# Prisma to Drizzle ORM Migration Guide

**Date:** November 5, 2025  
**Purpose:** Migrate GigStream backend from Prisma to Drizzle ORM for optimal Cloudflare Workers performance  
**Priority:** High (Production Blocker)  
**Estimated Time:** 4-6 hours

---

## Executive Summary

### Why Migrate?

**Current State (Prisma + Neon Adapter):**

- ❌ Bundle size: ~1MB+ (slow cold starts)
- ❌ Cold start latency: ~500ms-1s
- ❌ Limited features (no transactions, middleware)
- ❌ HTTP adapter workaround (not optimal)

**Target State (Drizzle ORM):**

- ✅ Bundle size: ~100KB (10x smaller)
- ✅ Cold start latency: <50ms
- ✅ Full feature support
- ✅ Native Cloudflare Workers support
- ✅ Native Neon WebSocket support

---

## Migration Strategy

### Phase 1: Setup (30 mins)

1. Install Drizzle dependencies
2. Create Drizzle configuration
3. Set up schema structure

### Phase 2: Schema Conversion (1 hour)

1. Convert Prisma schema to Drizzle schema
2. Define all 8 tables with types
3. Define relationships and indexes

### Phase 3: Migration Generation (30 mins)

1. Generate Drizzle migrations
2. Compare with existing Prisma migrations
3. Verify schema compatibility

### Phase 4: Query Conversion (2-3 hours)

1. Replace Prisma queries in auth service
2. Replace Prisma queries in payment service
3. Replace Prisma queries in blockchain service
4. Update all route handlers

### Phase 5: Testing & Cleanup (1 hour)

1. Run all test scripts
2. Verify database operations
3. Remove Prisma dependencies

---

## Step-by-Step Implementation

### Step 1: Install Dependencies

```bash
cd backend

# Install Drizzle ORM
npm install drizzle-orm @neondatabase/serverless

# Install Drizzle Kit (for migrations)
npm install -D drizzle-kit

# Later: Remove Prisma (after verification)
# npm uninstall prisma @prisma/client @prisma/adapter-neon
```

### Step 2: Create Drizzle Configuration

**File:** `backend/drizzle.config.ts`

```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

### Step 3: Create Database Connection

**File:** `backend/src/db/client.ts`

```typescript
import { drizzle } from "drizzle-orm/neon-http";
import { neonConfig } from "@neondatabase/serverless";
import * as schema from "./schema";

// Configure Neon for Cloudflare Workers
if (typeof WebSocket === "undefined") {
  // Use fetch for Cloudflare Workers environment
  neonConfig.webSocketConstructor = undefined;
  neonConfig.fetchFunction = fetch;
}

export function getDb(databaseUrl: string) {
  return drizzle(databaseUrl, { schema });
}

export type Database = ReturnType<typeof getDb>;
```

### Step 4: Convert Prisma Schema to Drizzle

**File:** `backend/src/db/schema.ts`

This will be the main schema file with all 8 tables. See detailed schema below.

### Step 5: Generate Migrations

```bash
# Generate migration from schema
npx drizzle-kit generate:pg

# Push schema to database (for testing)
npx drizzle-kit push:pg

# Run migrations
npx drizzle-kit migrate
```

---

## Detailed Drizzle Schema

### Table: workers

```typescript
import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  numeric,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const workers = pgTable(
  "workers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).unique(),
    emailVerified: boolean("email_verified").default(false),
    passwordHash: varchar("password_hash", { length: 255 }),
    displayName: varchar("display_name", { length: 100 }).notNull(),
    walletAddress: varchar("wallet_address", { length: 42 }).unique().notNull(),
    walletId: varchar("wallet_id", { length: 255 }),
    phoneNumber: varchar("phone_number", { length: 20 }),
    phoneVerified: boolean("phone_verified").default(false),

    // Risk & reputation
    reputationScore: integer("reputation_score").default(100),
    totalTasksCompleted: integer("total_tasks_completed").default(0),
    totalEarningsUsdc: numeric("total_earnings_usdc", {
      precision: 20,
      scale: 6,
    }).default("0"),

    // Account status
    status: varchar("status", { length: 20 }).default("active"),
    kycStatus: varchar("kyc_status", { length: 20 }).default("not_required"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    lastLoginAt: timestamp("last_login_at"),

    // Metadata
    metadata: jsonb("metadata").default({}),
  },
  (table) => ({
    emailIdx: index("idx_workers_email").on(table.email),
    walletIdx: index("idx_workers_wallet").on(table.walletAddress),
    reputationIdx: index("idx_workers_reputation").on(table.reputationScore),
    statusIdx: index("idx_workers_status").on(table.status),
    createdIdx: index("idx_workers_created").on(table.createdAt),
  })
);
```

### Table: platforms

```typescript
export const platforms = pgTable(
  "platforms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    email: varchar("email", { length: 255 }).unique().notNull(),
    apiKeyHash: varchar("api_key_hash", { length: 64 }).unique().notNull(),
    webhookUrl: varchar("webhook_url", { length: 500 }),
    webhookSecret: varchar("webhook_secret", { length: 255 }),

    // Stats
    totalWorkers: integer("total_workers").default(0),
    totalPaymentsUsdc: numeric("total_payments_usdc", {
      precision: 20,
      scale: 6,
    }).default("0"),

    // Status
    status: varchar("status", { length: 20 }).default("active"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),

    // Metadata
    metadata: jsonb("metadata").default({}),
  },
  (table) => ({
    apiKeyIdx: index("idx_platforms_api_key").on(table.apiKeyHash),
    statusIdx: index("idx_platforms_status").on(table.status),
  })
);
```

### Enums

```typescript
import { pgEnum } from "drizzle-orm/pg-core";

export const taskTypeEnum = pgEnum("task_type", [
  "fixed",
  "time_based",
  "milestone",
]);
export const taskStatusEnum = pgEnum("task_status", [
  "created",
  "assigned",
  "in_progress",
  "completed",
  "disputed",
  "cancelled",
]);
export const streamStatusEnum = pgEnum("stream_status", [
  "active",
  "paused",
  "completed",
  "cancelled",
]);
export const transactionTypeEnum = pgEnum("transaction_type", [
  "payout",
  "advance",
  "refund",
  "repayment",
  "fee",
]);
export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "submitted",
  "confirmed",
  "failed",
  "cancelled",
]);
export const reputationEventTypeEnum = pgEnum("reputation_event_type", [
  "task_completed",
  "task_late",
  "dispute_filed",
  "dispute_resolved",
  "rating_received",
  "manual_adjustment",
]);
export const loanStatusEnum = pgEnum("loan_status", [
  "pending",
  "approved",
  "disbursed",
  "active",
  "repaying",
  "repaid",
  "defaulted",
  "cancelled",
]);
```

---

## Query Conversion Examples

### Example 1: Find User by Email (Auth Service)

**Before (Prisma):**

```typescript
const worker = await prisma.worker.findUnique({
  where: { email },
});
```

**After (Drizzle):**

```typescript
import { eq } from "drizzle-orm";
import { workers } from "../db/schema";

const [worker] = await db
  .select()
  .from(workers)
  .where(eq(workers.email, email))
  .limit(1);
```

### Example 2: Create Transaction (Payment Service)

**Before (Prisma):**

```typescript
const transaction = await prisma.transaction.create({
  data: {
    workerId,
    type: "payout",
    amountUsdc,
    status: "pending",
  },
});
```

**After (Drizzle):**

```typescript
import { transactions } from "../db/schema";

const [transaction] = await db
  .insert(transactions)
  .values({
    workerId,
    type: "payout",
    amountUsdc,
    status: "pending",
  })
  .returning();
```

### Example 3: Update with Relations (Complex Query)

**Before (Prisma):**

```typescript
const worker = await prisma.worker.update({
  where: { id: workerId },
  data: {
    reputationScore: { increment: 5 },
    totalTasksCompleted: { increment: 1 },
  },
  include: {
    loans: {
      where: { status: "active" },
    },
  },
});
```

**After (Drizzle):**

```typescript
import { eq, and } from "drizzle-orm";
import { workers, loans } from "../db/schema";

// Update worker
await db
  .update(workers)
  .set({
    reputationScore: sql`${workers.reputationScore} + 5`,
    totalTasksCompleted: sql`${workers.totalTasksCompleted} + 1`,
  })
  .where(eq(workers.id, workerId));

// Get worker with active loans
const [worker] = await db
  .select()
  .from(workers)
  .where(eq(workers.id, workerId))
  .limit(1);

const activeLoans = await db
  .select()
  .from(loans)
  .where(and(eq(loans.workerId, workerId), eq(loans.status, "active")));
```

---

## File Migration Checklist

### Services to Update

- [ ] `src/services/auth.ts`

  - [ ] `registerWorker()` - INSERT query
  - [ ] `loginWorker()` - SELECT with WHERE
  - [ ] `verifyToken()` - SELECT by ID
  - [ ] `refreshToken()` - UPDATE query

- [ ] `src/services/payment.ts`

  - [ ] `executePayment()` - INSERT transaction
  - [ ] `getTransactionHistory()` - SELECT with pagination
  - [ ] `updateTransactionStatus()` - UPDATE query

- [ ] `src/services/circle.ts`

  - [ ] `createWallet()` - INSERT worker with wallet
  - [ ] `getBalance()` - No DB query (Circle API)

- [ ] `src/services/blockchain.ts`
  - [ ] `recordStreamCreation()` - INSERT stream
  - [ ] `updateStreamStatus()` - UPDATE stream
  - [ ] `recordReputation()` - INSERT reputation_event

### Routes to Update

- [ ] `src/routes/auth.ts`
- [ ] `src/routes/workers.ts`
- [ ] `src/routes/platforms.ts`
- [ ] `src/routes/tasks.ts`
- [ ] `src/routes/webhooks.ts`

---

## Testing Strategy

### 1. Unit Tests

```bash
# Test individual queries
npm run test:unit
```

### 2. Integration Tests

```bash
# Test with actual database
npm run test:integration
```

### 3. Manual Testing Scripts

```bash
# Test auth flow
node backend/test-auth-simple.mjs

# Test worker registration
node backend/test-worker-registration.mjs

# Test payment service
node backend/test-payment-service.mjs

# Test blockchain integration
node backend/test-blockchain.mjs
```

### 4. Performance Testing

```bash
# Compare cold start times
wrangler dev --test-performance
```

---

## Rollback Plan

If migration fails or issues are discovered:

### Step 1: Revert package.json

```bash
git checkout HEAD -- package.json package-lock.json
npm install
```

### Step 2: Restore Prisma files

```bash
git checkout HEAD -- src/services/
git checkout HEAD -- src/routes/
```

### Step 3: Verify Prisma still works

```bash
npm run dev
node backend/test-auth-simple.mjs
```

---

## Performance Benchmarks (Target)

| Metric        | Prisma (Current) | Drizzle (Target) | Improvement   |
| ------------- | ---------------- | ---------------- | ------------- |
| Cold Start    | 500-1000ms       | <50ms            | 10-20x faster |
| Bundle Size   | ~1MB             | ~100KB           | 10x smaller   |
| Query Latency | 50-100ms         | 20-50ms          | 2x faster     |
| Memory Usage  | 50-100MB         | 10-20MB          | 5x lower      |

---

## Post-Migration Validation

### Checklist

- [ ] All test scripts pass
- [ ] Worker registration works
- [ ] Authentication flow works
- [ ] Payment execution works
- [ ] Blockchain interactions work
- [ ] No console errors
- [ ] Cold start time < 100ms
- [ ] Bundle size < 200KB

### Deployment

- [ ] Test on Cloudflare Workers preview
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Deploy to production

---

## Common Issues & Solutions

### Issue 1: Type Errors

**Problem:** TypeScript complains about Drizzle types  
**Solution:** Regenerate types with `npx drizzle-kit generate`

### Issue 2: Connection Errors

**Problem:** Can't connect to Neon database  
**Solution:** Check DATABASE_URL in .env, verify Neon allows HTTP connections

### Issue 3: Missing Relations

**Problem:** Need to join tables  
**Solution:** Use Drizzle's `leftJoin()` or `innerJoin()` methods

### Issue 4: Migration Conflicts

**Problem:** Drizzle migrations conflict with Prisma  
**Solution:** Drop and recreate database (dev only), or manually sync schemas

---

## Resources

- **Drizzle Documentation:** https://orm.drizzle.team/docs/overview
- **Neon + Drizzle Guide:** https://orm.drizzle.team/docs/get-started-postgresql#neon
- **Cloudflare Workers + Drizzle:** https://orm.drizzle.team/docs/get-started-postgresql#cloudflare-workers
- **Migration from Prisma:** https://orm.drizzle.team/docs/migrations

---

## Timeline

- **Start:** November 5, 2025 (Now)
- **Target Completion:** November 5, 2025 (End of day)
- **Testing:** November 6, 2025
- **Production Deploy:** November 7, 2025

---

**Status:** 🚀 Ready to Begin  
**Risk Level:** Medium (good rollback plan in place)  
**Confidence:** High (well-documented, proven migration path)
