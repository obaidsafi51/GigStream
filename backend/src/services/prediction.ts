/**
 * GigStream Earnings Prediction Engine
 * 
 * Forecasts next 7 days earnings to determine safe advance amounts using:
 * - Prophet (Time Series Forecasting) for production (future)
 * - Moving average with day-of-week patterns for MVP/demo
 * 
 * Requirements:
 * - Prediction horizon: 7 days
 * - Accuracy target: MAPE < 15%
 * - Inference latency: < 500ms
 * - Update frequency: Daily
 * 
 * Based on:
 * - requirements.md FR-2.2.3
 * - design.md Section 5.3
 * - PRD Section 6.4
 */

import { getDatabase } from './database.js';
import * as schema from '../../database/schema.js';
import { eq, and, gte, desc } from 'drizzle-orm';

// ===================================
// TYPES & INTERFACES
// ===================================

export interface EarningsHistory {
  date: string; // ISO date (YYYY-MM-DD)
  earnings: number;
  tasksCompleted: number;
  platform?: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  holiday?: boolean;
}

export interface ProphetFeatures {
  historicalEarnings: EarningsHistory[]; // Min 30 days
  dayOfWeekPatterns: Record<number, number>; // Average earnings per day
  seasonality: 'weekly' | 'monthly' | 'none';
  trend: 'increasing' | 'stable' | 'decreasing';
  regressors?: {
    platformTrend: number;
    competitionIndex: number;
  };
}

export interface DailyPrediction {
  date: string;
  predicted: number;
  lower: number; // Lower bound of confidence interval
  upper: number; // Upper bound of confidence interval
}

export interface EarningsPrediction {
  next7Days: number; // Total predicted earnings
  dailyPredictions: DailyPrediction[];
  confidence: 'high' | 'medium' | 'low';
  confidenceScore: number; // 0-1
  mape: number; // Model accuracy on recent data
  breakdown: {
    weekdayEarnings: number; // Mon-Fri
    weekendEarnings: number; // Sat-Sun
    trendAdjustment: number; // +/- adjustment based on trend
  };
  safeAdvanceAmount: number; // 50-80% of prediction
  algorithmUsed: 'prophet' | 'heuristic';
  calculatedAt: Date;
}

// Cache configuration
const PREDICTION_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const predictionCache = new Map<string, { prediction: EarningsPrediction; expiresAt: number }>();

// ===================================
// PROPHET MODEL CONFIGURATION
// ===================================

/**
 * Prophet model configuration (for future implementation)
 * Currently using heuristic fallback
 */
// @ts-ignore - Reserved for future Prophet implementation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PROPHET_CONFIG = {
  changepoint_prior_scale: 0.05, // Flexibility of trend
  seasonality_prior_scale: 10, // Strength of seasonality
  seasonality_mode: 'multiplicative', // Or 'additive'
  weekly_seasonality: true,
  daily_seasonality: false,
  yearly_seasonality: false,
  interval_width: 0.8, // 80% confidence interval
};

// ===================================
// DATA COLLECTION
// ===================================

/**
 * Collect historical earnings data for a worker
 * Minimum 7 days required, 30 days recommended
 */
export async function collectEarningsHistory(
  workerId: string,
  days: number = 30,
  databaseUrl?: string
): Promise<EarningsHistory[]> {
  const db = getDatabase(databaseUrl);
  
  // Calculate date range
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Get all completed tasks in the date range
  const tasks = await db.query.tasks.findMany({
    where: and(
      eq(schema.tasks.workerId, workerId),
      eq(schema.tasks.status, 'completed'),
      gte(schema.tasks.completedAt, startDate)
    ),
    orderBy: [desc(schema.tasks.completedAt)],
  });

  // Group tasks by date
  const dailyEarnings: Record<string, { earnings: number; count: number; platform?: string }> = {};

  for (const task of tasks) {
    if (!task.completedAt) continue;

    const date = new Date(task.completedAt);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!dailyEarnings[dateKey]) {
      dailyEarnings[dateKey] = { earnings: 0, count: 0 };
    }

    dailyEarnings[dateKey].earnings += parseFloat(task.paymentAmountUsdc || '0');
    dailyEarnings[dateKey].count++;
    
    // Track platform (use first task's platform for simplicity)
    if (!dailyEarnings[dateKey].platform && task.platformId) {
      dailyEarnings[dateKey].platform = task.platformId;
    }
  }

  // Convert to array format
  const history: EarningsHistory[] = [];

  // Fill in all days (including zero-earning days)
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateKey = date.toISOString().split('T')[0];

    const data = dailyEarnings[dateKey] || { earnings: 0, count: 0 };

    history.push({
      date: dateKey,
      earnings: data.earnings,
      tasksCompleted: data.count,
      platform: data.platform,
      dayOfWeek: date.getDay(),
      holiday: false, // TODO: Implement holiday detection
    });
  }

  return history;
}

// ===================================
// PREDICTION ALGORITHMS
// ===================================

/**
 * Calculate earnings prediction using Prophet
 * TODO: Implement actual Prophet integration
 */
async function predictEarningsProphet(_history: EarningsHistory[]): Promise<EarningsPrediction> {
  // Placeholder for Prophet implementation
  // In production, this would use a trained Prophet model
  throw new Error('Prophet model not yet implemented. Use heuristic fallback.');
}

/**
 * Calculate earnings prediction using heuristic algorithm
 * This is the MVP/demo implementation
 * 
 * Algorithm:
 * 1. Calculate day-of-week averages
 * 2. Apply trend adjustment (linear regression)
 * 3. Use recency weighting (last 7 days more important)
 * 4. Calculate confidence based on volatility
 * 5. Generate 80% confidence intervals
 */
function predictEarningsHeuristic(history: EarningsHistory[]): EarningsPrediction {
  // Handle insufficient data
  if (history.length < 7) {
    const avgDaily = history.length > 0
      ? history.reduce((sum, h) => sum + h.earnings, 0) / history.length
      : 0;

    const conservativeEstimate = avgDaily * 7 * 0.7; // 70% of average for safety

    return {
      next7Days: Math.round(conservativeEstimate * 100) / 100,
      dailyPredictions: generateConservativePredictions(avgDaily * 0.7, 7),
      confidence: 'low',
      confidenceScore: 0.5,
      mape: 25, // Conservative estimate
      breakdown: {
        weekdayEarnings: avgDaily * 5 * 0.7,
        weekendEarnings: avgDaily * 2 * 0.7,
        trendAdjustment: 0,
      },
      safeAdvanceAmount: Math.round(conservativeEstimate * 0.5 * 100) / 100, // 50% for low confidence
      algorithmUsed: 'heuristic',
      calculatedAt: new Date(),
    };
  }

  // Calculate day-of-week patterns
  const dayOfWeekAvg: number[] = new Array(7).fill(0);
  const dayOfWeekCount: number[] = new Array(7).fill(0);

  history.forEach((h) => {
    dayOfWeekAvg[h.dayOfWeek] += h.earnings;
    dayOfWeekCount[h.dayOfWeek]++;
  });

  // Calculate averages (handle days with no data)
  dayOfWeekAvg.forEach((sum, i) => {
    dayOfWeekAvg[i] = dayOfWeekCount[i] > 0 ? sum / dayOfWeekCount[i] : 0;
  });

  // Calculate overall average as fallback
  const overallAvg = history.reduce((sum, h) => sum + h.earnings, 0) / history.length;

  // Fill in missing day-of-week averages with overall average
  for (let i = 0; i < 7; i++) {
    if (dayOfWeekAvg[i] === 0 && overallAvg > 0) {
      dayOfWeekAvg[i] = overallAvg;
    }
  }

  // Calculate trend (simple linear regression on last 14 days)
  const recentDays = history.slice(-14);
  const trend = calculateTrend(recentDays);
  
  // Determine trend direction (currently unused, reserved for future analytics)
  // @ts-ignore - Reserved for future trend analysis features
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const trendDirection: 'increasing' | 'stable' | 'decreasing' = 
    trend > 0.1 ? 'increasing' : trend < -0.1 ? 'decreasing' : 'stable';

  // Calculate recency-weighted average (last 7 days have more weight)
  const last7Days = history.slice(-7);
  const last7Avg = last7Days.reduce((sum, h) => sum + h.earnings, 0) / last7Days.length;

  // Predict next 7 days
  const dailyPredictions: DailyPrediction[] = [];
  let totalPredicted = 0;
  let weekdayTotal = 0;
  let weekendTotal = 0;

  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i + 1); // Start from tomorrow
    const dateKey = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();

    // Base prediction from day-of-week average
    let predicted = dayOfWeekAvg[dayOfWeek];

    // Apply trend adjustment (dampened to 10% of trend)
    const trendMultiplier = 1 + trend * 0.1;
    predicted *= trendMultiplier;

    // Apply recency weighting (60% historical pattern, 40% recent average)
    predicted = predicted * 0.6 + last7Avg * 0.4;

    // Round to 2 decimal places
    predicted = Math.round(predicted * 100) / 100;

    // Calculate confidence interval (80% confidence)
    const volatility = calculateVolatility(history);
    const intervalWidth = volatility < 0.2 ? 0.15 : volatility < 0.4 ? 0.25 : 0.4;
    
    const lower = Math.max(0, Math.round(predicted * (1 - intervalWidth) * 100) / 100);
    const upper = Math.round(predicted * (1 + intervalWidth) * 100) / 100;

    dailyPredictions.push({
      date: dateKey,
      predicted,
      lower,
      upper,
    });

    totalPredicted += predicted;

    // Track weekday vs weekend
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      weekdayTotal += predicted;
    } else {
      weekendTotal += predicted;
    }
  }

  // Calculate confidence based on volatility and data availability
  const volatility = calculateVolatility(history);
  const confidence: 'high' | 'medium' | 'low' = 
    volatility < 0.2 && history.length >= 30 ? 'high' :
    volatility < 0.4 && history.length >= 14 ? 'medium' : 
    'low';

  const confidenceScore = 
    history.length >= 30 ? 0.9 - volatility :
    history.length >= 14 ? 0.75 - volatility :
    0.6 - volatility;

  // Calculate MAPE on last 7 days (if enough data)
  let mape = 15; // Default estimate
  if (history.length >= 14) {
    mape = calculateMAPE(history.slice(-14, -7), dayOfWeekAvg, trend);
  }

  // Calculate trend adjustment
  const trendAdjustment = totalPredicted * trend * 0.1;

  // Calculate safe advance amount
  // 50% for low confidence, 65% for medium, 80% for high
  const advanceRatio = confidence === 'high' ? 0.8 : confidence === 'medium' ? 0.65 : 0.5;
  const safeAdvanceAmount = Math.round(totalPredicted * advanceRatio * 100) / 100;

  return {
    next7Days: Math.round(totalPredicted * 100) / 100,
    dailyPredictions,
    confidence,
    confidenceScore: Math.max(0, Math.min(1, confidenceScore)),
    mape: Math.round(mape * 100) / 100,
    breakdown: {
      weekdayEarnings: Math.round(weekdayTotal * 100) / 100,
      weekendEarnings: Math.round(weekendTotal * 100) / 100,
      trendAdjustment: Math.round(trendAdjustment * 100) / 100,
    },
    safeAdvanceAmount,
    algorithmUsed: 'heuristic',
    calculatedAt: new Date(),
  };
}

// ===================================
// PUBLIC API
// ===================================

/**
 * Predict earnings for a worker for the next N days
 * Uses cached prediction if available and not expired
 * 
 * @param workerId - Worker UUID
 * @param days - Number of days to predict (default: 7)
 * @param days - Number of days to predict (default: 7)
 * @param databaseUrl - Database connection string (required for Cloudflare Workers)
 * @param forceRefresh - Force recalculation (bypass cache)
 * @returns Earnings prediction with confidence and safe advance amount
 */
export async function predictEarnings(
  workerId: string,
  days: number = 7,
  databaseUrl?: string,
  forceRefresh: boolean = false
): Promise<EarningsPrediction> {
  // Check cache first (unless force refresh)
  const cacheKey = `${workerId}_${days}`;
  if (!forceRefresh) {
    const cached = predictionCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.prediction;
    }
  }

  // Collect historical data (30 days recommended)
  const history = await collectEarningsHistory(workerId, 30, databaseUrl);

  // Calculate prediction (try Prophet, fallback to heuristic)
  let prediction: EarningsPrediction;
  try {
    prediction = await predictEarningsProphet(history);
  } catch (error) {
    // Prophet not available, use heuristic
    prediction = predictEarningsHeuristic(history);
  }

  // Adjust if requested days is not 7
  if (days !== 7) {
    prediction = adjustPredictionDays(prediction, days);
  }

  // Cache the result
  predictionCache.set(cacheKey, {
    prediction,
    expiresAt: Date.now() + PREDICTION_CACHE_TTL,
  });

  return prediction;
}

/**
 * Get prediction from cache if available
 * Returns null if not cached or expired
 */
export function getCachedPrediction(workerId: string, days: number = 7): EarningsPrediction | null {
  const cacheKey = `${workerId}_${days}`;
  const cached = predictionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.prediction;
  }
  return null;
}

/**
 * Clear prediction cache for a worker
 * Useful after new task completion
 */
export function clearPredictionCache(workerId: string): void {
  // Clear all cached predictions for this worker
  const keysToDelete: string[] = [];
  predictionCache.forEach((_, key) => {
    if (key.startsWith(workerId)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => predictionCache.delete(key));
}

/**
 * Clear all cached predictions
 * Useful for testing or cache invalidation
 */
export function clearAllPredictions(): void {
  predictionCache.clear();
}

/**
 * Get predictions for multiple workers
 * Efficiently batches database queries
 */
export async function predictBatchEarnings(
  workerIds: string[],
  days: number = 7
): Promise<Map<string, EarningsPrediction>> {
  const results = new Map<string, EarningsPrediction>();

  // Process in parallel
  await Promise.all(
    workerIds.map(async (workerId) => {
      try {
        const prediction = await predictEarnings(workerId, days);
        results.set(workerId, prediction);
      } catch (error) {
        console.error(`Failed to predict earnings for worker ${workerId}:`, error);
      }
    })
  );

  return results;
}

/**
 * Update prediction after task completion
 * Call this after a task is completed to refresh the cache
 */
export async function updatePredictionAfterTask(workerId: string, databaseUrl?: string): Promise<void> {
  clearPredictionCache(workerId);
  await predictEarnings(workerId, 7, databaseUrl, true);
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

/**
 * Calculate linear trend of earnings data
 * Returns normalized slope (trend as percentage change)
 */
function calculateTrend(data: EarningsHistory[]): number {
  if (data.length < 2) return 0;

  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  data.forEach((d, i) => {
    sumX += i;
    sumY += d.earnings;
    sumXY += i * d.earnings;
    sumX2 += i * i;
  });

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const avgY = sumY / n;

  // Normalize slope relative to average (percentage change per day)
  return avgY > 0 ? slope / avgY : 0;
}

/**
 * Calculate coefficient of variation (volatility)
 * Lower values indicate more stable earnings
 */
function calculateVolatility(data: EarningsHistory[]): number {
  if (data.length < 2) return 1;

  const mean = data.reduce((sum, d) => sum + d.earnings, 0) / data.length;
  
  if (mean === 0) return 1;

  const variance = data.reduce((sum, d) => sum + Math.pow(d.earnings - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);

  // Coefficient of variation
  return stdDev / mean;
}

/**
 * Calculate MAPE (Mean Absolute Percentage Error)
 * Measures prediction accuracy on historical data
 */
function calculateMAPE(
  testData: EarningsHistory[],
  dayOfWeekAvg: number[],
  trend: number
): number {
  if (testData.length === 0) return 15; // Default estimate

  let totalPercentageError = 0;
  let validPoints = 0;

  testData.forEach((actual) => {
    if (actual.earnings === 0) return; // Skip zero-earning days

    // Predict using same algorithm
    let predicted = dayOfWeekAvg[actual.dayOfWeek];
    predicted *= (1 + trend * 0.1);

    const percentageError = Math.abs((actual.earnings - predicted) / actual.earnings);
    totalPercentageError += percentageError;
    validPoints++;
  });

  if (validPoints === 0) return 15;

  const mape = (totalPercentageError / validPoints) * 100;
  return Math.min(mape, 100); // Cap at 100%
}

/**
 * Generate conservative predictions for low-data scenarios
 */
function generateConservativePredictions(avgDaily: number, days: number): DailyPrediction[] {
  const predictions: DailyPrediction[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i + 1);
    const dateKey = date.toISOString().split('T')[0];

    predictions.push({
      date: dateKey,
      predicted: Math.round(avgDaily * 100) / 100,
      lower: Math.round(avgDaily * 0.5 * 100) / 100,
      upper: Math.round(avgDaily * 1.5 * 100) / 100,
    });
  }

  return predictions;
}

/**
 * Adjust prediction for different number of days
 */
function adjustPredictionDays(prediction: EarningsPrediction, newDays: number): EarningsPrediction {
  if (newDays === prediction.dailyPredictions.length) {
    return prediction;
  }

  // Simple proportional adjustment
  const ratio = newDays / prediction.dailyPredictions.length;

  return {
    ...prediction,
    next7Days: Math.round(prediction.next7Days * ratio * 100) / 100,
    safeAdvanceAmount: Math.round(prediction.safeAdvanceAmount * ratio * 100) / 100,
    breakdown: {
      weekdayEarnings: Math.round(prediction.breakdown.weekdayEarnings * ratio * 100) / 100,
      weekendEarnings: Math.round(prediction.breakdown.weekendEarnings * ratio * 100) / 100,
      trendAdjustment: Math.round(prediction.breakdown.trendAdjustment * ratio * 100) / 100,
    },
    dailyPredictions: prediction.dailyPredictions.slice(0, newDays),
  };
}

/**
 * Format prediction for display
 * Returns human-readable breakdown with explanations
 */
export function formatPredictionBreakdown(prediction: EarningsPrediction): {
  summary: string;
  confidence: string;
  dailyBreakdown: Array<{ date: string; amount: string; range: string }>;
  explanation: string;
} {
  const confidenceDescription = 
    prediction.confidence === 'high' ? 'High confidence (low volatility, sufficient data)' :
    prediction.confidence === 'medium' ? 'Medium confidence (moderate volatility)' :
    'Low confidence (high volatility or insufficient data)';

  const dailyBreakdown = prediction.dailyPredictions.map(day => ({
    date: day.date,
    amount: `$${day.predicted.toFixed(2)}`,
    range: `$${day.lower.toFixed(2)} - $${day.upper.toFixed(2)}`,
  }));

  const explanation = `
Prediction based on ${prediction.algorithmUsed === 'prophet' ? 'Prophet time series model' : 'moving average with day-of-week patterns'}.
Weekday earnings: $${prediction.breakdown.weekdayEarnings.toFixed(2)}
Weekend earnings: $${prediction.breakdown.weekendEarnings.toFixed(2)}
Trend adjustment: ${prediction.breakdown.trendAdjustment >= 0 ? '+' : ''}$${prediction.breakdown.trendAdjustment.toFixed(2)}
MAPE: ${prediction.mape.toFixed(1)}%
  `.trim();

  return {
    summary: `Predicted earnings: $${prediction.next7Days.toFixed(2)} over 7 days`,
    confidence: confidenceDescription,
    dailyBreakdown,
    explanation,
  };
}

/**
 * Validate prediction quality
 * Returns warnings if prediction may be unreliable
 */
export function validatePrediction(prediction: EarningsPrediction): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check for very low confidence
  if (prediction.confidenceScore < 0.5) {
    warnings.push('Low confidence score - prediction may be unreliable');
  }

  // Check for high MAPE
  if (prediction.mape > 25) {
    warnings.push('High prediction error (MAPE > 25%) - use with caution');
  }

  // Check for negative earnings
  if (prediction.next7Days < 0) {
    warnings.push('Negative earnings predicted - data issue or calculation error');
  }

  // Check for unrealistic values
  if (prediction.next7Days > 10000) {
    warnings.push('Unusually high earnings predicted - verify data quality');
  }

  // Check for zero earnings with high confidence
  if (prediction.next7Days === 0 && prediction.confidence === 'high') {
    warnings.push('Zero earnings predicted with high confidence - worker may be inactive');
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}

// ===================================
// PROPHET FUTURE IMPLEMENTATION
// ===================================

/**
 * Train Prophet model on historical data
 * TODO: Implement for production
 * 
 * This would:
 * 1. Fetch historical worker data (all workers, 6+ months)
 * 2. Prepare time series data (date, earnings)
 * 3. Configure Prophet parameters
 * 4. Train model with weekly seasonality
 * 5. Save model for inference
 * 6. Schedule daily retraining
 */
export async function trainProphetModel(): Promise<void> {
  throw new Error('Prophet training not yet implemented');
}

/**
 * Load trained Prophet model
 * TODO: Implement for production
 */
export async function loadProphetModel(): Promise<void> {
  throw new Error('Prophet model loading not yet implemented');
}

/**
 * Retrain Prophet model with new data
 * Should be run daily or weekly
 */
export async function retrainProphetModel(): Promise<void> {
  throw new Error('Prophet retraining not yet implemented');
}
