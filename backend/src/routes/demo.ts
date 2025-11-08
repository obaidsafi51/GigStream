/**
 * Demo API Routes
 * Provides endpoints for demo simulator to showcase payment flow
 * 
 * Endpoints:
 * - POST /api/v1/demo/complete-task - Simulate task completion and payment
 * - POST /api/v1/demo/reset - Reset demo data for clean demos
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { executeInstantPayment } from '../services/payment';
import { getDatabase } from '../services/database.js';
import * as schema from '../../database/schema.js';
import { eq, or, inArray, sql } from 'drizzle-orm';
import { count } from 'drizzle-orm';

const demoRoutes = new Hono();

/**
 * Request validation schema for complete-task endpoint
 */
const completeTaskSchema = z.object({
  workerId: z.string().min(1, 'Worker ID is required'),
  taskType: z.enum(['fixed', 'streaming']).default('fixed'),
  amount: z.number().min(1).max(1000),
  description: z.string().optional().default('Demo task'),
  platformId: z.string().optional(),
});

/**
 * POST /api/v1/demo/complete-task
 * Create a demo task and execute payment flow end-to-end
 * 
 * Flow:
 * 1. Create demo task in database
 * 2. Mark task as completed
 * 3. Execute instant payment
 * 4. Update reputation
 * 5. Return transaction details
 * 
 * @body {object} taskData - Task completion data
 * @returns {object} Payment transaction with blockchain details
 */
demoRoutes.post(
  '/complete-task',
  zValidator('json', completeTaskSchema),
  async (c) => {
    try {
      // Get DATABASE_URL from Cloudflare Workers environment or process.env
      const databaseUrl = c.env?.DATABASE_URL || process.env.DATABASE_URL;
      const db = getDatabase(databaseUrl);
      const { workerId, platformId, amount, taskType, description } = await c.req.json();

      // Step 1: Get or create demo platform
      let platform = await db.query.platforms.findFirst({
        where: eq(schema.platforms.name, 'Demo Platform'),
      });

      if (!platform) {
        const [newPlatform] = await db
          .insert(schema.platforms)
          .values({
            name: 'Demo Platform',
            email: 'demo@gigstream.app',
            apiKeyHash: 'demo_hash',
            status: 'active',
          })
          .returning();
        platform = newPlatform;
      }

      const usePlatformId = platformId || platform.id;

      // Step 2: Verify worker exists
      const worker = await db.query.workers.findFirst({
        where: eq(schema.workers.id, workerId),
      });

      if (!worker) {
        return c.json(
          {
            success: false,
            error: {
              code: 'WORKER_NOT_FOUND',
              message: 'Worker not found. Please use a valid worker ID.',
            },
          },
          404
        );
      }

      // Step 3: Create demo task
      const [task] = await db
        .insert(schema.tasks)
        .values({
          platformId: usePlatformId,
          workerId: workerId,
          title: `Demo ${taskType === 'streaming' ? 'Streaming' : 'Fixed'} Task`,
          description: description || 'Demo task for payment flow demonstration',
          paymentAmountUsdc: amount.toString(),
          status: 'completed',
          type: taskType,
          completedAt: new Date(),
          metadata: {
            demo: true,
            taskType,
            completedBy: 'simulator',
          },
        })
        .returning();

      // Step 4: Execute instant payment
      const paymentResult = await executeInstantPayment({
        taskId: task.id,
        workerId: workerId,
        amount: amount,
        platformId: usePlatformId,
      });

      // Step 5: Update reputation (simplified for demo)
      // Get current reputation score first
      const currentScore = worker.reputationScore || 500;
      const delta = 5;
      const newScore = Math.min(1000, Math.max(0, currentScore + delta));

      await db
        .insert(schema.reputationEvents)
        .values({
          workerId: workerId,
          eventType: 'task_completed',
          pointsDelta: delta,
          previousScore: currentScore,
          newScore: newScore,
          description: 'Demo task completed',
          metadata: {
            task_id: task.id,
            amount: amount,
            demo: true,
          },
        });

      // Update worker's reputation score
      await db
        .update(schema.workers)
        .set({ reputationScore: newScore })
        .where(eq(schema.workers.id, workerId));

      // Step 6: Return success response with all details
      return c.json(
        {
          success: true,
          data: {
            task: {
              id: task.id,
              title: task.title,
              description: task.description,
              amount: parseFloat(task.paymentAmountUsdc),
              type: task.type,
              status: task.status,
              completedAt: task.completedAt,
            },
            payment: {
              id: paymentResult.id,
              amount: paymentResult.amount,
              fee: paymentResult.fee,
              netAmount: paymentResult.netAmount,
              status: paymentResult.status,
              txHash: paymentResult.txHash,
              circleTxId: paymentResult.circleTxId,
              timestamp: paymentResult.timestamp,
            },
            worker: {
              id: worker.id,
              name: worker.displayName,
              reputationScore: newScore,
              walletAddress: worker.walletAddress,
            },
            blockchain: {
              network: 'Arc Testnet',
              chainId: 5042002,
              explorerUrl: paymentResult.txHash
                ? `https://testnet.arcscan.app/tx/${paymentResult.txHash}`
                : null,
            },
          },
          message: 'Demo task completed and payment processed successfully',
        },
        201
      );
    } catch (error) {
      console.error('Demo complete-task error:', error);

      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('Task already paid')) {
          return c.json(
            {
              success: false,
              error: {
                code: 'TASK_ALREADY_PAID',
                message: 'This task has already been paid',
              },
            },
            409
          );
        }

        if (error.message.includes('Worker wallet not found')) {
          return c.json(
            {
              success: false,
              error: {
                code: 'WALLET_NOT_FOUND',
                message: 'Worker wallet not configured',
              },
            },
            400
          );
        }
      }

      return c.json(
        {
          success: false,
          error: {
            code: 'DEMO_PAYMENT_FAILED',
            message: error instanceof Error ? error.message : 'Failed to process demo payment',
            details: process.env.NODE_ENV === 'development' ? error : undefined,
          },
        },
        500
      );
    }
  }
);

/**
 * POST /api/v1/demo/reset
 * Reset demo data to initial state for clean demonstrations
 * 
 * Actions:
 * 1. Delete demo transactions
 * 2. Delete demo tasks
 * 3. Reset demo worker balances
 * 4. Reset reputation scores to baseline
 * 
 * @returns {object} Reset confirmation
 */
demoRoutes.post('/reset', async (c) => {
  try {
    const databaseUrl = c.env?.DATABASE_URL || process.env.DATABASE_URL;
    const db = getDatabase(databaseUrl);

    // Step 1: Find all demo tasks
    const demoTasks = await db.query.tasks.findMany({
      where: (tasks, { or, like, sql }) =>
        or(
          sql`${tasks.metadata}->>'demo' = 'true'`,
          like(tasks.title, '%Demo%')
        ),
      columns: { id: true },
    });

    const demoTaskIds = demoTasks.map((task) => task.id);

    let deletedTransactionsCount = 0;
    let deletedReputationEventsCount = 0;
    let deletedTasksCount = 0;

    if (demoTaskIds.length > 0) {
      // Step 2: Delete demo transactions
      const deletedTransactions = await db
        .delete(schema.transactions)
        .where(inArray(schema.transactions.taskId, demoTaskIds))
        .returning();
      deletedTransactionsCount = deletedTransactions.length;

      // Step 3: Delete demo reputation events
      const deletedReputationEvents = await db
        .delete(schema.reputationEvents)
        .where(
          or(
            sql`${schema.reputationEvents.metadata}->>'demo' = 'true'`,
            inArray(
              sql`(${schema.reputationEvents.metadata}->>'task_id')::uuid`,
              demoTaskIds
            )
          )
        )
        .returning();
      deletedReputationEventsCount = deletedReputationEvents.length;

      // Step 4: Delete demo tasks
      const deletedTasks = await db
        .delete(schema.tasks)
        .where(inArray(schema.tasks.id, demoTaskIds))
        .returning();
      deletedTasksCount = deletedTasks.length;
    }

    // Step 5: Reset demo workers to baseline reputation
    const demoWorkers = await db.query.workers.findMany({
      where: (workers, { or, like }) =>
        or(like(workers.displayName, '%Demo%'), like(workers.email, '%demo%')),
      columns: { id: true, displayName: true, email: true },
    });

    // Reset reputation scores for demo workers
    for (const worker of demoWorkers) {
      // Calculate baseline score from non-demo events
      const nonDemoEvents = await db.query.reputationEvents.findMany({
        where: (events, { and, eq, sql }) =>
          and(
            eq(events.workerId, worker.id),
            sql`${events.metadata}->>'demo' IS DISTINCT FROM 'true'`
          ),
        columns: { pointsDelta: true },
      });

      const baselineScore = nonDemoEvents.reduce(
        (sum, event) => sum + event.pointsDelta,
        500
      );

      await db
        .update(schema.workers)
        .set({ reputationScore: Math.min(1000, Math.max(0, baselineScore)) })
        .where(eq(schema.workers.id, worker.id));
    }

    // Step 6: Log the reset action
    await db.insert(schema.auditLogs).values({
      actorType: 'system',
      actorId: null,
      action: 'reset',
      resourceType: 'demo',
      resourceId: null,
      success: true,
      metadata: {
        deletedTransactions: deletedTransactionsCount,
        deletedTasks: deletedTasksCount,
        deletedReputationEvents: deletedReputationEventsCount,
        resetWorkers: demoWorkers.length,
        timestamp: new Date().toISOString(),
      },
    });

    return c.json({
      success: true,
      data: {
        deletedTransactions: deletedTransactionsCount,
        deletedTasks: deletedTasksCount,
        deletedReputationEvents: deletedReputationEventsCount,
        resetWorkers: demoWorkers.length,
        message: 'Demo data reset successfully',
      },
    });
  } catch (error) {
    console.error('Demo reset error:', error);

    return c.json(
      {
        success: false,
        error: {
          code: 'DEMO_RESET_FAILED',
          message: error instanceof Error ? error.message : 'Failed to reset demo data',
          details: process.env.NODE_ENV === 'development' ? error : undefined,
        },
      },
      500
    );
  }
});

/**
 * GET /api/v1/demo/status
 * Get current demo environment status
 * 
 * @returns {object} Demo environment information
 */
demoRoutes.get('/status', async (c) => {
  try {
    const databaseUrl = c.env?.DATABASE_URL || process.env.DATABASE_URL;
    const db = getDatabase(databaseUrl);

    // Count demo data
    const demoTasksResult = await db
      .select({ count: count() })
      .from(schema.tasks)
      .where(
        or(
          sql`${schema.tasks.metadata}->>'demo' = 'true'`,
          sql`${schema.tasks.title} LIKE '%Demo%'`
        )
      );

    const demoTasksCount = demoTasksResult[0]?.count ?? 0;

    const demoTransactionsResult = await db
      .select({ count: count() })
      .from(schema.transactions)
      .where(sql`${schema.transactions.metadata}->>'demo' = 'true'`);

    const demoTransactionsCount = demoTransactionsResult[0]?.count ?? 0;

    const demoWorkers = await db.query.workers.findMany({
      where: (workers, { or, like }) =>
        or(like(workers.displayName, '%Demo%'), like(workers.email, '%demo%')),
      columns: {
        id: true,
        displayName: true,
        reputationScore: true,
        walletAddress: true,
      },
    });

    return c.json({
      success: true,
      data: {
        environment: 'demo',
        status: 'active',
        stats: {
          demoTasks: demoTasksCount,
          demoTransactions: demoTransactionsCount,
          demoWorkers: demoWorkers.length,
        },
        workers: demoWorkers.map((worker) => ({
          id: worker.id,
          name: worker.displayName,
          reputation_score: worker.reputationScore,
          wallet_address: worker.walletAddress,
        })),
        blockchain: {
          network: 'Arc Testnet',
          chainId: 5042002,
          explorerUrl: 'https://testnet.arcscan.app',
        },
      },
    });
  } catch (error) {
    console.error('Demo status error:', error);

    return c.json(
      {
        success: false,
        error: {
          code: 'DEMO_STATUS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get demo status',
        },
      },
      500
    );
  }
});

/**
 * GET /api/v1/demo/workers
 * Get list of demo workers with their stats
 */
demoRoutes.get('/workers', async (c) => {
  try {
    const databaseUrl = c.env?.DATABASE_URL || process.env.DATABASE_URL;
    const db = getDatabase(databaseUrl);
    
    const workers = await db.select().from(schema.workers).limit(20);
    
    return c.json({
      success: true,
      data: {
        workers: workers.map((w) => ({
          id: w.id,
          name: w.displayName,
          email: w.email,
          walletAddress: w.walletAddress,
          reputationScore: w.reputationScore,
          totalTasksCompleted: w.totalTasksCompleted,
          totalEarningsUsdc: w.totalEarningsUsdc,
          status: w.status,
          createdAt: w.createdAt,
        })),
        total: workers.length,
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'DEMO_WORKERS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get workers',
        },
      },
      500
    );
  }
});

/**
 * GET /api/v1/demo/platforms
 * Get list of demo platforms
 */
demoRoutes.get('/platforms', async (c) => {
  try {
    const databaseUrl = c.env?.DATABASE_URL || process.env.DATABASE_URL;
    const db = getDatabase(databaseUrl);
    
    const platforms = await db.select().from(schema.platforms).limit(20);
    
    return c.json({
      success: true,
      data: {
        platforms: platforms.map((p) => ({
          id: p.id,
          name: p.name,
          email: p.email,
          totalWorkers: p.totalWorkers,
          totalPaymentsUsdc: p.totalPaymentsUsdc,
          status: p.status,
          createdAt: p.createdAt,
        })),
        total: platforms.length,
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'DEMO_PLATFORMS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get platforms',
        },
      },
      500
    );
  }
});

/**
 * GET /api/v1/demo/tasks
 * Get list of demo tasks
 */
demoRoutes.get('/tasks', async (c) => {
  try {
    const databaseUrl = c.env?.DATABASE_URL || process.env.DATABASE_URL;
    const db = getDatabase(databaseUrl);
    
    const tasks = await db.select().from(schema.tasks).limit(20);
    
    return c.json({
      success: true,
      data: {
        tasks: tasks.map((t) => ({
          id: t.id,
          workerId: t.workerId,
          platformId: t.platformId,
          title: t.title,
          type: t.type,
          paymentAmountUsdc: t.paymentAmountUsdc,
          paidAmountUsdc: t.paidAmountUsdc,
          status: t.status,
          createdAt: t.createdAt,
          completedAt: t.completedAt,
        })),
        total: tasks.length,
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'DEMO_TASKS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get tasks',
        },
      },
      500
    );
  }
});

export default demoRoutes;
