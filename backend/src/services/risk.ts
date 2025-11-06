/**
 * GigStream Risk Scoring Engine
 * 
 * Calculates worker creditworthiness for advance eligibility using:
 * - XGBoost (Gradient Boosting) model for production (future)
 * - Heuristic rule-based scoring for MVP/demo
 * 
 * Requirements:
 * - Score range: 0-1000
 * - Eligibility threshold: >= 600
 * - Inference latency: < 100ms
 * - Weekly retraining schedule (future)
 * 
 * Based on:
 * - requirements.md FR-2.2.2
 * - design.md Section 5.2
 * - PRD Section 6.4
 */

import { getDatabase } from './database.js';
import * as schema from '../../database/schema.js';
import { eq, and, gte, desc } from 'drizzle-orm';

// ===================================
// TYPES & INTERFACES
// ===================================

export interface RiskScoreInputs {
  // Primary features (from PRD 6.4)
  completionRateLast30Days: number; // 0-1
  averageTaskValue: number; // USD
  accountAgeDays: number;
  disputeCount: number;
  ratingVariance: number; // Variance in ratings received
  timeOfDayPatterns: number[]; // 24-hour distribution

  // Additional features
  reputationScore: number; // 0-1000 from blockchain
  totalTasksCompleted: number;
  onTimeRate: number; // 0-1
  averageRating: number; // 0-5
  activeLoans: number;
  loanRepaymentHistory: number; // 0-1 (% repaid on time)
  earningsVolatility: number; // Standard deviation of weekly earnings
  last30DaysEarnings: number;
  totalDisputes: number;
  totalLoans: number; // Total number of loans (for history assessment)
}

export interface RiskScoreOutput {
  score: number; // 0-1000 (XGBoost prediction or heuristic)
  factors: Record<string, number>; // Factor breakdown for explainability
  eligibleForAdvance: boolean; // score >= 600 && no active loans
  maxAdvanceAmount: number; // 50-80% of predicted earnings
  recommendedFeeRate: number; // 2-5% based on risk (200-500 basis points)
  confidence: number; // Model confidence 0-1
  algorithmUsed: 'xgboost' | 'heuristic';
  calculatedAt: Date;
}

// Cache configuration
const SCORE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const scoreCache = new Map<string, { score: RiskScoreOutput; expiresAt: number }>();

// ===================================
// XGBOOST MODEL CONFIGURATION
// ===================================

/**
 * XGBoost model configuration (for future implementation)
 * Currently using heuristic fallback
 */
// @ts-ignore - Reserved for future XGBoost implementation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const XGBOOST_CONFIG = {
  objective: 'reg:squarederror',
  max_depth: 6,
  learning_rate: 0.1,
  n_estimators: 100,
  subsample: 0.8,
  colsample_bytree: 0.8,
  min_child_weight: 1,
  gamma: 0,
};

/**
 * Feature weights (approximate, learned from training)
 * These would come from a trained XGBoost model
 */
// @ts-ignore - Reserved for future XGBoost implementation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const FEATURE_WEIGHTS = {
  completionRateLast30Days: 0.25,
  averageTaskValue: 0.15,
  accountAgeDays: 0.1,
  disputeCount: -0.2, // Negative impact
  ratingVariance: -0.1, // Negative impact (inconsistency)
  reputationScore: 0.2,
  earningsVolatility: -0.1, // Negative impact
};

// ===================================
// DATA COLLECTION
// ===================================

/**
 * Collect all input features for risk scoring
 */
export async function collectRiskInputs(workerId: string, databaseUrl?: string): Promise<RiskScoreInputs> {
  const db = getDatabase(databaseUrl);

  // Get worker profile
  const worker = await db.query.workers.findFirst({
    where: eq(schema.workers.id, workerId),
  });

  if (!worker) {
    throw new Error(`Worker ${workerId} not found`);
  }

  // Calculate time ranges
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get tasks in last 30 days
  const tasksLast30Days = await db.query.tasks.findMany({
    where: and(
      eq(schema.tasks.workerId, workerId),
      gte(schema.tasks.createdAt, thirtyDaysAgo)
    ),
  });

  // Calculate completion rate (last 30 days)
  const completedTasks = tasksLast30Days.filter(t => t.status === 'completed').length;
  const totalTasks = tasksLast30Days.length;
  const completionRateLast30Days = totalTasks > 0 ? completedTasks / totalTasks : 0;

  // Calculate average task value
  const totalValue = tasksLast30Days.reduce((sum, t) => sum + parseFloat(t.paymentAmountUsdc || '0'), 0);
  const averageTaskValue = totalTasks > 0 ? totalValue / totalTasks : 0;

  // Calculate account age
  const accountAgeDays = worker.createdAt 
    ? Math.floor((now.getTime() - worker.createdAt.getTime()) / (24 * 60 * 60 * 1000))
    : 0;

  // Get dispute count
  const disputes = await db.query.reputationEvents.findMany({
    where: and(
      eq(schema.reputationEvents.workerId, workerId),
      eq(schema.reputationEvents.eventType, 'dispute_filed')
    ),
  });
  const disputeCount = disputes.length;

  // Calculate rating variance
  const ratingEvents = await db.query.reputationEvents.findMany({
    where: and(
      eq(schema.reputationEvents.workerId, workerId),
      eq(schema.reputationEvents.eventType, 'rating_received')
    ),
  });
  const ratings = ratingEvents
    .map(e => (e.metadata as any)?.rating)
    .filter(r => typeof r === 'number');
  const ratingVariance = calculateVariance(ratings);

  // Calculate average rating
  const averageRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
    : 0;

  // Get time-of-day patterns (24-hour distribution)
  const timeOfDayPatterns = calculateTimeOfDayPatterns(tasksLast30Days);

  // Calculate on-time rate
  const lateEvents = await db.query.reputationEvents.findMany({
    where: and(
      eq(schema.reputationEvents.workerId, workerId),
      eq(schema.reputationEvents.eventType, 'task_late')
    ),
  });
  const totalCompleted = worker.totalTasksCompleted || 0;
  const onTimeRate = totalCompleted > 0
    ? 1 - (lateEvents.length / totalCompleted)
    : 1;

  // Get active loans
  const activeLoans = await db.query.loans.findMany({
    where: and(
      eq(schema.loans.workerId, workerId),
      eq(schema.loans.status, 'active')
    ),
  });

  // Calculate loan repayment history
  const allLoans = await db.query.loans.findMany({
    where: eq(schema.loans.workerId, workerId),
  });
  const repaidOnTime = allLoans.filter(l => 
    l.status === 'repaid' && 
    l.repaidAt && 
    l.dueDate &&
    l.repaidAt <= l.dueDate
  ).length;
  const loanRepaymentHistory = allLoans.length > 0 ? repaidOnTime / allLoans.length : 1;

  // Calculate earnings volatility (standard deviation of weekly earnings)
  const weeklyEarnings = await calculateWeeklyEarnings(db, workerId);
  const earningsVolatility = calculateStandardDeviation(weeklyEarnings);

  // Calculate last 30 days earnings
  const last30DaysEarnings = tasksLast30Days
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + parseFloat(t.paymentAmountUsdc || '0'), 0);

  return {
    completionRateLast30Days,
    averageTaskValue,
    accountAgeDays,
    disputeCount,
    ratingVariance,
    timeOfDayPatterns,
    reputationScore: worker.reputationScore || 0,
    totalTasksCompleted: worker.totalTasksCompleted || 0,
    onTimeRate,
    averageRating,
    activeLoans: activeLoans.length,
    loanRepaymentHistory,
    earningsVolatility,
    last30DaysEarnings,
    totalDisputes: disputeCount,
    totalLoans: allLoans.length,
  };
}

// ===================================
// SCORING ALGORITHMS
// ===================================

/**
 * Calculate risk score using XGBoost model
 * TODO: Implement actual XGBoost integration
 */
async function calculateRiskScoreXGBoost(_inputs: RiskScoreInputs): Promise<RiskScoreOutput> {
  // Placeholder for XGBoost implementation
  // In production, this would load the trained model and make predictions
  throw new Error('XGBoost model not yet implemented. Use heuristic fallback.');
}

/**
 * Calculate risk score using heuristic rule-based algorithm
 * This is the MVP/demo implementation
 * 
 * Scoring factors:
 * - Reputation: 30% (300 points)
 * - Account maturity: 15% (150 points)
 * - Task history: 25% (250 points)
 * - Performance metrics: 20% (200 points)
 * - Dispute history: 10% (100 points)
 * - Loan history: Bonus/penalty (±50 points)
 */
function calculateRiskScoreHeuristic(inputs: RiskScoreInputs): RiskScoreOutput {
  const factors: Record<string, number> = {};

  // 1. Reputation (30% weight - 300 points)
  factors.reputation = (inputs.reputationScore / 1000) * 300;

  // 2. Account maturity (15% weight - 150 points)
  // Cap at 90 days for maturity bonus
  const maturityScore = Math.min(inputs.accountAgeDays / 90, 1);
  factors.maturity = maturityScore * 150;

  // 3. Task history (25% weight - 250 points)
  // Cap at 50 tasks for maximum score
  const taskScore = Math.min(inputs.totalTasksCompleted / 50, 1);
  factors.taskHistory = taskScore * 250;

  // 4. Performance metrics (20% weight - 200 points)
  const performanceScore =
    inputs.completionRateLast30Days * 0.4 +
    inputs.onTimeRate * 0.4 +
    (inputs.averageRating / 5) * 0.2;
  factors.performance = performanceScore * 200;

  // 5. Dispute history (10% weight - 100 points, negative)
  // Each dispute deducts 20 points, cap at -100
  const disputePenalty = Math.min(inputs.totalDisputes * 20, 100);
  factors.disputes = 100 - disputePenalty;

  // 6. Loan history (bonus/penalty)
  if (inputs.loanRepaymentHistory === 1 && inputs.totalLoans > 0) {
    factors.loanHistory = 50; // Bonus for perfect repayment
  } else if (inputs.loanRepaymentHistory < 0.8) {
    factors.loanHistory = -50; // Penalty for poor repayment
  } else {
    factors.loanHistory = 0;
  }

  // 7. Earnings consistency bonus
  if (inputs.earningsVolatility < 50 && inputs.last30DaysEarnings > 100) {
    factors.consistency = 30; // Bonus for stable earnings
  } else if (inputs.earningsVolatility > 150) {
    factors.consistency = -30; // Penalty for volatile earnings
  } else {
    factors.consistency = 0;
  }

  // Calculate total score (0-1000 range)
  const rawScore =
    factors.reputation +
    factors.maturity +
    factors.taskHistory +
    factors.performance +
    factors.disputes +
    factors.loanHistory +
    factors.consistency;

  const totalScore = Math.max(0, Math.min(1000, Math.round(rawScore)));

  // Eligibility determination
  // Must have score >= 600 AND no active loans
  const eligible = totalScore >= 600 && inputs.activeLoans === 0;

  // Max advance calculation
  let maxAdvance = 0;
  if (eligible && inputs.last30DaysEarnings > 0) {
    // 50-80% of last 30 days earnings, based on score
    // Higher score = higher advance ratio
    const ratio = 0.5 + (totalScore / 1000) * 0.3; // 50% to 80%
    maxAdvance = inputs.last30DaysEarnings * ratio;
    
    // Apply caps
    maxAdvance = Math.min(maxAdvance, 500); // Max $500 advance
    maxAdvance = Math.max(maxAdvance, 0); // No negative advances
  }

  // Fee rate calculation (higher risk = higher fee)
  // Score ranges: 800+ = 2%, 600-799 = 3.5%, <600 = 5%
  let feeRate: number;
  if (totalScore >= 800) {
    feeRate = 200; // 2% (200 basis points) - low risk
  } else if (totalScore >= 600) {
    feeRate = 350; // 3.5% (350 basis points) - medium risk
  } else {
    feeRate = 500; // 5% (500 basis points) - high risk
  }

  // Confidence calculation
  // Higher confidence if more data available
  let confidence = 0.5; // Base confidence
  if (inputs.totalTasksCompleted >= 10) confidence += 0.1;
  if (inputs.accountAgeDays >= 30) confidence += 0.1;
  if (inputs.totalTasksCompleted >= 30) confidence += 0.1;
  if (inputs.accountAgeDays >= 60) confidence += 0.1;
  if (inputs.totalLoans > 0) confidence += 0.1; // Loan history adds confidence
  confidence = Math.min(confidence, 1.0);

  return {
    score: totalScore,
    factors,
    eligibleForAdvance: eligible,
    maxAdvanceAmount: Math.round(maxAdvance * 100) / 100,
    recommendedFeeRate: feeRate,
    confidence,
    algorithmUsed: 'heuristic',
    calculatedAt: new Date(),
  };
}

// ===================================
// PUBLIC API
// ===================================

/**
 * Calculate comprehensive risk score for a worker
 * Returns cached result if available and recent (< 5 minutes)
 * Otherwise recalculates using XGBoost (if available) or heuristic algorithm
 * 
 * @param workerId - Worker UUID
 * @param databaseUrl - Database connection string (required for Cloudflare Workers)
 * @param forceRefresh - Bypass cache and recalculate
 */
export async function calculateRiskScore(
  workerId: string,
  databaseUrl?: string,
  forceRefresh: boolean = false
): Promise<RiskScoreOutput> {
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = scoreCache.get(workerId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.score;
    }
  }

  // Collect input features
  const inputs = await collectRiskInputs(workerId, databaseUrl);

  // Calculate score (try XGBoost, fallback to heuristic)
  let score: RiskScoreOutput;
  try {
    score = await calculateRiskScoreXGBoost(inputs);
  } catch (error) {
    // XGBoost not available, use heuristic
    score = calculateRiskScoreHeuristic(inputs);
  }

  // Cache the result
  scoreCache.set(workerId, {
    score,
    expiresAt: Date.now() + SCORE_CACHE_TTL,
  });

  return score;
}

/**
 * Get risk score from cache if available
 * Returns null if not cached or expired
 */
export function getCachedRiskScore(workerId: string): RiskScoreOutput | null {
  const cached = scoreCache.get(workerId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.score;
  }
  return null;
}

/**
 * Clear risk score cache for a worker
 * Useful after task completion or loan repayment
 */
export function clearRiskScoreCache(workerId: string): void {
  scoreCache.delete(workerId);
}

/**
 * Clear all cached risk scores
 * Useful for testing or cache invalidation
 */
export function clearAllRiskScores(): void {
  scoreCache.clear();
}

/**
 * Get risk score for multiple workers
 * Efficiently batches database queries
 */
export async function calculateBatchRiskScores(
  workerIds: string[]
): Promise<Map<string, RiskScoreOutput>> {
  const results = new Map<string, RiskScoreOutput>();

  // Process in parallel
  await Promise.all(
    workerIds.map(async (workerId) => {
      try {
        const score = await calculateRiskScore(workerId);
        results.set(workerId, score);
      } catch (error) {
        console.error(`Failed to calculate risk score for worker ${workerId}:`, error);
      }
    })
  );

  return results;
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

/**
 * Calculate variance of a number array
 */
function calculateVariance(numbers: number[]): number {
  if (numbers.length === 0) return 0;

  const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
  const variance = squaredDiffs.reduce((sum, n) => sum + n, 0) / numbers.length;

  return variance;
}

/**
 * Calculate standard deviation of a number array
 */
function calculateStandardDeviation(numbers: number[]): number {
  return Math.sqrt(calculateVariance(numbers));
}

/**
 * Calculate time-of-day patterns from tasks
 * Returns 24-hour distribution (0-23)
 */
function calculateTimeOfDayPatterns(tasks: any[]): number[] {
  const hourCounts = new Array(24).fill(0);

  for (const task of tasks) {
    if (task.completedAt) {
      const hour = new Date(task.completedAt).getHours();
      hourCounts[hour]++;
    }
  }

  // Normalize to percentages
  const total = hourCounts.reduce((sum, count) => sum + count, 0);
  if (total === 0) return hourCounts;

  return hourCounts.map(count => count / total);
}

/**
 * Calculate weekly earnings for volatility calculation
 */
async function calculateWeeklyEarnings(
  db: ReturnType<typeof getDatabase>,
  workerId: string
): Promise<number[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Get all completed tasks in last 30 days
  const tasks = await db.query.tasks.findMany({
    where: and(
      eq(schema.tasks.workerId, workerId),
      eq(schema.tasks.status, 'completed'),
      gte(schema.tasks.completedAt, thirtyDaysAgo)
    ),
    orderBy: [desc(schema.tasks.completedAt)],
  });

  // Group by week
  const weeklyEarnings: Record<string, number> = {};

  for (const task of tasks) {
    if (!task.completedAt) continue;

    const date = new Date(task.completedAt);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);

    const weekKey = weekStart.toISOString().split('T')[0];
    weeklyEarnings[weekKey] = (weeklyEarnings[weekKey] || 0) + parseFloat(task.paymentAmountUsdc || '0');
  }

  return Object.values(weeklyEarnings);
}

/**
 * Update risk score after task completion
 * Call this after a task is completed to refresh the cache
 */
export async function updateRiskScoreAfterTask(workerId: string, databaseUrl?: string): Promise<void> {
  clearRiskScoreCache(workerId);
  await calculateRiskScore(workerId, databaseUrl, true);
}

/**
 * Get risk score breakdown for display
 * Returns human-readable factor explanations
 */
export function formatRiskScoreBreakdown(score: RiskScoreOutput): {
  score: number;
  grade: string;
  factors: Array<{ name: string; value: number; description: string }>;
} {
  const grade =
    score.score >= 800 ? 'Excellent' :
    score.score >= 700 ? 'Very Good' :
    score.score >= 600 ? 'Good' :
    score.score >= 500 ? 'Fair' :
    'Poor';

  const factorDescriptions: Record<string, string> = {
    reputation: 'Blockchain reputation score',
    maturity: 'Account age and experience',
    taskHistory: 'Total tasks completed',
    performance: 'Completion rate and ratings',
    disputes: 'Dispute history (negative)',
    loanHistory: 'Loan repayment history',
    consistency: 'Earnings stability',
  };

  const factors = Object.entries(score.factors).map(([name, value]) => ({
    name,
    value: Math.round(value),
    description: factorDescriptions[name] || name,
  }));

  return {
    score: score.score,
    grade,
    factors,
  };
}

// ===================================
// XGBOOST FUTURE IMPLEMENTATION
// ===================================

/**
 * Train XGBoost model on historical data
 * TODO: Implement for production
 * 
 * This would:
 * 1. Fetch historical worker data
 * 2. Prepare training features
 * 3. Train XGBoost model
 * 4. Save model for inference
 * 5. Schedule weekly retraining
 */
export async function trainXGBoostModel(): Promise<void> {
  throw new Error('XGBoost training not yet implemented');
}

/**
 * Load trained XGBoost model
 * TODO: Implement for production
 */
export async function loadXGBoostModel(): Promise<void> {
  throw new Error('XGBoost model loading not yet implemented');
}
