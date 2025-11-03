# Blockchain Service - Quick Reference

## Import

```typescript
import {
  // PaymentStreaming
  createPaymentStream,
  releaseStreamPayment,
  pauseStream,
  resumeStream,
  cancelStream,
  getStream,
  getWorkerStreams,
  getPlatformStreams,

  // ReputationLedger
  recordTaskCompletion,
  recordDispute,
  getReputation,

  // MicroLoan
  requestLoan,
  approveLoan,
  repayLoan,
  markLoanDefault,
  getLoan,
  getActiveLoan,

  // Utilities
  usdcToWei,
  weiToUsdc,
  getCurrentBlock,
  getTransactionReceipt,
  CONTRACT_ADDRESSES,

  // Types
  StreamParams,
  StreamResult,
  LoanParams,
  LoanResult,
  ReputationParams,
  TransactionResult,
} from "./services/blockchain";
```

## Quick Examples

### Create Payment Stream

```typescript
const result = await createPaymentStream({
  workerAddress: "0x...",
  platformAddress: "0x...",
  totalAmount: usdcToWei(100), // 100 USDC
  duration: 7 * 24 * 60 * 60, // 7 days
  releaseInterval: 24 * 60 * 60, // Release every 24 hours
});
console.log("Stream ID:", result.streamId);
```

### Record Task Completion

```typescript
const txHash = await recordTaskCompletion({
  workerAddress: "0x...",
  taskId: 12345n,
  onTime: true,
  rating: 5, // 1-5 stars
});
```

### Request Loan

```typescript
const result = await requestLoan({
  workerAddress: "0x...",
  amount: usdcToWei(50), // 50 USDC
});
console.log("Loan ID:", result.loanId);
```

### Query Data (No Gas)

```typescript
// Get reputation
const rep = await getReputation("0x...");
console.log("Score:", rep.score);

// Get streams
const streamIds = await getWorkerStreams("0x...");

// Get loan
const loan = await getLoan(1);
```

## Contract Addresses

```typescript
import { CONTRACT_ADDRESSES } from "./services/blockchain";

console.log(CONTRACT_ADDRESSES.paymentStreaming); // 0x1ab2a328...
console.log(CONTRACT_ADDRESSES.reputationLedger); // 0xbc1ec3a3...
console.log(CONTRACT_ADDRESSES.microLoan); // 0x17688759...
console.log(CONTRACT_ADDRESSES.usdcToken); // 0x1c7D4B19...
```

## Gas Costs

| Operation       | Gas     | Cost          |
| --------------- | ------- | ------------- |
| Create Stream   | ~400k   | $0.066        |
| Release Payment | ~30k    | $0.005        |
| Record Task     | ~25-50k | $0.004-$0.008 |
| Request Loan    | ~170k   | $0.028        |
| Approve Loan    | ~234k   | $0.039        |
| Repay Loan      | ~52k    | $0.009        |

## Environment Setup

```bash
# .env
ARC_RPC_URL=https://rpc.testnet.arc.network
BACKEND_PRIVATE_KEY=0x...  # Private key with gas
```

## Testing

```bash
# Run test suite
node backend/test-blockchain.mjs

# Expected output:
# ✅ Passed: 4
# ❌ Failed: 0
# ⏭️  Skipped: 3
```

## Common Patterns

### Payment Flow with Reputation

```typescript
// After successful payment
await recordTaskCompletion({
  workerAddress: worker.wallet_address,
  taskId: BigInt(task.id),
  onTime: task.completed_at <= task.deadline,
  rating: task.worker_rating || 0,
});
```

### Loan Approval Flow

```typescript
// 1. Check reputation
const rep = await getReputation(workerAddress);
if (rep.score < 600n) {
  throw new Error("Insufficient reputation");
}

// 2. Calculate risk-based fee
const feeRate = rep.score > 800n ? 200 : 300; // 2% or 3%

// 3. Approve loan
await approveLoan(loanId, approvedAmount, feeRate);
```

### Stream Management

```typescript
// Create stream
const stream = await createPaymentStream(params);

// Release payments (scheduled job)
await releaseStreamPayment(stream.streamId);

// Pause if needed
await pauseStream(stream.streamId);

// Resume
await resumeStream(stream.streamId);
```

## Error Handling

```typescript
try {
  const result = await createPaymentStream(params);
} catch (error) {
  if (error.code === "CALL_EXCEPTION") {
    // Contract reverted
  } else if (error.message.includes("Transfer failed")) {
    // Insufficient USDC
  } else {
    // Other error
  }
}
```

## Full Documentation

See `backend/BLOCKCHAIN_SERVICE_README.md` for complete API reference.
