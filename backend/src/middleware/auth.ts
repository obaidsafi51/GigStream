/**
 * Authentication Middleware
 * JWT validation for workers and API key validation for platforms
 */

import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';

/**
 * Authenticate JWT token
 * Used for worker endpoints
 */
export async function authenticateJWT(c: Context, next: Next) {
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
    // TODO: Implement JWT verification (Task 3.4)
    // 1. Verify JWT signature
    // 2. Check expiration
    // 3. Extract user info
    // 4. Attach to context
    
    // For now, return not implemented
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'JWT authentication will be implemented in Task 3.4',
        },
      },
      501
    );
  } catch (error) {
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
}

/**
 * Authenticate API key
 * Used for platform endpoints
 */
export async function authenticateAPIKey(c: Context, next: Next) {
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
    // TODO: Implement API key validation (Task 3.4)
    // 1. Hash provided key
    // 2. Look up in database
    // 3. Check expiration and permissions
    // 4. Attach platform info to context
    
    // For now, return not implemented
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'API key authentication will be implemented in Task 3.4',
        },
      },
      501
    );
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key',
        },
      },
      401
    );
  }
}
