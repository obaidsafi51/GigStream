/**
 * Authentication Service
 * JWT token generation, password hashing, and validation
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWTPayload } from '../types/api';

const BCRYPT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_TOKEN_EXPIRY || '24h';
const JWT_REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d';

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload as object, JWT_SECRET, {
    expiresIn: JWT_ACCESS_TOKEN_EXPIRY,
  } as jwt.SignOptions);
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload as object, JWT_SECRET, {
    expiresIn: JWT_REFRESH_TOKEN_EXPIRY,
  } as jwt.SignOptions);
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Generate API key for platforms
 * Format: gs_live_<random_32_chars> or gs_test_<random_32_chars>
 */
export function generateApiKey(isTest: boolean = true): string {
  const prefix = isTest ? 'gs_test_' : 'gs_live_';
  const randomPart = generateRandomString(32);
  return prefix + randomPart;
}

/**
 * Hash API key for storage
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  // Use SHA-256 for API keys (faster than bcrypt, sufficient for API keys)
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Generate random string for tokens
 */
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  
  return result;
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  
  return { valid: true };
}

/**
 * Generate secure session token
 */
export function generateSessionToken(): string {
  return generateRandomString(64);
}
