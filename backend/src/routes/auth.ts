/**
 * Authentication Routes
 * Handles worker and platform authentication
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { PrismaClient } from '@prisma/client';
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

const authRoutes = new Hono();
const prisma = new PrismaClient();

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

    if (type === 'worker') {
      // Check if email already exists
      const existingWorker = await prisma.worker.findUnique({
        where: { email },
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

      // Create worker (wallet creation will be done in Task 4.2)
      const worker = await prisma.worker.create({
        data: {
          email,
          password_hash: passwordHash,
          name,
          reputation_score: 500, // Base score
          account_age_days: 0,
          completion_rate: 0,
          total_tasks: 0,
          total_earned: 0,
          average_rating: 0,
          dispute_rate: 0,
        },
      });

      // Generate tokens
      const accessToken = generateAccessToken({
        sub: worker.id,
        type: 'worker',
        wallet: worker.wallet_address || undefined,
      });

      const refreshToken = generateRefreshToken({
        sub: worker.id,
        type: 'worker',
        wallet: worker.wallet_address || undefined,
      });

      // Log audit trail
      await prisma.auditLog.create({
        data: {
          actor_id: worker.id,
          actor_type: 'worker',
          action: 'worker_registered',
          resource_type: 'worker',
          resource_id: worker.id,
        },
      });

      return c.json(
        {
          success: true,
          data: {
            user: {
              id: worker.id,
              email: worker.email,
              name: worker.name,
              type: 'worker',
              walletAddress: worker.wallet_address,
              reputationScore: worker.reputation_score,
            },
            accessToken,
            refreshToken,
          },
        },
        201
      );
    } else {
      // Platform registration
      const existingPlatform = await prisma.platform.findFirst({
        where: { contact_email: email },
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
      const platform = await prisma.platform.create({
        data: {
          name,
          api_key: apiKey, // Store plaintext for now (will only show once)
          api_key_hash: apiKeyHash,
          contact_email: email,
          total_payouts: 0,
          total_tasks: 0,
          active_workers: 0,
          is_active: true,
        },
      });

      // Log audit trail
      await prisma.auditLog.create({
        data: {
          actor_id: platform.id,
          actor_type: 'platform',
          action: 'platform_registered',
          resource_type: 'platform',
          resource_id: platform.id,
        },
      });

      return c.json(
        {
          success: true,
          data: {
            platform: {
              id: platform.id,
              name: platform.name,
              email: platform.contact_email,
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

    // Look up worker by email
    const worker = await prisma.worker.findUnique({
      where: { email },
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
    const isValidPassword = await verifyPassword(password, worker.password_hash);

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
    await prisma.worker.update({
      where: { id: worker.id },
      data: { last_active_at: new Date() },
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      sub: worker.id,
      type: 'worker',
      wallet: worker.wallet_address || undefined,
    });

    const refreshToken = generateRefreshToken({
      sub: worker.id,
      type: 'worker',
      wallet: worker.wallet_address || undefined,
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        actor_id: worker.id,
        actor_type: 'worker',
        action: 'worker_login',
        resource_type: 'worker',
        resource_id: worker.id,
      },
    });

    return c.json({
      success: true,
      data: {
        user: {
          id: worker.id,
          email: worker.email,
          name: worker.name,
          type: 'worker',
          walletAddress: worker.wallet_address,
          reputationScore: worker.reputation_score,
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

    // Check if user/platform still exists
    if (payload.type === 'worker') {
      const worker = await prisma.worker.findUnique({
        where: { id: payload.sub },
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
        wallet: worker.wallet_address || undefined,
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
