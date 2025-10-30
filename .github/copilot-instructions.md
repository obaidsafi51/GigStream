# GigStream - AI Coding Agent Instructions

## Project Overview

GigStream is an AI-powered real-time USDC payment streaming platform for gig workers, built on Circle's Arc blockchain. This is a **13-day hackathon project** (Oct 27 - Nov 8, 2025) with a monorepo architecture.

**Critical Context**: Always reference `project/requirements.md` (technical specs), `project/design.md` (4,549-line detailed architecture), and `project/tasks.md` (13-day timeline with task status) before making changes.

## Architecture & Technology Stack

### Monorepo Structure

```
contracts/    # Foundry + Solidity 0.8.20 (PaymentStreaming, ReputationLedger, MicroLoan)
backend/      # Hono + Cloudflare Workers + PostgreSQL 16 + Prisma ORM
frontend/     # Next.js 15 + React 19 + TypeScript 5 + Tailwind CSS 4
scripts/      # Circle API utilities (.mjs files for wallet/testnet setup)
project/      # Source-of-truth design documents
```

### Key Dependencies

- **Blockchain**: Arc Testnet (Chain ID: 5042002), OpenZeppelin v5.4.0
- **Circle SDK**: `@circle-fin/developer-controlled-wallets` (server-side only, NOT in frontend)
- **Database**: Neon.tech serverless PostgreSQL with Prisma adapter
- **Frontend State**: Zustand (NOT Redux), React 19 Server Components
- **Testing**: Foundry for contracts (28 tests, 100% pass), Jest for backend/frontend

## Critical Developer Workflows

### Smart Contract Development

```bash
# Foundry workflow (NOT Hardhat)
cd contracts
forge build                    # Compile contracts
forge test                     # Run 28 tests
forge test --gas-report        # Gas analysis (~348k createStream, ~29k releasePayment)
npm run deploy:testnet         # Uses custom .mjs script, not Forge script

# Important: Gas limits are realistic (see TASK_2.1_COMPLETED.md)
# - createStream: ~348k (includes USDC transfer + storage)
# - releasePayment: ~29k
# - claimEarnings: ~53k
```

### Database Management

```bash
cd backend
npm run db:generate            # Generate Prisma client (always after schema changes)
npm run db:migrate             # Apply migrations (8 tables + triggers + views)
npm run db:seed                # Populate demo data (alice@example.com / demo123)
npm run db:studio              # Open Prisma Studio browser GUI

# CRITICAL: After migrations, manually apply triggers/views:
psql $DATABASE_URL < prisma/triggers.sql
psql $DATABASE_URL < prisma/views.sql
```

### Frontend Development

```bash
cd frontend
npm run dev                    # Starts on localhost:3000

# Route Structure (App Router):
# /app/(auth)/         - Public auth pages (login, register)
# /app/(worker)/       - Protected worker dashboard (TODO: Tasks 7.1-8.5)
# /app/(platform)/     - Protected platform admin (TODO: Task 9.1-9.2)
# /app/api/v1/         - Mock API routes (temporary, migrate to backend later)
```

### Circle API Utilities

```bash
# Essential scripts for Arc blockchain integration:
node contracts/scripts/test-arc-connection.mjs        # Verify RPC connectivity
node contracts/scripts/create-circle-wallet.mjs       # Create wallet for testing
node contracts/scripts/test-circle-wallet.mjs         # Test wallet operations
node contracts/scripts/arc-faucet-guide.mjs           # Instructions to get testnet USDC

# These require .env variables: CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET, ARC_RPC_URL
```

## Project-Specific Patterns

### Database Schema (8 Core Tables)

- **workers**: wallet_id (Circle wallet ID), wallet_address (blockchain addr), reputation_score (0-1000)
- **platforms**: api_key for webhook authentication
- **tasks**: Polymorphic (fixed/streaming), includes verification_data (JSON)
- **streams**: Links to smart contract via contract_address + contract_stream_id
- **transactions**: All USDC movements, tx_hash for Arc explorer links
- **reputation_events**: Append-only audit log for reputation changes
- **loans**: Micro-advance system (max 1 active per worker, enforced by constraint)
- **audit_logs**: Comprehensive compliance trail

**Triggers**: 6 automated triggers update aggregate stats (total_tasks, completion_rate, etc.) - see `backend/prisma/triggers.sql`

**Views**: 5 analytical views for performance - see `backend/prisma/views.sql`

### Smart Contract Patterns

- **Security**: ALL state-modifying functions use `nonReentrant`, transfer before state change
- **Events**: Emit comprehensive events for off-chain indexing (backend listens to these)
- **Access Control**: Platform-only functions (pauseStream), worker-only (claimEarnings), owner-only (pause contract)
- **Gas Optimization**: Immutable variables, packed structs, minimal storage operations

**Example Pattern** (PaymentStreaming.sol):

```solidity
function claimEarnings(uint256 streamId) external nonReentrant whenNotPaused {
    Stream storage stream = streams[streamId];
    require(msg.sender == stream.worker, "Only worker can claim");

    uint256 claimable = stream.releasedAmount - stream.claimedAmount;
    require(claimable > 0, "No earnings to claim");

    stream.claimedAmount += claimable; // Update state BEFORE transfer

    require(usdcToken.transfer(stream.worker, claimable), "Transfer failed");
    emit EarningsClaimed(streamId, stream.worker, claimable);
}
```

### Frontend State Management

- **Auth**: Zustand `auth-store.ts` with persist middleware (localStorage + httpOnly cookies)
- **Server Components**: Fetch initial data, pass to client components via props
- **Real-time Updates**: Polling pattern (NOT WebSockets) - see design.md Section 6.4
- **Protected Routes**: `middleware.ts` checks auth token, redirects to /login

**Authentication Flow**:

1. Login → Set httpOnly cookie + Zustand state
2. Middleware validates token on protected routes
3. Token refresh every 23 hours (24h expiry)
4. Logout → Clear cookie + Zustand state

### Circle API Integration (Server-Side Only)

```typescript
// backend/services/circle.ts (TODO: Task 4.1)
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

// CRITICAL: Wallet operations are server-side only
// Frontend NEVER touches Circle SDK or private keys
// Worker receives wallet address from backend, displays in UI
```

## Common Pitfalls & Solutions

### 1. Gas Limit Assumptions

**Issue**: Initial design assumed <50k gas per operation  
**Reality**: Real operations include USDC transfers (~21k base) + storage writes  
**Solution**: Use realistic limits from gas reports (see TASK_2.1_COMPLETED.md)

### 2. Forge Submodule Clutter

**Issue**: `forge install` creates Git submodules, clutters VS Code  
**Solution**: lib/ is in .gitignore, remove .gitmodules if created

### 3. Database Triggers Missing

**Issue**: Migrations don't auto-apply triggers/views  
**Solution**: Manually run `prisma/triggers.sql` and `views.sql` after first migration

### 4. Frontend Mock APIs

**Issue**: Current auth routes in `frontend/app/api/` are temporary mocks  
**Solution**: When backend is ready (Task 3.3-4.4), replace with actual backend calls

### 5. Circle SDK in Frontend

**Common Mistake**: Installing Circle SDK in frontend package.json  
**Correct**: Circle Developer-Controlled Wallets are server-side only (backend manages keys)

## Testing Strategy

### Smart Contracts (28 Tests, 100% Pass)

- Basic functionality: Stream creation, payment release, earnings claim
- Edge cases: Invalid inputs, unauthorized access, timing constraints
- Gas measurements: Verify operations stay within limits
- Security: Pause functionality, reentrancy protection

### Backend (TODO: Tasks 3.4-4.4)

- Unit tests: Service layer logic (risk scoring, prediction)
- Integration tests: Database operations, Circle API calls
- E2E tests: Complete payment flow (webhook → verify → pay → confirm)

### Frontend (TODO: Tasks 7.1-9.2)

- Component tests: UI rendering, form validation
- Hook tests: useAuth, real-time polling
- E2E tests (Playwright): Full user journey (register → login → dashboard → advance)

## Task Status Reference

**✅ Completed**:

- Tasks 1.1-1.4: Environment setup, database, Circle API
- Tasks 2.1-2.2: PaymentStreaming contract + tests (28/28 passing)
- Tasks 6.1-6.5: Frontend setup, auth pages, layout components

**🚧 In Progress**:

- Task 2.3: ReputationLedger contract (NEXT PRIORITY)
- Task 2.4: Deploy contracts to Arc testnet

**📋 Pending**:

- Day 3-5: Backend API, Circle integration, webhooks, AI verification
- Day 7-8: Worker dashboard, advance system, reputation UI
- Day 9-13: Platform admin, deployment, demo polish

Check `project/tasks.md` for detailed acceptance criteria and dependencies before starting any task.

## When Making Changes

1. **Check task dependencies**: Ensure prerequisite tasks are complete (see tasks.md)
2. **Follow design spec**: All APIs, schemas, contracts match design.md exactly
3. **Update task status**: Mark tasks as completed in tasks.md with test results
4. **Document decisions**: If deviating from design, document in summary/ folder
5. **Test thoroughly**: All changes must pass existing tests + add new tests

## Critical Data Flow Patterns

### Instant Payment Flow (< 3s requirement)

```
Platform Webhook (t=0ms)
  → Handler validates HMAC (t=10ms)
  → Queue for verification (t=20ms)
  → Risk engine auto-approves (t=100ms)
  → Circle API USDC transfer (t=500ms)
  → Arc blockchain confirmation (t=1500ms)
  → Event listener updates DB (t=1700ms)
  → Worker UI updates (t=1800ms)
Total: <2 seconds ✓
```

### Payment Stream Flow

1. Platform calls `POST /api/tasks/start` with stream params
2. Smart contract escrows USDC via `createStream()`
3. Scheduled job calls `releasePayment()` every interval (e.g., 60s)
4. Worker can call `claimEarnings()` anytime for early withdrawal
5. Platform can `pauseStream()` or `cancelStream()` with refund logic

### Advance Request Flow

1. Worker requests advance → Backend checks eligibility
2. Risk Engine calculates: reputation score (0-1000), earnings prediction (7-day), existing loans
3. Max advance: 80% of predicted earnings, Fee: 2-5% based on risk
4. Auto-repayment: 20% deducted from next 5 task completions
5. Constraint: Only 1 active loan per worker (enforced by DB)

## API Contract Patterns

### Worker Endpoints (JWT Auth)

```typescript
// All endpoints prefix: /api/v1/workers/:workerId
GET / balance; // Real-time USDC balance from Circle
GET / earnings; // Paginated transaction history
GET / reputation; // Score breakdown with contributing factors
POST / advance; // Request micro-loan (auto-approved if eligible)
GET / loans; // Active loan status with repayment schedule
```

### Platform Endpoints (API Key Auth)

```typescript
// All endpoints prefix: /api/v1/
POST   /tasks/complete        // Webhook: task done → triggers payment
POST   /tasks/start-stream    // Create payment stream via smart contract
GET    /platforms/:id/workers // Worker list with reputation scores
GET    /platforms/:id/analytics // Payment volume, retention metrics
```

**Webhook Security**: HMAC-SHA256 signature in `X-Signature` header, verify before processing

## Smart Contract State Machines

### Stream States

- **Active**: Normal operation, releasing payments per interval
- **Paused**: Temporarily stopped (platform can resume)
- **Completed**: All funds released and claimed
- **Cancelled**: Early termination, remaining funds refunded to platform

### Loan States

- **Pending** → **Approved** → **Disbursed** → **Active** → **Repaying** → **Repaid**
- **Defaulted**: 30 days overdue, affects reputation score

## Environment Variables (.env)

### Required for All Components

```bash
# Circle Developer-Controlled Wallets (server-side only)
CIRCLE_API_KEY=test_api_key_xxx
CIRCLE_ENTITY_SECRET=xxx  # For wallet operations

# Arc Blockchain
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002

# Database
DATABASE_URL=postgresql://user:pass@host/gigstream_db?sslmode=require

# JWT Auth
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=24h

# Smart Contracts (after deployment)
PAYMENT_STREAMING_ADDRESS=0x...
REPUTATION_LEDGER_ADDRESS=0x...
MICRO_LOAN_ADDRESS=0x...
```

## Performance Targets (from requirements.md)

- API latency: p95 < 200ms
- Database queries: p95 < 50ms
- Blockchain tx confirmation: < 1s (Arc testnet)
- Payment end-to-end: < 3s (critical path)
- Risk scoring inference: < 100ms
- Task verification: < 500ms
- Concurrent users: 100 (hackathon demo)
- Throughput: 1,000 transactions/hour

## AI/ML Model Specifications

### Task Verification Agent (design.md Section 5.1)

**Purpose**: Validate task completion before payment release  
**Approach**: Cloudflare Workers AI OR heuristic scoring (if AI unavailable)  
**Fast-path checks** (< 100ms):

- Required fields present (photo, GPS, timestamp)
- Timestamp within task window
- GPS within geofence (if specified)
- Photo quality check (file size > 10KB)

**Verdict**: `approve` | `flag` | `reject`  
**Auto-approval rate target**: >90% for valid tasks  
**False positive rate**: <2%

### Risk Scoring Model (design.md Section 5.2)

**Purpose**: Calculate worker creditworthiness (0-1000 score)  
**Factors**:

- Completion rate: 30 points (max)
- Account age: 15 points (max, 1 point per month)
- Task consistency: 10 points (regular activity)
- Average rating: 20 points (4-5 stars)
- Dispute rate: -50 points (per dispute)
- Payment history: 25 points (on-time repayments)

**Base score**: 500 (new workers)  
**Threshold for advances**: 600+  
**Inference**: < 100ms via cached scores

### Earnings Prediction Engine (design.md Section 5.3)

**Purpose**: Forecast next 7-day earnings for advance calculation  
**Method**: Moving average + day-of-week patterns  
**Inputs**: Last 30 days task completion data  
**Output**: Prediction with confidence interval  
**MAPE target**: <20% on demo data  
**Advance amount**: 50-80% of predicted earnings (conservative)

## Security Checklist

### Smart Contracts

- ✅ Use OpenZeppelin audited libraries (ReentrancyGuard, Pausable, Ownable)
- ✅ ALL state changes protected by `nonReentrant`
- ✅ Update state BEFORE external calls (prevent reentrancy)
- ✅ Emit events for all state changes (off-chain indexing)
- ✅ Emergency pause mechanism (`pause()`, `unpause()`)
- ✅ Access control: owner-only, platform-only, worker-only functions
- ✅ Input validation: non-zero addresses, reasonable amounts, valid durations
- ✅ Gas optimization: immutable variables, packed structs

### Backend API

- ✅ HTTPS/TLS 1.3 enforcement
- ✅ JWT tokens with 24h expiry + refresh tokens
- ✅ API key authentication for platform endpoints
- ✅ Rate limiting: 100 req/min per user
- ✅ Input validation with Zod schemas
- ✅ SQL injection prevention via Prisma ORM
- ✅ CORS configuration for allowed origins
- ✅ HMAC-SHA256 webhook signature verification
- ✅ Password hashing with bcrypt (cost factor: 10)
- ✅ No sensitive data in logs (mask wallet addresses, API keys)

### Database

- ✅ Passwords stored as bcrypt hashes (NEVER plaintext)
- ✅ API keys stored as SHA-256 hashes
- ✅ Foreign key constraints with CASCADE rules
- ✅ CHECK constraints for data integrity (reputation 0-1000, valid emails)
- ✅ Unique constraints (one active loan per worker)
- ✅ Audit logs for all critical operations
- ✅ Automated backups (daily) with point-in-time recovery

## Debugging Tips

### Circle API Issues

```bash
# Test Arc RPC connectivity
node contracts/scripts/test-arc-connection.mjs

# Verify Circle wallet creation
node contracts/scripts/create-circle-wallet.mjs

# Check wallet balance
node contracts/scripts/test-circle-wallet.mjs

# Common errors:
# - "Invalid entity secret" → Check CIRCLE_ENTITY_SECRET in .env
# - "API key not found" → Verify CIRCLE_API_KEY from console.circle.com
# - "Insufficient balance" → Use arc-faucet-guide.mjs to get testnet USDC
```

### Smart Contract Debugging

```bash
# Check contract compilation
forge build --force

# Run specific test
forge test --match-test testStreamCreation -vvv

# Gas profiling
forge test --gas-report

# Coverage report
forge coverage --report lcov

# Common errors:
# - "Transfer failed" → Check USDC approval before createStream
# - "Stream does not exist" → Verify streamId is valid
# - "Only worker can claim" → msg.sender must match stream.worker
```

### Database Debugging

```bash
# Connect to database
psql $DATABASE_URL

# Check schema
\dt                    # List tables
\d+ workers            # Describe workers table

# Verify triggers
SELECT * FROM pg_trigger WHERE tgname LIKE '%gigstream%';

# Check indexes
\di

# Common issues:
# - Migration fails → Drop database and re-run from scratch
# - Triggers missing → Manually apply triggers.sql and views.sql
# - Seed data errors → Check foreign key constraints order
```

### Frontend Debugging

```bash
# Clear Next.js cache
rm -rf .next

# Check TypeScript errors
npm run type-check

# Lint check
npm run lint

# Common issues:
# - "Hydration mismatch" → Check Server/Client component boundaries
# - "Module not found" → Verify imports use @/ alias correctly
# - "Auth token expired" → Implement token refresh logic
```

## Code Style Conventions

### TypeScript/JavaScript

- **Naming**: camelCase for functions/variables, PascalCase for components/classes
- **File naming**: kebab-case for files (`auth-store.ts`, not `AuthStore.ts`)
- **Imports**: Use absolute imports with `@/` alias
- **Types**: Explicit return types for functions, avoid `any`
- **Error handling**: Always use try-catch for async operations

### Solidity

- **Naming**: camelCase for functions, PascalCase for contracts/structs
- **Visibility**: Explicit visibility modifiers (public, external, internal, private)
- **Documentation**: NatSpec comments for all public functions
- **Constants**: UPPER_CASE for constants
- **Gas optimization**: Use `immutable` for deployment-time values, `constant` for compile-time

### Database

- **Table names**: snake_case plural (`workers`, not `Worker`)
- **Column names**: snake_case (`wallet_address`, not `walletAddress`)
- **Indexes**: Prefix with `idx_` (`idx_workers_email`)
- **Foreign keys**: Explicit names (`fk_tasks_worker_id`)

## References

- Design document: `project/design.md` (4,549 lines - THE source of truth)
- Requirements: `project/requirements.md` (technical specs)
- Task timeline: `project/tasks.md` (13-day breakdown)
- Completion reports: `summary/TASK_*.md`
- Database schema: `backend/prisma/schema.prisma`
- Smart contracts: `contracts/src/PaymentStreaming.sol`
- Circle SDK docs: https://developers.circle.com/wallets/dev-controlled/create-your-first-wallet
- Arc testnet explorer: https://explorer.testnet.arc.network
