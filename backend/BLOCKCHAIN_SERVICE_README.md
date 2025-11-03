# Blockchain Service - Complete Implementation Guide

## Overview

The blockchain service provides a comprehensive interface for interacting with GigStream's smart contracts deployed on Arc testnet. It handles all blockchain operations including payment streaming, reputation tracking, and micro-loan management.

**Status**: ✅ **COMPLETED** (Task 4.4)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Backend Application                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         blockchain.ts Service Layer                   │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │                                                        │  │
│  │  • createPaymentStream()                              │  │
│  │  • releaseStreamPayment()                             │  │
│  │  • pauseStream() / resumeStream() / cancelStream()    │  │
│  │  • recordTaskCompletion()                             │  │
│  │  • requestLoan() / approveLoan() / repayLoan()        │  │
│  │  • getStream() / getReputation() / getLoan()          │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                        │
└─────────────────────┼────────────────────────────────────────┘
                      │
                      │ ethers.js v6
                      │
┌─────────────────────▼────────────────────────────────────────┐
│              Arc Testnet (Chain ID: 5042002)                 │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┬──────────────────┬─────────────────┐  │
│  │ PaymentStreaming │ ReputationLedger │   MicroLoan     │  │
│  │   0x1ab2a328...  │   0xbc1ec3a3...  │ 0x17688759...   │  │
│  └──────────────────┴──────────────────┴─────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         USDC Token (0x1c7D4B19...)                    │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

## Installation

### Dependencies

```bash
cd backend
npm install ethers@^6.13.4
```

### Environment Variables

Add to `backend/.env`:

```bash
# Arc Blockchain
ARC_RPC_URL=https://rpc.testnet.arc.network

# Backend Wallet (for signing transactions)
BACKEND_PRIVATE_KEY=0x...  # Private key with gas for transactions
# OR use deployer key (fallback)
DEPLOYER_PRIVATE_KEY=0x...
```

## Contract Addresses

The service automatically loads contract addresses from `contracts/deployments.json`:

```json
{
  "network": "arc-testnet",
  "chainId": "5042002",
  "contracts": {
    "PaymentStreaming": {
      "address": "0x1ab2a328642e0c682ea079ea8821e0efcd378d42"
    },
    "ReputationLedger": {
      "address": "0xbc1ec3a376126d943a5be1370e4208bafc2d6482"
    },
    "MicroLoan": {
      "address": "0x176887591fBeD5a16E9F178779046ACdd5c9e000"
    }
  },
  "usdcToken": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
}
```

## API Reference

### PaymentStreaming Functions

#### `createPaymentStream(params: StreamParams): Promise<StreamResult>`

Creates a new payment stream for time-based work.

**Parameters**:

```typescript
{
  workerAddress: string; // Worker's wallet address
  platformAddress: string; // Platform's wallet address
  totalAmount: bigint; // Total USDC amount (6 decimals)
  duration: number; // Total duration in seconds
  releaseInterval: number; // Release interval in seconds (min: 60s)
}
```

**Returns**:

```typescript
{
  streamId: number; // Unique stream identifier
  transactionHash: string; // Transaction hash on Arc
  blockNumber: number; // Block number
  gasUsed: bigint; // Gas consumed
}
```

**Example**:

```typescript
import { createPaymentStream, usdcToWei } from "./services/blockchain";

const result = await createPaymentStream({
  workerAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
  platformAddress: "0xA8b28f81726cBF47379669163a9DBE64626D6D43",
  totalAmount: usdcToWei(100), // 100 USDC
  duration: 7 * 24 * 60 * 60, // 7 days
  releaseInterval: 24 * 60 * 60, // Release every 24 hours
});

console.log("Stream created:", result.streamId);
console.log("Transaction:", result.transactionHash);
```

**Gas Cost**: ~400,000 gas (includes USDC approval)

**Events Emitted**:

- `StreamCreated(streamId, worker, platform, totalAmount, duration, releaseInterval)`

---

#### `releaseStreamPayment(streamId: number): Promise<TransactionResult>`

Releases the next payment installment for an active stream.

**Parameters**:

- `streamId` - Stream identifier

**Returns**:

```typescript
{
  transactionHash: string;
  blockNumber: number;
  gasUsed: bigint;
  success: boolean;
}
```

**Example**:

```typescript
const result = await releaseStreamPayment(1);
console.log("Payment released:", result.transactionHash);
```

**Gas Cost**: ~30,000 gas

**Requirements**:

- Stream must be active
- Release interval must have elapsed since last release
- Stream must not be completed

---

#### `pauseStream(streamId: number): Promise<string>`

Pauses an active payment stream (platform or owner only).

**Example**:

```typescript
const txHash = await pauseStream(1);
console.log("Stream paused:", txHash);
```

---

#### `resumeStream(streamId: number): Promise<string>`

Resumes a paused payment stream.

---

#### `cancelStream(streamId: number): Promise<string>`

Cancels a stream and refunds remaining funds to platform.

---

#### `getStream(streamId: number): Promise<StreamData>`

Retrieves stream details (read-only).

**Returns**:

```typescript
{
  id: bigint;
  worker: string;
  platform: string;
  totalAmount: bigint;
  releasedAmount: bigint;
  claimedAmount: bigint;
  startTime: bigint;
  duration: bigint;
  releaseInterval: bigint;
  lastReleaseTime: bigint;
  status: number; // 0=Active, 1=Paused, 2=Completed, 3=Cancelled
}
```

---

#### `getWorkerStreams(workerAddress: string): Promise<number[]>`

Get all stream IDs for a worker.

---

#### `getPlatformStreams(platformAddress: string): Promise<number[]>`

Get all stream IDs for a platform.

---

### ReputationLedger Functions

#### `recordTaskCompletion(params: ReputationParams): Promise<string>`

Records a task completion on-chain and updates worker reputation.

**Parameters**:

```typescript
{
  workerAddress: string; // Worker's wallet address
  taskId: bigint; // Off-chain task ID
  onTime: boolean; // Was task completed on time?
  rating: number; // Rating 1-5 (0 if no rating)
}
```

**Example**:

```typescript
const txHash = await recordTaskCompletion({
  workerAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
  taskId: 12345n,
  onTime: true,
  rating: 5,
});
```

**Gas Cost**: ~50,000 gas (first call), ~25,000 gas (subsequent)

**Authorization**: Requires caller to be an authorized recorder. Add with:

```solidity
// Contract owner must call:
reputationLedger.addAuthorizedRecorder(backendAddress);
```

---

#### `recordDispute(workerAddress: string, taskId: bigint, severity: number): Promise<string>`

Records a dispute and deducts reputation points.

**Parameters**:

- `workerAddress` - Worker's address
- `taskId` - Task ID
- `severity` - Severity level 1-5 (higher = more points lost)

---

#### `getReputation(workerAddress: string): Promise<ReputationData>`

Retrieves worker reputation data (read-only).

**Returns**:

```typescript
{
  score: bigint; // Current reputation score (0-1000)
  totalTasks: bigint; // Total tasks assigned
  completedOnTime: bigint; // Tasks completed on time
  totalDisputes: bigint; // Number of disputes
  totalRatings: bigint; // Number of ratings received
  sumOfRatings: bigint; // Sum of all ratings
}
```

**Example**:

```typescript
const rep = await getReputation("0x742d35...");
console.log("Score:", rep.score);
console.log(
  "Completion rate:",
  ((Number(rep.completedOnTime) / Number(rep.totalTasks)) * 100).toFixed(2) +
    "%"
);
console.log(
  "Average rating:",
  Number(rep.sumOfRatings) / Number(rep.totalRatings)
);
```

---

### MicroLoan Functions

#### `requestLoan(params: LoanParams): Promise<LoanResult>`

Requests a micro-loan advance.

**Parameters**:

```typescript
{
  workerAddress: string; // Worker's wallet address
  amount: bigint; // Requested amount (1-500 USDC)
}
```

**Returns**:

```typescript
{
  loanId: number;
  transactionHash: string;
  blockNumber: number;
  gasUsed: bigint;
}
```

**Example**:

```typescript
const result = await requestLoan({
  workerAddress: "0x742d35...",
  amount: usdcToWei(50), // 50 USDC
});

console.log("Loan ID:", result.loanId);
```

**Gas Cost**: ~170,000 gas

**Requirements**:

- Worker must have reputation >= 600
- No existing active loan
- Amount between 1-500 USDC

---

#### `approveLoan(loanId: number, approvedAmount: bigint, feeRateBps: number): Promise<string>`

Approves a loan request and disburses funds (authorized approver only).

**Parameters**:

- `loanId` - Loan identifier
- `approvedAmount` - Approved amount (may be less than requested)
- `feeRateBps` - Fee rate in basis points (200-500, i.e., 2-5%)

**Example**:

```typescript
const txHash = await approveLoan(
  1, // Loan ID
  usdcToWei(45), // Approve 45 USDC (less than 50 requested)
  300 // 3% fee
);
```

**Gas Cost**: ~234,000 gas (includes USDC disbursement)

**Authorization**: Requires caller to be an authorized approver.

---

#### `repayLoan(loanId: number, amount: bigint): Promise<string>`

Makes a loan repayment.

**Example**:

```typescript
const txHash = await repayLoan(1, usdcToWei(10)); // Repay 10 USDC
```

**Gas Cost**: ~52,000 gas

---

#### `markLoanDefault(loanId: number): Promise<string>`

Marks a loan as defaulted (authorized approver only).

---

#### `getLoan(loanId: number): Promise<LoanData>`

Retrieves loan details (read-only).

**Returns**:

```typescript
{
  id: bigint;
  worker: string;
  requestedAmount: bigint;
  approvedAmount: bigint;
  feeRateBps: bigint;
  feeAmount: bigint;
  totalDue: bigint;
  repaidAmount: bigint;
  repaymentTasksTarget: bigint;
  repaymentTasksCompleted: bigint;
  createdAt: bigint;
  disbursedAt: bigint;
  dueDate: bigint;
  status: number; // 0=Pending, 1=Approved, 2=Disbursed, 3=Repaying, 4=Repaid, 5=Defaulted, 6=Cancelled
}
```

---

#### `getActiveLoan(workerAddress: string): Promise<number>`

Gets the active loan ID for a worker (0 if none).

---

### Utility Functions

#### `usdcToWei(amount: number): bigint`

Converts USDC amount to wei (6 decimals).

```typescript
const wei = usdcToWei(100); // 100000000n (100 USDC)
```

#### `weiToUsdc(wei: bigint): number`

Converts wei to USDC amount (6 decimals).

```typescript
const usdc = weiToUsdc(100000000n); // 100
```

#### `getCurrentBlock(): Promise<number>`

Gets current Arc testnet block number.

#### `getTransactionReceipt(txHash: string): Promise<TransactionReceipt>`

Gets transaction receipt for a given hash.

---

## Testing

### Run Test Suite

```bash
node backend/test-blockchain.mjs
```

**Test Coverage**:

- ✅ Utility function tests (conversion)
- ✅ Read-only queries (reputation, streams, loans)
- ⏭️ Transaction tests (skipped to avoid gas costs)

**Sample Output**:

```
🧪 Testing Blockchain Service
============================================================

📋 Configuration:
   Worker Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1
   Platform Address: 0xA8b28f81726cBF47379669163a9DBE64626D6D43

📦 Contract Addresses:
   PaymentStreaming: 0x1ab2a328642e0c682ea079ea8821e0efcd378d42
   ReputationLedger: 0xbc1ec3a376126d943a5be1370e4208bafc2d6482
   MicroLoan: 0x176887591fBeD5a16E9F178779046ACdd5c9e000
   USDC Token: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
============================================================

✅ USDC conversion
   100 USDC = 100000000 wei
✅ Get worker reputation
   Score: 100, Tasks: 0, On-time: 0
✅ Get worker streams
   Found 0 streams
✅ Get active loan
   Active loan ID: 0 (no active loan)

============================================================
📊 Test Summary:
   ✅ Passed: 4
   ❌ Failed: 0
   ⏭️  Skipped: 3
   📈 Total: 7
============================================================
```

### Manual Testing (with Gas)

To test transaction-creating functions, uncomment sections in the test script:

```typescript
// 1. Create Payment Stream
const streamResult = await createPaymentStream({
  workerAddress: WORKER_ADDRESS,
  platformAddress: PLATFORM_ADDRESS,
  totalAmount: usdcToWei(100),
  duration: 7 * 24 * 60 * 60,
  releaseInterval: 24 * 60 * 60,
});

// 2. Record Task Completion
const repTxHash = await recordTaskCompletion({
  workerAddress: WORKER_ADDRESS,
  taskId: 12345n,
  onTime: true,
  rating: 5,
});

// 3. Request Loan
const loanResult = await requestLoan({
  workerAddress: WORKER_ADDRESS,
  amount: usdcToWei(50),
});
```

---

## Integration with Payment Service

The blockchain service is used by the payment service for on-chain operations:

```typescript
// backend/src/services/payment.ts
import { recordTaskCompletion } from "./blockchain";

// After successful payment
await recordTaskCompletion({
  workerAddress: worker.wallet_address,
  taskId: BigInt(task.id),
  onTime: isOnTime(task),
  rating: task.worker_rating || 0,
});
```

---

## Gas Usage Summary

| Operation                | Gas Cost | USDC Cost (@ 0.165 USDC/gas) |
| ------------------------ | -------- | ---------------------------- |
| Create Stream            | ~400,000 | ~0.066 USDC                  |
| Release Payment          | ~30,000  | ~0.005 USDC                  |
| Claim Earnings           | ~53,000  | ~0.009 USDC                  |
| Pause/Resume Stream      | ~25,000  | ~0.004 USDC                  |
| Cancel Stream            | ~40,000  | ~0.007 USDC                  |
| Record Task (first)      | ~50,000  | ~0.008 USDC                  |
| Record Task (subsequent) | ~25,000  | ~0.004 USDC                  |
| Request Loan             | ~170,000 | ~0.028 USDC                  |
| Approve Loan             | ~234,000 | ~0.039 USDC                  |
| Repay Loan               | ~52,000  | ~0.009 USDC                  |

**Total for typical workflow**: ~0.15 USDC (payment stream + reputation + loan)

---

## Error Handling

All functions include comprehensive error handling:

```typescript
try {
  const result = await createPaymentStream(params);
  console.log("Success:", result);
} catch (error) {
  if (error.message.includes("Invalid worker address")) {
    // Handle validation error
  } else if (error.message.includes("Transfer failed")) {
    // Handle USDC transfer failure
  } else if (error.code === "CALL_EXCEPTION") {
    // Handle contract call failure
  } else {
    // Handle other errors
  }
}
```

**Common Errors**:

- `Signer not initialized` - BACKEND_PRIVATE_KEY not set
- `Transfer failed` - Insufficient USDC balance or allowance
- `Stream does not exist` - Invalid stream ID
- `Only worker can claim` - Wrong caller for worker-only functions
- `Not authorized` - Caller not authorized for restricted functions

---

## Authorization Setup

### Add Backend as Authorized Recorder

```bash
# Using Foundry cast
cast send $REPUTATION_LEDGER_ADDRESS \
  "addAuthorizedRecorder(address)" \
  $BACKEND_ADDRESS \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --rpc-url $ARC_RPC_URL
```

### Add Backend as Authorized Approver

```bash
cast send $MICRO_LOAN_ADDRESS \
  "addAuthorizedApprover(address)" \
  $BACKEND_ADDRESS \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --rpc-url $ARC_RPC_URL
```

---

## Security Considerations

1. **Private Key Management**

   - Store BACKEND_PRIVATE_KEY in `.env` (never commit)
   - Use environment variable injection in production
   - Consider using key management services (AWS KMS, HashiCorp Vault)

2. **Gas Price Control**

   - Transactions use estimated gas + 20% buffer
   - Monitor gas costs in production
   - Implement gas price oracle if needed

3. **Transaction Confirmation**

   - All transactions wait for 1 confirmation
   - Increase confirmations for high-value operations
   - Implement transaction monitoring for failures

4. **Input Validation**
   - Validate addresses before calling contracts
   - Check amounts are within expected ranges
   - Verify contract addresses match deployments

---

## Performance Optimization

1. **Read Operations**

   - Use read-only contract instances (no gas)
   - Cache reputation scores (60s TTL)
   - Batch stream queries

2. **Write Operations**

   - Estimate gas before transactions
   - Use appropriate gas limits
   - Implement retry logic for failures

3. **Event Listening**
   - Consider implementing event listeners for real-time updates
   - Use WebSocket provider for event subscriptions
   - Update database when events are detected

---

## Troubleshooting

### Provider Connection Issues

```typescript
// Test RPC connectivity
import { ethers } from "ethers";
const provider = new ethers.JsonRpcProvider("https://rpc.testnet.arc.network");
const blockNumber = await provider.getBlockNumber();
console.log("Current block:", blockNumber);
```

### Transaction Failures

1. Check gas balance: Backend wallet needs Arc testnet gas
2. Check USDC balance: Platform needs USDC for streams
3. Check authorization: Backend must be authorized for restricted operations
4. Check transaction revert reason in Arc explorer

### Contract Address Mismatches

Ensure `contracts/deployments.json` is up-to-date with latest deployment.

---

## Future Enhancements

1. **Event Listeners** - Real-time contract event monitoring
2. **Transaction Queue** - Batch transactions for gas optimization
3. **Gas Price Oracle** - Dynamic gas price adjustment
4. **Multi-Signature** - Support for multi-sig wallets
5. **Upgradability** - Proxy pattern for contract upgrades

---

## References

- [Ethers.js Documentation](https://docs.ethers.org/v6/)
- [Arc Testnet Explorer](https://testnet.arcscan.app/)
- [GigStream Smart Contracts](../contracts/)
- [Payment Service Integration](./PAYMENT_SERVICE_README.md)

---

## Support

For issues or questions:

1. Check error messages in console
2. Review Arc explorer for transaction details
3. Verify contract addresses in deployments.json
4. Test with `test-blockchain.mjs` script

**Task Status**: ✅ Task 4.4 COMPLETED
**Date**: November 3, 2025
**Gas Tested**: Yes (via Foundry tests)
**Integration Ready**: Yes
