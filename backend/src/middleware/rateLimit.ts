/**
 * Rate Limiting Middleware
 * Implements token bucket algorithm for API rate limiting
 * Target: 100 requests/minute per user
 */

import { Context, Next } from 'hono';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Rate limiter middleware
 */
export function rateLimiter(config: RateLimitConfig) {
  return async (c: Context, next: Next) => {
    // Get identifier (IP address or user ID from auth)
    const identifier = c.req.header('CF-Connecting-IP') || 
                       c.req.header('X-Real-IP') ||
                       'unknown';

    const now = Date.now();
    const record = rateLimitStore.get(identifier);

    // Initialize or reset if window expired
    if (!record || record.resetAt < now) {
      rateLimitStore.set(identifier, {
        count: 1,
        resetAt: now + config.windowMs,
      });
      
      // Set rate limit headers
      c.header('X-RateLimit-Limit', String(config.max));
      c.header('X-RateLimit-Remaining', String(config.max - 1));
      c.header('X-RateLimit-Reset', String(now + config.windowMs));
      
      return next();
    }

    // Increment count
    record.count++;

    // Check if limit exceeded
    if (record.count > config.max) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      
      c.header('X-RateLimit-Limit', String(config.max));
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', String(record.resetAt));
      c.header('Retry-After', String(retryAfter));
      
      return c.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many requests. Please try again in ${retryAfter} seconds.`,
            retryAfter,
          },
        },
        429
      );
    }

    // Set rate limit headers
    c.header('X-RateLimit-Limit', String(config.max));
    c.header('X-RateLimit-Remaining', String(config.max - record.count));
    c.header('X-RateLimit-Reset', String(record.resetAt));

    return next();
  };
}

/**
 * Clean up expired rate limit records (call periodically)
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}
