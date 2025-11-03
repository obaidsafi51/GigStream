/**
 * Blockchain Interaction Service
 * Handles smart contract interactions on Arc testnet
 * 
 * @module services/blockchain
 * @description Provides functions to interact with deployed smart contracts:
 * - PaymentStreaming: Create and manage payment streams
 * - ReputationLedger: Track worker reputation on-chain
 * - MicroLoan: Request and manage advance payments
 */

import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Read deployments.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const deploymentsPath = join(__dirname, '../../../contracts/deployments.json');
const deployments = JSON.parse(readFileSync(deploymentsPath, 'utf-8'));

// ============ Types ============

export interface StreamParams {
  workerAddress: string;
  platformAddress: string;
  totalAmount: bigint; // Amount in USDC wei (6 decimals)
  duration: number; // Duration in seconds
  releaseInterval: number; // Release interval in seconds
}

export interface StreamResult {
  streamId: number;
  transactionHash: string;
  blockNumber: number;
  gasUsed: bigint;
}

export interface LoanParams {
  workerAddress: string;
  amount: bigint; // Amount in USDC wei (6 decimals)
}

export interface LoanResult {
  loanId: number;
  transactionHash: string;
  blockNumber: number;
  gasUsed: bigint;
}

export interface ReputationParams {
  workerAddress: string;
  taskId: bigint; // Off-chain task ID
  onTime: boolean;
  rating: number; // 1-5 stars (0 if no rating)
}

export interface TransactionResult {
  transactionHash: string;
  blockNumber: number;
  gasUsed: bigint;
  success: boolean;
}

// ============ Environment Variables ============

const ARC_RPC_URL = process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network';
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const BACKEND_PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY || DEPLOYER_PRIVATE_KEY;

if (!BACKEND_PRIVATE_KEY) {
  console.warn('⚠️  BACKEND_PRIVATE_KEY not set - blockchain interactions will fail');
}

// ============ Contract Addresses ============

const PAYMENT_STREAMING_ADDRESS = deployments.contracts.PaymentStreaming.address;
const REPUTATION_LEDGER_ADDRESS = deployments.contracts.ReputationLedger.address;
const MICRO_LOAN_ADDRESS = deployments.contracts.MicroLoan.address;
const USDC_TOKEN_ADDRESS = deployments.usdcToken;

// ============ Contract ABIs ============

// PaymentStreaming ABI (essential functions only)
const PAYMENT_STREAMING_ABI = [
  'function createStream(address worker, uint256 totalAmount, uint256 duration, uint256 releaseInterval) external returns (uint256)',
  'function releasePayment(uint256 streamId) external',
  'function claimEarnings(uint256 streamId) external',
  'function pauseStream(uint256 streamId) external',
  'function resumeStream(uint256 streamId) external',
  'function cancelStream(uint256 streamId) external',
  'function getStream(uint256 streamId) external view returns (tuple(uint256 id, address worker, address platform, uint256 totalAmount, uint256 releasedAmount, uint256 claimedAmount, uint256 startTime, uint256 duration, uint256 releaseInterval, uint256 lastReleaseTime, uint8 status))',
  'function getWorkerStreams(address worker) external view returns (uint256[])',
  'function getPlatformStreams(address platform) external view returns (uint256[])',
  'event StreamCreated(uint256 indexed streamId, address indexed worker, address indexed platform, uint256 totalAmount, uint256 duration, uint256 releaseInterval)',
  'event PaymentReleased(uint256 indexed streamId, address indexed worker, uint256 amount, uint256 totalReleased)',
  'event EarningsClaimed(uint256 indexed streamId, address indexed worker, uint256 amount)',
  'event StreamPaused(uint256 indexed streamId, address indexed by)',
  'event StreamResumed(uint256 indexed streamId, address indexed by)',
  'event StreamCancelled(uint256 indexed streamId, address indexed by, uint256 refundAmount)',
];

// ReputationLedger ABI
const REPUTATION_LEDGER_ABI = [
  'function recordTaskCompletion(address worker, uint256 taskId, bool onTime, uint8 rating) external',
  'function recordDispute(address worker, uint256 taskId, uint8 severity) external',
  'function getReputation(address worker) external view returns (tuple(uint256 score, uint256 totalTasks, uint256 completedOnTime, uint256 totalDisputes, uint256 totalRatings, uint256 sumOfRatings))',
  'function addAuthorizedRecorder(address recorder) external',
  'function removeAuthorizedRecorder(address recorder) external',
  'event TaskRecorded(address indexed worker, uint256 indexed taskId, bool onTime, uint8 rating, uint256 newScore)',
  'event DisputeRecorded(address indexed worker, uint256 indexed taskId, uint8 severity, uint256 pointsLost, uint256 newScore)',
];

// MicroLoan ABI
const MICRO_LOAN_ABI = [
  'function requestAdvance(uint256 amount) external returns (uint256)',
  'function approveLoan(uint256 loanId, uint256 approvedAmount, uint256 feeRateBps) external',
  'function repayFromEarnings(uint256 loanId, uint256 amount) external',
  'function markDefault(uint256 loanId) external',
  'function cancelLoan(uint256 loanId) external',
  'function getLoan(uint256 loanId) external view returns (tuple(uint256 id, address worker, uint256 requestedAmount, uint256 approvedAmount, uint256 feeRateBps, uint256 feeAmount, uint256 totalDue, uint256 repaidAmount, uint256 repaymentTasksTarget, uint256 repaymentTasksCompleted, uint256 createdAt, uint256 disbursedAt, uint256 dueDate, uint8 status))',
  'function getActiveLoan(address worker) external view returns (uint256)',
  'function addAuthorizedApprover(address approver) external',
  'event LoanRequested(uint256 indexed loanId, address indexed worker, uint256 requestedAmount)',
  'event LoanApproved(uint256 indexed loanId, uint256 approvedAmount, uint256 feeRateBps)',
  'event LoanDisbursed(uint256 indexed loanId, uint256 amount)',
  'event RepaymentMade(uint256 indexed loanId, uint256 amount, uint256 remaining)',
];

// USDC ERC20 ABI
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
];

// ============ Provider & Signer Setup ============

let provider: ethers.JsonRpcProvider;
let signer: ethers.Wallet;

/**
 * Initialize provider and signer
 * @private
 */
function initializeProvider(): void {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(ARC_RPC_URL);
    console.log('✅ Arc testnet provider initialized:', ARC_RPC_URL);
  }
  
  if (!signer && BACKEND_PRIVATE_KEY) {
    signer = new ethers.Wallet(BACKEND_PRIVATE_KEY, provider);
    console.log('✅ Signer initialized:', signer.address);
  }
}

/**
 * Get contract instance
 * @private
 */
function getContract(address: string, abi: string[]): ethers.Contract {
  initializeProvider();
  
  if (!signer) {
    throw new Error('Signer not initialized - BACKEND_PRIVATE_KEY required');
  }
  
  return new ethers.Contract(address, abi, signer);
}

/**
 * Get read-only contract instance
 * @private
 */
function getReadOnlyContract(address: string, abi: string[]): ethers.Contract {
  initializeProvider();
  return new ethers.Contract(address, abi, provider);
}

// ============ Gas Estimation Utilities ============

/**
 * Estimate gas for a transaction with 20% buffer
 * @private
 */
async function estimateGasWithBuffer(
  contract: ethers.Contract,
  method: string,
  args: any[]
): Promise<bigint> {
  const estimatedGas = await contract[method].estimateGas(...args);
  // Add 20% buffer for safety
  return (estimatedGas * 120n) / 100n;
}

/**
 * Wait for transaction confirmation
 * @private
 */
async function waitForConfirmation(
  tx: ethers.ContractTransactionResponse
): Promise<ethers.ContractTransactionReceipt | null> {
  console.log(`⏳ Waiting for transaction confirmation: ${tx.hash}`);
  const receipt = await tx.wait(1); // Wait for 1 confirmation
  
  if (receipt) {
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
  }
  
  return receipt;
}

// ============ PaymentStreaming Functions ============

/**
 * Create a new payment stream
 * 
 * @param params Stream parameters
 * @returns Stream ID and transaction details
 * 
 * @example
 * ```typescript
 * const result = await createPaymentStream({
 *   workerAddress: '0x123...',
 *   platformAddress: '0x456...',
 *   totalAmount: ethers.parseUnits('100', 6), // 100 USDC
 *   duration: 7 * 24 * 60 * 60, // 7 days
 *   releaseInterval: 24 * 60 * 60 // 24 hours
 * });
 * console.log('Stream ID:', result.streamId);
 * ```
 */
export async function createPaymentStream(params: StreamParams): Promise<StreamResult> {
  try {
    console.log('🔵 Creating payment stream...');
    console.log('   Worker:', params.workerAddress);
    console.log('   Platform:', params.platformAddress);
    console.log('   Amount:', ethers.formatUnits(params.totalAmount, 6), 'USDC');
    console.log('   Duration:', params.duration, 'seconds');
    console.log('   Release Interval:', params.releaseInterval, 'seconds');
    
    const streamingContract = getContract(PAYMENT_STREAMING_ADDRESS, PAYMENT_STREAMING_ABI);
    const usdcContract = getContract(USDC_TOKEN_ADDRESS, ERC20_ABI);
    
    // Check and approve USDC if needed
    const allowance = await usdcContract.allowance(params.platformAddress, PAYMENT_STREAMING_ADDRESS);
    if (allowance < params.totalAmount) {
      console.log('📝 Approving USDC...');
      const approveTx = await usdcContract.approve(PAYMENT_STREAMING_ADDRESS, params.totalAmount);
      await waitForConfirmation(approveTx);
    }
    
    // Estimate gas
    const gasLimit = await estimateGasWithBuffer(
      streamingContract,
      'createStream',
      [params.workerAddress, params.totalAmount, params.duration, params.releaseInterval]
    );
    
    // Create stream
    const tx = await streamingContract.createStream(
      params.workerAddress,
      params.totalAmount,
      params.duration,
      params.releaseInterval,
      { gasLimit }
    );
    
    const receipt = await waitForConfirmation(tx);
    
    if (!receipt) {
      throw new Error('Transaction failed - no receipt');
    }
    
    // Parse StreamCreated event to get stream ID
    const event = receipt.logs
      .map(log => {
        try {
          return streamingContract.interface.parseLog({
            topics: log.topics as string[],
            data: log.data
          });
        } catch {
          return null;
        }
      })
      .find(e => e && e.name === 'StreamCreated');
    
    if (!event) {
      throw new Error('StreamCreated event not found');
    }
    
    const streamId = Number(event.args[0]);
    
    console.log('✅ Payment stream created successfully!');
    console.log('   Stream ID:', streamId);
    console.log('   Transaction hash:', receipt.hash);
    
    return {
      streamId,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
    };
  } catch (error) {
    console.error('❌ Error creating payment stream:', error);
    throw error;
  }
}

/**
 * Release payment from a stream
 * 
 * @param streamId Stream identifier
 * @returns Transaction details
 */
export async function releaseStreamPayment(streamId: number): Promise<TransactionResult> {
  try {
    console.log('🔵 Releasing payment for stream:', streamId);
    
    const contract = getContract(PAYMENT_STREAMING_ADDRESS, PAYMENT_STREAMING_ABI);
    
    const gasLimit = await estimateGasWithBuffer(contract, 'releasePayment', [streamId]);
    
    const tx = await contract.releasePayment(streamId, { gasLimit });
    const receipt = await waitForConfirmation(tx);
    
    if (!receipt) {
      throw new Error('Transaction failed - no receipt');
    }
    
    console.log('✅ Payment released successfully!');
    
    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      success: true,
    };
  } catch (error) {
    console.error('❌ Error releasing payment:', error);
    throw error;
  }
}

/**
 * Pause a payment stream
 * 
 * @param streamId Stream identifier
 * @returns Transaction hash
 */
export async function pauseStream(streamId: number): Promise<string> {
  try {
    console.log('🔵 Pausing stream:', streamId);
    
    const contract = getContract(PAYMENT_STREAMING_ADDRESS, PAYMENT_STREAMING_ABI);
    const tx = await contract.pauseStream(streamId);
    const receipt = await waitForConfirmation(tx);
    
    if (!receipt) {
      throw new Error('Transaction failed');
    }
    
    console.log('✅ Stream paused successfully!');
    return receipt.hash;
  } catch (error) {
    console.error('❌ Error pausing stream:', error);
    throw error;
  }
}

/**
 * Resume a paused payment stream
 * 
 * @param streamId Stream identifier
 * @returns Transaction hash
 */
export async function resumeStream(streamId: number): Promise<string> {
  try {
    console.log('🔵 Resuming stream:', streamId);
    
    const contract = getContract(PAYMENT_STREAMING_ADDRESS, PAYMENT_STREAMING_ABI);
    const tx = await contract.resumeStream(streamId);
    const receipt = await waitForConfirmation(tx);
    
    if (!receipt) {
      throw new Error('Transaction failed');
    }
    
    console.log('✅ Stream resumed successfully!');
    return receipt.hash;
  } catch (error) {
    console.error('❌ Error resuming stream:', error);
    throw error;
  }
}

/**
 * Cancel a payment stream
 * 
 * @param streamId Stream identifier
 * @returns Transaction hash
 */
export async function cancelStream(streamId: number): Promise<string> {
  try {
    console.log('🔵 Cancelling stream:', streamId);
    
    const contract = getContract(PAYMENT_STREAMING_ADDRESS, PAYMENT_STREAMING_ABI);
    const tx = await contract.cancelStream(streamId);
    const receipt = await waitForConfirmation(tx);
    
    if (!receipt) {
      throw new Error('Transaction failed');
    }
    
    console.log('✅ Stream cancelled successfully!');
    return receipt.hash;
  } catch (error) {
    console.error('❌ Error cancelling stream:', error);
    throw error;
  }
}

/**
 * Get stream details
 * 
 * @param streamId Stream identifier
 * @returns Stream data
 */
export async function getStream(streamId: number) {
  const contract = getReadOnlyContract(PAYMENT_STREAMING_ADDRESS, PAYMENT_STREAMING_ABI);
  return await contract.getStream(streamId);
}

/**
 * Get all streams for a worker
 * 
 * @param workerAddress Worker wallet address
 * @returns Array of stream IDs
 */
export async function getWorkerStreams(workerAddress: string): Promise<number[]> {
  const contract = getReadOnlyContract(PAYMENT_STREAMING_ADDRESS, PAYMENT_STREAMING_ABI);
  const streamIds = await contract.getWorkerStreams(workerAddress);
  return streamIds.map((id: bigint) => Number(id));
}

/**
 * Get all streams for a platform
 * 
 * @param platformAddress Platform wallet address
 * @returns Array of stream IDs
 */
export async function getPlatformStreams(platformAddress: string): Promise<number[]> {
  const contract = getReadOnlyContract(PAYMENT_STREAMING_ADDRESS, PAYMENT_STREAMING_ABI);
  const streamIds = await contract.getPlatformStreams(platformAddress);
  return streamIds.map((id: bigint) => Number(id));
}

// ============ ReputationLedger Functions ============

/**
 * Record task completion on-chain
 * 
 * @param params Task completion parameters
 * @returns Transaction hash
 * 
 * @example
 * ```typescript
 * await recordTaskCompletion({
 *   workerAddress: '0x123...',
 *   taskId: 12345n,
 *   onTime: true,
 *   rating: 5
 * });
 * ```
 */
export async function recordTaskCompletion(params: ReputationParams): Promise<string> {
  try {
    console.log('🔵 Recording task completion...');
    console.log('   Worker:', params.workerAddress);
    console.log('   Task ID:', params.taskId.toString());
    console.log('   On Time:', params.onTime);
    console.log('   Rating:', params.rating);
    
    const contract = getContract(REPUTATION_LEDGER_ADDRESS, REPUTATION_LEDGER_ABI);
    
    const gasLimit = await estimateGasWithBuffer(
      contract,
      'recordTaskCompletion',
      [params.workerAddress, params.taskId, params.onTime, params.rating]
    );
    
    const tx = await contract.recordTaskCompletion(
      params.workerAddress,
      params.taskId,
      params.onTime,
      params.rating,
      { gasLimit }
    );
    
    const receipt = await waitForConfirmation(tx);
    
    if (!receipt) {
      throw new Error('Transaction failed');
    }
    
    console.log('✅ Task completion recorded successfully!');
    return receipt.hash;
  } catch (error) {
    console.error('❌ Error recording task completion:', error);
    throw error;
  }
}

/**
 * Record a dispute on-chain
 * 
 * @param workerAddress Worker address
 * @param taskId Task ID
 * @param severity Severity level (1-5)
 * @returns Transaction hash
 */
export async function recordDispute(
  workerAddress: string,
  taskId: bigint,
  severity: number
): Promise<string> {
  try {
    console.log('🔵 Recording dispute...');
    console.log('   Worker:', workerAddress);
    console.log('   Task ID:', taskId.toString());
    console.log('   Severity:', severity);
    
    const contract = getContract(REPUTATION_LEDGER_ADDRESS, REPUTATION_LEDGER_ABI);
    
    const tx = await contract.recordDispute(workerAddress, taskId, severity);
    const receipt = await waitForConfirmation(tx);
    
    if (!receipt) {
      throw new Error('Transaction failed');
    }
    
    console.log('✅ Dispute recorded successfully!');
    return receipt.hash;
  } catch (error) {
    console.error('❌ Error recording dispute:', error);
    throw error;
  }
}

/**
 * Get worker reputation data
 * 
 * @param workerAddress Worker address
 * @returns Reputation data
 */
export async function getReputation(workerAddress: string) {
  const contract = getReadOnlyContract(REPUTATION_LEDGER_ADDRESS, REPUTATION_LEDGER_ABI);
  return await contract.getReputation(workerAddress);
}

// ============ MicroLoan Functions ============

/**
 * Request a micro-loan advance
 * 
 * @param params Loan parameters
 * @returns Loan ID and transaction details
 * 
 * @example
 * ```typescript
 * const result = await requestLoan({
 *   workerAddress: '0x123...',
 *   amount: ethers.parseUnits('50', 6) // 50 USDC
 * });
 * console.log('Loan ID:', result.loanId);
 * ```
 */
export async function requestLoan(params: LoanParams): Promise<LoanResult> {
  try {
    console.log('🔵 Requesting loan...');
    console.log('   Worker:', params.workerAddress);
    console.log('   Amount:', ethers.formatUnits(params.amount, 6), 'USDC');
    
    const contract = getContract(MICRO_LOAN_ADDRESS, MICRO_LOAN_ABI);
    
    const gasLimit = await estimateGasWithBuffer(contract, 'requestAdvance', [params.amount]);
    
    const tx = await contract.requestAdvance(params.amount, { gasLimit });
    const receipt = await waitForConfirmation(tx);
    
    if (!receipt) {
      throw new Error('Transaction failed');
    }
    
    // Parse LoanRequested event to get loan ID
    const event = receipt.logs
      .map(log => {
        try {
          return contract.interface.parseLog({
            topics: log.topics as string[],
            data: log.data
          });
        } catch {
          return null;
        }
      })
      .find(e => e && e.name === 'LoanRequested');
    
    if (!event) {
      throw new Error('LoanRequested event not found');
    }
    
    const loanId = Number(event.args[0]);
    
    console.log('✅ Loan requested successfully!');
    console.log('   Loan ID:', loanId);
    
    return {
      loanId,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
    };
  } catch (error) {
    console.error('❌ Error requesting loan:', error);
    throw error;
  }
}

/**
 * Approve a loan request (authorized approver only)
 * 
 * @param loanId Loan identifier
 * @param approvedAmount Approved amount (may be less than requested)
 * @param feeRateBps Fee rate in basis points (200-500)
 * @returns Transaction hash
 */
export async function approveLoan(
  loanId: number,
  approvedAmount: bigint,
  feeRateBps: number
): Promise<string> {
  try {
    console.log('🔵 Approving loan:', loanId);
    console.log('   Approved Amount:', ethers.formatUnits(approvedAmount, 6), 'USDC');
    console.log('   Fee Rate:', feeRateBps / 100, '%');
    
    const contract = getContract(MICRO_LOAN_ADDRESS, MICRO_LOAN_ABI);
    
    const tx = await contract.approveLoan(loanId, approvedAmount, feeRateBps);
    const receipt = await waitForConfirmation(tx);
    
    if (!receipt) {
      throw new Error('Transaction failed');
    }
    
    console.log('✅ Loan approved and disbursed successfully!');
    return receipt.hash;
  } catch (error) {
    console.error('❌ Error approving loan:', error);
    throw error;
  }
}

/**
 * Make a loan repayment
 * 
 * @param loanId Loan identifier
 * @param amount Repayment amount
 * @returns Transaction hash
 */
export async function repayLoan(loanId: number, amount: bigint): Promise<string> {
  try {
    console.log('🔵 Repaying loan:', loanId);
    console.log('   Amount:', ethers.formatUnits(amount, 6), 'USDC');
    
    const contract = getContract(MICRO_LOAN_ADDRESS, MICRO_LOAN_ABI);
    
    const tx = await contract.repayFromEarnings(loanId, amount);
    const receipt = await waitForConfirmation(tx);
    
    if (!receipt) {
      throw new Error('Transaction failed');
    }
    
    console.log('✅ Loan repayment successful!');
    return receipt.hash;
  } catch (error) {
    console.error('❌ Error repaying loan:', error);
    throw error;
  }
}

/**
 * Mark a loan as defaulted (authorized approver only)
 * 
 * @param loanId Loan identifier
 * @returns Transaction hash
 */
export async function markLoanDefault(loanId: number): Promise<string> {
  try {
    console.log('🔵 Marking loan as defaulted:', loanId);
    
    const contract = getContract(MICRO_LOAN_ADDRESS, MICRO_LOAN_ABI);
    const tx = await contract.markDefault(loanId);
    const receipt = await waitForConfirmation(tx);
    
    if (!receipt) {
      throw new Error('Transaction failed');
    }
    
    console.log('✅ Loan marked as defaulted!');
    return receipt.hash;
  } catch (error) {
    console.error('❌ Error marking loan as defaulted:', error);
    throw error;
  }
}

/**
 * Get loan details
 * 
 * @param loanId Loan identifier
 * @returns Loan data
 */
export async function getLoan(loanId: number) {
  const contract = getReadOnlyContract(MICRO_LOAN_ADDRESS, MICRO_LOAN_ABI);
  return await contract.getLoan(loanId);
}

/**
 * Get active loan for a worker
 * 
 * @param workerAddress Worker address
 * @returns Active loan ID (0 if none)
 */
export async function getActiveLoan(workerAddress: string): Promise<number> {
  const contract = getReadOnlyContract(MICRO_LOAN_ADDRESS, MICRO_LOAN_ABI);
  const loanId = await contract.getActiveLoan(workerAddress);
  return Number(loanId);
}

// ============ Utility Functions ============

/**
 * Get current block number
 */
export async function getCurrentBlock(): Promise<number> {
  initializeProvider();
  return await provider.getBlockNumber();
}

/**
 * Get transaction receipt
 */
export async function getTransactionReceipt(txHash: string) {
  initializeProvider();
  return await provider.getTransactionReceipt(txHash);
}

/**
 * Convert USDC amount to wei (6 decimals)
 */
export function usdcToWei(amount: number): bigint {
  return ethers.parseUnits(amount.toString(), 6);
}

/**
 * Convert wei to USDC amount (6 decimals)
 */
export function weiToUsdc(wei: bigint): number {
  return parseFloat(ethers.formatUnits(wei, 6));
}

// ============ Export Contract Addresses ============

export const CONTRACT_ADDRESSES = {
  paymentStreaming: PAYMENT_STREAMING_ADDRESS,
  reputationLedger: REPUTATION_LEDGER_ADDRESS,
  microLoan: MICRO_LOAN_ADDRESS,
  usdcToken: USDC_TOKEN_ADDRESS,
} as const;

console.log('🚀 Blockchain service initialized');
console.log('   Network: Arc Testnet');
console.log('   Chain ID:', deployments.chainId);
console.log('   PaymentStreaming:', PAYMENT_STREAMING_ADDRESS);
console.log('   ReputationLedger:', REPUTATION_LEDGER_ADDRESS);
console.log('   MicroLoan:', MICRO_LOAN_ADDRESS);
console.log('   USDC Token:', USDC_TOKEN_ADDRESS);
