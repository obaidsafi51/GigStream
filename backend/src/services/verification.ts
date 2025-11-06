/**
 * Task Verification Agent
 * 
 * AI-powered verification system with fraud detection and pattern recognition.
 * Implements fast-path checks, heuristic scoring, and Cloudflare Workers AI integration.
 * 
 * Requirements:
 * - Verification latency < 500ms for auto-approved tasks
 * - Auto-approval rate > 90% for valid tasks
 * - False positive rate < 2%
 * - Fraud detection accuracy > 95%
 */

import { z } from 'zod';

// ============================================================================
// Type Definitions
// ============================================================================

export const TaskCompletionSchema = z.object({
  externalTaskId: z.string(),
  workerId: z.string().uuid(),
  completedAt: z.string().datetime(),
  amount: z.number().positive().max(1000),
  completionProof: z.object({
    photos: z.array(z.string().url()).optional(),
    gpsCoordinates: z.object({
      lat: z.number().min(-90).max(90),
      lon: z.number().min(-180).max(180)
    }).optional(),
    duration: z.number().positive().optional(),
    signature: z.string().optional(),
    metadata: z.record(z.any()).optional()
  }).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  metadata: z.record(z.any()).optional()
});

export type TaskCompletion = z.infer<typeof TaskCompletionSchema>;

export interface VerificationResult {
  verdict: 'approve' | 'flag' | 'reject';
  confidence: number; // 0-100
  reason: string;
  checks: {
    fastPath: {
      passed: boolean;
      issues: string[];
      checksDuration: number;
    };
    ai: {
      score: number;
      patterns: string[];
      method: 'cloudflare_ai' | 'heuristic';
      duration: number;
    };
    fraud: {
      suspicious: boolean;
      signals: string[];
      riskLevel: 'low' | 'medium' | 'high';
      duration: number;
    };
  };
  latencyMs: number;
  autoApprove: boolean;
}

export interface WorkerHistory {
  reputationScore: number;
  tasksLast24h: number;
  averageTaskAmount: number;
  disputes: number;
  completionRate: number;
  totalTasksCompleted: number;
  accountAgeDays: number;
  recentTasks?: Array<{
    amount: number;
    duration: number;
    gps?: { lat: number; lon: number };
    completedAt: Date;
  }>;
}

// ============================================================================
// Verification Rules Configuration
// ============================================================================

const VERIFICATION_RULES = {
  requiredFields: ['completedAt', 'amount', 'workerId'],
  amountLimits: {
    min: 0.01,
    max: 1000,
    flagThreshold: 500, // Flag high-value tasks for review
    autoApproveMax: 200 // Auto-approve only below this amount
  },
  timeLimits: {
    maxFutureOffsetMs: 5 * 60 * 1000, // 5 minutes
    maxPastOffsetMs: 24 * 60 * 60 * 1000 // 24 hours
  },
  gpsValidation: {
    required: false, // Optional for MVP
    geofenceCheck: false,
    radiusMeters: 1000
  },
  photoValidation: {
    required: false, // Optional for MVP
    minCount: 0,
    maxSizeMB: 10,
    formats: ['jpg', 'jpeg', 'png', 'webp']
  },
  durationLimits: {
    minMinutes: 1, // Suspiciously fast if less
    maxMinutes: 480 // 8 hours
  }
};

// ============================================================================
// Fast-Path Validation Checks
// ============================================================================

function runFastPathChecks(task: TaskCompletion): {
  passed: boolean;
  issues: string[];
  checksDuration: number;
} {
  const startTime = Date.now();
  const issues: string[] = [];
  
  // 1. Required fields validation
  if (!task.completedAt) {
    issues.push('Missing completion timestamp');
  }
  if (!task.amount || task.amount <= 0) {
    issues.push('Invalid amount');
  }
  if (!task.workerId) {
    issues.push('Missing worker ID');
  }
  
  // 2. Amount limits
  if (task.amount < VERIFICATION_RULES.amountLimits.min) {
    issues.push(`Amount too low: $${task.amount}`);
  }
  if (task.amount > VERIFICATION_RULES.amountLimits.max) {
    issues.push(`Amount exceeds limit: $${task.amount}`);
  }
  
  // 3. Timestamp validation
  const now = Date.now();
  const completedTime = new Date(task.completedAt).getTime();
  
  if (completedTime > now + VERIFICATION_RULES.timeLimits.maxFutureOffsetMs) {
    issues.push('Completion time is in the future');
  }
  if (now - completedTime > VERIFICATION_RULES.timeLimits.maxPastOffsetMs) {
    issues.push('Completion time too old (>24h)');
  }
  if (isNaN(completedTime)) {
    issues.push('Invalid timestamp format');
  }
  
  // 4. Duration validation (if provided)
  if (task.completionProof?.duration !== undefined) {
    if (task.completionProof.duration < VERIFICATION_RULES.durationLimits.minMinutes) {
      issues.push(`Task completed too quickly: ${task.completionProof.duration} minutes`);
    }
    if (task.completionProof.duration > VERIFICATION_RULES.durationLimits.maxMinutes) {
      issues.push(`Task duration too long: ${task.completionProof.duration} minutes`);
    }
  }
  
  // 5. GPS validation (if required)
  if (VERIFICATION_RULES.gpsValidation.required && !task.completionProof?.gpsCoordinates) {
    issues.push('Missing required GPS coordinates');
  }
  
  // 6. Photo validation (if required)
  if (VERIFICATION_RULES.photoValidation.required) {
    const photos = task.completionProof?.photos || [];
    if (photos.length < VERIFICATION_RULES.photoValidation.minCount) {
      issues.push(`Insufficient photos: ${photos.length}/${VERIFICATION_RULES.photoValidation.minCount}`);
    }
  }
  
  return {
    passed: issues.length === 0,
    issues,
    checksDuration: Date.now() - startTime
  };
}

// ============================================================================
// Fraud Detection Engine
// ============================================================================

async function detectFraud(
  task: TaskCompletion,
  workerHistory: WorkerHistory
): Promise<{
  suspicious: boolean;
  signals: string[];
  riskLevel: 'low' | 'medium' | 'high';
  duration: number;
}> {
  const startTime = Date.now();
  const signals: string[] = [];
  let riskScore = 0;
  
  // Pattern 1: Rapid completion spike (velocity check)
  if (workerHistory.tasksLast24h > 50) {
    signals.push(`Unusually high completion rate: ${workerHistory.tasksLast24h} tasks in 24h`);
    riskScore += 30;
  } else if (workerHistory.tasksLast24h > 30) {
    signals.push(`High completion rate: ${workerHistory.tasksLast24h} tasks in 24h`);
    riskScore += 15;
  }
  
  // Pattern 2: Amount inconsistency
  if (workerHistory.averageTaskAmount > 0) {
    const amountRatio = task.amount / workerHistory.averageTaskAmount;
    if (amountRatio > 3) {
      signals.push(`Task amount ${amountRatio.toFixed(1)}x higher than average ($${task.amount} vs $${workerHistory.averageTaskAmount})`);
      riskScore += 25;
    } else if (amountRatio > 2) {
      signals.push(`Task amount significantly higher than average`);
      riskScore += 10;
    }
  }
  
  // Pattern 3: Off-hours activity (2am-5am local time)
  const hour = new Date(task.completedAt).getHours();
  if (hour >= 2 && hour <= 5) {
    signals.push('Task completed during off-hours (2am-5am)');
    riskScore += 10;
  }
  
  // Pattern 4: Duplicate GPS coordinates (location farming)
  if (task.completionProof?.gpsCoordinates && workerHistory.recentTasks) {
    const { lat, lon } = task.completionProof.gpsCoordinates;
    const sameLocationCount = workerHistory.recentTasks.filter(t => 
      t.gps && 
      Math.abs(t.gps.lat - lat) < 0.001 && 
      Math.abs(t.gps.lon - lon) < 0.001
    ).length;
    
    if (sameLocationCount > 10) {
      signals.push(`High number of tasks from same location: ${sameLocationCount} tasks`);
      riskScore += 25;
    } else if (sameLocationCount > 5) {
      signals.push(`Multiple tasks from same location: ${sameLocationCount} tasks`);
      riskScore += 10;
    }
  }
  
  // Pattern 5: New account with high-value task
  if (workerHistory.accountAgeDays < 7 && task.amount > 100) {
    signals.push('New account (<7 days) with high-value task');
    riskScore += 20;
  }
  
  // Pattern 6: Low reputation with disputes
  if (workerHistory.reputationScore < 500 && workerHistory.disputes > 2) {
    signals.push(`Low reputation (${workerHistory.reputationScore}) with ${workerHistory.disputes} disputes`);
    riskScore += 20;
  }
  
  // Pattern 7: Completion rate anomaly
  if (workerHistory.completionRate < 0.8) {
    signals.push(`Low completion rate: ${(workerHistory.completionRate * 100).toFixed(1)}%`);
    riskScore += 15;
  }
  
  // Pattern 8: Duration anomaly
  if (task.completionProof?.duration && workerHistory.recentTasks) {
    const avgDuration = workerHistory.recentTasks.reduce((sum, t) => sum + t.duration, 0) / 
      workerHistory.recentTasks.length;
    
    if (avgDuration > 0 && task.completionProof.duration < avgDuration * 0.3) {
      signals.push(`Task completed much faster than usual (${task.completionProof.duration}min vs ${avgDuration.toFixed(0)}min avg)`);
      riskScore += 15;
    }
  }
  
  // Determine risk level and suspicion
  let riskLevel: 'low' | 'medium' | 'high';
  let suspicious = false;
  
  if (riskScore >= 50) {
    riskLevel = 'high';
    suspicious = true;
  } else if (riskScore >= 25) {
    riskLevel = 'medium';
    suspicious = signals.length >= 2; // Need multiple signals for medium risk
  } else {
    riskLevel = 'low';
    suspicious = false;
  }
  
  return {
    suspicious,
    signals,
    riskLevel,
    duration: Date.now() - startTime
  };
}

// ============================================================================
// AI Verification Engine
// ============================================================================

async function verifyWithCloudflareAI(
  task: TaskCompletion,
  workerHistory: WorkerHistory,
  env: any
): Promise<{ score: number; patterns: string[]; error?: string }> {
  try {
    const prompt = `Analyze this gig task completion for potential fraud or issues:

Task Details:
- Task ID: ${task.externalTaskId}
- Amount: $${task.amount} USDC
- Duration: ${task.completionProof?.duration || 'N/A'} minutes
- Photos provided: ${task.completionProof?.photos?.length || 0}
- GPS provided: ${task.completionProof?.gpsCoordinates ? 'Yes' : 'No'}
- Rating: ${task.rating || 'N/A'}/5

Worker Profile:
- Reputation: ${workerHistory.reputationScore}/1000
- Completion rate: ${(workerHistory.completionRate * 100).toFixed(1)}%
- Total tasks: ${workerHistory.totalTasksCompleted}
- Tasks last 24h: ${workerHistory.tasksLast24h}
- Average task amount: $${workerHistory.averageTaskAmount.toFixed(2)}
- Disputes: ${workerHistory.disputes}

Analyze for:
1. Legitimacy of task completion
2. Risk of fraud or manipulation
3. Consistency with worker's history
4. Any suspicious patterns

Respond with JSON:
{
  "score": 0-100,
  "patterns": ["pattern1", "pattern2"],
  "verdict": "approve" | "flag" | "reject"
}`;

    const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { 
          role: 'system', 
          content: 'You are a fraud detection AI for gig economy task verification. Analyze tasks and respond with JSON only.' 
        },
        { role: 'user', content: prompt }
      ]
    });

    // Parse AI response
    const result = JSON.parse(response.result || '{}');
    
    return {
      score: result.score || 70,
      patterns: result.patterns || ['AI analysis completed']
    };
    
  } catch (error) {
    console.warn('Cloudflare AI verification failed:', error);
    return {
      score: 0,
      patterns: [],
      error: error instanceof Error ? error.message : 'AI verification failed'
    };
  }
}

function verifyWithHeuristic(
  task: TaskCompletion,
  workerHistory: WorkerHistory
): { score: number; patterns: string[] } {
  let score = 50; // Base score
  const patterns: string[] = [];
  
  // ========== Positive Factors ==========
  
  // 1. Worker reputation boost (max +30)
  if (workerHistory.reputationScore >= 800) {
    score += 30;
    patterns.push('Excellent reputation (800+)');
  } else if (workerHistory.reputationScore >= 600) {
    score += 20;
    patterns.push('Good reputation (600+)');
  } else if (workerHistory.reputationScore >= 400) {
    score += 10;
    patterns.push('Fair reputation (400+)');
  }
  
  // 2. Historical performance (max +20)
  if (workerHistory.completionRate >= 0.95) {
    score += 15;
    patterns.push('Excellent completion rate (>95%)');
  } else if (workerHistory.completionRate >= 0.85) {
    score += 10;
    patterns.push('Good completion rate (>85%)');
  } else if (workerHistory.completionRate >= 0.75) {
    score += 5;
    patterns.push('Acceptable completion rate (>75%)');
  }
  
  if (workerHistory.disputes === 0 && workerHistory.totalTasksCompleted > 10) {
    score += 5;
    patterns.push('No disputes with significant history');
  }
  
  // 3. Task attributes (max +15)
  if (task.amount < 50) {
    score += 5;
    patterns.push('Low-value task (lower risk)');
  }
  
  if (task.completionProof?.photos && task.completionProof.photos.length >= 2) {
    score += 10;
    patterns.push('Photo evidence provided');
  } else if (task.completionProof?.photos && task.completionProof.photos.length >= 1) {
    score += 5;
    patterns.push('Some photo evidence');
  }
  
  if (task.completionProof?.gpsCoordinates) {
    score += 5;
    patterns.push('GPS verification available');
  }
  
  // 4. Duration reasonable (max +5)
  if (task.completionProof?.duration) {
    const duration = task.completionProof.duration;
    if (duration >= 10 && duration <= 240) { // 10min to 4h
      score += 5;
      patterns.push('Reasonable task duration');
    }
  }
  
  // 5. Rating provided (max +5)
  if (task.rating && task.rating >= 4) {
    score += 5;
    patterns.push('High rating provided');
  }
  
  // ========== Negative Factors ==========
  
  // 1. Disputes history (max -30)
  if (workerHistory.disputes > 5) {
    score -= 30;
    patterns.push('High dispute count (>5)');
  } else if (workerHistory.disputes > 2) {
    score -= 20;
    patterns.push('Multiple disputes (>2)');
  } else if (workerHistory.disputes > 0) {
    score -= 10;
    patterns.push('Some disputes in history');
  }
  
  // 2. Anomaly detection (max -25)
  if (task.completionProof?.duration && task.completionProof.duration < 1) {
    score -= 20;
    patterns.push('Task completed suspiciously fast');
  }
  
  if (workerHistory.averageTaskAmount > 0 && 
      task.amount > workerHistory.averageTaskAmount * 2) {
    score -= 15;
    patterns.push('Task amount significantly higher than average');
  }
  
  // 3. New account risk (max -15)
  if (workerHistory.accountAgeDays < 3) {
    score -= 15;
    patterns.push('Very new account (<3 days)');
  } else if (workerHistory.accountAgeDays < 7) {
    score -= 10;
    patterns.push('New account (<7 days)');
  }
  
  // 4. Low experience with high value (max -20)
  if (workerHistory.totalTasksCompleted < 5 && task.amount > 100) {
    score -= 20;
    patterns.push('Inexperienced worker with high-value task');
  }
  
  // Clamp score to 0-100 range
  score = Math.max(0, Math.min(100, score));
  
  return { score, patterns };
}

// ============================================================================
// Main Verification Function
// ============================================================================

export async function verifyTaskCompletion(
  task: TaskCompletion,
  workerHistory: WorkerHistory,
  env?: any
): Promise<VerificationResult> {
  const startTime = Date.now();
  
  // Step 1: Fast-path validation checks
  const fastPath = runFastPathChecks(task);
  
  // Hard fail on critical validation issues
  if (!fastPath.passed && fastPath.issues.some(issue => 
    issue.includes('future') || 
    issue.includes('Invalid timestamp') ||
    issue.includes('Missing worker ID')
  )) {
    return {
      verdict: 'reject',
      confidence: 100,
      reason: `Failed validation: ${fastPath.issues.join('; ')}`,
      checks: {
        fastPath,
        ai: { score: 0, patterns: [], method: 'heuristic', duration: 0 },
        fraud: { suspicious: false, signals: [], riskLevel: 'low', duration: 0 }
      },
      latencyMs: Date.now() - startTime,
      autoApprove: false
    };
  }
  
  // Step 2: Fraud detection
  const fraud = await detectFraud(task, workerHistory);
  
  // Step 3: AI verification (with fallback to heuristic)
  let aiResult: { score: number; patterns: string[] };
  let aiMethod: 'cloudflare_ai' | 'heuristic' = 'heuristic';
  const aiStartTime = Date.now();
  
  if (env?.AI) {
    const cloudflareResult = await verifyWithCloudflareAI(task, workerHistory, env);
    if (!cloudflareResult.error) {
      aiResult = cloudflareResult;
      aiMethod = 'cloudflare_ai';
    } else {
      aiResult = verifyWithHeuristic(task, workerHistory);
    }
  } else {
    aiResult = verifyWithHeuristic(task, workerHistory);
  }
  
  const aiDuration = Date.now() - aiStartTime;
  
  // Step 4: Calculate final verdict
  let finalScore = aiResult.score;
  
  // Adjust for fraud signals
  if (fraud.riskLevel === 'high') {
    finalScore -= 30;
  } else if (fraud.riskLevel === 'medium') {
    finalScore -= 15;
  }
  
  // Adjust for fast-path issues (non-critical)
  if (!fastPath.passed) {
    finalScore -= 10;
  }
  
  // Clamp final score
  finalScore = Math.max(0, Math.min(100, finalScore));
  
  // Step 5: Determine verdict based on final score and rules
  let verdict: 'approve' | 'flag' | 'reject';
  let autoApprove = false;
  
  if (fraud.riskLevel === 'high' || finalScore < 50) {
    verdict = 'reject';
  } else if (
    finalScore >= 90 && 
    fraud.riskLevel === 'low' && 
    fastPath.passed &&
    task.amount <= VERIFICATION_RULES.amountLimits.autoApproveMax
  ) {
    verdict = 'approve';
    autoApprove = true;
  } else if (finalScore >= 70) {
    // Flag for manual review if not auto-approved but reasonable score
    verdict = 'flag';
  } else {
    verdict = 'reject';
  }
  
  // Override: Always flag high-value tasks
  if (task.amount > VERIFICATION_RULES.amountLimits.flagThreshold) {
    if (verdict === 'approve') {
      verdict = 'flag';
      autoApprove = false;
      aiResult.patterns.push('High-value task requires manual review');
    }
  }
  
  // Build detailed reason
  const reasonParts = [
    `Final score: ${finalScore.toFixed(0)}/100`,
    `Fraud risk: ${fraud.riskLevel}`,
    fraud.signals.length > 0 ? `Signals: ${fraud.signals.length}` : null,
    aiResult.patterns.slice(0, 3).join(', ')
  ].filter(Boolean);
  
  const totalLatency = Date.now() - startTime;
  
  return {
    verdict,
    confidence: finalScore,
    reason: reasonParts.join(' | '),
    checks: {
      fastPath,
      ai: { ...aiResult, method: aiMethod, duration: aiDuration },
      fraud
    },
    latencyMs: totalLatency,
    autoApprove
  };
}

// ============================================================================
// Helper Function: Get Verification Statistics
// ============================================================================

export function getVerificationStats(results: VerificationResult[]): {
  totalVerifications: number;
  autoApprovalRate: number;
  averageLatency: number;
  verdictBreakdown: Record<string, number>;
  fraudDetectionRate: number;
} {
  const total = results.length;
  const autoApproved = results.filter(r => r.autoApprove).length;
  const avgLatency = results.reduce((sum, r) => sum + r.latencyMs, 0) / total;
  
  const verdictBreakdown = {
    approve: results.filter(r => r.verdict === 'approve').length,
    flag: results.filter(r => r.verdict === 'flag').length,
    reject: results.filter(r => r.verdict === 'reject').length
  };
  
  const fraudDetected = results.filter(r => 
    r.checks.fraud.suspicious || r.checks.fraud.riskLevel !== 'low'
  ).length;
  
  return {
    totalVerifications: total,
    autoApprovalRate: (autoApproved / total) * 100,
    averageLatency: avgLatency,
    verdictBreakdown,
    fraudDetectionRate: (fraudDetected / total) * 100
  };
}
