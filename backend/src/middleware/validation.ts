/**
 * Request Validation Middleware
 * Uses Zod for schema validation
 */

import { Context, Next } from 'hono';
import { z, ZodError } from 'zod';

/**
 * Validate request body against Zod schema
 */
export function validateRequest(schema: z.ZodSchema) {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json();
      const validated = schema.parse(body);
      
      // Attach validated data to context
      c.set('validatedData', validated);
      
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return c.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
              })),
            },
          },
          400
        );
      }
      
      // Handle JSON parse errors
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Request body must be valid JSON',
          },
        },
        400
      );
    }
  };
}

/**
 * Validate query parameters
 */
export function validateQuery(schema: z.ZodSchema) {
  return async (c: Context, next: Next) => {
    try {
      const query = c.req.query();
      const validated = schema.parse(query);
      
      // Attach validated data to context
      c.set('validatedQuery', validated);
      
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return c.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid query parameters',
              details: error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
              })),
            },
          },
          400
        );
      }
      
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_QUERY',
            message: 'Invalid query parameters',
          },
        },
        400
      );
    }
  };
}
