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
  type CreateWalletsInput,
  type CreateWalletSetInput,
} from '@circle-fin/developer-controlled-wallets';
import crypto from 'crypto';

/**
 * Circle SDK client instance (singleton)
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

    circleClient = initiateDeveloperControlledWalletsClient({
      apiKey,
      entitySecret,
    });

    console.log('✓ Circle SDK initialized');
  }

  return circleClient;
}

/**
 * Create wallet set (required before creating wallets)
 * Wallet sets group related wallets together
 */
async function createWalletSet(name: string): Promise<string> {
  const client = getCircleClient();

  try {
    const request: CreateWalletSetInput = {
      name: name,
    };

    const response = await client.createWalletSet(request);

    if (!response.data?.walletSet?.id) {
      throw new Error('Wallet set creation failed - no ID returned');
    }

    console.log(`✓ Wallet set created: ${response.data.walletSet.id}`);
    return response.data.walletSet.id;
  } catch (error: any) {
    console.error('✗ Failed to create wallet set:', error.message);
    throw new Error(`Wallet set creation failed: ${error.message}`);
  }
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
  const client = getCircleClient();

  try {
    // Step 1: Create wallet set for this user
    const walletSetName = `gigstream-user-${userId}-${Date.now()}`;
    const walletSetId = await createWalletSet(walletSetName);

    // Step 2: Create wallet in the wallet set
    // Arc is EVM-compatible, so we use EVM-TESTNET wallet type
    // Arc Testnet Chain ID: 5042002
    const request: CreateWalletsInput = {
      accountType: 'EOA', // Externally Owned Account
      blockchains: ['EVM-TESTNET'], // Arc is EVM-compatible
      count: 1,
      walletSetId: walletSetId,
    };

    const response = await client.createWallets(request);

    if (!response.data?.wallets || response.data.wallets.length === 0) {
      throw new Error('Wallet creation failed - no wallets returned');
    }

    const wallet = response.data.wallets[0];

    if (!wallet.id) {
      throw new Error('Wallet creation failed - no wallet ID returned');
    }

    // Address may be pending generation, poll if needed
    let address = wallet.address || '';
    if (!address) {
      console.log('⏳ Wallet address generation pending, waiting...');
      // In production, implement polling or webhook listener
      // For MVP, we'll return empty address and let it be populated later
      address = 'pending';
    }

    console.log(`✓ Wallet created: ${wallet.id}`);
    console.log(`  Address: ${address}`);
    console.log(`  State: ${wallet.state}`);

    return {
      walletId: wallet.id,
      address: address,
    };
  } catch (error: any) {
    console.error('✗ Failed to create wallet:', error.message);
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', JSON.stringify(error.response.data, null, 2));
    }
    throw new Error(`Wallet creation failed: ${error.message}`);
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
