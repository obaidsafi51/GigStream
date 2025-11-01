// GigStream Database Service
// Handles Prisma client initialization and common database operations
// Optimized for Cloudflare Workers with Neon serverless adapter

import { PrismaClient } from '@prisma/client';

/**
 * Initialize Prisma client
 * For Cloudflare Workers with Neon, use the edge client and adapter
 */
export function createPrismaClient(databaseUrl?: string) {
  const prisma = new PrismaClient({ 
    datasources: databaseUrl ? {
      db: {
        url: databaseUrl
      }
    } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
  
  return prisma;
}

/**
 * Get Prisma client instance (singleton pattern for serverless)
 * Should be called once per request in Cloudflare Workers
 */
let prismaInstance: PrismaClient | null = null;

export function getPrisma(databaseUrl?: string): PrismaClient {
  if (!prismaInstance) {
    const dbUrl = databaseUrl || process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL is not defined');
    }
    prismaInstance = createPrismaClient(dbUrl);
  }
  return prismaInstance;
}

/**
 * Close Prisma connection (important for proper cleanup)
 */
export async function closePrisma() {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}

/**
 * Database health check
 */
export async function checkDatabaseHealth(prisma: PrismaClient): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Common database queries for GigStream
 */
export const queries = {
  /**
   * Get worker with full profile
   */
  async getWorkerProfile(prisma: PrismaClient, workerId: string) {
    return prisma.worker.findUnique({
      where: { id: workerId },
      include: {
        tasks: {
          take: 10,
          orderBy: { created_at: 'desc' },
        },
        transactions: {
          take: 10,
          orderBy: { created_at: 'desc' },
        },
        loans: {
          where: { status: { in: ['disbursed', 'repaying'] } },
        },
      },
    });
  },

  /**
   * Get worker earnings summary using view
   */
  async getWorkerEarnings(prisma: PrismaClient, workerId: string) {
    // Query the worker_earnings_view
    return prisma.$queryRaw`
      SELECT * FROM worker_earnings_view 
      WHERE worker_id = ${workerId}
    `;
  },

  /**
   * Get platform statistics
   */
  async getPlatformStats(prisma: PrismaClient, platformId: string) {
    return prisma.$queryRaw`
      SELECT * FROM platform_performance_view 
      WHERE platform_id = ${platformId}
    `;
  },

  /**
   * Get platform analytics with detailed metrics
   * Uses the analytics service for comprehensive data
   */
  async getPlatformAnalytics(prisma: PrismaClient, platformId: string, days: number = 30) {
    // Import dynamically to avoid circular dependencies
    const { getPlatformAnalyticsWithCache } = await import('./analytics.js');
    return getPlatformAnalyticsWithCache(prisma, platformId, 300); // 5 minute cache
  },

  /**
   * Get active payment streams
   */
  async getActiveStreams(prisma: PrismaClient) {
    return prisma.stream.findMany({
      where: { 
        status: 'active',
        next_release_at: { lte: new Date() },
      },
      include: {
        task: {
          include: {
            worker: true,
            platform: true,
          },
        },
      },
      orderBy: { next_release_at: 'asc' },
    });
  },

  /**
   * Get worker risk assessment
   */
  async getWorkerRiskAssessment(prisma: PrismaClient, workerId: string) {
    return prisma.$queryRaw`
      SELECT * FROM worker_risk_assessment 
      WHERE worker_id = ${workerId}
    `;
  },

  /**
   * Create task with audit log
   */
  async createTaskWithAudit(
    prisma: PrismaClient,
    taskData: any,
    actorId: string,
    actorType: string
  ) {
    return prisma.$transaction(async (tx: any) => {
      // Create task
      const task = await tx.task.create({
        data: taskData,
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          actor_id: actorId,
          actor_type: actorType,
          action: 'create_task',
          resource_type: 'task',
          resource_id: task.id,
          metadata: {
            task_type: task.task_type,
            amount: task.amount.toString(),
          },
        },
      });

      return task;
    });
  },

  /**
   * Complete task and update reputation
   */
  async completeTaskWithReputation(
    prisma: PrismaClient,
    taskId: string,
    reputationDelta: number = 10
  ) {
    return prisma.$transaction(async (tx: any) => {
      // Update task
      const task = await tx.task.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          completed_at: new Date(),
        },
      });

      // Create reputation event
      await tx.reputationEvent.create({
        data: {
          worker_id: task.worker_id,
          event_type: 'task_completed',
          delta: reputationDelta,
          reason: `Completed task: ${task.title || task.id}`,
          related_id: task.id,
        },
      });

      return task;
    });
  },

  /**
   * Process payment transaction
   */
  async processPayment(
    prisma: PrismaClient,
    transactionData: any
  ) {
    return prisma.$transaction(async (tx: any) => {
      // Create transaction
      const transaction = await tx.transaction.create({
        data: transactionData,
      });

      // Update task if linked
      if (transactionData.task_id) {
        await tx.task.update({
          where: { id: transactionData.task_id },
          data: { status: 'completed' },
        });
      }

      return transaction;
    });
  },
};

/**
 * Database migration utilities
 */
export const migrations = {
  /**
   * Apply database triggers and functions
   */
  async applyTriggersAndFunctions(_prisma: PrismaClient) {
    // This would be called after initial migration
    // Read and execute triggers.sql and views.sql
    console.log('Triggers and functions should be applied via migration files');
  },

  /**
   * Apply database views
   */
  async applyViews(_prisma: PrismaClient) {
    // This would be called after initial migration
    console.log('Views should be applied via migration files');
  },
};

export default {
  createPrismaClient,
  getPrisma,
  closePrisma,
  checkDatabaseHealth,
  queries,
  migrations,
};
