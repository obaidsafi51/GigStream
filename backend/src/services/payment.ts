/**
 * Payment Execution Service
 * Handles instant USDC payment execution for completed tasks
 * 
 * Critical Requirements:
 * - End-to-end payment time < 3 seconds
 * - Idempotency to prevent double-payments
 * - Transaction retry logic (3 attempts)
 * - Comprehensive audit logging
 * - Integration with Circle API and smart contracts
 * 
 * Flow:
 * 1. Verify task completion and eligibility
 * 2. Calculate payment amount (after fees if applicable)
 * 3. Execute USDC transfer via Circle API or smart contract
 * 4. Wait for blockchain confirmation
 * 5. Update database records
 * 6. Emit payment event for listeners
 */

import { getDatabase } from './database.js';
import { getDb } from '../db/client.js';
import { executeTransfer, getTransactionStatus } from './circle.js';
import * as crypto from 'crypto';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';

/**
 * Transaction result type
 */
export interface TransactionResult {
  id: string;
  taskId: string;
  workerId: string;
  amount: number;
  fee: number;
  netAmount: number;
  txHash: string | null;
  circleTxId: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  timestamp: Date;
}

/**
 * Payment execution options
 */
export interface PaymentExecutionOptions {
  taskId: string;
  workerId: string;
  amount: number;
  platformId: string;
  idempotencyKey?: string;
  maxRetries?: number;
  metadata?: Record<string, any>;
}

/**
 * Idempotency key storage (in-memory for MVP, should be Redis in production)
 */
const processedPayments = new Map<string, TransactionResult>();

/**
 * Generate idempotency key for payment
 */
function generateIdempotencyKey(taskId: string, workerId: string): string {
  return crypto
    .createHash('sha256')
    .update(`${taskId}-${workerId}-payment`)
    .digest('hex');
}

/**
 * Check if payment has already been processed
 */
function isPaymentProcessed(idempotencyKey: string): TransactionResult | null {
  return processedPayments.get(idempotencyKey) || null;
}

/**
 * Store processed payment
 */
function storeProcessedPayment(idempotencyKey: string, result: TransactionResult): void {
  processedPayments.set(idempotencyKey, result);
  
  // Clean up old entries after 1 hour (in production, use Redis with TTL)
  setTimeout(() => {
    processedPayments.delete(idempotencyKey);
  }, 60 * 60 * 1000);
}

/**
 * Calculate payment fee (0% for MVP, configurable for production)
 */
function calculatePaymentFee(amount: number): number {
  const feePercentage = parseFloat(process.env.PAYMENT_FEE_PERCENTAGE || '0');
  return (amount * feePercentage) / 100;
}

/**
 * Verify task eligibility for payment
 */
async function verifyTaskEligibility(
  db: ReturnType<typeof getDb>,
  taskId: string,
  workerId: string
): Promise<{ valid: boolean; error?: string; task?: any }> {
  // 1. Check task exists with relations
  const task = await db.query.tasks.findFirst({
    where: eq(schema.tasks.id, taskId),
    with: {
      worker: true,
      platform: true,
    },
  });

  if (!task) {
    return { valid: false, error: 'Task not found' };
  }

  // 2. Verify worker ownership
  if (task.workerId !== workerId) {
    return { valid: false, error: 'Task does not belong to this worker' };
  }

  // 3. Check task is completed
  if (task.status !== 'completed') {
    return { valid: false, error: 'Task is not completed' };
  }

  // 4. Check not already paid - query transactions
  const existingPayments = await db
    .select()
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.taskId, taskId),
        eq(schema.transactions.type, 'payout'),
        eq(schema.transactions.status, 'confirmed')
      )
    )
    .limit(1);

  if (existingPayments.length > 0) {
    return { valid: false, error: 'Task already paid' };
  }

  // 5. Validate amount
  const amount = parseFloat(task.paymentAmountUsdc);
  if (amount <= 0 || amount > 10000) {
    return { valid: false, error: 'Invalid payment amount' };
  }

  return { valid: true, task };
}

/**
 * Execute USDC transfer with retry logic
 */
async function executeTransferWithRetry(
  fromWalletId: string,
  toAddress: string,
  amount: number,
  maxRetries: number = 3
): Promise<{ success: boolean; txId?: string; txHash?: string; error?: string }> {
  let lastError: string = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Payment] Transfer attempt ${attempt}/${maxRetries}`);

      // Execute transfer via Circle API
      // Note: For Arc blockchain, transfers are done via smart contracts
      // Circle API is used for wallet balance queries
      const result = await executeTransfer({
        fromWalletId,
        toAddress,
        amount,
      });

      // Check transaction status
      if (result.transactionId) {
        const status = await getTransactionStatus(result.transactionId);
        
        if (status.status === 'confirmed') {
          return {
            success: true,
            txId: result.transactionId,
            txHash: status.transactionHash,
          };
        }
      }

      // If not complete but no error, wait and retry
      if (attempt < maxRetries) {
        await sleep(2000 * attempt); // Exponential backoff
        continue;
      }

      lastError = 'Transfer did not complete in time';
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Payment] Transfer attempt ${attempt} failed:`, lastError);

      if (attempt < maxRetries) {
        await sleep(2000 * attempt); // Exponential backoff
        continue;
      }
    }
  }

  return { success: false, error: lastError };
}

/**
 * Sleep utility for retry logic
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Update database with payment result
 */
async function updateDatabaseRecords(
  db: ReturnType<typeof getDb>,
  taskId: string,
  workerId: string,
  platformId: string,
  amount: number,
  fee: number,
  txHash: string | null,
  circleTxId: string | null,
  status: 'confirmed' | 'failed',
  error?: string
): Promise<any> {
  return db.transaction(async (tx) => {
    // 1. Create transaction record
    const [transaction] = await tx
      .insert(schema.transactions)
      .values({
        workerId,
        platformId,
        taskId,
        txHash: txHash || undefined,
        type: 'payout',
        amountUsdc: amount.toString(),
        feeUsdc: fee.toString(),
        status: status,
        errorMessage: error || undefined,
        confirmedAt: status === 'confirmed' ? new Date() : undefined,
        metadata: {
          platform_id: platformId,
          net_amount: amount - fee,
          circle_tx_id: circleTxId,
        },
      })
      .returning();

    // 2. Update task status if not already set
    await tx
      .update(schema.tasks)
      .set({
        status: status === 'confirmed' ? 'completed' : 'in_progress',
        completedAt: status === 'confirmed' ? new Date() : undefined,
      })
      .where(eq(schema.tasks.id, taskId));

    // 3. Create audit log
    await tx.insert(schema.auditLogs).values({
      actorId: 'system',
      actorType: 'system',
      action: 'execute_payment',
      resourceType: 'transaction',
      resourceId: transaction.id,
      success: status === 'confirmed',
      errorMessage: error || undefined,
      metadata: {
        task_id: taskId,
        worker_id: workerId,
        amount: amount.toString(),
        status,
        tx_hash: txHash,
      },
    });

    // 4. If successful, create reputation event
    if (status === 'confirmed') {
      // Get current worker reputation
      const [worker] = await tx
        .select({ reputationScore: schema.workers.reputationScore })
        .from(schema.workers)
        .where(eq(schema.workers.id, workerId));

      if (worker) {
        const previousScore = worker.reputationScore || 0;
        const delta = 10; // Base reputation increase
        const newScore = previousScore + delta;

        await tx.insert(schema.reputationEvents).values({
          workerId,
          taskId,
          eventType: 'task_completed',
          pointsDelta: delta,
          previousScore,
          newScore,
          description: 'Payment completed successfully',
          metadata: {
            amount: amount.toString(),
            tx_hash: txHash,
          },
        });
      }
    }

    return transaction;
  });
}

/**
 * Execute instant payment for a completed task
 * 
 * @param options Payment execution options
 * @returns Transaction result
 * 
 * @example
 * ```typescript
 * const result = await executeInstantPayment({
 *   taskId: 'task-123',
 *   workerId: 'worker-456',
 *   amount: 50.00,
 *   platformId: 'platform-789',
 * });
 * ```
 */
export async function executeInstantPayment(
  options: PaymentExecutionOptions
): Promise<TransactionResult> {
  const startTime = Date.now();
  const { taskId, workerId, amount, platformId, maxRetries = 3 } = options;

  console.log(`[Payment] Starting instant payment for task ${taskId}`);

  // Generate or use provided idempotency key
  const idempotencyKey = options.idempotencyKey || generateIdempotencyKey(taskId, workerId);

  // Check if already processed (idempotency)
  const existingResult = isPaymentProcessed(idempotencyKey);
  if (existingResult) {
    console.log(`[Payment] Payment already processed (idempotency): ${idempotencyKey}`);
    return existingResult;
  }

  const db = getDatabase();

  try {
    // Step 1: Verify task completion eligibility
    console.log('[Payment] Step 1: Verifying task eligibility');
    const verification = await verifyTaskEligibility(db, taskId, workerId);

    if (!verification.valid) {
      const errorResult: TransactionResult = {
        id: crypto.randomUUID(),
        taskId,
        workerId,
        amount,
        fee: 0,
        netAmount: 0,
        txHash: null,
        circleTxId: null,
        status: 'failed',
        error: verification.error,
        timestamp: new Date(),
      };

      storeProcessedPayment(idempotencyKey, errorResult);
      return errorResult;
    }

    const task = verification.task;

    // Step 2: Calculate payment amount and fees
    console.log('[Payment] Step 2: Calculating payment amount');
    const fee = calculatePaymentFee(amount);
    const netAmount = amount - fee;

    console.log(`[Payment] Amount: ${amount} USDC, Fee: ${fee} USDC, Net: ${netAmount} USDC`);

    // Step 3: Execute USDC transfer
    console.log('[Payment] Step 3: Executing USDC transfer');
    
    // Get worker wallet info
    const workerWalletId = task.worker?.walletId;
    const workerWalletAddress = task.worker?.walletAddress;
    const platformWalletId = task.platform?.walletAddress; // Will use as fallback

    if (!workerWalletId) {
      throw new Error('Worker wallet ID not found');
    }

    if (!workerWalletAddress) {
      throw new Error('Worker wallet address not found');
    }

    // Execute transfer with retry logic
    // Note: For MVP, we use a mock wallet ID for platform
    // In production, platform would have a proper wallet_id field
    const transferResult = await executeTransferWithRetry(
      platformWalletId || 'platform-wallet-mock',
      workerWalletAddress,
      netAmount,
      maxRetries
    );

    // Step 4: Wait for blockchain confirmation (already done in executeTransferWithRetry)
    console.log('[Payment] Step 4: Transfer completed');

    // Step 5: Update database records
    console.log('[Payment] Step 5: Updating database records');
    const transaction = await updateDatabaseRecords(
      db,
      taskId,
      workerId,
      platformId,
      amount,
      fee,
      transferResult.txHash || null,
      transferResult.txId || null,
      transferResult.success ? 'confirmed' : 'failed',
      transferResult.error
    );

    // Step 6: Create result and store for idempotency
    const result: TransactionResult = {
      id: transaction.id,
      taskId,
      workerId,
      amount,
      fee,
      netAmount,
      txHash: transferResult.txHash || null,
      circleTxId: transferResult.txId || null,
      status: transferResult.success ? 'completed' : 'failed',
      error: transferResult.error,
      timestamp: new Date(),
    };

    storeProcessedPayment(idempotencyKey, result);

    const duration = Date.now() - startTime;
    console.log(`[Payment] Payment completed in ${duration}ms (target: <3000ms)`);

    if (duration > 3000) {
      console.warn(`[Payment] WARNING: Payment took longer than 3s target`);
    }

    // Emit payment event (for future real-time notifications)
    emitPaymentEvent(result);

    return result;

  } catch (error) {
    console.error('[Payment] Error executing payment:', error);

    const errorResult: TransactionResult = {
      id: crypto.randomUUID(),
      taskId,
      workerId,
      amount,
      fee: 0,
      netAmount: 0,
      txHash: null,
      circleTxId: null,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    };

    storeProcessedPayment(idempotencyKey, errorResult);
    return errorResult;
  }
}

/**
 * Get payment transaction by ID
 */
export async function getPaymentTransaction(transactionId: string): Promise<any> {
  const db = getDatabase();
  
  // Get transaction with related data
  const transaction = await db.query.transactions.findFirst({
    where: eq(schema.transactions.id, transactionId),
    with: {
      worker: {
        columns: {
          id: true,
          name: true,
          email: true,
          walletAddress: true,
        },
      },
    },
  });

  if (!transaction) return null;

  // Get task info manually
  if (transaction.taskId) {
    const task = await db.query.tasks.findFirst({
      where: eq(schema.tasks.id, transaction.taskId),
      columns: {
        id: true,
        title: true,
        type: true,
        status: true,
      },
    });
    
    return {
      ...transaction,
      task,
    };
  }

  return transaction;
}

/**
 * Get payment transactions for a worker
 */
export async function getWorkerPayments(
  workerId: string,
  options?: {
    limit?: number;
    offset?: number;
    status?: string;
  }
): Promise<any[]> {
  const db = getDatabase();
  
  // Build query with optional status filter
  const transactions = await db.query.transactions.findMany({
    where: and(
      eq(schema.transactions.workerId, workerId),
      eq(schema.transactions.type, 'payout'),
      options?.status ? eq(schema.transactions.status, options.status as any) : undefined
    ),
    orderBy: [desc(schema.transactions.createdAt)],
    limit: options?.limit || 50,
    offset: options?.offset || 0,
  });

  // Get task info for each transaction
  const enrichedTransactions = await Promise.all(
    transactions.map(async (tx) => {
      if (!tx.taskId) return { ...tx, task: null };
      
      const task = await db.query.tasks.findFirst({
        where: eq(schema.tasks.id, tx.taskId),
        columns: {
          id: true,
          title: true,
          type: true,
        },
      });
      
      return { ...tx, task };
    })
  );

  return enrichedTransactions;
}

/**
 * Get payment statistics for a worker
 */
export async function getWorkerPaymentStats(workerId: string): Promise<{
  totalPayments: number;
  totalAmount: number;
  totalFees: number;
  successRate: number;
  averagePaymentTime: number;
}> {
  const db = getDatabase();
  
  // Import aggregation functions
  const { count, sum } = await import('drizzle-orm');
  
  // Get aggregate stats
  const [stats] = await db
    .select({
      totalCount: count(),
      totalAmount: sum(schema.transactions.amountUsdc),
      totalFees: sum(schema.transactions.feeUsdc),
    })
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.workerId, workerId),
        eq(schema.transactions.type, 'payout')
      )
    );

  // Get successful payment count
  const [successStats] = await db
    .select({ count: count() })
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.workerId, workerId),
        eq(schema.transactions.type, 'payout'),
        eq(schema.transactions.status, 'confirmed')
      )
    );

  const totalPayments = stats?.totalCount || 0;
  const totalAmount = parseFloat(stats?.totalAmount || '0');
  const totalFees = parseFloat(stats?.totalFees || '0');
  const successfulPayments = successStats?.count || 0;
  const successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;

  return {
    totalPayments,
    totalAmount,
    totalFees,
    successRate,
    averagePaymentTime: 0, // Would need additional tracking for this metric
  };
}

/**
 * Retry failed payment
 */
export async function retryFailedPayment(transactionId: string): Promise<TransactionResult> {
  const db = getDatabase();
  
  // Get transaction with related data
  const transaction = await db.query.transactions.findFirst({
    where: eq(schema.transactions.id, transactionId),
    with: {
      task: true,
      worker: true,
    },
  });

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  if (transaction.status === 'confirmed') {
    throw new Error('Transaction already completed');
  }

  if (!transaction.task) {
    throw new Error('Task not found for transaction');
  }

  if (!transaction.taskId) {
    throw new Error('Transaction has no task ID');
  }

  // Execute payment again with new idempotency key
  return executeInstantPayment({
    taskId: transaction.taskId,
    workerId: transaction.workerId!,
    amount: parseFloat(transaction.amountUsdc),
    platformId: (transaction.task as any).platformId,
    idempotencyKey: `retry-${transactionId}-${Date.now()}`,
  });
}

/**
 * Emit payment event for listeners
 * In production, this would integrate with a real-time notification service
 */
function emitPaymentEvent(result: TransactionResult): void {
  // TODO: Integrate with WebSocket server or notification service
  console.log('[Payment] Event emitted:', {
    type: 'payment.completed',
    taskId: result.taskId,
    workerId: result.workerId,
    amount: result.amount,
    status: result.status,
  });
}

/**
 * Bulk payment execution for multiple tasks
 * Useful for scheduled payment releases
 */
export async function executeBulkPayments(
  payments: PaymentExecutionOptions[]
): Promise<TransactionResult[]> {
  console.log(`[Payment] Executing bulk payments: ${payments.length} tasks`);

  const results: TransactionResult[] = [];

  // Process payments sequentially to avoid overwhelming the system
  for (const payment of payments) {
    try {
      const result = await executeInstantPayment(payment);
      results.push(result);
    } catch (error) {
      console.error(`[Payment] Bulk payment failed for task ${payment.taskId}:`, error);
      results.push({
        id: crypto.randomUUID(),
        taskId: payment.taskId,
        workerId: payment.workerId,
        amount: payment.amount,
        fee: 0,
        netAmount: 0,
        txHash: null,
        circleTxId: null,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
    }
  }

  const successCount = results.filter(r => r.status === 'completed').length;
  console.log(`[Payment] Bulk payment completed: ${successCount}/${payments.length} successful`);

  return results;
}
