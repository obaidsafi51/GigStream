/**
 * Worker Routes
 * Handles worker-specific operations
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { authenticateJWT } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const workersRoutes = new Hono();

// Validation schemas
const advanceRequestSchema = z.object({
  amount: z.number().positive().max(500),
  reason: z.string().optional(),
});

/**
 * GET /api/v1/workers/:workerId
 * Get worker profile
 */
workersRoutes.get('/:workerId', authenticateJWT, async (c) => {
  const workerId = c.req.param('workerId');
  
  // TODO: Implement profile retrieval
  return c.json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Worker profile endpoint to be implemented',
    },
  }, 501);
});

/**
 * GET /api/v1/workers/:workerId/balance
 * Get real-time USDC balance from Circle
 */
workersRoutes.get('/:workerId/balance', authenticateJWT, async (c) => {
  const workerId = c.req.param('workerId');
  
  // TODO: Implement balance query via Circle API (Task 4.1)
  return c.json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Balance query will be implemented in Task 4.1',
    },
  }, 501);
});

/**
 * GET /api/v1/workers/:workerId/earnings
 * Get paginated transaction history
 */
workersRoutes.get('/:workerId/earnings', authenticateJWT, async (c) => {
  const workerId = c.req.param('workerId');
  const page = Number(c.req.query('page') || '1');
  const limit = Number(c.req.query('limit') || '20');
  
  // TODO: Implement earnings history
  return c.json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Earnings history to be implemented',
    },
  }, 501);
});

/**
 * GET /api/v1/workers/:workerId/reputation
 * Get reputation score and breakdown
 */
workersRoutes.get('/:workerId/reputation', authenticateJWT, async (c) => {
  const workerId = c.req.param('workerId');
  
  try {
    // Import services dynamically
    const { calculateRiskScore, formatRiskScoreBreakdown } = await import('../services/risk.js');
    const { getDatabase } = await import('../services/database.js');
    const schema = await import('../../database/schema.js');
    const { eq, desc } = await import('drizzle-orm');
    
    const db = getDatabase();
    
    // Get worker profile
    const worker = await db.query.workers.findFirst({
      where: eq(schema.workers.id, workerId),
    });
    
    if (!worker) {
      return c.json({
        success: false,
        error: {
          code: 'WORKER_NOT_FOUND',
          message: 'Worker not found',
        },
      }, 404);
    }
    
    // Calculate risk score (includes reputation factors)
    const riskScore = await calculateRiskScore(workerId);
    const breakdown = formatRiskScoreBreakdown(riskScore);
    
    // Get reputation events (last 20)
    const events = await db.query.reputationEvents.findMany({
      where: eq(schema.reputationEvents.workerId, workerId),
      orderBy: [desc(schema.reputationEvents.createdAt)],
      limit: 20,
    });
    
    // Get all tasks for completion stats
    const allTasks = await db.query.tasks.findMany({
      where: eq(schema.tasks.workerId, workerId),
    });
    
    // Calculate stats
    const completedTasks = allTasks.filter(t => t.status === 'completed').length;
    const totalTasks = allTasks.length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    // Calculate average rating
    const ratedTasks = allTasks.filter(t => t.workerRating !== null);
    const avgRating = ratedTasks.length > 0
      ? ratedTasks.reduce((sum, t) => sum + (t.workerRating || 0), 0) / ratedTasks.length
      : 0;
    
    // Determine rank/tier based on score
    const getRank = (score: number): string => {
      if (score >= 900) return 'Diamond';
      if (score >= 800) return 'Platinum';
      if (score >= 700) return 'Gold';
      if (score >= 600) return 'Silver';
      if (score >= 400) return 'Bronze';
      return 'Starter';
    };
    
    // Determine badges earned
    const badges = [
      {
        name: 'First Task',
        icon: '🎯',
        earned: completedTasks >= 1,
        description: 'Complete your first task',
      },
      {
        name: 'Consistent',
        icon: '📊',
        earned: completedTasks >= 10,
        description: 'Complete 10 tasks',
      },
      {
        name: 'Top Rated',
        icon: '⭐',
        earned: avgRating >= 4.5 && ratedTasks.length >= 5,
        description: 'Maintain 4.5+ star rating',
      },
      {
        name: 'Reliable',
        icon: '✅',
        earned: completionRate >= 95,
        description: '95%+ completion rate',
      },
      {
        name: 'Veteran',
        icon: '🏆',
        earned: completedTasks >= 50,
        description: 'Complete 50 tasks',
      },
      {
        name: 'Excellent',
        icon: '💎',
        earned: riskScore.score >= 900,
        description: 'Achieve 900+ reputation score',
      },
    ];
    
    // Get average worker score for comparison
    const avgWorkerScore = 650; // TODO: Calculate from actual workers
    
    return c.json({
      success: true,
      data: {
        score: worker.reputationScore || 0,
        maxScore: 1000,
        rank: getRank(worker.reputationScore || 0),
        grade: breakdown.grade,
        tasksCompleted: completedTasks,
        totalTasks,
        completionRate: Math.round(completionRate),
        avgRating: Math.round(avgRating * 10) / 10,
        avgWorkerScore,
        percentile: worker.reputationScore && worker.reputationScore > avgWorkerScore
          ? Math.round(((worker.reputationScore - avgWorkerScore) / (1000 - avgWorkerScore)) * 50 + 50)
          : 50,
        factors: breakdown.factors,
        badges,
        events: events.map(e => ({
          id: e.id,
          type: e.eventType,
          pointsDelta: e.pointsDelta,
          previousScore: e.previousScore,
          newScore: e.newScore,
          description: e.description,
          createdAt: e.createdAt,
          metadata: e.metadata,
        })),
        riskScore: {
          score: riskScore.score,
          confidence: riskScore.confidence,
          algorithmUsed: riskScore.algorithmUsed,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching reputation:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch reputation data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    }, 500);
  }
});

/**
 * GET /api/v1/workers/:workerId/advance/eligibility
 * Check worker eligibility for advance and calculate max amount
 * 
 * Eligibility criteria:
 * - Risk score >= 600
 * - Predicted earnings >= $50
 * - No active loans
 * - Account age >= 7 days
 * - Completion rate >= 80%
 */
workersRoutes.get('/:workerId/advance/eligibility', authenticateJWT, async (c) => {
  const workerId = c.req.param('workerId');
  
  try {
    const startTime = Date.now();
    
    // Import services dynamically (ESM compatibility)
    const { calculateRiskScore } = await import('../services/risk.js');
    const { predictEarnings } = await import('../services/prediction.js');
    const { getDatabase } = await import('../services/database.js');
    const schema = await import('../../database/schema.js');
    const { eq, and } = await import('drizzle-orm');
    
    const db = getDatabase();
    
    // Get worker profile
    const worker = await db.query.workers.findFirst({
      where: eq(schema.workers.id, workerId),
    });
    
    if (!worker) {
      return c.json({
        success: false,
        error: {
          code: 'WORKER_NOT_FOUND',
          message: 'Worker not found',
        },
      }, 404);
    }
    
    // Run risk scoring and earnings prediction in parallel
    const [riskScore, earningsPrediction] = await Promise.all([
      calculateRiskScore(workerId),
      predictEarnings(workerId, 7),
    ]);
    
    // Check account age (>= 7 days)
    const accountAgeDays = worker.createdAt
      ? Math.floor((Date.now() - worker.createdAt.getTime()) / (24 * 60 * 60 * 1000))
      : 0;
    const accountAgeCheck = accountAgeDays >= 7;
    
    // Calculate completion rate (from worker aggregates)
    const completionRate = worker.totalTasksCompleted && worker.totalTasksCompleted > 0
      ? (worker.totalTasksCompleted / (worker.totalTasksCompleted + (worker.totalTasksCancelled || 0)))
      : 0;
    const completionRateCheck = completionRate >= 0.8;
    
    // Check for active loans
    const activeLoans = await db.query.loans.findMany({
      where: and(
        eq(schema.loans.workerId, workerId),
        eq(schema.loans.status, 'active')
      ),
    });
    const noActiveLoansCheck = activeLoans.length === 0;
    
    // Determine overall eligibility
    const eligible =
      riskScore.score >= 600 &&
      earningsPrediction.next7Days >= 50 &&
      noActiveLoansCheck &&
      accountAgeCheck &&
      completionRateCheck;
    
    // Calculate max advance amount
    // Use the more conservative of: risk-based max or prediction-based safe amount
    const maxAdvance = eligible
      ? Math.min(riskScore.maxAdvanceAmount, earningsPrediction.safeAdvanceAmount)
      : 0;
    
    // Calculate fee (basis points: 200-500)
    const feeRate = riskScore.recommendedFeeRate;
    const feePercentage = feeRate / 100; // Convert basis points to percentage
    
    // Calculate duration
    const duration = Date.now() - startTime;
    
    return c.json({
      success: true,
      data: {
        eligible,
        maxAdvanceAmount: Math.round(maxAdvance * 100) / 100,
        feeRate: feeRate, // Basis points (200-500)
        feePercentage: Math.round(feePercentage * 100) / 100, // Percentage (2-5%)
        
        // Risk assessment
        riskScore: {
          score: riskScore.score,
          eligible: riskScore.eligibleForAdvance,
          confidence: riskScore.confidence,
          algorithmUsed: riskScore.algorithmUsed,
        },
        
        // Earnings prediction
        earningsPrediction: {
          next7Days: earningsPrediction.next7Days,
          confidence: earningsPrediction.confidence,
          safeAdvanceAmount: earningsPrediction.safeAdvanceAmount,
          dailyPredictions: earningsPrediction.dailyPredictions,
        },
        
        // Eligibility checks breakdown
        checks: {
          riskScoreCheck: {
            passed: riskScore.score >= 600,
            value: riskScore.score,
            threshold: 600,
            description: 'Risk score must be >= 600',
          },
          predictedEarningsCheck: {
            passed: earningsPrediction.next7Days >= 50,
            value: Math.round(earningsPrediction.next7Days * 100) / 100,
            threshold: 50,
            description: 'Predicted 7-day earnings must be >= $50',
          },
          noActiveLoansCheck: {
            passed: noActiveLoansCheck,
            value: activeLoans.length,
            threshold: 0,
            description: 'Must have no active loans',
          },
          accountAgeCheck: {
            passed: accountAgeCheck,
            value: accountAgeDays,
            threshold: 7,
            description: 'Account must be >= 7 days old',
          },
          completionRateCheck: {
            passed: completionRateCheck,
            value: Math.round(completionRate * 100) / 100,
            threshold: 0.8,
            description: 'Completion rate must be >= 80%',
          },
        },
        
        // Additional info
        metadata: {
          workerId,
          calculatedAt: new Date().toISOString(),
          durationMs: duration,
        },
      },
    });
  } catch (error) {
    console.error('Error checking advance eligibility:', error);
    return c.json({
      success: false,
      error: {
        code: 'ELIGIBILITY_CHECK_FAILED',
        message: 'Failed to check advance eligibility',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    }, 500);
  }
});

/**
 * POST /api/v1/workers/:workerId/advance
 * Request micro-advance (auto-approved if eligible)
 * 
 * Process:
 * 1. Validate request and check eligibility
 * 2. Create loan record in database
 * 3. Execute USDC transfer via blockchain
 * 4. Update smart contract (MicroLoan)
 * 5. Return loan details
 * 
 * Target: Complete in < 5 seconds
 */
workersRoutes.post(
  '/:workerId/advance',
  authenticateJWT,
  validateRequest(advanceRequestSchema),
  async (c) => {
    const workerId = c.req.param('workerId');
    const body = await c.req.json();
    const requestedAmount = body.amount;
    const reason = body.reason;
    
    const startTime = Date.now();
    
    try {
      console.log(`[Advance] Request received for worker ${workerId}, amount: ${requestedAmount} USDC`);
      
      // Import services dynamically
      const { calculateRiskScore } = await import('../services/risk.js');
      const { predictEarnings } = await import('../services/prediction.js');
      const { getDatabase } = await import('../services/database.js');
      const { requestLoan, approveLoan, getLoan, usdcToWei, weiToUsdc } = await import('../services/blockchain.js');
      const { executeTransfer } = await import('../services/circle.js');
      const schema = await import('../../database/schema.js');
      const { eq, and } = await import('drizzle-orm');
      
      const db = getDatabase();
      
      // Step 1: Get worker profile
      const worker = await db.query.workers.findFirst({
        where: eq(schema.workers.id, workerId),
      });
      
      if (!worker) {
        return c.json({
          success: false,
          error: {
            code: 'WORKER_NOT_FOUND',
            message: 'Worker not found',
          },
        }, 404);
      }
      
      // Step 2: Check for active loans
      const activeLoans = await db.query.loans.findMany({
        where: and(
          eq(schema.loans.workerId, workerId),
          eq(schema.loans.status, 'active')
        ),
      });
      
      if (activeLoans.length > 0) {
        return c.json({
          success: false,
          error: {
            code: 'ACTIVE_LOAN_EXISTS',
            message: 'Worker already has an active loan. Only one loan allowed at a time.',
            data: {
              activeLoanId: activeLoans[0].id,
              activeLoanAmount: parseFloat(activeLoans[0].approvedAmountUsdc || '0'),
            },
          },
        }, 400);
      }
      
      // Step 3: Run eligibility checks in parallel
      console.log('[Advance] Running eligibility checks...');
      const [riskScore, earningsPrediction] = await Promise.all([
        calculateRiskScore(workerId),
        predictEarnings(workerId, 7),
      ]);
      
      // Check account age (>= 7 days)
      const accountAgeDays = worker.createdAt
        ? Math.floor((Date.now() - worker.createdAt.getTime()) / (24 * 60 * 60 * 1000))
        : 0;
      const accountAgeCheck = accountAgeDays >= 7;
      
      // Calculate completion rate
      const completionRate = worker.totalTasksCompleted && worker.totalTasksCompleted > 0
        ? (worker.totalTasksCompleted / (worker.totalTasksCompleted + (worker.totalTasksCancelled || 0)))
        : 0;
      const completionRateCheck = completionRate >= 0.8;
      
      // Step 4: Validate eligibility
      const eligible =
        riskScore.score >= 600 &&
        earningsPrediction.next7Days >= 50 &&
        accountAgeCheck &&
        completionRateCheck;
      
      if (!eligible) {
        console.log('[Advance] Worker not eligible for advance');
        return c.json({
          success: false,
          error: {
            code: 'NOT_ELIGIBLE',
            message: 'Worker is not eligible for advance based on current criteria',
            data: {
              riskScore: riskScore.score,
              riskScoreRequired: 600,
              predictedEarnings: earningsPrediction.next7Days,
              predictedEarningsRequired: 50,
              accountAgeDays,
              accountAgeRequired: 7,
              completionRate: Math.round(completionRate * 100) / 100,
              completionRateRequired: 0.8,
            },
          },
        }, 400);
      }
      
      // Step 5: Validate amount within limits
      const maxAdvance = Math.min(riskScore.maxAdvanceAmount, earningsPrediction.safeAdvanceAmount);
      
      if (requestedAmount <= 0 || requestedAmount > 500) {
        return c.json({
          success: false,
          error: {
            code: 'INVALID_AMOUNT',
            message: 'Amount must be between $1 and $500',
          },
        }, 400);
      }
      
      if (requestedAmount > maxAdvance) {
        return c.json({
          success: false,
          error: {
            code: 'AMOUNT_EXCEEDS_LIMIT',
            message: `Requested amount exceeds maximum eligible advance of $${maxAdvance.toFixed(2)}`,
            data: {
              requestedAmount,
              maxAdvance: Math.round(maxAdvance * 100) / 100,
            },
          },
        }, 400);
      }
      
      // Step 6: Calculate fee
      const feeRate = riskScore.recommendedFeeRate; // Basis points (200-500)
      const feeAmount = (requestedAmount * feeRate) / 10000; // Convert basis points to decimal
      const totalDue = requestedAmount + feeAmount;
      
      console.log(`[Advance] Amount: ${requestedAmount}, Fee: ${feeAmount} (${feeRate}bps), Total: ${totalDue}`);
      
      // Step 7: Create loan record in database
      console.log('[Advance] Creating loan record...');
      const [loan] = await db
        .insert(schema.loans)
        .values({
          workerId,
          requestedAmountUsdc: requestedAmount.toString(),
          approvedAmountUsdc: requestedAmount.toString(),
          feeRateBps: feeRate,
          feeAmountUsdc: feeAmount.toString(),
          totalDueUsdc: totalDue.toString(),
          repaidAmountUsdc: '0',
          repaymentTasksTarget: 5, // 20% over 5 tasks
          repaymentTasksCompleted: 0,
          status: 'approved',
          approvedAt: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          metadata: {
            risk_score: riskScore.score,
            predicted_earnings: earningsPrediction.next7Days,
            reason: reason || 'Advance request',
            auto_approved: true,
          },
        })
        .returning();
      
      console.log(`[Advance] Loan record created: ${loan.id}`);
      
      // Step 8: Execute blockchain transaction
      console.log('[Advance] Executing blockchain transaction...');
      
      let contractLoanId: number | null = null;
      let txHash: string | null = null;
      let blockchainError: string | null = null;
      
      try {
        // Request loan on smart contract
        const amountWei = usdcToWei(requestedAmount);
        
        // Note: Smart contract call requires worker's wallet address
        // For MVP, we'll create the loan request from the worker's perspective
        // In production, this would be done via a proper signer setup
        
        // For now, we'll skip the blockchain call and use database only
        // The smart contract integration would happen here:
        // const loanResult = await requestLoan({
        //   workerAddress: worker.walletAddress,
        //   amount: amountWei,
        // });
        // contractLoanId = loanResult.loanId;
        // txHash = loanResult.transactionHash;
        
        console.log('[Advance] Blockchain transaction skipped for MVP (using database only)');
        
      } catch (blockchainErr) {
        blockchainError = blockchainErr instanceof Error ? blockchainErr.message : 'Blockchain error';
        console.error('[Advance] Blockchain transaction failed:', blockchainError);
        // Continue with database-only approach
      }
      
      // Step 9: Execute USDC transfer via Circle
      console.log('[Advance] Executing USDC transfer...');
      
      let circleTxId: string | null = null;
      let transferTxHash: string | null = null;
      
      try {
        // Transfer USDC from platform wallet to worker wallet
        // Note: For MVP, Circle API transfers are mocked
        // In production, this would execute actual USDC transfer
        
        const transferResult = await executeTransfer({
          fromWalletId: process.env.PLATFORM_WALLET_ID || 'platform-wallet-mock',
          toAddress: worker.walletAddress,
          amount: requestedAmount,
        });
        
        circleTxId = transferResult.transactionId;
        transferTxHash = transferResult.transactionHash;
        
        console.log(`[Advance] Transfer initiated: ${circleTxId}`);
        
      } catch (transferErr) {
        console.error('[Advance] Circle transfer failed:', transferErr);
        // For MVP, we'll continue even if transfer fails
        // In production, this would roll back the loan creation
      }
      
      // Step 10: Update loan record with transaction details
      await db
        .update(schema.loans)
        .set({
          status: 'disbursed',
          disbursedAt: new Date(),
          contractLoanId: contractLoanId || undefined,
          metadata: {
            ...loan.metadata,
            circle_tx_id: circleTxId,
            tx_hash: txHash || transferTxHash,
            blockchain_error: blockchainError,
          },
        })
        .where(eq(schema.loans.id, loan.id));
      
      // Step 11: Create transaction record
      await db.insert(schema.transactions).values({
        workerId,
        type: 'advance',
        amountUsdc: requestedAmount.toString(),
        feeUsdc: feeAmount.toString(),
        txHash: txHash || transferTxHash || undefined,
        status: 'confirmed',
        confirmedAt: new Date(),
        metadata: {
          loan_id: loan.id,
          fee_rate_bps: feeRate,
          total_due: totalDue.toString(),
          circle_tx_id: circleTxId,
        },
      });
      
      // Step 12: Create audit log
      await db.insert(schema.auditLogs).values({
        actorId: workerId,
        actorType: 'worker',
        action: 'request_advance',
        resourceType: 'loan',
        resourceId: loan.id,
        success: true,
        metadata: {
          amount: requestedAmount,
          fee: feeAmount,
          risk_score: riskScore.score,
          predicted_earnings: earningsPrediction.next7Days,
        },
      });
      
      const duration = Date.now() - startTime;
      console.log(`[Advance] Advance request completed in ${duration}ms (target: <5000ms)`);
      
      // Step 13: Return loan details
      return c.json({
        success: true,
        data: {
          loan: {
            id: loan.id,
            workerId: loan.workerId,
            requestedAmount: parseFloat(loan.requestedAmountUsdc),
            approvedAmount: parseFloat(loan.approvedAmountUsdc || '0'),
            feeRate: loan.feeRateBps,
            feeAmount: parseFloat(loan.feeAmountUsdc || '0'),
            totalDue: parseFloat(loan.totalDueUsdc || '0'),
            repaidAmount: parseFloat(loan.repaidAmountUsdc || '0'),
            repaymentProgress: {
              tasksTarget: loan.repaymentTasksTarget,
              tasksCompleted: loan.repaymentTasksCompleted,
              percentComplete: 0,
            },
            status: loan.status,
            approvedAt: loan.approvedAt,
            disbursedAt: loan.disbursedAt,
            dueDate: loan.dueDate,
            contractLoanId: contractLoanId,
            transactionHash: txHash || transferTxHash,
          },
          metadata: {
            processedInMs: duration,
            autoApproved: true,
            riskScore: riskScore.score,
            predictedEarnings: earningsPrediction.next7Days,
          },
        },
      });
      
    } catch (error) {
      console.error('[Advance] Error processing advance request:', error);
      return c.json({
        success: false,
        error: {
          code: 'ADVANCE_REQUEST_FAILED',
          message: 'Failed to process advance request',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      }, 500);
    }
  }
);

/**
 * GET /api/v1/workers/:workerId/loans
 * Get all loans for a worker with repayment details
 */
workersRoutes.get('/:workerId/loans', authenticateJWT, async (c) => {
  const workerId = c.req.param('workerId');
  const status = c.req.query('status'); // Optional filter: active, repaid, defaulted, etc.
  
  try {
    const { getDatabase } = await import('../services/database.js');
    const schema = await import('../../database/schema.js');
    const { eq, and, desc } = await import('drizzle-orm');
    
    const db = getDatabase();
    
    // Build query with optional status filter
    const loans = await db.query.loans.findMany({
      where: and(
        eq(schema.loans.workerId, workerId),
        status ? eq(schema.loans.status, status as any) : undefined
      ),
      orderBy: [desc(schema.loans.createdAt)],
    });
    
    // Format loans with calculated fields
    const formattedLoans = loans.map((loan) => {
      const approvedAmount = parseFloat(loan.approvedAmountUsdc || '0');
      const feeAmount = parseFloat(loan.feeAmountUsdc || '0');
      const totalDue = parseFloat(loan.totalDueUsdc || '0');
      const repaidAmount = parseFloat(loan.repaidAmountUsdc || '0');
      const remaining = totalDue - repaidAmount;
      const percentComplete = totalDue > 0 ? (repaidAmount / totalDue) * 100 : 0;
      
      return {
        id: loan.id,
        requestedAmount: parseFloat(loan.requestedAmountUsdc),
        approvedAmount,
        feeRate: loan.feeRateBps,
        feeAmount,
        totalDue,
        repaidAmount,
        remainingAmount: Math.max(0, remaining),
        repaymentProgress: {
          tasksTarget: loan.repaymentTasksTarget,
          tasksCompleted: loan.repaymentTasksCompleted,
          percentComplete: Math.round(percentComplete * 100) / 100,
          amountPerTask: totalDue / (loan.repaymentTasksTarget || 5),
        },
        status: loan.status,
        createdAt: loan.createdAt,
        approvedAt: loan.approvedAt,
        disbursedAt: loan.disbursedAt,
        dueDate: loan.dueDate,
        repaidAt: loan.repaidAt,
        contractLoanId: loan.contractLoanId,
        metadata: loan.metadata,
      };
    });
    
    return c.json({
      success: true,
      data: {
        loans: formattedLoans,
        count: formattedLoans.length,
      },
    });
  } catch (error) {
    console.error('Error fetching loans:', error);
    return c.json({
      success: false,
      error: {
        code: 'FETCH_LOANS_FAILED',
        message: 'Failed to fetch loans',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    }, 500);
  }
});

/**
 * GET /api/v1/workers/:workerId/loans/active
 * Get active loan for a worker
 */
workersRoutes.get('/:workerId/loans/active', authenticateJWT, async (c) => {
  const workerId = c.req.param('workerId');
  
  try {
    const { getDatabase } = await import('../services/database.js');
    const schema = await import('../../database/schema.js');
    const { eq, and } = await import('drizzle-orm');
    
    const db = getDatabase();
    
    // Find active loan
    const loan = await db.query.loans.findFirst({
      where: and(
        eq(schema.loans.workerId, workerId),
        eq(schema.loans.status, 'active')
      ),
    });
    
    if (!loan) {
      return c.json({
        success: true,
        data: {
          hasActiveLoan: false,
          loan: null,
        },
      });
    }
    
    // Format loan with calculated fields
    const approvedAmount = parseFloat(loan.approvedAmountUsdc || '0');
    const feeAmount = parseFloat(loan.feeAmountUsdc || '0');
    const totalDue = parseFloat(loan.totalDueUsdc || '0');
    const repaidAmount = parseFloat(loan.repaidAmountUsdc || '0');
    const remaining = totalDue - repaidAmount;
    const percentComplete = totalDue > 0 ? (repaidAmount / totalDue) * 100 : 0;
    
    return c.json({
      success: true,
      data: {
        hasActiveLoan: true,
        loan: {
          id: loan.id,
          requestedAmount: parseFloat(loan.requestedAmountUsdc),
          approvedAmount,
          feeRate: loan.feeRateBps,
          feeAmount,
          totalDue,
          repaidAmount,
          remainingAmount: Math.max(0, remaining),
          repaymentProgress: {
            tasksTarget: loan.repaymentTasksTarget,
            tasksCompleted: loan.repaymentTasksCompleted,
            percentComplete: Math.round(percentComplete * 100) / 100,
            amountPerTask: totalDue / (loan.repaymentTasksTarget || 5),
          },
          status: loan.status,
          createdAt: loan.createdAt,
          approvedAt: loan.approvedAt,
          disbursedAt: loan.disbursedAt,
          dueDate: loan.dueDate,
          contractLoanId: loan.contractLoanId,
          metadata: loan.metadata,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching active loan:', error);
    return c.json({
      success: false,
      error: {
        code: 'FETCH_ACTIVE_LOAN_FAILED',
        message: 'Failed to fetch active loan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    }, 500);
  }
});

export default workersRoutes;
