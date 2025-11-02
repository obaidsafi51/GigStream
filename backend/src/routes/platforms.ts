/**
 * Platform Routes
 * Handles gig platform integration endpoints
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { authenticateAPIKey } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { getPrisma } from '../services/database.js';
import { getPlatformAnalyticsWithCache } from '../services/analytics.js';

const platformsRoutes = new Hono();

// Validation schemas
const platformRegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  webhookUrl: z.string().url(),
  description: z.string().optional(),
});

const taskCompleteSchema = z.object({
  taskId: z.string(),
  workerId: z.string(),
  platformId: z.string(),
  amount: z.number().positive(),
  verificationData: z.object({
    photo: z.string().url().optional(),
    gps: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }).optional(),
    timestamp: z.string().datetime(),
    metadata: z.record(z.any()).optional(),
  }),
});

const streamStartSchema = z.object({
  workerId: z.string(),
  platformId: z.string(),
  totalAmount: z.number().positive(),
  duration: z.number().positive(),
  releaseInterval: z.number().positive(),
  taskDescription: z.string(),
});

/**
 * POST /api/v1/platforms/register
 * Register new platform and generate API key
 */
platformsRoutes.post('/register', validateRequest(platformRegisterSchema), async (c) => {
  // TODO: Implement platform registration
  return c.json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Platform registration to be implemented',
    },
  }, 501);
});

/**
 * POST /api/v1/platforms/tasks/complete
 * Webhook: Task completion triggers instant payment
 */
platformsRoutes.post(
  '/tasks/complete',
  authenticateAPIKey,
  validateRequest(taskCompleteSchema),
  async (c) => {
    // TODO: Implement task completion flow (Task 5.1-5.2)
    // 1. Validate webhook signature
    // 2. Queue task for verification
    // 3. Acknowledge webhook (<200ms)
    // 4. Background: Verify task -> Execute payment
    
    return c.json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Task completion will be implemented in Tasks 5.1-5.2',
      },
    }, 501);
  }
);

/**
 * POST /api/v1/platforms/tasks/start-stream
 * Create payment stream via smart contract
 */
platformsRoutes.post(
  '/tasks/start-stream',
  authenticateAPIKey,
  validateRequest(streamStartSchema),
  async (c) => {
    // TODO: Implement stream creation (Task 4.4)
    // 1. Validate platform has sufficient balance
    // 2. Call PaymentStreaming.createStream()
    // 3. Store stream details in database
    
    return c.json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Stream creation will be implemented in Task 4.4',
      },
    }, 501);
  }
);

/**
 * GET /api/v1/platforms/:platformId/workers
 * Get worker list with reputation scores
 */
platformsRoutes.get('/:platformId/workers', authenticateAPIKey, async (c) => {
  const platformId = c.req.param('platformId');
  const page = Number(c.req.query('page') || '1');
  const limit = Number(c.req.query('limit') || '20');
  
  // TODO: Implement worker list retrieval
  return c.json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Worker list endpoint to be implemented',
    },
  }, 501);
});

/**
 * GET /api/v1/platforms/:platformId/analytics
 * Get platform analytics with comprehensive metrics and time series data
 * 
 * Features:
 * - Total payouts, tasks completed, unique workers
 * - Average payment time and rating
 * - Time series data for charts
 * - 5-minute caching for performance
 * 
 * Query params:
 * - days: number of days for time series (default: 30, max: 90)
 * 
 * Performance:
 * - Target: <500ms response time
 * - Cached responses: <50ms
 * - Cache duration: 5 minutes (300s)
 */
platformsRoutes.get('/:platformId/analytics', authenticateAPIKey, async (c) => {
  try {
    const platformId = c.req.param('platformId');
    
    // Parse query parameters
    const daysParam = c.req.query('days');
    const days = daysParam ? parseInt(daysParam, 10) : 30;
    
    // Validate days parameter
    if (isNaN(days) || days < 1 || days > 90) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_PARAMETER',
          message: 'Days parameter must be between 1 and 90',
        },
      }, 400);
    }

    // Get Prisma client
    const prisma = getPrisma();

    // Get analytics with caching (5 minutes = 300 seconds)
    const startTime = Date.now();
    const analytics = await getPlatformAnalyticsWithCache(prisma, platformId, 300);
    const responseTime = Date.now() - startTime;

    // Return analytics data
    return c.json({
      success: true,
      data: analytics,
      meta: {
        responseTime: `${responseTime}ms`,
        cached: responseTime < 100, // Likely cached if very fast
      },
    }, 200);

  } catch (error: any) {
    // Handle specific errors
    if (error.message?.includes('not found')) {
      return c.json({
        success: false,
        error: {
          code: 'PLATFORM_NOT_FOUND',
          message: `Platform with ID ${c.req.param('platformId')} does not exist`,
        },
      }, 404);
    }

    // Log error for debugging
    console.error('Platform analytics error:', error);

    // Return generic error
    return c.json({
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to calculate platform analytics',
        details: error.message,
      },
    }, 500);
  }
});

/**
 * POST /api/v1/platforms/:platformId/webhooks
 * Configure webhook URLs for platform
 */
platformsRoutes.post('/:platformId/webhooks', authenticateAPIKey, async (c) => {
  const platformId = c.req.param('platformId');
  
  // TODO: Implement webhook configuration
  return c.json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Webhook configuration to be implemented',
    },
  }, 501);
});

export default platformsRoutes;
