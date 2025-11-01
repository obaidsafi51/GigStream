/**
 * Global Error Handler
 * Centralized error handling for all routes
 */

import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

/**
 * Global error handler middleware
 */
export function errorHandler(err: Error, c: Context) {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
  });

  // Handle HTTP exceptions
  if (err instanceof HTTPException) {
    return c.json(
      {
        success: false,
        error: {
          code: 'HTTP_ERROR',
          message: err.message,
          status: err.status,
        },
      },
      err.status
    );
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: err.message,
        },
      },
      400
    );
  }

  if (err.name === 'UnauthorizedError') {
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

  // Default 500 error
  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        // Only include details in development
        ...(process.env.NODE_ENV === 'development' && {
          details: err.message,
          stack: err.stack,
        }),
      },
    },
    500
  );
}
