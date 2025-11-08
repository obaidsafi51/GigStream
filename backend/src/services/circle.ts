/**
 * Circle API Client
 * Wrapper for Circle Developer-Controlled Wallets SDK
 * Reference: https://developers.circle.com/sdk-explorer#server-side-sdks
 * 
 * CRITICAL: All wallet operations are server-side only
 * NEVER expose Circle SDK or wallet operations to frontend
 */

import { 
  initiateDeveloperControlledWalletsClient,
} from '@circle-fin/developer-controlled-wallets';
import crypto from 'crypto';

/**
 * Circle SDK client instance (singleton)
 * Note: Circle SDK only works in Node.js environment
 * For Cloudflare Workers, we use a separate wallet service
 */
let circleClient: ReturnType<typeof initiateDeveloperControlledWalletsClient> | null = null;

/**
 * Initialize Circle SDK client
 * Uses environment variables: CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET
 */
function getCircleClient() {
  if (!circleClient) {
    const apiKey = process.env.CIRCLE_API_KEY;
    const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

    if (!apiKey) {
      throw new Error('CIRCLE_API_KEY not configured in environment');
    }

    if (!entitySecret) {
      throw new Error('CIRCLE_ENTITY_SECRET not configured in environment');
    }

    try {
      circleClient = initiateDeveloperControlledWalletsClient({
        apiKey,
        entitySecret,
      });

      console.log('✓ Circle SDK initialized');
    } catch (error: any) {
      console.error('✗ Failed to initialize Circle SDK:', error.message);
      throw new Error(`Circle SDK initialization failed: ${error.message}`);
    }
  }

  return circleClient;
}



/**
 * Create Circle wallet for a user (developer-controlled)
 * Server-side only - NEVER expose wallet operations to frontend
 * 
 * @param userId - Unique identifier for the user (for wallet set naming)
 * @returns Wallet ID and blockchain address
 */
export async function createWallet(userId: string): Promise<{
  walletId: string;
  address: string;
}> {
  // Use standalone wallet service (Node.js) for Circle SDK operations
  // This runs alongside Cloudflare Workers
  const walletServiceUrl = process.env.WALLET_SERVICE_URL || 'http://localhost:3001';
  const walletServiceSecret = process.env.WALLET_SERVICE_SECRET || 'dev-secret-change-in-production';

  try {
    console.log('🔧 Calling wallet service for Circle SDK operations');
    console.log(`   Service: ${walletServiceUrl}`);
    console.log(`   Secret: ${walletServiceSecret.substring(0, 15)}...`);
    console.log(`   User ID: ${userId}`);

    const response = await fetch(`${walletServiceUrl}/create-wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Secret': walletServiceSecret,
      },
      body: JSON.stringify({
        userId: userId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Wallet service error: ${response.status} - ${error}`);
    }

    const data = await response.json() as any;

    if (!data.success || !data.data) {
      throw new Error('Wallet service returned invalid response');
    }

    const wallet = data.data;

    console.log(`✓ Wallet created via service: ${wallet.walletId}`);
    console.log(`  Address: ${wallet.address}`);
    console.log(`  Compatible with Arc blockchain: ${wallet.arcCompatible}`);

    return {
      walletId: wallet.walletId,
      address: wallet.address,
    };
  } catch (error: any) {
    console.error('✗ Wallet service call failed:', error.message);
    
    // Check if service is unreachable
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      console.error('⚠ Wallet service appears to be offline');
      console.error('  Start it with: node backend/wallet-service.mjs');
    }
    
    // Re-throw to trigger fallback in auth route
    throw error;
  }
}

/**
 * Get wallet balance (USDC)
 * 
 * @param walletId - Circle wallet ID
 * @returns USDC balance as a number (e.g., 100.50 for 100.50 USDC)
 */
export async function getWalletBalance(walletId: string): Promise<number> {
  const client = getCircleClient();

  try {
    // Get wallet details
    const response = await client.getWallet({ id: walletId });

    if (!response.data?.wallet) {
      throw new Error('Wallet not found');
    }

    // For developer-controlled wallets, we need to query token balance separately
    // Using getWalletTokenBalance endpoint
    try {
      const tokenResponse = await client.getWalletTokenBalance({ id: walletId });
      
      if (tokenResponse.data?.tokenBalances) {
        // Find USDC token balance
        const usdcBalance = tokenResponse.data.tokenBalances.find(
          (token: any) => token.token?.symbol === 'USDC' || token.token?.name?.includes('USDC')
        );

        if (usdcBalance && usdcBalance.amount) {
          const amount = parseFloat(usdcBalance.amount);
          console.log(`✓ Wallet ${walletId} balance: ${amount} USDC`);
          return amount;
        }
      }
    } catch (balanceError: any) {
      console.warn(`⚠ Could not fetch token balance: ${balanceError.message}`);
    }

    console.log(`ℹ No USDC balance found for wallet ${walletId}, returning 0`);
    return 0;
  } catch (error: any) {
    console.error('✗ Failed to get wallet balance:', error.message);
    throw new Error(`Failed to get wallet balance: ${error.message}`);
  }
}

/**
 * Execute USDC transfer via Circle API
 * Transfers USDC from one wallet to another address on blockchain
 * 
 * Note: For MVP, we'll use direct blockchain transactions via smart contracts
 * Circle SDK transfer functions are still being configured for Arc blockchain
 * 
 * @param params - Transfer parameters
 * @returns Transaction ID and hash
 */
export async function executeTransfer(params: {
  fromWalletId: string;
  toAddress: string;
  amount: number;
}): Promise<{
  transactionId: string;
  transactionHash?: string;
}> {
  const { fromWalletId, toAddress, amount } = params;

  try {
    // Step 1: Validate balance sufficient
    const balance = await getWalletBalance(fromWalletId);
    if (balance < amount) {
      throw new Error(
        `Insufficient balance: ${balance} USDC available, ${amount} USDC required`
      );
    }

    // Step 2: Validate amount (must be positive, max 6 decimals for USDC)
    if (amount <= 0) {
      throw new Error('Transfer amount must be positive');
    }

    console.log(`⏳ Transfer requested: ${amount} USDC`);
    console.log(`  From wallet: ${fromWalletId}`);
    console.log(`  To address: ${toAddress}`);

    // Step 3: For MVP, transfers will be handled by smart contracts
    // Circle Developer-Controlled Wallets will sign transactions that interact
    // with our PaymentStreaming contract, which handles USDC transfers
    
    // TODO: Implement actual Circle API transfer when Arc blockchain is fully supported
    // For now, return a mock transaction ID
    // In production, this will use client.createTransaction() with proper parameters
    
    console.warn('⚠ Transfer execution via Circle API not yet implemented for Arc');
    console.warn('  Transfers will be executed via smart contract calls');

    return {
      transactionId: `mock-tx-${Date.now()}`,
      transactionHash: undefined,
    };
  } catch (error: any) {
    console.error('✗ Failed to execute transfer:', error.message);
    throw new Error(`Transfer failed: ${error.message}`);
  }
}

/**
 * Get transaction status from Circle API
 * 
 * @param transactionId - Circle transaction ID
 * @returns Transaction status and hash
 */
export async function getTransactionStatus(transactionId: string): Promise<{
  status: 'pending' | 'confirmed' | 'failed';
  transactionHash?: string;
}> {
  const client = getCircleClient();

  try {
    // Query transaction details
    const response = await client.getTransaction({ id: transactionId });

    if (!response.data?.transaction) {
      throw new Error('Transaction not found');
    }

    const transaction = response.data.transaction;

    // Map Circle transaction state to our status
    let status: 'pending' | 'confirmed' | 'failed';
    const txState = (transaction as any).state?.toLowerCase() || 'pending';

    if (txState === 'complete' || txState === 'confirmed' || txState === 'success') {
      status = 'confirmed';
    } else if (txState === 'failed' || txState === 'denied' || txState === 'cancelled') {
      status = 'failed';
    } else {
      status = 'pending';
    }

    console.log(`✓ Transaction ${transactionId} status: ${status}`);

    return {
      status,
      transactionHash: (transaction as any).txHash || (transaction as any).transactionHash,
    };
  } catch (error: any) {
    console.error('✗ Failed to get transaction status:', error.message);
    throw new Error(`Failed to get transaction status: ${error.message}`);
  }
}

/**
 * Verify Circle webhook signature using HMAC-SHA256
 * Protects against spoofed webhook requests
 * 
 * @param payload - Raw webhook payload string
 * @param signature - Signature from X-Signature header
 * @param secret - Webhook secret from environment
 * @returns True if signature is valid
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    // Compute HMAC-SHA256 of payload using secret
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const computedSignature = hmac.digest('hex');

    // Compare signatures using timing-safe comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(computedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );

    if (isValid) {
      console.log('✓ Webhook signature verified');
    } else {
      console.warn('✗ Webhook signature verification failed');
    }

    return isValid;
  } catch (error: any) {
    console.error('✗ Webhook signature verification error:', error.message);
    return false;
  }
}

/**
 * Retry wrapper for Circle API calls
 * Implements exponential backoff for transient failures
 * 
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Result of successful function call
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on client errors (4xx)
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        console.error(`✗ Client error, not retrying: ${error.message}`);
        throw error;
      }

      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.warn(`⚠ Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

/**
 * Log Circle API request for debugging and audit
 * 
 * @param operation - Name of the operation (e.g., 'createWallet')
 * @param params - Request parameters (sensitive data will be masked)
 */
export function logCircleRequest(operation: string, params: Record<string, any>): void {
  const sanitizedParams = { ...params };

  // Mask sensitive data
  if (sanitizedParams.walletId) {
    sanitizedParams.walletId = sanitizedParams.walletId.substring(0, 8) + '...';
  }
  if (sanitizedParams.address) {
    sanitizedParams.address = sanitizedParams.address.substring(0, 10) + '...';
  }

  console.log(`📝 Circle API: ${operation}`, sanitizedParams);
}
