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
import { getPrisma } from '../services/database';

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
      const { workerId, taskType, amount, description, platformId } = c.req.valid('json');
      const prisma = getPrisma();

      // Step 1: Get or create demo platform
      let platform = await prisma.platform.findFirst({
        where: { name: 'Demo Platform' },
      });

      if (!platform) {
        platform = await prisma.platform.create({
          data: {
            name: 'Demo Platform',
            email: 'demo@gigstream.app',
            api_key_hash: 'demo_hash',
            wallet_id: 'demo_wallet_id',
            wallet_address: '0x0000000000000000000000000000000000000001',
            status: 'active',
          },
        });
      }

      const usePlatformId = platformId || platform.id;

      // Step 2: Verify worker exists
      const worker = await prisma.worker.findUnique({
        where: { id: workerId },
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
      const task = await prisma.task.create({
        data: {
          platform_id: usePlatformId,
          worker_id: workerId,
          title: `Demo ${taskType === 'streaming' ? 'Streaming' : 'Fixed'} Task`,
          description: description || 'Demo task for payment flow demonstration',
          amount: amount,
          status: 'completed',
          task_type: taskType,
          completed_at: new Date(),
          metadata: {
            demo: true,
            taskType,
            completedBy: 'simulator',
          },
        },
      });

      // Step 4: Execute instant payment
      const paymentResult = await executeInstantPayment({
        taskId: task.id,
        workerId: workerId,
        amount: amount,
        platformId: usePlatformId,
      });

      // Step 5: Update reputation (simplified for demo)
      await prisma.reputationEvent.create({
        data: {
          worker_id: workerId,
          event_type: 'task_completed',
          score_change: 5,
          metadata: {
            task_id: task.id,
            amount: amount,
            demo: true,
          },
        },
      });

      // Update worker's reputation score
      const reputationEvents = await prisma.reputationEvent.findMany({
        where: { worker_id: workerId },
      });
      const totalScore = reputationEvents.reduce((sum, event) => sum + event.score_change, 0);
      const newScore = Math.min(1000, Math.max(0, 500 + totalScore));

      await prisma.worker.update({
        where: { id: workerId },
        data: { reputation_score: newScore },
      });

      // Step 6: Return success response with all details
      return c.json(
        {
          success: true,
          data: {
            task: {
              id: task.id,
              title: task.title,
              description: task.description,
              amount: task.amount,
              type: task.task_type,
              status: task.status,
              completedAt: task.completed_at,
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
              name: worker.name,
              reputationScore: newScore,
              walletAddress: worker.wallet_address,
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
    const prisma = getPrisma();

    // Step 1: Find all demo tasks
    const demoTasks = await prisma.task.findMany({
      where: {
        OR: [
          { metadata: { path: ['demo'], equals: true } },
          { title: { contains: 'Demo' } },
        ],
      },
    });

    const demoTaskIds = demoTasks.map((task) => task.id);

    // Step 2: Delete demo transactions
    const deletedTransactions = await prisma.transaction.deleteMany({
      where: { task_id: { in: demoTaskIds } },
    });

    // Step 3: Delete demo reputation events
    const deletedReputationEvents = await prisma.reputationEvent.deleteMany({
      where: {
        OR: [
          { metadata: { path: ['demo'], equals: true } },
          { metadata: { path: ['task_id'], in: demoTaskIds } },
        ],
      },
    });

    // Step 4: Delete demo tasks
    const deletedTasks = await prisma.task.deleteMany({
      where: { id: { in: demoTaskIds } },
    });

    // Step 5: Reset demo workers to baseline reputation
    const demoWorkers = await prisma.worker.findMany({
      where: {
        OR: [
          { name: { contains: 'Demo' } },
          { email: { contains: 'demo' } },
        ],
      },
    });

    // Reset reputation scores for demo workers
    for (const worker of demoWorkers) {
      // Calculate baseline score from non-demo events
      const nonDemoEvents = await prisma.reputationEvent.findMany({
        where: {
          worker_id: worker.id,
          NOT: {
            metadata: { path: ['demo'], equals: true },
          },
        },
      });

      const baselineScore = nonDemoEvents.reduce(
        (sum, event) => sum + event.score_change,
        500
      );

      await prisma.worker.update({
        where: { id: worker.id },
        data: { reputation_score: Math.min(1000, Math.max(0, baselineScore)) },
      });
    }

    // Step 6: Log the reset action
    await prisma.auditLog.create({
      data: {
        entity_type: 'demo',
        entity_id: 'demo_reset',
        action: 'reset',
        user_id: 'system',
        metadata: {
          deletedTransactions: deletedTransactions.count,
          deletedTasks: deletedTasks.count,
          deletedReputationEvents: deletedReputationEvents.count,
          resetWorkers: demoWorkers.length,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return c.json({
      success: true,
      data: {
        deletedTransactions: deletedTransactions.count,
        deletedTasks: deletedTasks.count,
        deletedReputationEvents: deletedReputationEvents.count,
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
    const prisma = getPrisma();

    // Count demo data
    const demoTasks = await prisma.task.count({
      where: {
        OR: [
          { metadata: { path: ['demo'], equals: true } },
          { title: { contains: 'Demo' } },
        ],
      },
    });

    const demoTransactions = await prisma.transaction.count({
      where: {
        metadata: { path: ['demo'], equals: true },
      },
    });

    const demoWorkers = await prisma.worker.findMany({
      where: {
        OR: [
          { name: { contains: 'Demo' } },
          { email: { contains: 'demo' } },
        ],
      },
      select: {
        id: true,
        name: true,
        reputation_score: true,
        wallet_address: true,
      },
    });

    return c.json({
      success: true,
      data: {
        environment: 'demo',
        status: 'active',
        stats: {
          demoTasks,
          demoTransactions,
          demoWorkers: demoWorkers.length,
        },
        workers: demoWorkers,
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

export default demoRoutes;
