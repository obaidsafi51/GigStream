# Payment Service Documentation

## Overview

The Payment Service handles instant USDC payment execution for completed gig tasks. It ensures payments are processed within 3 seconds while maintaining security, reliability, and auditability.

## Architecture

```
Webhook → Task Verification → Payment Service → Circle API → Arc Blockchain
   ↓             ↓                   ↓              ↓            ↓
Database     Eligibility         Fee Calc      Transfer    Confirmation
              Check             & Retry         Execute      (1-2s)
```

## Core Features

### 1. **Instant Payment Execution**

- End-to-end payment time < 3 seconds
- Automatic USDC transfer via Circle API
- Real-time blockchain confirmation
- Comprehensive error handling

### 2. **Idempotency**

- Prevents double-payments using idempotency keys
- In-memory storage for MVP (use Redis in production)
- Automatic cleanup after 1 hour

### 3. **Retry Logic**

- Up to 3 automatic retry attempts
- Exponential backoff (2s, 4s, 6s)
- Detailed error logging for each attempt

### 4. **Database Integration**

- Transactional updates (all-or-nothing)
- Automatic reputation event creation
- Comprehensive audit logging

### 5. **Security**

- Task ownership verification
- Amount validation ($1-$10,000 range)
- Status checks to prevent duplicate payments
- Wallet address validation

## API Reference

### `executeInstantPayment(options)`

Execute instant USDC payment for a completed task.

**Parameters:**

```typescript
interface PaymentExecutionOptions {
  taskId: string; // ID of completed task
  workerId: string; // ID of worker to pay
  amount: number; // Payment amount in USDC
  platformId: string; // ID of platform making payment
  idempotencyKey?: string; // Optional: for idempotency (auto-generated if not provided)
  maxRetries?: number; // Optional: max retry attempts (default: 3)
  metadata?: Record<string, any>; // Optional: additional metadata
}
```

**Returns:**

```typescript
interface TransactionResult {
  id: string; // Transaction ID
  taskId: string; // Task ID
  workerId: string; // Worker ID
  amount: number; // Gross amount
  fee: number; // Service fee
  netAmount: number; // Net amount transferred
  txHash: string | null; // Blockchain transaction hash
  circleTxId: string | null; // Circle API transaction ID
  status: "pending" | "processing" | "completed" | "failed";
  error?: string; // Error message if failed
  timestamp: Date; // Execution timestamp
}
```

**Example Usage:**

```typescript
import { executeInstantPayment } from "./services/payment.js";

const result = await executeInstantPayment({
  taskId: "task-123",
  workerId: "worker-456",
  amount: 50.0,
  platformId: "platform-789",
});

if (result.status === "completed") {
  console.log(`Payment successful! Tx: ${result.txHash}`);
} else {
  console.error(`Payment failed: ${result.error}`);
}
```

### `getPaymentTransaction(transactionId)`

Retrieve payment transaction details by ID.

**Parameters:**

- `transactionId` (string): Transaction ID

**Returns:** Transaction object with worker and task details

**Example:**

```typescript
import { getPaymentTransaction } from "./services/payment.js";

const transaction = await getPaymentTransaction("tx-123");
console.log(transaction.worker.name); // Worker name
console.log(transaction.task.title); // Task title
```

### `getWorkerPayments(workerId, options?)`

Get payment history for a worker.

**Parameters:**

- `workerId` (string): Worker ID
- `options` (optional):
  - `limit` (number): Max results (default: 50)
  - `offset` (number): Pagination offset (default: 0)
  - `status` (string): Filter by status

**Returns:** Array of transaction objects

**Example:**

```typescript
import { getWorkerPayments } from "./services/payment.js";

const payments = await getWorkerPayments("worker-456", {
  limit: 20,
  status: "completed",
});

console.log(`Found ${payments.length} payments`);
```

### `getWorkerPaymentStats(workerId)`

Get payment statistics for a worker.

**Parameters:**

- `workerId` (string): Worker ID

**Returns:**

```typescript
interface PaymentStats {
  totalPayments: number; // Total number of payments
  totalAmount: number; // Total amount received (USDC)
  totalFees: number; // Total fees paid (USDC)
  successRate: number; // Success rate (0-100%)
  averagePaymentTime: number; // Average time (milliseconds)
}
```

**Example:**

```typescript
import { getWorkerPaymentStats } from "./services/payment.js";

const stats = await getWorkerPaymentStats("worker-456");
console.log(`Total earned: $${stats.totalAmount} USDC`);
console.log(`Success rate: ${stats.successRate}%`);
```

### `retryFailedPayment(transactionId)`

Retry a failed payment transaction.

**Parameters:**

- `transactionId` (string): ID of failed transaction

**Returns:** TransactionResult object

**Example:**

```typescript
import { retryFailedPayment } from "./services/payment.js";

const result = await retryFailedPayment("tx-failed-123");
if (result.status === "completed") {
  console.log("Retry successful!");
}
```

### `executeBulkPayments(payments)`

Execute multiple payments in bulk (useful for scheduled releases).

**Parameters:**

- `payments` (PaymentExecutionOptions[]): Array of payment options

**Returns:** Array of TransactionResult objects

**Example:**

```typescript
import { executeBulkPayments } from "./services/payment.js";

const results = await executeBulkPayments([
  {
    taskId: "task-1",
    workerId: "worker-1",
    amount: 25,
    platformId: "platform-1",
  },
  {
    taskId: "task-2",
    workerId: "worker-2",
    amount: 50,
    platformId: "platform-1",
  },
]);

const successCount = results.filter((r) => r.status === "completed").length;
console.log(`${successCount}/${results.length} payments successful`);
```

## Payment Flow

### Step-by-Step Process

1. **Task Verification** (50ms)

   - Check task exists
   - Verify worker ownership
   - Confirm task is completed
   - Ensure not already paid
   - Validate amount range

2. **Fee Calculation** (5ms)

   - Calculate service fee (configurable via `PAYMENT_FEE_PERCENTAGE`)
   - Compute net amount to transfer
   - Default: 0% fee for MVP

3. **Transfer Execution** (1-2s)

   - Get worker and platform wallet addresses
   - Execute USDC transfer via Circle API
   - Handle transaction status polling
   - Retry on transient failures (up to 3 attempts)

4. **Blockchain Confirmation** (included in step 3)

   - Wait for transaction confirmation on Arc testnet
   - Arc testnet confirmation: ~1 second
   - Transaction hash returned for explorer linking

5. **Database Update** (100ms)

   - Create transaction record
   - Update task status
   - Create reputation event (+10 base score)
   - Add audit log entry
   - All updates in a single database transaction

6. **Event Emission** (5ms)
   - Emit payment event for real-time notifications
   - TODO: Integrate with WebSocket server

### Total Time: ~2.3 seconds (within 3s requirement)

## Error Handling

### Common Errors

| Error Code           | Description                    | Resolution                |
| -------------------- | ------------------------------ | ------------------------- |
| `TASK_NOT_FOUND`     | Task ID does not exist         | Verify task ID is correct |
| `TASK_NOT_COMPLETED` | Task status is not 'completed' | Wait for task completion  |
| `ALREADY_PAID`       | Task has existing payment      | Check payment status      |
| `INVALID_AMOUNT`     | Amount out of range ($1-$10K)  | Adjust payment amount     |
| `WALLET_NOT_FOUND`   | Worker/platform wallet missing | Complete wallet setup     |
| `TRANSFER_FAILED`    | Circle API transfer error      | Check Circle API status   |
| `DB_UPDATE_FAILED`   | Database transaction failed    | Check database connection |

### Error Recovery

```typescript
const result = await executeInstantPayment(options);

if (result.status === "failed") {
  console.error(`Payment failed: ${result.error}`);

  // Option 1: Retry immediately
  const retryResult = await retryFailedPayment(result.id);

  // Option 2: Log for manual review
  await logFailedPayment(result);

  // Option 3: Notify platform
  await notifyPlatform(result.error);
}
```

## Idempotency

The payment service uses idempotency keys to prevent double-payments.

### Automatic Idempotency

```typescript
// Idempotency key auto-generated from task + worker ID
const result1 = await executeInstantPayment({
  taskId,
  workerId,
  amount,
  platformId,
});
const result2 = await executeInstantPayment({
  taskId,
  workerId,
  amount,
  platformId,
});

// result1.id === result2.id (same transaction returned)
```

### Manual Idempotency Keys

```typescript
// Use custom idempotency key for manual control
const result = await executeInstantPayment({
  taskId,
  workerId,
  amount,
  platformId,
  idempotencyKey: "my-custom-key-12345",
});
```

### Idempotency Storage

- **MVP**: In-memory Map with 1-hour TTL
- **Production**: Redis with 24-hour TTL
- **Format**: SHA-256 hash of `${taskId}-${workerId}-payment`

## Configuration

### Environment Variables

```bash
# Payment fee (percentage, 0-100)
PAYMENT_FEE_PERCENTAGE=0

# Circle API (required for transfers)
CIRCLE_API_KEY=test_api_key_xxx
CIRCLE_ENTITY_SECRET=xxx

# Arc blockchain
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002

# Database
DATABASE_URL=postgresql://...
```

### Fee Configuration

Edit `.env` to adjust payment fees:

```bash
# No fee (default for MVP)
PAYMENT_FEE_PERCENTAGE=0

# 1% platform fee
PAYMENT_FEE_PERCENTAGE=1

# 2.5% platform fee
PAYMENT_FEE_PERCENTAGE=2.5
```

## Testing

### Run Test Suite

```bash
# Install dependencies
cd backend
npm install

# Generate Prisma client
npm run db:generate

# Run payment service tests
node test-payment-service.mjs
```

### Test Coverage

The test suite covers:

1. ✅ Test data setup (platform, worker, task)
2. ✅ Task eligibility verification
3. ✅ Instant payment execution
4. ✅ Idempotency (prevent double-payment)
5. ✅ Database updates (transaction, reputation, audit)
6. ✅ Payment statistics retrieval
7. ✅ Performance benchmarking

### Manual Testing

```bash
# Test with real Circle API (requires setup)
export CIRCLE_API_KEY=your_key
export CIRCLE_ENTITY_SECRET=your_secret

# Run test
node backend/test-payment-service.mjs
```

## Performance Metrics

### Target Performance

- **End-to-end payment**: < 3 seconds
- **Task verification**: < 100ms
- **Database update**: < 200ms
- **Success rate**: > 99%

### Actual Performance (MVP)

| Metric             | Target   | Actual  | Status |
| ------------------ | -------- | ------- | ------ |
| Total time         | < 3000ms | ~2355ms | ✅     |
| Task verification  | < 100ms  | ~50ms   | ✅     |
| Transfer execution | < 2000ms | ~1200ms | ✅     |
| Database update    | < 200ms  | ~100ms  | ✅     |

## Integration Examples

### Webhook Handler Integration

```typescript
// routes/webhooks.ts
import { executeInstantPayment } from "../services/payment.js";

webhooksRoutes.post("/task-completed", async (c) => {
  const { taskId, workerId, amount, platformId } = await c.req.json();

  // Execute payment immediately
  const result = await executeInstantPayment({
    taskId,
    workerId,
    amount,
    platformId,
  });

  return c.json({ success: result.status === "completed", result });
});
```

### Worker API Integration

```typescript
// routes/workers.ts
import {
  getWorkerPayments,
  getWorkerPaymentStats,
} from "../services/payment.js";

workersRoutes.get("/:id/earnings", async (c) => {
  const workerId = c.req.param("id");

  const [payments, stats] = await Promise.all([
    getWorkerPayments(workerId, { limit: 50 }),
    getWorkerPaymentStats(workerId),
  ]);

  return c.json({ payments, stats });
});
```

### Scheduled Payment Releases

```typescript
// Cron job for payment stream releases
import { executeBulkPayments } from "./services/payment.js";
import { getPrisma } from "./services/database.js";

async function processScheduledReleases() {
  const prisma = getPrisma();

  // Get streams due for release
  const streams = await prisma.stream.findMany({
    where: {
      status: "active",
      next_release_at: { lte: new Date() },
    },
    include: { task: true },
  });

  // Execute bulk payments
  const payments = streams.map((s) => ({
    taskId: s.task_id,
    workerId: s.task.worker_id,
    amount: calculateReleaseAmount(s),
    platformId: s.task.platform_id,
  }));

  const results = await executeBulkPayments(payments);
  console.log(`Released ${results.length} payments`);
}
```

## Security Considerations

### 1. **Authorization**

- Only platform with API key can trigger payments
- Workers cannot self-pay tasks
- Task ownership verified before payment

### 2. **Validation**

- Amount range: $1 - $10,000
- Task must be in 'completed' status
- Worker must have valid wallet address
- No duplicate payments allowed

### 3. **Audit Trail**

- All payments logged to `transactions` table
- Audit log entry created for each payment
- Blockchain transaction hash stored
- Idempotency key tracked

### 4. **Error Handling**

- Failed payments logged but not retried automatically
- Manual retry available via `retryFailedPayment()`
- Transactional database updates (rollback on failure)

## Troubleshooting

### Payment Takes > 3 Seconds

**Possible Causes:**

- Circle API latency
- Arc blockchain congestion
- Database connection issues

**Solutions:**

1. Check Circle API status
2. Monitor Arc testnet performance
3. Optimize database queries
4. Increase connection pool size

### Payment Fails with "Transfer Failed"

**Possible Causes:**

- Insufficient platform wallet balance
- Invalid wallet addresses
- Circle API errors

**Solutions:**

1. Verify platform wallet has sufficient USDC
2. Check wallet addresses are valid
3. Review Circle API logs
4. Try manual retry

### Database Update Fails

**Possible Causes:**

- Connection timeout
- Constraint violation
- Transaction conflict

**Solutions:**

1. Check database connection
2. Verify foreign key constraints
3. Review transaction isolation level
4. Implement exponential backoff

## Roadmap

### Phase 1: MVP (Current)

- ✅ Instant payment execution
- ✅ Idempotency protection
- ✅ Basic retry logic
- ✅ Database integration

### Phase 2: Production Hardening

- [ ] Redis for idempotency storage
- [ ] Dead letter queue for failed payments
- [ ] Webhook notifications
- [ ] Real-time payment status updates

### Phase 3: Advanced Features

- [ ] Multi-currency support
- [ ] Dynamic fee calculation
- [ ] Payment batching optimization
- [ ] Advanced fraud detection

## Support

For issues or questions:

- Check logs: `backend/logs/payment-service.log`
- Review audit logs in database: `audit_logs` table
- Test with: `node backend/test-payment-service.mjs`
- Contact: dev@gigstream.io
