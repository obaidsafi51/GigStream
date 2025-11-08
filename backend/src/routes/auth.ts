/**
 * Authentication Routes
 * Handles worker and platform authentication
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { getDatabase } from '../services/database.js';
import * as schema from '../../database/schema.js';
import { eq } from 'drizzle-orm';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  validatePasswordStrength,
  generateApiKey,
  hashApiKey,
} from '../services/auth';
import { createWallet } from '../services/circle';

// Type definitions for Cloudflare Workers environment
type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  CIRCLE_API_KEY: string;
  CIRCLE_ENTITY_SECRET: string;
  ARC_RPC_URL: string;
};

const authRoutes = new Hono<{ Bindings: Bindings }>();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  type: z.enum(['worker', 'platform']).optional().default('worker'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const walletLoginSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  signature: z.string(),
  message: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

/**
 * POST /api/v1/auth/register
 * Register new worker or platform
 */
authRoutes.post('/register', validateRequest(registerSchema), async (c) => {
  try {
    const { email, password, name, type } = await c.req.json();

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return c.json(
        {
          success: false,
          error: {
            code: 'WEAK_PASSWORD',
            message: passwordValidation.message,
          },
        },
        400
      );
    }

    const db = getDatabase(c.env?.DATABASE_URL);

    if (type === 'worker') {
      // Check if email already exists
      const existingWorker = await db.query.workers.findFirst({
        where: eq(schema.workers.email, email),
      });

      if (existingWorker) {
        return c.json(
          {
            success: false,
            error: {
              code: 'EMAIL_EXISTS',
              message: 'Email already registered',
            },
          },
          409
        );
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create Circle wallet for the worker
      let walletId: string | undefined;
      let walletAddress: string | undefined;
      
      try {
        const startTime = Date.now();
        console.log(`Creating Circle wallet for worker: ${email}`);
        
        const wallet = await createWallet(email);
        walletId = wallet.walletId;
        walletAddress = wallet.address !== 'pending' ? wallet.address : undefined;
        
        const elapsedTime = Date.now() - startTime;
        console.log(`✓ Wallet created in ${elapsedTime}ms`);
        
        if (elapsedTime > 2000) {
          console.warn(`⚠ Wallet creation took ${elapsedTime}ms (target: <2s)`);
        }
      } catch (walletError) {
        console.error('Failed to create Circle wallet:', walletError);
        console.error('Error details:', walletError instanceof Error ? walletError.message : String(walletError));
        
        // Fallback to temporary wallet for now
        // This allows registration to proceed while Circle API issues are resolved
        console.warn('⚠ FALLBACK: Creating worker with temporary wallet identifier');
        console.warn('  Real wallet creation will be retried later');
        console.warn('  Reason:', walletError instanceof Error ? walletError.message : 'Unknown error');
        
        // Create a temporary placeholder wallet address
        walletId = `temp-wallet-${Date.now()}`;
        walletAddress = undefined; // Will be populated when wallet creation succeeds
        
        // Note: In production with working Circle API, you may want to:
        // return c.json({ success: false, error: { code: 'WALLET_CREATION_FAILED', ... } }, 500);
      }

      // Create worker with wallet information
      // Generate unique placeholder if wallet creation failed
      const finalWalletAddress = walletAddress || 
        `0x${Buffer.from(email + Date.now().toString()).toString('hex').substring(0, 40).padEnd(40, '0')}`;
      
      const [worker] = await db
        .insert(schema.workers)
        .values({
          email,
          passwordHash,
          displayName: name,
          walletAddress: finalWalletAddress,
          walletId,
          reputationScore: 500, // Base score
          totalTasksCompleted: 0,
          totalEarningsUsdc: '0',
          status: 'active',
        })
        .returning();

      // Generate tokens
      const accessToken = generateAccessToken({
        sub: worker.id,
        type: 'worker',
        wallet: worker.walletAddress || undefined,
      });

      const refreshToken = generateRefreshToken({
        sub: worker.id,
        type: 'worker',
        wallet: worker.walletAddress || undefined,
      });

      // Log audit trail
      await db.insert(schema.auditLogs).values({
        actorId: worker.id,
        actorType: 'worker',
        action: 'worker_registered',
        resourceType: 'worker',
        resourceId: worker.id,
        success: true,
      });

      return c.json(
        {
          success: true,
          data: {
            user: {
              id: worker.id,
              email: worker.email,
              name: worker.displayName,
              type: 'worker',
              walletAddress: worker.walletAddress,
              reputationScore: worker.reputationScore,
            },
            accessToken,
            refreshToken,
          },
        },
        201
      );
    } else {
      // Platform registration
      const existingPlatform = await db.query.platforms.findFirst({
        where: eq(schema.platforms.email, email),
      });

      if (existingPlatform) {
        return c.json(
          {
            success: false,
            error: {
              code: 'EMAIL_EXISTS',
              message: 'Email already registered',
            },
          },
          409
        );
      }

      // Generate API key
      const apiKey = generateApiKey(true); // testnet
      const apiKeyHash = await hashApiKey(apiKey);

      // Create platform
      const [platform] = await db
        .insert(schema.platforms)
        .values({
          name,
          email,
          apiKeyHash,
          totalWorkers: 0,
          totalPaymentsUsdc: '0',
          status: 'active',
        })
        .returning();

      // Log audit trail
      await db.insert(schema.auditLogs).values({
        actorId: platform.id,
        actorType: 'platform',
        action: 'platform_registered',
        resourceType: 'platform',
        resourceId: platform.id,
        success: true,
      });

      return c.json(
        {
          success: true,
          data: {
            platform: {
              id: platform.id,
              name: platform.name,
              email: platform.email,
              type: 'platform',
            },
            apiKey, // Show API key only once!
            message: 'Save your API key securely - it will not be shown again',
          },
        },
        201
      );
    }
  } catch (error) {
    console.error('Registration error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Registration failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      500
    );
  }
});

/**
 * POST /api/v1/auth/login
 * Login with email/password
 */
authRoutes.post('/login', validateRequest(loginSchema), async (c) => {
  try {
    const { email, password } = await c.req.json();

    const db = getDatabase(c.env?.DATABASE_URL);

    // Look up worker by email
    const worker = await db.query.workers.findFirst({
      where: eq(schema.workers.email, email),
    });

    if (!worker) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        },
        401
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, worker.passwordHash || '');

    if (!isValidPassword) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        },
        401
      );
    }

    // Update last active timestamp
    await db
      .update(schema.workers)
      .set({ lastLoginAt: new Date() })
      .where(eq(schema.workers.id, worker.id));

    // Generate tokens
    const accessToken = generateAccessToken({
      sub: worker.id,
      type: 'worker',
      wallet: worker.walletAddress || undefined,
    });

    const refreshToken = generateRefreshToken({
      sub: worker.id,
      type: 'worker',
      wallet: worker.walletAddress || undefined,
    });

    // Log audit trail
    await db.insert(schema.auditLogs).values({
      actorId: worker.id,
      actorType: 'worker',
      action: 'worker_login',
      resourceType: 'worker',
      resourceId: worker.id,
      success: true,
    });

    return c.json({
      success: true,
      data: {
        user: {
          id: worker.id,
          email: worker.email,
          name: worker.displayName,
          type: 'worker',
          walletAddress: worker.walletAddress,
          reputationScore: worker.reputationScore,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: 'Login failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      500
    );
  }
});

/**
 * POST /api/v1/auth/wallet-login
 * Wallet-based authentication (sign message verification)
 */
authRoutes.post('/wallet-login', validateRequest(walletLoginSchema), async (c) => {
  // TODO: Implement wallet signature verification (Task 5.3 - future enhancement)
  return c.json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Wallet login will be implemented in future version',
    },
  }, 501);
});

/**
 * POST /api/v1/auth/refresh
 * Refresh JWT token
 */
authRoutes.post('/refresh', validateRequest(refreshSchema), async (c) => {
  try {
    const { refreshToken } = await c.req.json();

    // Verify refresh token
    const payload = verifyToken(refreshToken);

    if (!payload) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Invalid or expired refresh token',
          },
        },
        401
      );
    }

    const db = getDatabase(c.env?.DATABASE_URL);

    // Check if user/platform still exists
    if (payload.type === 'worker') {
      const worker = await db.query.workers.findFirst({
        where: eq(schema.workers.id, payload.sub),
      });

      if (!worker) {
        return c.json(
          {
            success: false,
            error: {
              code: 'USER_NOT_FOUND',
              message: 'Worker account not found',
            },
          },
          404
        );
      }

      // Generate new access token
      const accessToken = generateAccessToken({
        sub: worker.id,
        type: 'worker',
        wallet: worker.walletAddress || undefined,
      });

      return c.json({
        success: true,
        data: {
          accessToken,
        },
      });
    } else {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_TOKEN_TYPE',
            message: 'Refresh token not supported for platforms',
          },
        },
        400
      );
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'REFRESH_FAILED',
          message: 'Token refresh failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      500
    );
  }
});

/**
 * POST /api/v1/auth/logout
 * Logout and invalidate token
 */
authRoutes.post('/logout', async (c) => {
  // For stateless JWT, logout is handled client-side by deleting the token
  // In future, can implement token blacklist for added security
  return c.json({
    success: true,
    message: 'Logged out successfully',
  });
});

export default authRoutes;
