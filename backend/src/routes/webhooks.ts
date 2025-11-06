/**
 * Webhook Routes
 * Handles incoming webhooks from Circle and platforms
 */

import { Hono } from 'hono';
import { createHmac, timingSafeEqual } from 'crypto';
import { getDatabase, queries } from '../services/database.js';
import { verifyTaskCompletion, TaskCompletionSchema } from '../services/verification.js';
import { executeInstantPayment } from '../services/payment.js';
import * as schema from '../../database/schema.js';
import { eq } from 'drizzle-orm';

const webhooksRoutes = new Hono();

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
        webhookEnabled: true,
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
    
    if (!platform.webhookEnabled) {
      return c.json({ 
        error: {
          code: 'WEBHOOKS_DISABLED',
          message: 'Webhooks are disabled for this platform'
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
 * Async task processing function
 * Handles verification and payment execution
 */
async function processTaskCompletion(
  task: any,
  platform: any,
  db: ReturnType<typeof getDatabase>,
  env: any
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
      resourceId: task.externalTaskId,
      success: verification.verdict !== 'reject',
      metadata: {
        verdict: verification.verdict,
        confidence: verification.confidence,
        latency_ms: verification.latencyMs,
        auto_approved: verification.autoApprove,
        fraud_risk: verification.checks.fraud.riskLevel,
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
        verificationNotes: verification.reason,
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
      };
    } catch (paymentError) {
      console.error('Payment execution failed:', paymentError);
      
      // Log payment failure
      await db.insert(schema.auditLogs).values({
        actorId: task.workerId,
        actorType: 'worker',
        action: 'payment_failed',
        resourceType: 'task',
        resourceId: task.externalTaskId,
        success: false,
        metadata: {
          error: paymentError instanceof Error ? paymentError.message : 'Unknown error',
        },
      });
      
      return {
        success: false,
        error: {
          code: 'PAYMENT_FAILED',
          message: 'Task verified but payment execution failed',
          details: paymentError instanceof Error ? paymentError.message : 'Unknown error'
        }
      };
    }
    
  } catch (error) {
    console.error('Task processing error:', error);
    
    // Log processing error
    try {
      await db.insert(schema.auditLogs).values({
        actorId: task.workerId,
        actorType: 'worker',
        action: 'task_processing_failed',
        resourceType: 'task',
        resourceId: task.externalTaskId,
        success: false,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return {
      success: false,
      error: {
        code: 'PROCESSING_FAILED',
        message: 'Failed to process task completion',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

export default webhooksRoutes;
