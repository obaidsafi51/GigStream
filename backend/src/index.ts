/**
 * GigStream Backend API - Main Entry Point
 * Framework: Hono + Cloudflare Workers
 * Purpose: AI-powered real-time USDC payment streaming for gig workers
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';

// Import routes
import authRoutes from './routes/auth';
import workersRoutes from './routes/workers';
import platformsRoutes from './routes/platforms';
import webhooksRoutes from './routes/webhooks';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimit';

// Type definitions for Cloudflare Workers environment
type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  CIRCLE_API_KEY: string;
  CIRCLE_ENTITY_SECRET: string;
  ARC_RPC_URL: string;
};

// Initialize Hono app
const app = new Hono<{ Bindings: Bindings }>();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', secureHeaders());

// CORS configuration
app.use(
  '*',
  cors({
    origin: [
      'http://localhost:3000',
      'https://gigstream.pages.dev',
      'https://*.gigstream.pages.dev',
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    exposeHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 600,
    credentials: true,
  })
);

// Rate limiting (100 req/min per user)
app.use('/api/*', rateLimiter({ windowMs: 60000, max: 100 }));

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'gigstream-api',
  });
});

// API routes
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/workers', workersRoutes);
app.route('/api/v1/platforms', platformsRoutes);
app.route('/api/v1/webhooks', webhooksRoutes);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
        path: c.req.path,
      },
    },
    404
  );
});

// Global error handler
app.onError(errorHandler);

// Export for Cloudflare Workers
export default app;
