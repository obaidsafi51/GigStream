/**
 * Webhook Routes
 * Handles incoming webhooks from Circle and platforms
 * 
 * Features:
 * - HMAC-SHA256 signature verification
 * - <200ms response time (async processing)
 * - Retry logic (3 attempts with exponential backoff)
 * - Dead letter queue for failed webhooks
 * - Comprehensive audit logging
 * 
 * Based on:
 * - requirements.md FR-2.4.2
 * - design.md Section 4.3
 * - tasks.md Task 5.4
 */

import { Hono } from 'hono';
import { createHmac, timingSafeEqual } from 'crypto';
import { getDatabase, queries } from '../services/database.js';
import { verifyTaskCompletion, TaskCompletionSchema } from '../services/verification.js';
import { executeInstantPayment } from '../services/payment.js';
import * as schema from '../../database/schema.js';
import { eq } from 'drizzle-orm';

const webhooksRoutes = new Hono();

// ===================================
// RETRY CONFIGURATION
// ===================================

const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000, // 1 second
  maxDelayMs: 10000, // 10 seconds
  exponentialBase: 2, // Exponential backoff multiplier
};

/**
 * Calculate delay for exponential backoff
 * Attempt 1: 1s, Attempt 2: 2s, Attempt 3: 4s
 */
function calculateRetryDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.exponentialBase, attempt - 1);
  return Math.min(delay, RETRY_CONFIG.maxDelayMs);
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Verify HMAC signature for webhook security
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  const expected = `sha256=${expectedSignature}`;
  
  // Timing-safe comparison to prevent timing attacks
  if (expected.length !== signature.length) {
    return false;
  }
  
  return timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}

/**
 * Hash API key for lookup
 */
function hashApiKey(apiKey: string): string {
  return createHmac('sha256', 'gigstream-api-key-salt')
    .update(apiKey)
    .digest('hex');
}

/**
 * POST /api/v1/webhooks/circle
 * Handle Circle transaction notifications
 */
webhooksRoutes.post('/circle', async (c) => {
  // TODO: Implement Circle webhook handler (Task 4.1)
  // 1. Verify webhook signature
  // 2. Parse transaction data
  // 3. Update database records
  // 4. Emit events for listeners
  
  return c.json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Circle webhook will be implemented in Task 4.1',
    },
  }, 501);
});

/**
 * POST /api/v1/webhooks/task-completed
 * Handle task completion from platforms
 * 
 * Requirements:
 * - Response time < 200ms
 * - HMAC-SHA256 signature verification
 * - Async processing for verification
 */
webhooksRoutes.post('/task-completed', async (c) => {
  const startTime = Date.now();
  
  try {
    // 1. Get authentication headers
    const apiKey = c.req.header('X-API-Key');
    const signature = c.req.header('X-Signature');
    
    if (!apiKey || !signature) {
      return c.json({ 
        error: {
          code: 'MISSING_AUTH_HEADERS',
          message: 'Missing X-API-Key or X-Signature header'
        }
      }, 401);
    }
    
    // 2. Verify platform exists and get webhook secret
    const db = getDatabase(c.env?.DATABASE_URL);
    const platform = await db.query.platforms.findFirst({
      where: eq(schema.platforms.apiKeyHash, hashApiKey(apiKey)),
      columns: {
        id: true,
        name: true,
        webhookSecret: true,
        status: true,
      },
    });
    
    if (!platform) {
      return c.json({ 
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key'
        }
      }, 401);
    }
    
    if (platform.status !== 'active') {
      return c.json({ 
        error: {
          code: 'PLATFORM_INACTIVE',
          message: 'Platform is not active'
        }
      }, 403);
    }
    
    if (!platform.webhookSecret) {
      return c.json({ 
        error: {
          code: 'WEBHOOK_NOT_CONFIGURED',
          message: 'Webhook secret not configured'
        }
      }, 500);
    }
    
    // 3. Verify HMAC signature
    const rawBody = await c.req.text();
    const isValid = verifyWebhookSignature(rawBody, signature, platform.webhookSecret);
    
    if (!isValid) {
      // Log failed verification attempt
      await db.insert(schema.auditLogs).values({
        actorId: platform.id,
        actorType: 'platform',
        action: 'webhook_verification_failed',
        resourceType: 'webhook',
        success: false,
        metadata: {
          signature_provided: signature.substring(0, 20) + '...',
        },
      });
      
      return c.json({ 
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'HMAC signature verification failed'
        }
      }, 403);
    }
    
    // 4. Parse and validate payload
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch (error) {
      return c.json({ 
        error: {
          code: 'INVALID_JSON',
          message: 'Request body is not valid JSON'
        }
      }, 400);
    }
    
    const validationResult = TaskCompletionSchema.safeParse(body);
    
    if (!validationResult.success) {
      return c.json({ 
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'Invalid request payload',
          details: validationResult.error.errors
        }
      }, 400);
    }
    
    const task = validationResult.data;
    
    // 5. Quick acknowledgment (< 200ms target)
    const responseTime = Date.now() - startTime;
    
    if (responseTime < 200) {
      // Process asynchronously to meet response time requirement
      c.executionCtx.waitUntil(
        processTaskCompletion(task, platform, db, c.env)
      );
      
      return c.json({
        status: 'accepted',
        message: 'Task queued for verification',
        estimatedProcessingTime: '2-5 seconds',
        taskId: task.externalTaskId,
      }, 202);
    }
    
    // If we're already slow, process synchronously
    const result = await processTaskCompletion(task, platform, db, c.env);
    return c.json(result, result.success ? 200 : 400);
    
  } catch (error) {
    console.error('Webhook handler error:', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to process webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, 500);
  }
});

/**
 * Async task processing function with retry logic
 * Handles verification and payment execution
 * 
 * Implements:
 * - 3 retry attempts with exponential backoff
 * - Dead letter queue for permanent failures
 * - Comprehensive error tracking
 */
async function processTaskCompletion(
  task: any,
  platform: any,
  db: ReturnType<typeof getDatabase>,
  env: any
): Promise<any> {
  return await processTaskWithRetry(task, platform, db, env, 1);
}

/**
 * Recursive retry function with exponential backoff
 */
async function processTaskWithRetry(
  task: any,
  platform: any,
  db: ReturnType<typeof getDatabase>,
  env: any,
  attempt: number
): Promise<any> {
  const processingStartTime = Date.now();
  
  try {
    // 1. Get worker history for verification
    const workerHistory = await queries.getWorkerHistory(db, task.workerId);
    
    // 2. Verify task with AI/fraud detection
    const verification = await verifyTaskCompletion(task, workerHistory, env);
    
    // 3. Log verification result
    await db.insert(schema.auditLogs).values({
      actorId: task.workerId,
      actorType: 'worker',
      action: 'task_verification',
      resourceType: 'task',
      resourceId: null, // externalTaskId is string, stored in metadata
      success: verification.verdict !== 'reject',
      metadata: {
        externalTaskId: task.externalTaskId,
        verdict: verification.verdict,
        confidence: verification.confidence,
        latency_ms: verification.latencyMs,
        auto_approved: verification.autoApprove,
        fraud_risk: verification.checks.fraud.riskLevel,
        retry_attempt: attempt,
      },
    });
    
    // 4. Handle verdict
    if (verification.verdict === 'reject') {
      return {
        success: false,
        error: {
          code: 'TASK_REJECTED',
          message: 'Task verification failed',
          reason: verification.reason,
          confidence: verification.confidence
        }
      };
    }
    
    if (verification.verdict === 'flag') {
      // Create task in database for manual review
      await db.insert(schema.tasks).values({
        platformId: platform.id,
        workerId: task.workerId,
        externalTaskId: task.externalTaskId,
        type: 'fixed',
        title: task.metadata?.title || 'Task completion',
        description: task.metadata?.description,
        paymentAmountUsdc: task.amount.toString(),
        status: 'pending', // Pending manual review
        verificationData: task.completionProof,
        verificationStatus: 'flagged',
        metadata: {
          verification: verification,
          flagged_for_review: true,
        },
      });
      
      return {
        success: true,
        status: 'flagged_for_review',
        message: 'Task flagged for manual review',
        reason: verification.reason,
        estimatedReviewTime: '1-2 hours'
      };
    }
    
    // 5. Execute payment (if approved)
    try {
      const payment = await executeInstantPayment(
        task.externalTaskId,
        task.workerId,
        task.amount,
        db
      );
      
      const totalProcessingTime = Date.now() - processingStartTime;
      
      return {
        success: true,
        taskId: payment.task.id,
        transactionHash: payment.transaction.txHash,
        amount: task.amount,
        verification: {
          verdict: verification.verdict,
          confidence: verification.confidence,
          latency: verification.latencyMs,
        },
        processingTime: totalProcessingTime,
        retryAttempt: attempt,
      };
    } catch (paymentError) {
      console.error(`Payment execution failed (attempt ${attempt}):`, paymentError);
      
      // Log payment failure
      await db.insert(schema.auditLogs).values({
        actorId: task.workerId,
        actorType: 'worker',
        action: 'payment_failed',
        resourceType: 'task',
        resourceId: null,
        success: false,
        metadata: {
          externalTaskId: task.externalTaskId,
          error: paymentError instanceof Error ? paymentError.message : 'Unknown error',
          retry_attempt: attempt,
        },
      });
      
      // Retry logic for transient errors
      if (attempt < RETRY_CONFIG.maxAttempts) {
        const isRetryable = isRetryableError(paymentError);
        
        if (isRetryable) {
          const delay = calculateRetryDelay(attempt);
          console.log(`Retrying in ${delay}ms (attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts})`);
          
          await sleep(delay);
          return await processTaskWithRetry(task, platform, db, env, attempt + 1);
        }
      }
      
      // Max retries exceeded or non-retryable error - send to dead letter queue
      await addToDeadLetterQueue(task, platform, paymentError, attempt, db);
      
      return {
        success: false,
        error: {
          code: 'PAYMENT_FAILED',
          message: 'Task verified but payment execution failed after retries',
          details: paymentError instanceof Error ? paymentError.message : 'Unknown error',
          retriesAttempted: attempt,
        }
      };
    }
    
  } catch (error) {
    console.error(`Task processing error (attempt ${attempt}):`, error);
    
    // Log processing error
    try {
      await db.insert(schema.auditLogs).values({
        actorId: task.workerId,
        actorType: 'worker',
        action: 'task_processing_failed',
        resourceType: 'task',
        resourceId: null,
        success: false,
        metadata: {
          externalTaskId: task.externalTaskId,
          error: error instanceof Error ? error.message : 'Unknown error',
          retry_attempt: attempt,
        },
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    // Retry logic for transient errors
    if (attempt < RETRY_CONFIG.maxAttempts) {
      const isRetryable = isRetryableError(error);
      
      if (isRetryable) {
        const delay = calculateRetryDelay(attempt);
        console.log(`Retrying in ${delay}ms (attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts})`);
        
        await sleep(delay);
        return await processTaskWithRetry(task, platform, db, env, attempt + 1);
      }
    }
    
    // Max retries exceeded or non-retryable error - send to dead letter queue
    await addToDeadLetterQueue(task, platform, error, attempt, db);
    
    return {
      success: false,
      error: {
        code: 'PROCESSING_FAILED',
        message: 'Failed to process task completion after retries',
        details: error instanceof Error ? error.message : 'Unknown error',
        retriesAttempted: attempt,
      }
    };
  }
}

/**
 * Determine if an error is retryable (transient)
 * Non-retryable errors: validation errors, business logic errors
 * Retryable errors: network errors, timeouts, database connection issues
 */
function isRetryableError(error: any): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Non-retryable errors (permanent failures)
    if (
      message.includes('invalid') ||
      message.includes('not found') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('validation')
    ) {
      return false;
    }
    
    // Retryable errors (transient failures)
    if (
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('network') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('unavailable') ||
      message.includes('503') ||
      message.includes('504')
    ) {
      return true;
    }
  }
  
  // Default: retry on unknown errors (conservative approach)
  return true;
}

/**
 * Add failed webhook to dead letter queue
 * Stores permanently failed webhooks for manual investigation
 */
async function addToDeadLetterQueue(
  task: any,
  platform: any,
  error: any,
  attempts: number,
  db: ReturnType<typeof getDatabase>
): Promise<void> {
  try {
    // Store in audit logs with special action type
    await db.insert(schema.auditLogs).values({
      actorId: platform.id,
      actorType: 'platform',
      action: 'webhook_dead_letter_queue',
      resourceType: 'task',
      resourceId: null,
      success: false,
      metadata: {
        externalTaskId: task.externalTaskId,
        task_data: task,
        platform_id: platform.id,
        platform_name: platform.name,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_stack: error instanceof Error ? error.stack : undefined,
        retry_attempts: attempts,
        failed_at: new Date().toISOString(),
        requires_manual_intervention: true,
      },
    });
    
    console.error(`Task ${task.externalTaskId} added to dead letter queue after ${attempts} attempts`);
  } catch (dlqError) {
    console.error('Failed to add to dead letter queue:', dlqError);
    // Log to console as last resort
    console.error('DEAD LETTER QUEUE ITEM:', {
      taskId: task.externalTaskId,
      platformId: platform.id,
      attempts,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * GET /api/v1/webhooks/dead-letter-queue
 * Retrieve failed webhooks from dead letter queue
 * For monitoring and manual intervention
 * 
 * Requires platform authentication
 */
webhooksRoutes.get('/dead-letter-queue', async (c) => {
  try {
    // Verify authentication
    const apiKey = c.req.header('X-API-Key');
    
    if (!apiKey) {
      return c.json({ 
        error: {
          code: 'MISSING_AUTH_HEADER',
          message: 'Missing X-API-Key header'
        }
      }, 401);
    }
    
    const db = getDatabase(c.env?.DATABASE_URL);
    
    // Verify platform
    const platform = await db.query.platforms.findFirst({
      where: eq(schema.platforms.apiKeyHash, hashApiKey(apiKey)),
      columns: {
        id: true,
        name: true,
      },
    });
    
    if (!platform) {
      return c.json({ 
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key'
        }
      }, 401);
    }
    
    // Query parameters for filtering
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    
    // Get dead letter queue items for this platform
    const dlqItems = await db.query.auditLogs.findMany({
      where: eq(schema.auditLogs.action, 'webhook_dead_letter_queue'),
      limit: limit,
      offset: offset,
      orderBy: (logs, { desc }) => [desc(logs.createdAt)],
    });
    
    // Filter for this platform's items
    const platformItems = dlqItems.filter(item => 
      (item.metadata as any)?.platform_id === platform.id
    );
    
    return c.json({
      success: true,
      count: platformItems.length,
      items: platformItems.map(item => ({
        id: item.id,
        createdAt: item.createdAt,
        taskId: item.resourceId,
        externalTaskId: (item.metadata as any)?.externalTaskId,
        error: (item.metadata as any)?.error_message,
        attempts: (item.metadata as any)?.retry_attempts,
        taskData: (item.metadata as any)?.task_data,
      })),
      pagination: {
        limit,
        offset,
        total: platformItems.length,
      },
    });
  } catch (error) {
    console.error('Failed to retrieve dead letter queue:', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve dead letter queue',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, 500);
  }
});

/**
 * POST /api/v1/webhooks/dead-letter-queue/:id/retry
 * Manually retry a failed webhook from dead letter queue
 * 
 * Requires platform authentication
 */
webhooksRoutes.post('/dead-letter-queue/:id/retry', async (c) => {
  try {
    const dlqId = c.req.param('id');
    const apiKey = c.req.header('X-API-Key');
    
    if (!apiKey) {
      return c.json({ 
        error: {
          code: 'MISSING_AUTH_HEADER',
          message: 'Missing X-API-Key header'
        }
      }, 401);
    }
    
    const db = getDatabase(c.env?.DATABASE_URL);
    
    // Verify platform
    const platform = await db.query.platforms.findFirst({
      where: eq(schema.platforms.apiKeyHash, hashApiKey(apiKey)),
      columns: {
        id: true,
        name: true,
        webhookSecret: true,
      },
    });
    
    if (!platform) {
      return c.json({ 
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key'
        }
      }, 401);
    }
    
    // Get DLQ item
    const dlqItem = await db.query.auditLogs.findFirst({
      where: (logs, { eq }) => eq(logs.id, dlqId),
    });
    
    if (!dlqItem || dlqItem.action !== 'webhook_dead_letter_queue') {
      return c.json({
        error: {
          code: 'DLQ_ITEM_NOT_FOUND',
          message: 'Dead letter queue item not found'
        }
      }, 404);
    }
    
    // Verify ownership
    if ((dlqItem.metadata as any)?.platform_id !== platform.id) {
      return c.json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to retry this item'
        }
      }, 403);
    }
    
    // Extract task data and retry
    const taskData = (dlqItem.metadata as any)?.task_data;
    
    if (!taskData) {
      return c.json({
        error: {
          code: 'INVALID_DLQ_DATA',
          message: 'Task data not found in dead letter queue item'
        }
      }, 400);
    }
    
    // Process the task (this will attempt retries again)
    const result = await processTaskCompletion(taskData, platform, db, c.env);
    
    // Log the manual retry attempt
    await db.insert(schema.auditLogs).values({
      actorId: platform.id,
      actorType: 'platform',
      action: 'dlq_manual_retry',
      resourceType: 'task',
      resourceId: null,
      success: result.success,
      metadata: {
        externalTaskId: taskData.externalTaskId,
        dlq_item_id: dlqId,
        retry_result: result,
      },
    });
    
    return c.json({
      success: result.success,
      message: result.success 
        ? 'Task successfully reprocessed' 
        : 'Task reprocessing failed',
      result: result,
    });
  } catch (error) {
    console.error('Failed to retry DLQ item:', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retry dead letter queue item',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, 500);
  }
});

export default webhooksRoutes;
