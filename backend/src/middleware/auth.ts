/**
 * Authentication Middleware
 * JWT validation for workers and API key validation for platforms
 */

import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyToken, hashApiKey } from '../services/auth';
import { getDatabase } from '../services/database.js';

/**
 * Authenticate JWT token
 * Used for worker endpoints
 */
export async function authenticateJWT(c: Context, next: Next): Promise<Response | void> {
  // Get token from Authorization header or cookie
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : getCookie(c, 'auth_token');

  if (!token) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      },
      401
    );
  }

  try {
    // Verify JWT signature and decode payload
    const payload = verifyToken(token);
    
    if (!payload) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token',
          },
        },
        401
      );
    }

    // Check token type (must be worker for this middleware)
    if (payload.type !== 'worker') {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_TOKEN_TYPE',
            message: 'Worker token required',
          },
        },
        403
      );
    }

    // Attach user info to context for use in routes
    c.set('userId', payload.sub);
    c.set('userType', payload.type);
    c.set('walletAddress', payload.wallet);

    await next();
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Authentication failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      401
    );
  }
}

/**
 * Authenticate API key
 * Used for platform endpoints
 */
export async function authenticateAPIKey(c: Context, next: Next): Promise<Response | void> {
  const apiKey = c.req.header('X-API-Key');

  if (!apiKey) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'API key required',
        },
      },
      401
    );
  }

  try {
    // Hash the provided API key
    const apiKeyHash = await hashApiKey(apiKey);
    
    // Get database client
    const db = getDatabase();
    
    // Look up platform by API key hash
    const platform = await db.query.platforms.findFirst({
      where: (platforms, { and, eq }) =>
        and(
          eq(platforms.apiKeyHash, apiKeyHash),
          eq(platforms.status, 'active')
        ),
      columns: {
        id: true,
        name: true,
      },
    });

    if (!platform) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid or inactive API key',
          },
        },
        401
      );
    }

    // Attach platform info to context
    c.set('platformId', platform.id);
    c.set('platformName', platform.name);
    c.set('userType', 'platform');

    await next();
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'API key validation failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      500
    );
  }
}
