// GigStream Database Service
// Handles Drizzle ORM client initialization and common database operations
// Optimized for Cloudflare Workers with Neon HTTP driver

import { getDb } from '../../database/client.js';
import * as schema from '../../database/schema.js';
import { eq, desc, lte, gte, inArray, and, sql } from 'drizzle-orm';
import { config } from 'dotenv';

/**
 * Get Drizzle database instance
 * Creates a new connection per request (Cloudflare Workers pattern)
 * Returns the appropriate database type (Neon or PostgreSQL)
 * 
 * Note: For Node.js scripts, DATABASE_URL comes from process.env
 *       For Cloudflare Workers, it should be passed from c.env
 */
export function getDatabase(databaseUrl?: string) {
  // In a Node.js environment, attempt to load variables from a .env file
  // if DATABASE_URL is not already present. This is safe to call and won't
  // override existing environment variables. It helps local scripts run
  // without needing the --env-file flag.
  if (typeof process !== 'undefined' && !process.env.DATABASE_URL) {
    console.log('DATABASE_URL not found in process.env, attempting to load from .env file...');
    config();
  }

  // Try multiple sources in order:
  // 1. Passed parameter (from Cloudflare Workers context)
  // 2. process.env (for Node.js scripts, now loaded via dotenv)
  // 3. globalThis (for some edge case environments)
  const dbUrl = databaseUrl || 
                process.env.DATABASE_URL ||
                (globalThis as any).DATABASE_URL;
  
  if (!dbUrl) {
    console.error('CRITICAL: DATABASE_URL is not defined after checking all sources.');
    throw new Error('DATABASE_URL is not defined. Ensure it is set in your environment, a .env file, or passed correctly in a worker context.');
  }

  try {
    // Log a sanitized version of the URL for debugging
    const url = new URL(dbUrl);
    console.log(`Attempting to connect to database host: ${url.hostname}`);
  } catch (e) {
    console.error('CRITICAL: The provided DATABASE_URL is not a valid URL.');
    throw new Error('The DATABASE_URL is malformed. Please check the format.');
  }

  return getDb(dbUrl);
}

/**
 * Database health check
 */
export async function checkDatabaseHealth(db: ReturnType<typeof getDb>): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
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
  async getWorkerProfile(db: ReturnType<typeof getDb>, workerId: string) {
    // Get worker
    const worker = await db.query.workers.findFirst({
      where: eq(schema.workers.id, workerId),
    });

    if (!worker) return null;

    // Get recent tasks
    const tasks = await db.query.tasks.findMany({
      where: eq(schema.tasks.workerId, workerId),
      orderBy: [desc(schema.tasks.createdAt)],
      limit: 10,
    });

    // Get recent transactions
    const transactions = await db.query.transactions.findMany({
      where: eq(schema.transactions.workerId, workerId),
      orderBy: [desc(schema.transactions.createdAt)],
      limit: 10,
    });

    // Get active loans
    const loans = await db.query.loans.findMany({
      where: and(
        eq(schema.loans.workerId, workerId),
        inArray(schema.loans.status, ['disbursed', 'repaying'])
      ),
    });

    return {
      ...worker,
      tasks,
      transactions,
      loans,
    };
  },

  /**
   * Get worker earnings summary using view
   */
  async getWorkerEarnings(db: ReturnType<typeof getDb>, workerId: string) {
    // Query the worker_earnings_view
    return db.execute(sql`
      SELECT * FROM worker_earnings_view 
      WHERE worker_id = ${workerId}
    `);
  },

  /**
   * Get platform statistics
   */
  async getPlatformStats(db: ReturnType<typeof getDb>, platformId: string) {
    return db.execute(sql`
      SELECT * FROM platform_performance_view 
      WHERE platform_id = ${platformId}
    `);
  },

  /**
   * Get platform analytics with detailed metrics
   * Uses the analytics service for comprehensive data
   * TODO: Uncomment after analytics.ts is converted to Drizzle
   */
  async getPlatformAnalytics(_db: ReturnType<typeof getDb>, _platformId: string, _cacheTtl: number = 300) {
    // Import dynamically to avoid circular dependencies
    // const { getPlatformAnalyticsWithCache } = await import('./analytics.js');
    // return getPlatformAnalyticsWithCache(db, platformId, _cacheTtl); // 5 minute cache
    throw new Error('getPlatformAnalytics not yet implemented - analytics.ts needs Drizzle conversion');
  },

  /**
   * Get active payment streams
   */
  async getActiveStreams(db: ReturnType<typeof getDb>) {
    // Get streams with status 'active' and next_release_at <= now
    const activeStreams = await db.query.streams.findMany({
      where: and(
        eq(schema.streams.status, 'active'),
        lte(schema.streams.nextReleaseAt, new Date())
      ),
      orderBy: [schema.streams.nextReleaseAt],
    });

    // Use Drizzle relational queries for joins
    const enrichedStreams = await Promise.all(
      activeStreams.map(async (stream) => {
        if (!stream.taskId) return { ...stream, task: null };

        const task = await db.query.tasks.findFirst({
          where: eq(schema.tasks.id, stream.taskId),
          with: {
            worker: true,
            platform: true,
          },
        });

        return {
          ...stream,
          task: task || null,
        };
      })
    );

    return enrichedStreams;
  },

  /**
   * Get worker risk assessment
   */
  async getWorkerRiskAssessment(db: ReturnType<typeof getDb>, workerId: string) {
    return db.execute(sql`
      SELECT * FROM worker_risk_assessment 
      WHERE worker_id = ${workerId}
    `);
  },

  /**
   * Get worker history for verification
   * Returns aggregated data needed for task verification and fraud detection
   */
  async getWorkerHistory(db: ReturnType<typeof getDb>, workerId: string) {
    // Get worker profile
    const worker = await db.query.workers.findFirst({
      where: eq(schema.workers.id, workerId),
      columns: {
        id: true,
        reputationScore: true,
        totalTasksCompleted: true,
        totalEarningsUsdc: true,
        createdAt: true,
      },
    });

    if (!worker) {
      throw new Error('Worker not found');
    }

    // Get tasks in last 24 hours
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const tasksLast24h = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.tasks)
      .where(
        and(
          eq(schema.tasks.workerId, workerId),
          gte(schema.tasks.completedAt, last24h)
        )
      );

    // Get average task amount
    const avgAmountResult = await db
      .select({ 
        avg: sql<string>`COALESCE(AVG(${schema.tasks.paymentAmountUsdc}), 0)` 
      })
      .from(schema.tasks)
      .where(
        and(
          eq(schema.tasks.workerId, workerId),
          eq(schema.tasks.status, 'completed')
        )
      );

    // Get disputes count
    const disputesResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.tasks)
      .where(
        and(
          eq(schema.tasks.workerId, workerId),
          eq(schema.tasks.status, 'disputed')
        )
      );

    // Get recent tasks (last 30 days) for pattern analysis
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentTasks = await db.query.tasks.findMany({
      where: and(
        eq(schema.tasks.workerId, workerId),
        gte(schema.tasks.createdAt, last30Days)
      ),
      columns: {
        paymentAmountUsdc: true,
        completedAt: true,
        verificationData: true,
      },
      orderBy: [desc(schema.tasks.completedAt)],
      limit: 50,
    });

    // Calculate account age
    const accountAgeDays = worker.createdAt 
      ? Math.floor((Date.now() - worker.createdAt.getTime()) / (24 * 60 * 60 * 1000))
      : 0;

    // Calculate completion rate
    const totalTasks = worker.totalTasksCompleted || 0;
    const disputes = disputesResult[0]?.count || 0;
    const completionRate = totalTasks > 0 ? totalTasks / (totalTasks + disputes) : 1;

    // Parse recent tasks for fraud detection
    const recentTasksFormatted = recentTasks.map(task => {
      const verificationData = task.verificationData as any;
      return {
        amount: parseFloat(task.paymentAmountUsdc),
        duration: 0, // Duration fields removed from schema
        gps: verificationData?.gpsCoordinates ? {
          lat: verificationData.gpsCoordinates.lat,
          lon: verificationData.gpsCoordinates.lon,
        } : undefined,
        completedAt: task.completedAt ? new Date(task.completedAt) : new Date(),
      };
    });

    return {
      reputationScore: worker.reputationScore || 100,
      tasksLast24h: tasksLast24h[0]?.count || 0,
      averageTaskAmount: parseFloat(avgAmountResult[0]?.avg || '0'),
      disputes,
      completionRate,
      totalTasksCompleted: totalTasks,
      accountAgeDays,
      recentTasks: recentTasksFormatted,
    };
  },

  /**
   * Create task with audit log
   */
  async createTaskWithAudit(
    db: ReturnType<typeof getDb>,
    taskData: typeof schema.tasks.$inferInsert,
    actorId: string,
    actorType: string
  ) {
    return db.transaction(async (tx) => {
      // Create task
      const [task] = await tx.insert(schema.tasks).values(taskData).returning();

      // Create audit log (success is required)
      await tx.insert(schema.auditLogs).values({
        actorId,
        actorType,
        action: 'create_task',
        resourceType: 'task',
        resourceId: task.id,
        success: true,
        metadata: {
          task_type: task.type,
          payment_amount: task.paymentAmountUsdc,
        },
      });

      return task;
    });
  },

  /**
   * Complete task and update reputation
   */
  async completeTaskWithReputation(
    db: ReturnType<typeof getDb>,
    taskId: string,
    reputationDelta: number = 10
  ) {
    return db.transaction(async (tx) => {
      // Update task
      const [task] = await tx
        .update(schema.tasks)
        .set({
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(schema.tasks.id, taskId))
        .returning();

      if (!task || !task.workerId) {
        throw new Error('Task not found or has no worker');
      }

      // Get current worker reputation
      const [worker] = await tx
        .select({ reputationScore: schema.workers.reputationScore })
        .from(schema.workers)
        .where(eq(schema.workers.id, task.workerId));

      if (!worker) {
        throw new Error('Worker not found');
      }

      const previousScore = worker.reputationScore || 0;
      const newScore = previousScore + reputationDelta;

      // Create reputation event (with required previousScore and newScore)
      await tx.insert(schema.reputationEvents).values({
        workerId: task.workerId,
        taskId: task.id,
        eventType: 'task_completed',
        pointsDelta: reputationDelta,
        previousScore,
        newScore,
        description: `Completed task: ${task.title || task.id}`,
      });

      return task;
    });
  },

  /**
   * Process payment transaction
   */
  async processPayment(
    db: ReturnType<typeof getDb>,
    transactionData: typeof schema.transactions.$inferInsert
  ) {
    return db.transaction(async (tx) => {
      // Create transaction
      const [transaction] = await tx
        .insert(schema.transactions)
        .values(transactionData)
        .returning();

      // Update task if linked
      if (transactionData.taskId) {
        await tx
          .update(schema.tasks)
          .set({ status: 'completed' })
          .where(eq(schema.tasks.id, transactionData.taskId));
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
  async applyTriggersAndFunctions() {
    // This would be called after initial migration
    // Read and execute triggers.sql and views.sql
    console.log('Triggers and functions should be applied via migration files');
  },

  /**
   * Apply database views
   */
  async applyViews() {
    // This would be called after initial migration
    console.log('Views should be applied via migration files');
  },
};

export default {
  getDatabase,
  checkDatabaseHealth,
  queries,
  migrations,
};
