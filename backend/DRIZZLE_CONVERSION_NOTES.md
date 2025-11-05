# Drizzle Conversion Notes

## Field Name Mapping (Prisma → Drizzle)

### Tasks Table

- `task_type` → `type` (field name in schema)
- `amount` → `paymentAmountUsdc` (field name in schema)
- `paid_amount` → `paidAmountUsdc`
- `worker_id` → `workerId` (camelCase in schema)
- `platform_id` → `platformId`
- `completed_at` → `completedAt`
- `due_date` → `dueDate`
- `created_at` → `createdAt`
- `updated_at` → `updatedAt`

### Reputation Events Table

- `worker_id` → `workerId`
- `task_id` → `taskId`
- `event_type` → `eventType`
- `delta` → `pointsDelta` (IMPORTANT: different field name!)
- `reason` → `description` (IMPORTANT: different field name!)
- `related_id` → `taskId` (merged with task_id)
- `previous_score` → `previousScore` (required field!)
- `new_score` → `newScore` (required field!)
- `triggered_by` → `triggeredBy`
- `created_at` → `createdAt`

### Audit Logs Table

- `actor_id` → `actorId`
- `actor_type` → `actorType`
- `resource_type` → `resourceType`
- `resource_id` → `resourceId`
- `ip_address` → `ipAddress`
- `user_agent` → `userAgent`
- `request_id` → `requestId`
- `changes_before` → `changesBefore`
- `changes_after` → `changesAfter`
- `success` → `success` (REQUIRED field, not optional!)
- `error_message` → `errorMessage`
- `created_at` → `createdAt`

### Transactions Table

- `worker_id` → `workerId`
- `task_id` → `taskId`
- `tx_hash` → `txHash`
- `tx_type` → `txType`
- `amount_usdc` → `amountUsdc`
- `fee_usdc` → `feeUsdc`
- `circle_tx_id` → `circleTxId`
- `processed_at` → `processedAt`
- `error_message` → `errorMessage`
- `created_at` → `createdAt`

### Streams Table

- `task_id` → `taskId`
- `contract_address` → `contractAddress`
- `contract_stream_id` → `contractStreamId`
- `worker_address` → `workerAddress`
- `platform_address` → `platformAddress`
- `total_amount_usdc` → `totalAmountUsdc`
- `released_amount_usdc` → `releasedAmountUsdc`
- `claimed_amount_usdc` → `claimedAmountUsdc`
- `start_time` → `startTime`
- `end_time` → `endTime`
- `release_interval_seconds` → `releaseIntervalSeconds`
- `last_release_at` → `lastReleaseAt`
- `next_release_at` → `nextReleaseAt`
- `created_at` → `createdAt`
- `updated_at` → `updatedAt`

## Critical Differences

### 1. Reputation Events

**Prisma version** only had `delta` and `reason` fields.
**Drizzle version** requires:

- `pointsDelta` (was `delta`)
- `description` (was `reason`)
- `previousScore` (NEW - required!)
- `newScore` (NEW - required!)

This means we need to calculate these values before inserting reputation events.

### 2. Audit Logs

**Prisma version** had `success` as optional.
**Drizzle version** requires `success` to be explicitly set (boolean, not null).

### 3. No Nested Includes

Drizzle doesn't support Prisma's `include` syntax. Must do manual joins or use `db.query.*` with `with` option.

Example Prisma:

```typescript
prisma.worker.findUnique({
  where: { id },
  include: {
    tasks: { take: 10 },
    transactions: true,
  },
});
```

Example Drizzle:

```typescript
// Option 1: Relational queries
const worker = await db.query.workers.findFirst({
  where: eq(workers.id, id),
  with: {
    tasks: { limit: 10 },
    transactions: true,
  },
});

// Option 2: Manual joins
const worker = await db.select().from(workers).where(eq(workers.id, id));
const workerTasks = await db
  .select()
  .from(tasks)
  .where(eq(tasks.workerId, id))
  .limit(10);
```

### 4. Transactions

Prisma:

```typescript
prisma.$transaction(async (tx) => {
  await tx.task.create({ data });
  await tx.auditLog.create({ data });
});
```

Drizzle:

```typescript
db.transaction(async (tx) => {
  await tx.insert(tasks).values(data);
  await tx.insert(auditLogs).values(data);
});
```

### 5. Aggregations

Prisma:

```typescript
const stats = await prisma.transaction.aggregate({
  where: { worker_id: workerId },
  _count: true,
  _sum: { amount: true },
});
```

Drizzle:

```typescript
import { count, sum } from "drizzle-orm";

const stats = await db
  .select({
    count: count(),
    totalAmount: sum(transactions.amountUsdc),
  })
  .from(transactions)
  .where(eq(transactions.workerId, workerId));
```

## Files Requiring Conversion

1. **src/services/database.ts** [IN PROGRESS]

   - Replace `getPrisma()` with `getDatabase()`
   - Convert all query functions
   - Fix field names

2. **src/services/payment.ts**

   - Replace `getPrisma()` with `getDatabase()`
   - Convert all Prisma queries to Drizzle
   - Fix field names in transactions, tasks, audit logs, reputation events
   - Update aggregation queries

3. **src/services/analytics.ts**

   - Replace Prisma aggregations with Drizzle
   - Update field names

4. **src/routes/auth.ts**

   - Replace `getPrisma()` with `getDatabase()`
   - Update worker lookups

5. **src/routes/demo.ts**

   - Replace `getPrisma()` with `getDatabase()`
   - Convert task creation, worker lookups
   - Fix field names

6. **src/routes/platforms.ts**

   - Replace `getPrisma()` with `getDatabase()`
   - Convert analytics queries

7. **src/middleware/auth.ts**
   - Replace Prisma with Drizzle for JWT verification

## Conversion Strategy

### Phase 1: Simple Conversions (Lookups/Reads)

- Single table queries
- No transactions
- Example: `findUnique`, `findFirst`, `findMany`

### Phase 2: Complex Queries (Joins/Aggregations)

- Multi-table queries
- Aggregations (`count`, `sum`, `avg`)
- Custom SQL for views

### Phase 3: Transactions (Writes)

- Task creation with audit logs
- Payment processing with reputation updates
- Loan creation with deductions

### Phase 4: Testing & Cleanup

- Run all test files
- Verify functionality
- Remove Prisma dependencies

## Next Steps

1. Finish database.ts conversion (fix field names in transactions)
2. Create helper function for reputation event creation (calculate prev/new scores)
3. Convert payment.ts service
4. Convert other route files
5. Test everything
6. Remove Prisma
