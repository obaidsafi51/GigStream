// GigStream Analytics Service
// Provides platform performance metrics and analytics
// Optimized for fast calculation with caching support

import { getDb } from '../../database/client.js';
import * as schema from '../../database/schema.js';
import { eq, gte, and, sql } from 'drizzle-orm';

/**
 * Platform analytics response interface
 */
export interface PlatformAnalytics {
  platformId: string;
  platformName: string;
  metrics: {
    totalPayouts: string; // USDC amount as string
    tasksCompleted: number;
    uniqueWorkers: number;
    averagePaymentTime: number; // in seconds
    averageRating: string; // 0-5 stars
  };
  timeSeries: {
    date: string; // YYYY-MM-DD
    payouts: string;
    tasks: number;
    workers: number;
  }[];
  generatedAt: string;
}

/**
 * Calculate platform analytics
 * @param db - Drizzle database instance
 * @param platformId - Platform ID
 * @param days - Number of days for time series data (default: 30)
 * @returns Platform analytics data
 */
export async function calculatePlatformAnalytics(
  db: ReturnType<typeof getDb>,
  platformId: string,
  days: number = 30
): Promise<PlatformAnalytics> {
  const startTime = Date.now();

  // Get platform details
  const platform = await db.query.platforms.findFirst({
    where: eq(schema.platforms.id, platformId),
    columns: {
      id: true,
      name: true,
      totalPaymentsUsdc: true,
    },
  });

  if (!platform) {
    throw new Error(`Platform not found: ${platformId}`);
  }

  // Calculate date range for time series
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get all completed tasks for this platform
  const completedTasks = await db
    .select({
      id: schema.tasks.id,
      workerId: schema.tasks.workerId,
      paymentAmountUsdc: schema.tasks.paymentAmountUsdc,
      createdAt: schema.tasks.createdAt,
      completedAt: schema.tasks.completedAt,
    })
    .from(schema.tasks)
    .where(
      and(
        eq(schema.tasks.platformId, platformId),
        eq(schema.tasks.status, 'completed'),
        gte(schema.tasks.completedAt, startDate)
      )
    )
    .orderBy(schema.tasks.completedAt);

  // Calculate metrics
  const totalPayouts = completedTasks.reduce(
    (sum: number, task: any) => sum + Number(task.paymentAmountUsdc),
    0
  );

  const tasksCompleted = completedTasks.length;

  const uniqueWorkers = new Set(completedTasks.map((task: any) => task.workerId).filter(Boolean)).size;

  // Calculate average payment time (time from task creation to completion)
  const paymentTimes = completedTasks
    .filter((task: any) => task.completedAt && task.createdAt)
    .map((task: any) => {
      const created = new Date(task.createdAt).getTime();
      const completed = new Date(task.completedAt!).getTime();
      return (completed - created) / 1000; // Convert to seconds
    });

  const averagePaymentTime =
    paymentTimes.length > 0
      ? Math.round(paymentTimes.reduce((a: number, b: number) => a + b, 0) / paymentTimes.length)
      : 0;

  // Get average rating for this platform's tasks
  const ratingResult = await db.execute<{ avg_rating: number }>(sql`
    SELECT 
      COALESCE(AVG(w.average_rating), 0) as avg_rating
    FROM tasks t
    JOIN workers w ON t.worker_id = w.id
    WHERE t.platform_id = ${platformId}
      AND t.status = 'completed'
      AND t.completed_at >= ${startDate}
  `);

  const averageRating = (Array.isArray(ratingResult) ? ratingResult[0] : ratingResult.rows[0])?.avg_rating || 0;

  // Generate time series data (daily aggregates)
  const timeSeriesMap = new Map<string, { payouts: number; tasks: Set<string>; workers: Set<string> }>();

  // Initialize all days in range
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    timeSeriesMap.set(dateStr, {
      payouts: 0,
      tasks: new Set(),
      workers: new Set(),
    });
  }

  // Populate with actual data
  completedTasks.forEach((task: any) => {
    if (task.completedAt) {
      const dateStr = new Date(task.completedAt).toISOString().split('T')[0];
      const entry = timeSeriesMap.get(dateStr);
      if (entry) {
        entry.payouts += Number(task.paymentAmountUsdc);
        entry.tasks.add(task.id);
        if (task.workerId) {
          entry.workers.add(task.workerId);
        }
      }
    }
  });

  // Convert map to array
  const timeSeries = Array.from(timeSeriesMap.entries())
    .map(([date, data]) => ({
      date,
      payouts: data.payouts.toFixed(6),
      tasks: data.tasks.size,
      workers: data.workers.size,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const calculationTime = Date.now() - startTime;
  console.log(`Platform analytics calculated in ${calculationTime}ms for platform ${platformId}`);

  return {
    platformId: platform.id,
    platformName: platform.name,
    metrics: {
      totalPayouts: totalPayouts.toFixed(6),
      tasksCompleted,
      uniqueWorkers,
      averagePaymentTime,
      averageRating: averageRating.toFixed(2),
    },
    timeSeries,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Simple in-memory cache for analytics
 * In production, use Redis or Cloudflare KV
 */
interface CacheEntry {
  data: PlatformAnalytics;
  expiresAt: number;
}

const analyticsCache = new Map<string, CacheEntry>();

/**
 * Get platform analytics with caching
 * @param db - Drizzle database instance
 * @param platformId - Platform ID
 * @param cacheDuration - Cache duration in seconds (default: 300 = 5 minutes)
 * @returns Platform analytics data (cached or fresh)
 */
export async function getPlatformAnalyticsWithCache(
  db: ReturnType<typeof getDb>,
  platformId: string,
  cacheDuration: number = 300
): Promise<PlatformAnalytics> {
  const cacheKey = `analytics:${platformId}`;
  const now = Date.now();

  // Check cache
  const cached = analyticsCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    console.log(`Analytics cache hit for platform ${platformId}`);
    return cached.data;
  }

  // Calculate fresh analytics
  console.log(`Analytics cache miss for platform ${platformId}, calculating...`);
  const analytics = await calculatePlatformAnalytics(db, platformId);

  // Store in cache
  analyticsCache.set(cacheKey, {
    data: analytics,
    expiresAt: now + cacheDuration * 1000,
  });

  // Clean up expired entries periodically
  if (Math.random() < 0.1) {
    // 10% chance to clean cache
    for (const [key, entry] of analyticsCache.entries()) {
      if (entry.expiresAt <= now) {
        analyticsCache.delete(key);
      }
    }
  }

  return analytics;
}

/**
 * Clear analytics cache for a platform
 * @param platformId - Platform ID (optional, clears all if not provided)
 */
export function clearAnalyticsCache(platformId?: string): void {
  if (platformId) {
    const cacheKey = `analytics:${platformId}`;
    analyticsCache.delete(cacheKey);
    console.log(`Analytics cache cleared for platform ${platformId}`);
  } else {
    analyticsCache.clear();
    console.log('All analytics cache cleared');
  }
}

export default {
  calculatePlatformAnalytics,
  getPlatformAnalyticsWithCache,
  clearAnalyticsCache,
};
