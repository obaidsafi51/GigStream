# GigStream — Detailed Design Document

**Version:** 1.0  
**Date:** October 28, 2025  
**Based on:** `requirements.md` v1.0  
**Status:** ✅ **APPROVED** — Ready for Implementation

**Approved by:** Team  
**Approval Date:** October 28, 2025

This document provides comprehensive low-level design specifications for the GigStream MVP, including detailed architecture, component interactions, data models, API contracts, state machines, security considerations, and implementation guidelines.

## Document Purpose

This design document serves as the bridge between requirements and implementation, providing sufficient technical detail for developers to build the system without ambiguity.

## Goals & Non-goals

**Goals:**

- Provide detailed, unambiguous specifications for all system components
- Define precise data structures, APIs, and interfaces
- Document state transitions, error handling, and edge cases
- Enable parallel development by clearly defining component boundaries
- Ensure security and performance requirements are designed in from the start

**Non-goals:**

- Production-hardened deployment (MVP/hackathon focus)
- Mainnet deployment or real money handling
- KYC/AML implementation
- Multi-chain support beyond Arc testnet
- Advanced ML model training (use pre-trained or heuristics)

---

## 1. System Architecture

### 1.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│        Worker Dashboard   │  Platform Admin  │  Demo Simulator  │
│        (Next.js 15 App Router - Unified Monorepo)               │
└──────────────┬──────────────────┬────────────────┬──────────────┘
               │                  │                │
               └──────────────────┼────────────────┘
                                  │
                         HTTPS/TLS 1.3
                                  │
┌─────────────────────────────────▼───────────────────────────────┐
│                      API GATEWAY LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  Cloudflare Workers (Hono Framework)                            │
│  - Rate Limiting                                                │
│  - Authentication (JWT / API Keys)                              │
│  - Request Validation                                           │
│  - CORS Handling                                                │
└──────────────┬──────────────────────────────────────────────────┘
               │
               ├──────────────────┬──────────────────┬─────────────┐
               │                  │                  │             │
┌──────────────▼──────┐  ┌───────▼────────┐  ┌─────▼──────┐  ┌──▼───────┐
│   AUTH SERVICE      │  │  PAYMENT       │  │   RISK     │  │ WEBHOOK  │
│                     │  │  ORCHESTRATOR  │  │  ENGINE    │  │ HANDLER  │
│ - JWT generation    │  │                │  │            │  │          │
│ - Wallet sign-in    │  │ - Task verify  │  │ - Scoring  │  │ - Verify │
│ - Session mgmt      │  │ - Pay execute  │  │ - Predict  │  │ - Queue  │
└──────────┬──────────┘  └───────┬────────┘  └─────┬──────┘  └──┬───────┘
           │                     │                  │            │
           │     ┌───────────────┴──────────────────┴────────────┘
           │     │
┌──────────▼─────▼─────────────────────────────────────────────────┐
│                    DATA PERSISTENCE LAYER                         │
├───────────────────────────────────────────────────────────────────┤
│  PostgreSQL 15+ (Primary Database)                               │
│  - Workers, Platforms, Tasks, Streams, Loans, Reputation         │
│  - Transactions, Audit Logs                                       │
│                                                                   │
│  Redis (Optional - Caching & Rate Limiting)                       │
│  - API rate limit counters                                        │
│  - Session cache                                                  │
│  - Real-time balance cache                                        │
└────────────────┬──────────────────────────────────────────────────┘
                 │
┌────────────────▼──────────────────────────────────────────────────┐
│                    BLOCKCHAIN LAYER                               │
├───────────────────────────────────────────────────────────────────┤
│  Circle Developer-Controlled Wallets API                         │
│  - Wallet creation                                                │
│  - Balance queries                                                │
│  - USDC transfers                                                 │
│                                                                   │
│  Arc Testnet (Smart Contracts)                                    │
│  ┌─────────────────┬──────────────────┬──────────────────┐      │
│  │ PaymentStreaming│ ReputationLedger │  MicroLoan       │      │
│  │                 │                  │                  │      │
│  │ - Escrow        │ - Score tracking │ - Loan mgmt      │      │
│  │ - Auto-release  │ - Task history   │ - Repayment      │      │
│  └─────────────────┴──────────────────┴──────────────────┘      │
└───────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┴────────────────┐
                │                                │
┌───────────────▼──────────┐      ┌──────────────▼────────────┐
│  EVENT LISTENER SERVICE  │      │  CLOUDFLARE WORKERS AI    │
│                          │      │                           │
│ - Smart contract events  │      │ - Task verification       │
│ - Transaction monitoring │      │ - Risk scoring model      │
│ - State synchronization  │      │ - Earnings prediction     │
└──────────────────────────┘      └───────────────────────────┘
```

### 1.2 Component Descriptions

#### 1.2.1 Frontend Application

**Unified Next.js 15 Application**

- **Technology:** Next.js 15 App Router, React 19 RC, TypeScript 5, Tailwind CSS 4
- **Architecture:** Monorepo with separate route groups for Worker & Platform dashboards
- **Deployment:** Cloudflare Pages with Edge Runtime
- **Circle SDK:** NOT required (wallet management is server-side via Developer-Controlled Wallets)

**Worker Dashboard** (`/app/(worker)/...`)

- **Purpose:** Primary interface for gig workers
- **Key Features:**
  - Real-time balance display (Server Components + Client streaming)
  - Task management with optimistic updates
  - Advance request with Server Actions
  - Reputation visualization
  - Transaction history
- **State Management:** React 19 `use()` + Zustand for client state
- **Real-time Updates:** Server-Sent Events or polling with React 19 hooks
- **Authentication:** JWT in httpOnly cookies

**Platform Admin Dashboard** (`/app/(platform)/...`)

- **Purpose:** Management interface for gig platforms
- **Key Features:**
  - Worker analytics with Server Components
  - Payment monitoring dashboard
  - API key management
  - System health metrics

**Demo Simulator** (`/app/(demo)/...`)

- **Purpose:** Simulated gig platform for demonstrations
- **Key Features:**
  - Task simulation interface
  - Webhook testing
  - Pre-populated demo data
  - Reset/seed functionality

#### 1.2.2 Backend Services

**API Gateway (Cloudflare Workers + Hono)**

- **Purpose:** Entry point for all HTTP requests
- **Responsibilities:**
  - Route requests to appropriate handlers
  - Enforce rate limits (100 req/min per worker)
  - Validate JWT tokens and API keys
  - Input validation and sanitization
  - CORS policy enforcement
  - Request/response logging
- **Technology:** Hono framework on Cloudflare Workers
- **Performance:** Target <50ms overhead per request

**Authentication Service**

- **Responsibilities:**
  - JWT token generation and validation
  - Wallet-based authentication (sign message verification)
  - Session management
  - Password hashing (bcrypt, cost factor 10)
  - API key generation for platforms
- **Token Structure:**
  ```json
  {
    "sub": "worker_id or platform_id",
    "type": "worker | platform",
    "iat": 1234567890,
    "exp": 1234654290,
    "wallet": "0x..."
  }
  ```

**Payment Orchestrator**

- **Responsibilities:**
  - Coordinate task verification
  - Execute USDC transfers via Circle SDK
  - Update database records
  - Emit notifications
  - Handle payment failures and retries
- **Flow:**
  1. Receive task completion event
  2. Call Risk Engine for verification
  3. If approved: call Circle API for transfer
  4. Poll for transaction confirmation
  5. Update database + emit events
  6. Send notification to worker

**Risk Engine**

- **Responsibilities:**
  - Task verification (AI or heuristic)
  - Worker risk scoring (0-1000)
  - Earnings prediction (7-day forecast)
  - Advance eligibility calculation
- **Models:**
  - Task verification: Binary classifier (approve/flag/reject)
  - Risk scoring: Regression model or weighted heuristic
  - Earnings prediction: Time series model or moving average
- **Performance:** <500ms for verification, <100ms for scoring

**Webhook Handler**

- **Responsibilities:**
  - Receive webhooks from platforms
  - Verify HMAC signatures
  - Queue tasks for async processing
  - Retry failed deliveries (3 attempts)
  - Dead letter queue for failures
- **Security:** HMAC-SHA256 signature verification

**Event Listener Service**

- **Responsibilities:**
  - Subscribe to Arc blockchain events
  - Monitor smart contract state changes
  - Sync blockchain data to database
  - Trigger actions based on events
- **Events Monitored:**
  - StreamCreated, PaymentReleased, StreamPaused
  - TaskCompleted, DisputeRecorded
  - LoanApproved, RepaymentMade

### 1.3 Data Flow Patterns

#### 1.3.1 Instant Payment Flow (Critical Path)

```
Platform → Webhook → Handler → Risk Engine → Circle API → Blockchain → Event Listener → Database → Worker UI
   (1)       (2)       (3)         (4)          (5)          (6)           (7)           (8)       (9)

Timeline:
(1) t=0ms:     Platform sends task completion webhook
(2) t=10ms:    Webhook received and verified
(3) t=20ms:    Task queued for verification
(4) t=100ms:   Risk engine approves (auto-approve path)
(5) t=500ms:   Circle API transfer initiated
(6) t=1500ms:  Transaction confirmed on Arc
(7) t=1600ms:  Event listener detects confirmation
(8) t=1700ms:  Database updated
(9) t=1800ms:  Worker UI shows updated balance

Total: <2 seconds (within 3s requirement)
```

#### 1.3.2 Payment Stream Flow

```
1. Platform calls POST /api/tasks/start with stream parameters
2. Backend validates and creates escrow transaction
3. Smart contract (PaymentStreaming) locks funds
4. Scheduled job runs every release_interval:
   a. Call releasePayment(streamId) on contract
   b. Contract transfers pro-rata amount to worker
   c. Event listener updates database
5. Worker can call claimEarnings() anytime for early withdrawal
6. Platform can pauseStream() or cancelStream()
```

#### 1.3.3 Advance Request Flow

```
1. Worker requests advance via UI
2. Backend calls Risk Engine for eligibility check
3. Risk Engine calculates:
   - Current reputation score
   - 7-day earnings prediction
   - Existing loan status
4. If eligible:
   a. Create loan record in database
   b. Call MicroLoan contract approveLoan()
   c. Contract transfers USDC to worker
   d. Set up auto-repayment from next 5 tasks
5. Each subsequent task completion:
   a. Calculate repayment amount (20% of earnings)
   b. Transfer to loan contract
   c. Update loan balance
6. Loan marked "repaid" when balance = 0
```

### 1.4 Scalability Considerations

**Horizontal Scaling:**

- Cloudflare Workers auto-scale globally
- Stateless API design (no server affinity needed)
- Database connection pooling (max 10 connections per worker instance)

**Caching Strategy:**

- Worker balance: Cache for 5 seconds (Redis)
- Reputation scores: Cache for 60 seconds
- Platform API keys: Cache indefinitely (invalidate on update)
- Static assets: CDN with 1-year cache

**Performance Targets:**

- API latency: p95 < 200ms
- Database queries: p95 < 50ms
- Blockchain transactions: < 1s confirmation (Arc testnet)
- Concurrent users: 100 (hackathon demo)
- Throughput: 1,000 transactions/hour

---

## 2. Database Design (PostgreSQL)

### 2.1 Schema Overview

The database uses PostgreSQL 15+ with the following design principles:

- UUID primary keys for distributed system compatibility
- JSONB for flexible metadata storage
- Proper foreign key constraints with CASCADE rules
- Indexes on frequently queried columns
- Audit trail via append-only logs
- Timestamp tracking (created_at, updated_at)

### 2.2 Detailed Table Specifications

#### Table: `workers`

**Purpose:** Store gig worker accounts and wallet information

```sql
CREATE TABLE workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE, -- nullable for wallet-only auth
    email_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255), -- bcrypt hash, nullable if wallet-only
    display_name VARCHAR(100) NOT NULL,
    wallet_address VARCHAR(42) UNIQUE NOT NULL, -- Ethereum address format
    wallet_id VARCHAR(255), -- Circle wallet ID
    phone_number VARCHAR(20),
    phone_verified BOOLEAN DEFAULT FALSE,

    -- Risk & reputation
    reputation_score INTEGER DEFAULT 100, -- 0-1000 scale
    total_tasks_completed INTEGER DEFAULT 0,
    total_earnings_usdc NUMERIC(20, 6) DEFAULT 0,

    -- Account status
    status VARCHAR(20) DEFAULT 'active', -- active, suspended, banned
    kyc_status VARCHAR(20) DEFAULT 'not_required', -- for future use

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP,

    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB, -- flexible field for additional data

    CONSTRAINT valid_wallet_address CHECK (wallet_address ~ '^0x[a-fA-F0-9]{40}$'),
    CONSTRAINT valid_reputation CHECK (reputation_score >= 0 AND reputation_score <= 1000)
);

-- Indexes
CREATE INDEX idx_workers_email ON workers(email) WHERE email IS NOT NULL;
CREATE INDEX idx_workers_wallet ON workers(wallet_address);
CREATE INDEX idx_workers_reputation ON workers(reputation_score DESC);
CREATE INDEX idx_workers_status ON workers(status) WHERE status = 'active';
CREATE INDEX idx_workers_created ON workers(created_at DESC);
```

#### Table: `platforms`

**Purpose:** Gig platform accounts and API credentials

```sql
CREATE TABLE platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    company_name VARCHAR(200),

    -- API credentials
    api_key_hash VARCHAR(255) NOT NULL UNIQUE,
    api_key_prefix VARCHAR(10) NOT NULL, -- First 8 chars for identification

    -- Webhooks
    webhook_url VARCHAR(500),
    webhook_secret VARCHAR(255), -- For HMAC signature
    webhook_enabled BOOLEAN DEFAULT TRUE,

    -- Platform wallet for escrow
    platform_wallet_address VARCHAR(42),

    -- Rate limiting
    rate_limit_per_minute INTEGER DEFAULT 1000,

    -- Status
    status VARCHAR(20) DEFAULT 'active', -- active, suspended

    -- Contact info
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_api_call_at TIMESTAMP,

    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB,

    CONSTRAINT valid_webhook_url CHECK (webhook_url IS NULL OR webhook_url ~ '^https://.*')
);

-- Indexes
CREATE INDEX idx_platforms_api_key ON platforms(api_key_hash);
CREATE INDEX idx_platforms_status ON platforms(status) WHERE status = 'active';
```

#### Table: `tasks`

**Purpose:** Individual gig tasks/jobs

```sql
CREATE TYPE task_type AS ENUM ('fixed', 'time_based', 'milestone');
CREATE TYPE task_status AS ENUM ('created', 'assigned', 'in_progress', 'completed', 'disputed', 'cancelled');

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relationships
    platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
    stream_id UUID REFERENCES streams(id) ON DELETE SET NULL,

    -- Task details
    external_task_id VARCHAR(255), -- Platform's task ID
    type task_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,

    -- Payment
    amount_usdc NUMERIC(20, 6) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USDC',

    -- Status tracking
    status task_status DEFAULT 'created',

    -- Timing
    estimated_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,
    start_ts TIMESTAMP,
    end_ts TIMESTAMP,
    completed_at TIMESTAMP,

    -- Verification data
    completion_proof JSONB, -- photos, GPS, signatures, etc.
    verification_status VARCHAR(20), -- pending, approved, flagged, rejected
    verification_notes TEXT,
    verified_at TIMESTAMP,
    verified_by VARCHAR(50), -- 'ai', 'manual', 'auto'

    -- Rating & quality
    worker_rating INTEGER, -- 1-5 stars
    platform_rating INTEGER,
    quality_score NUMERIC(3, 2), -- 0.00 to 5.00

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB,

    CONSTRAINT valid_amount CHECK (amount_usdc > 0),
    CONSTRAINT valid_worker_rating CHECK (worker_rating IS NULL OR (worker_rating >= 1 AND worker_rating <= 5)),
    CONSTRAINT completion_requires_worker CHECK (status != 'completed' OR worker_id IS NOT NULL)
);

-- Indexes
CREATE INDEX idx_tasks_worker ON tasks(worker_id) WHERE worker_id IS NOT NULL;
CREATE INDEX idx_tasks_platform ON tasks(platform_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created ON tasks(created_at DESC);
CREATE INDEX idx_tasks_completed ON tasks(completed_at DESC) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_tasks_external ON tasks(platform_id, external_task_id);
```

#### Table: `streams`

**Purpose:** Payment streaming records for time-based work

```sql
CREATE TYPE stream_status AS ENUM ('active', 'paused', 'completed', 'cancelled');

CREATE TABLE streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relationships
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,

    -- Smart contract reference
    contract_stream_id BIGINT, -- ID in PaymentStreaming contract
    contract_address VARCHAR(42),

    -- Stream parameters
    total_amount_usdc NUMERIC(20, 6) NOT NULL,
    released_amount_usdc NUMERIC(20, 6) DEFAULT 0,
    claimed_amount_usdc NUMERIC(20, 6) DEFAULT 0,

    -- Timing
    duration_seconds INTEGER NOT NULL,
    release_interval_seconds INTEGER NOT NULL,
    next_release_at TIMESTAMP,

    -- Status
    status stream_status DEFAULT 'active',

    -- Timestamps
    started_at TIMESTAMP DEFAULT NOW(),
    paused_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB,

    CONSTRAINT valid_amounts CHECK (
        released_amount_usdc >= 0 AND
        released_amount_usdc <= total_amount_usdc AND
        claimed_amount_usdc <= released_amount_usdc
    ),
    CONSTRAINT valid_intervals CHECK (
        duration_seconds > 0 AND
        release_interval_seconds > 0 AND
        release_interval_seconds <= duration_seconds
    )
);

-- Indexes
CREATE INDEX idx_streams_worker ON streams(worker_id);
CREATE INDEX idx_streams_platform ON streams(platform_id);
CREATE INDEX idx_streams_status ON streams(status);
CREATE INDEX idx_streams_next_release ON streams(next_release_at) WHERE status = 'active';
CREATE INDEX idx_streams_contract ON streams(contract_address, contract_stream_id);
```

#### Table: `transactions`

**Purpose:** All blockchain transactions (payments, advances, refunds)

```sql
CREATE TYPE transaction_type AS ENUM ('payout', 'advance', 'refund', 'repayment', 'fee');
CREATE TYPE transaction_status AS ENUM ('pending', 'submitted', 'confirmed', 'failed', 'cancelled');

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Blockchain data
    tx_hash VARCHAR(66), -- Ethereum tx hash
    block_number BIGINT,
    block_timestamp TIMESTAMP,

    -- Transaction details
    type transaction_type NOT NULL,
    amount_usdc NUMERIC(20, 6) NOT NULL,
    fee_usdc NUMERIC(20, 6) DEFAULT 0,

    -- Addresses
    from_wallet VARCHAR(42) NOT NULL,
    to_wallet VARCHAR(42) NOT NULL,

    -- Status
    status transaction_status DEFAULT 'pending',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Relationships
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    stream_id UUID REFERENCES streams(id) ON DELETE SET NULL,
    loan_id UUID REFERENCES loans(id) ON DELETE SET NULL,
    worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
    platform_id UUID REFERENCES platforms(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    submitted_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    failed_at TIMESTAMP,

    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB,

    CONSTRAINT valid_amount CHECK (amount_usdc > 0),
    CONSTRAINT valid_fee CHECK (fee_usdc >= 0)
);

-- Indexes
CREATE INDEX idx_transactions_tx_hash ON transactions(tx_hash) WHERE tx_hash IS NOT NULL;
CREATE INDEX idx_transactions_from ON transactions(from_wallet);
CREATE INDEX idx_transactions_to ON transactions(to_wallet);
CREATE INDEX idx_transactions_worker ON transactions(worker_id) WHERE worker_id IS NOT NULL;
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX idx_transactions_pending ON transactions(created_at) WHERE status = 'pending';
```

#### Table: `reputation_events`

**Purpose:** Append-only log of reputation changes

```sql
CREATE TYPE reputation_event_type AS ENUM ('task_completed', 'task_late', 'dispute_filed', 'dispute_resolved', 'rating_received', 'manual_adjustment');

CREATE TABLE reputation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relationships
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

    -- Event details
    event_type reputation_event_type NOT NULL,
    points_delta INTEGER NOT NULL, -- Can be negative
    previous_score INTEGER NOT NULL,
    new_score INTEGER NOT NULL,

    -- Context
    reason TEXT,
    rating INTEGER, -- If rating_received
    on_time BOOLEAN, -- If task_completed
    dispute_severity INTEGER, -- If dispute

    -- Smart contract sync
    blockchain_event_id VARCHAR(100), -- For events recorded on-chain
    synced_to_blockchain BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),

    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB,

    CONSTRAINT valid_scores CHECK (
        previous_score >= 0 AND previous_score <= 1000 AND
        new_score >= 0 AND new_score <= 1000
    ),
    CONSTRAINT score_delta_matches CHECK (new_score = previous_score + points_delta)
);

-- Indexes
CREATE INDEX idx_reputation_worker ON reputation_events(worker_id, created_at DESC);
CREATE INDEX idx_reputation_task ON reputation_events(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_reputation_type ON reputation_events(event_type);
CREATE INDEX idx_reputation_created ON reputation_events(created_at DESC);
```

#### Table: `loans`

**Purpose:** Advance payment (micro-loan) records

```sql
CREATE TYPE loan_status AS ENUM ('pending', 'approved', 'disbursed', 'active', 'repaying', 'repaid', 'defaulted', 'cancelled');

CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relationships
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,

    -- Loan terms
    requested_amount_usdc NUMERIC(20, 6) NOT NULL,
    approved_amount_usdc NUMERIC(20, 6),
    fee_rate_bps INTEGER NOT NULL, -- Basis points (200 = 2%)
    fee_amount_usdc NUMERIC(20, 6),
    total_due_usdc NUMERIC(20, 6), -- approved_amount + fee

    -- Repayment tracking
    repaid_amount_usdc NUMERIC(20, 6) DEFAULT 0,
    remaining_balance_usdc NUMERIC(20, 6),

    -- Repayment schedule
    repayment_tasks_count INTEGER DEFAULT 5, -- Spread over next N tasks
    repayment_tasks_completed INTEGER DEFAULT 0,
    repayment_per_task_usdc NUMERIC(20, 6),

    -- Eligibility & risk
    risk_score INTEGER, -- Worker's score at time of request
    predicted_earnings_usdc NUMERIC(20, 6), -- 7-day prediction
    eligibility_ratio NUMERIC(3, 2), -- approved / predicted (e.g., 0.80)

    -- Status
    status loan_status DEFAULT 'pending',

    -- Smart contract reference
    contract_loan_id BIGINT,
    contract_address VARCHAR(42),

    -- Timestamps
    requested_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP,
    disbursed_at TIMESTAMP,
    repaid_at TIMESTAMP,
    defaulted_at TIMESTAMP,
    due_date TIMESTAMP, -- 30 days from disbursement

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB,

    CONSTRAINT valid_amounts CHECK (
        requested_amount_usdc > 0 AND
        (approved_amount_usdc IS NULL OR approved_amount_usdc <= requested_amount_usdc) AND
        repaid_amount_usdc >= 0 AND
        repaid_amount_usdc <= total_due_usdc
    ),
    CONSTRAINT valid_fee_rate CHECK (fee_rate_bps >= 0 AND fee_rate_bps <= 10000),
    CONSTRAINT one_active_loan_per_worker UNIQUE (worker_id) WHERE status IN ('active', 'repaying', 'disbursed')
);

-- Indexes
CREATE INDEX idx_loans_worker ON loans(worker_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_active ON loans(worker_id) WHERE status IN ('active', 'repaying');
CREATE INDEX idx_loans_due ON loans(due_date) WHERE status IN ('active', 'repaying');
CREATE INDEX idx_loans_created ON loans(created_at DESC);
```

#### Table: `audit_logs`

**Purpose:** Comprehensive audit trail for compliance and debugging

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Actor
    actor_type VARCHAR(20) NOT NULL, -- 'worker', 'platform', 'system', 'admin'
    actor_id UUID, -- worker_id, platform_id, or NULL for system

    -- Action
    action VARCHAR(100) NOT NULL, -- 'worker.created', 'task.completed', 'payment.sent'
    resource_type VARCHAR(50), -- 'worker', 'task', 'transaction', etc.
    resource_id UUID,

    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100), -- Trace ID for request tracking

    -- Details
    description TEXT,
    old_values JSONB,
    new_values JSONB,

    -- Result
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,

    -- Timestamp
    created_at TIMESTAMP DEFAULT NOW(),

    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB
);

-- Indexes
CREATE INDEX idx_audit_actor ON audit_logs(actor_type, actor_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_request ON audit_logs(request_id) WHERE request_id IS NOT NULL;

-- Partition by month for scalability (optional for MVP)
-- CREATE TABLE audit_logs_y2025m10 PARTITION OF audit_logs
--     FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
```

### 2.3 Database Functions and Triggers

#### Auto-update timestamp trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON workers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platforms_updated_at BEFORE UPDATE ON platforms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_streams_updated_at BEFORE UPDATE ON streams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON loans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### Calculate loan amounts trigger

```sql
CREATE OR REPLACE FUNCTION calculate_loan_amounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate fee
    NEW.fee_amount_usdc = (NEW.approved_amount_usdc * NEW.fee_rate_bps) / 10000;

    -- Calculate total due
    NEW.total_due_usdc = NEW.approved_amount_usdc + NEW.fee_amount_usdc;

    -- Calculate remaining balance
    NEW.remaining_balance_usdc = NEW.total_due_usdc - NEW.repaid_amount_usdc;

    -- Calculate repayment per task
    IF NEW.repayment_tasks_count > 0 THEN
        NEW.repayment_per_task_usdc = NEW.total_due_usdc / NEW.repayment_tasks_count;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_loan_amounts_trigger
    BEFORE INSERT OR UPDATE ON loans
    FOR EACH ROW
    EXECUTE FUNCTION calculate_loan_amounts();
```

### 2.4 Views for Common Queries

#### Active workers summary

```sql
CREATE VIEW worker_summary AS
SELECT
    w.id,
    w.display_name,
    w.wallet_address,
    w.reputation_score,
    w.total_tasks_completed,
    w.total_earnings_usdc,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'in_progress') as active_tasks,
    l.id as active_loan_id,
    l.remaining_balance_usdc as loan_balance,
    w.created_at,
    w.last_login_at
FROM workers w
LEFT JOIN tasks t ON t.worker_id = w.id
LEFT JOIN loans l ON l.worker_id = w.id AND l.status IN ('active', 'repaying')
WHERE w.status = 'active'
GROUP BY w.id, l.id, l.remaining_balance_usdc;
```

#### Platform analytics view

```sql
CREATE VIEW platform_analytics AS
SELECT
    p.id as platform_id,
    p.name,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
    COUNT(DISTINCT t.worker_id) as unique_workers,
    COALESCE(SUM(t.amount_usdc) FILTER (WHERE t.status = 'completed'), 0) as total_paid_usdc,
    COALESCE(AVG(t.actual_duration_minutes) FILTER (WHERE t.status = 'completed'), 0) as avg_task_duration,
    COALESCE(AVG(t.worker_rating) FILTER (WHERE t.worker_rating IS NOT NULL), 0) as avg_worker_rating
FROM platforms p
LEFT JOIN tasks t ON t.platform_id = p.id
WHERE p.status = 'active'
GROUP BY p.id, p.name;
```

### 2.5 Data Migration Strategy

For the hackathon MVP:

1. Use a migration tool like Prisma Migrate or Drizzle Kit
2. Seed script for demo data:
   - 10 demo workers with varying reputation scores
   - 2 demo platforms
   - 50 historical tasks (completed)
   - 5 active tasks
   - 2 active loans
3. Reset script for clean demos

---

## 3. Smart Contract Architecture

### 3.1 Overview

The smart contract layer consists of three main contracts deployed on Arc testnet:

1. **PaymentStreaming** - Manages escrow and time-based payment releases
2. **ReputationLedger** - On-chain reputation tracking
3. **MicroLoan** - Advance payment management

**Design Principles:**

- Use OpenZeppelin contracts for security (Ownable, Pausable, ReentrancyGuard)
- Emit comprehensive events for off-chain indexing
- Gas-optimized storage patterns
- Clear separation of concerns
- No upgradability (simpler for MVP, redeploy if needed)

### 3.2 PaymentStreaming Contract

**Purpose:** Escrow USDC and release payments at scheduled intervals for time-based work.

#### 3.2.1 State Variables

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PaymentStreaming is ReentrancyGuard, Pausable, Ownable {

    IERC20 public immutable usdcToken;

    uint256 public streamCount;

    enum StreamStatus { Active, Paused, Completed, Cancelled }

    struct Stream {
        uint256 id;
        address worker;
        address platform;
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 claimedAmount;
        uint256 startTime;
        uint256 duration; // in seconds
        uint256 releaseInterval; // in seconds
        uint256 lastReleaseTime;
        StreamStatus status;
    }

    // streamId => Stream
    mapping(uint256 => Stream) public streams;

    // worker => array of stream IDs
    mapping(address => uint256[]) public workerStreams;

    // platform => array of stream IDs
    mapping(address => uint256[]) public platformStreams;

    // Minimum interval to prevent spam (1 minute)
    uint256 public constant MIN_RELEASE_INTERVAL = 60;

    // Maximum duration (30 days)
    uint256 public constant MAX_DURATION = 30 days;
}
```

#### 3.2.2 Events

```solidity
event StreamCreated(
    uint256 indexed streamId,
    address indexed worker,
    address indexed platform,
    uint256 totalAmount,
    uint256 duration,
    uint256 releaseInterval
);

event PaymentReleased(
    uint256 indexed streamId,
    address indexed worker,
    uint256 amount,
    uint256 totalReleased
);

event EarningsClaimed(
    uint256 indexed streamId,
    address indexed worker,
    uint256 amount
);

event StreamPaused(
    uint256 indexed streamId,
    address indexed by
);

event StreamResumed(
    uint256 indexed streamId,
    address indexed by
);

event StreamCancelled(
    uint256 indexed streamId,
    address indexed by,
    uint256 refundAmount
);

event StreamCompleted(
    uint256 indexed streamId,
    uint256 totalPaid
);
```

#### 3.2.3 Core Functions

```solidity
/**
 * @notice Create a new payment stream
 * @param worker Address of the gig worker
 * @param totalAmount Total USDC to be streamed (in token decimals)
 * @param duration Total duration in seconds
 * @param releaseInterval Interval between releases in seconds
 * @return streamId The ID of the created stream
 */
function createStream(
    address worker,
    uint256 totalAmount,
    uint256 duration,
    uint256 releaseInterval
) external nonReentrant whenNotPaused returns (uint256 streamId) {
    require(worker != address(0), "Invalid worker address");
    require(totalAmount > 0, "Amount must be positive");
    require(duration > 0 && duration <= MAX_DURATION, "Invalid duration");
    require(releaseInterval >= MIN_RELEASE_INTERVAL, "Interval too short");
    require(releaseInterval <= duration, "Interval exceeds duration");

    // Transfer USDC from platform to contract (escrow)
    require(
        usdcToken.transferFrom(msg.sender, address(this), totalAmount),
        "Transfer failed"
    );

    streamId = ++streamCount;

    Stream storage stream = streams[streamId];
    stream.id = streamId;
    stream.worker = worker;
    stream.platform = msg.sender;
    stream.totalAmount = totalAmount;
    stream.releasedAmount = 0;
    stream.claimedAmount = 0;
    stream.startTime = block.timestamp;
    stream.duration = duration;
    stream.releaseInterval = releaseInterval;
    stream.lastReleaseTime = block.timestamp;
    stream.status = StreamStatus.Active;

    workerStreams[worker].push(streamId);
    platformStreams[msg.sender].push(streamId);

    emit StreamCreated(streamId, worker, msg.sender, totalAmount, duration, releaseInterval);
}

/**
 * @notice Release the next payment installment for a stream
 * @param streamId The ID of the stream
 */
function releasePayment(uint256 streamId) external nonReentrant whenNotPaused {
    Stream storage stream = streams[streamId];
    require(stream.id != 0, "Stream does not exist");
    require(stream.status == StreamStatus.Active, "Stream not active");

    uint256 elapsed = block.timestamp - stream.lastReleaseTime;
    require(elapsed >= stream.releaseInterval, "Too soon to release");

    uint256 amountToRelease = _calculateReleasableAmount(stream);
    require(amountToRelease > 0, "Nothing to release");

    stream.releasedAmount += amountToRelease;
    stream.lastReleaseTime = block.timestamp;

    // Check if stream is completed
    if (stream.releasedAmount >= stream.totalAmount ||
        block.timestamp >= stream.startTime + stream.duration) {
        stream.status = StreamStatus.Completed;
        emit StreamCompleted(streamId, stream.releasedAmount);
    }

    emit PaymentReleased(streamId, stream.worker, amountToRelease, stream.releasedAmount);
}

/**
 * @notice Worker claims released but unclaimed earnings
 * @param streamId The ID of the stream
 */
function claimEarnings(uint256 streamId) external nonReentrant whenNotPaused {
    Stream storage stream = streams[streamId];
    require(stream.id != 0, "Stream does not exist");
    require(msg.sender == stream.worker, "Only worker can claim");

    uint256 claimableAmount = stream.releasedAmount - stream.claimedAmount;
    require(claimableAmount > 0, "Nothing to claim");

    stream.claimedAmount += claimableAmount;

    require(
        usdcToken.transfer(stream.worker, claimableAmount),
        "Transfer failed"
    );

    emit EarningsClaimed(streamId, stream.worker, claimableAmount);
}

/**
 * @notice Pause a stream (platform or owner only)
 * @param streamId The ID of the stream
 */
function pauseStream(uint256 streamId) external {
    Stream storage stream = streams[streamId];
    require(stream.id != 0, "Stream does not exist");
    require(
        msg.sender == stream.platform || msg.sender == owner(),
        "Not authorized"
    );
    require(stream.status == StreamStatus.Active, "Stream not active");

    stream.status = StreamStatus.Paused;
    emit StreamPaused(streamId, msg.sender);
}

/**
 * @notice Resume a paused stream
 * @param streamId The ID of the stream
 */
function resumeStream(uint256 streamId) external {
    Stream storage stream = streams[streamId];
    require(stream.id != 0, "Stream does not exist");
    require(
        msg.sender == stream.platform || msg.sender == owner(),
        "Not authorized"
    );
    require(stream.status == StreamStatus.Paused, "Stream not paused");

    stream.status = StreamStatus.Active;
    stream.lastReleaseTime = block.timestamp; // Reset timer
    emit StreamResumed(streamId, msg.sender);
}

/**
 * @notice Cancel a stream and refund remaining balance
 * @param streamId The ID of the stream
 */
function cancelStream(uint256 streamId) external nonReentrant {
    Stream storage stream = streams[streamId];
    require(stream.id != 0, "Stream does not exist");
    require(
        msg.sender == stream.platform || msg.sender == owner(),
        "Not authorized"
    );
    require(
        stream.status == StreamStatus.Active || stream.status == StreamStatus.Paused,
        "Cannot cancel"
    );

    // Calculate final amounts
    uint256 remainingForWorker = stream.releasedAmount - stream.claimedAmount;
    uint256 refundToPlatform = stream.totalAmount - stream.releasedAmount;

    stream.status = StreamStatus.Cancelled;

    // Transfer remaining released amount to worker
    if (remainingForWorker > 0) {
        require(
            usdcToken.transfer(stream.worker, remainingForWorker),
            "Worker transfer failed"
        );
        stream.claimedAmount += remainingForWorker;
    }

    // Refund unreleased amount to platform
    if (refundToPlatform > 0) {
        require(
            usdcToken.transfer(stream.platform, refundToPlatform),
            "Platform refund failed"
        );
    }

    emit StreamCancelled(streamId, msg.sender, refundToPlatform);
}

/**
 * @notice Get detailed information about a stream
 * @param streamId The ID of the stream
 */
function getStreamDetails(uint256 streamId) external view returns (Stream memory) {
    require(streams[streamId].id != 0, "Stream does not exist");
    return streams[streamId];
}

/**
 * @notice Get all stream IDs for a worker
 */
function getWorkerStreams(address worker) external view returns (uint256[] memory) {
    return workerStreams[worker];
}

/**
 * @notice Calculate how much can be released based on time elapsed
 */
function _calculateReleasableAmount(Stream storage stream) private view returns (uint256) {
    uint256 totalElapsed = block.timestamp - stream.startTime;
    uint256 totalReleasable;

    if (totalElapsed >= stream.duration) {
        // Stream completed, release remaining
        totalReleasable = stream.totalAmount;
    } else {
        // Pro-rata calculation
        totalReleasable = (stream.totalAmount * totalElapsed) / stream.duration;
    }

    // Amount not yet released
    uint256 newRelease = totalReleasable > stream.releasedAmount ?
        totalReleasable - stream.releasedAmount : 0;

    return newRelease;
}

/**
 * @notice Emergency pause (owner only)
 */
function pause() external onlyOwner {
    _pause();
}

/**
 * @notice Unpause (owner only)
 */
function unpause() external onlyOwner {
    _unpause();
}
}
```

#### 3.2.4 Gas Optimization Notes

- Use `immutable` for USDC token address
- Pack struct fields to minimize storage slots
- Use events instead of storing historical data
- Batch operations where possible
- Estimated gas costs:
  - `createStream`: ~150,000 gas
  - `releasePayment`: ~80,000 gas
  - `claimEarnings`: ~50,000 gas

### 3.3 ReputationLedger Contract

**Purpose:** Track worker reputation on-chain for transparency and portability.

#### 3.3.1 Contract Structure

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract ReputationLedger is Ownable, Pausable {

    struct ReputationData {
        uint256 score; // 0-1000
        uint256 totalTasks;
        uint256 completedOnTime;
        uint256 totalDisputes;
        uint256 totalRatings;
        uint256 sumOfRatings;
    }

    // worker => reputation data
    mapping(address => ReputationData) public reputations;

    // Authorized recorders (backend services)
    mapping(address => bool) public authorizedRecorders;

    // Constants
    uint256 public constant BASE_SCORE = 100;
    uint256 public constant MAX_SCORE = 1000;
    uint256 public constant TASK_COMPLETION_POINTS = 2;
    uint256 public constant ON_TIME_BONUS = 1;
    uint256 public constant HIGH_RATING_BONUS = 1; // 4-5 stars

    // Events
    event TaskRecorded(
        address indexed worker,
        uint256 taskId,
        bool onTime,
        uint8 rating,
        uint256 newScore
    );

    event DisputeRecorded(
        address indexed worker,
        uint256 taskId,
        uint8 severity,
        uint256 pointsLost,
        uint256 newScore
    );

    event AuthorizedRecorderAdded(address indexed recorder);
    event AuthorizedRecorderRemoved(address indexed recorder);

    constructor() {
        authorizedRecorders[msg.sender] = true;
    }

    modifier onlyAuthorized() {
        require(authorizedRecorders[msg.sender], "Not authorized");
        _;
    }

    /**
     * @notice Record a completed task
     * @param worker Worker address
     * @param taskId Task identifier (can be off-chain ID)
     * @param onTime Whether task was completed on time
     * @param rating Rating from 1-5 (0 if no rating)
     */
    function recordCompletion(
        address worker,
        uint256 taskId,
        bool onTime,
        uint8 rating
    ) external onlyAuthorized whenNotPaused {
        require(worker != address(0), "Invalid worker");
        require(rating <= 5, "Invalid rating");

        ReputationData storage rep = reputations[worker];

        // Initialize if first task
        if (rep.totalTasks == 0) {
            rep.score = BASE_SCORE;
        }

        // Update task counts
        rep.totalTasks++;
        if (onTime) {
            rep.completedOnTime++;
        }

        // Calculate points
        uint256 points = TASK_COMPLETION_POINTS;
        if (onTime) points += ON_TIME_BONUS;
        if (rating >= 4) points += HIGH_RATING_BONUS;

        // Update score (cap at MAX_SCORE)
        uint256 newScore = rep.score + points;
        if (newScore > MAX_SCORE) newScore = MAX_SCORE;
        rep.score = newScore;

        // Update rating average
        if (rating > 0) {
            rep.totalRatings++;
            rep.sumOfRatings += rating;
        }

        emit TaskRecorded(worker, taskId, onTime, rating, newScore);
    }

    /**
     * @notice Record a dispute
     * @param worker Worker address
     * @param taskId Task identifier
     * @param severity Severity level (1-5, higher = worse)
     */
    function recordDispute(
        address worker,
        uint256 taskId,
        uint8 severity
    ) external onlyAuthorized whenNotPaused {
        require(worker != address(0), "Invalid worker");
        require(severity >= 1 && severity <= 5, "Invalid severity");

        ReputationData storage rep = reputations[worker];
        rep.totalDisputes++;

        // Points lost: 10 * severity (10-50 points)
        uint256 pointsLost = 10 * uint256(severity);

        // Deduct points (floor at 0)
        uint256 newScore = rep.score > pointsLost ? rep.score - pointsLost : 0;
        rep.score = newScore;

        emit DisputeRecorded(worker, taskId, severity, pointsLost, newScore);
    }

    /**
     * @notice Get reputation score
     */
    function getReputationScore(address worker)
        external view returns (uint256 score, uint256 tasksCompleted)
    {
        ReputationData memory rep = reputations[worker];
        return (rep.score, rep.totalTasks);
    }

    /**
     * @notice Get completion rate (as percentage * 100)
     */
    function getCompletionRate(address worker) external view returns (uint256) {
        ReputationData memory rep = reputations[worker];
        if (rep.totalTasks == 0) return 10000; // 100% if no tasks yet
        return (rep.completedOnTime * 10000) / rep.totalTasks;
    }

    /**
     * @notice Get average rating (scaled by 100)
     */
    function getAverageRating(address worker) external view returns (uint256) {
        ReputationData memory rep = reputations[worker];
        if (rep.totalRatings == 0) return 0;
        return (rep.sumOfRatings * 100) / rep.totalRatings;
    }

    /**
     * @notice Add authorized recorder
     */
    function addAuthorizedRecorder(address recorder) external onlyOwner {
        authorizedRecorders[recorder] = true;
        emit AuthorizedRecorderAdded(recorder);
    }

    /**
     * @notice Remove authorized recorder
     */
    function removeAuthorizedRecorder(address recorder) external onlyOwner {
        authorizedRecorders[recorder] = false;
        emit AuthorizedRecorderRemoved(recorder);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
```

### 3.4 MicroLoan Contract

**Purpose:** Manage advance payments with automated repayment from future earnings.

#### 3.4.1 Contract Structure

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MicroLoan is ReentrancyGuard, Pausable, Ownable {

    IERC20 public immutable usdcToken;

    uint256 public loanCount;

    enum LoanStatus { Pending, Approved, Disbursed, Repaying, Repaid, Defaulted, Cancelled }

    struct Loan {
        uint256 id;
        address worker;
        uint256 requestedAmount;
        uint256 approvedAmount;
        uint256 feeRateBps; // Basis points (200 = 2%)
        uint256 feeAmount;
        uint256 totalDue;
        uint256 repaidAmount;
        uint256 repaymentTasksTarget;
        uint256 repaymentTasksCompleted;
        uint256 createdAt;
        uint256 disbursedAt;
        uint256 dueDate; // 30 days from disbursement
        LoanStatus status;
    }

    // loanId => Loan
    mapping(uint256 => Loan) public loans;

    // worker => active loan ID (only one active loan per worker)
    mapping(address => uint256) public activeLoan;

    // Authorized approvers (risk engine)
    mapping(address => bool) public authorizedApprovers;

    // Constants
    uint256 public constant DEFAULT_PERIOD = 30 days;
    uint256 public constant MIN_FEE_BPS = 200; // 2%
    uint256 public constant MAX_FEE_BPS = 500; // 5%
    uint256 public constant DEFAULT_REPAYMENT_TASKS = 5;

    // Events
    event LoanRequested(
        uint256 indexed loanId,
        address indexed worker,
        uint256 requestedAmount
    );

    event LoanApproved(
        uint256 indexed loanId,
        uint256 approvedAmount,
        uint256 feeRateBps
    );

    event LoanDisbursed(
        uint256 indexed loanId,
        address indexed worker,
        uint256 amount
    );

    event RepaymentMade(
        uint256 indexed loanId,
        uint256 amount,
        uint256 remainingBalance
    );

    event LoanRepaid(
        uint256 indexed loanId,
        uint256 totalRepaid
    );

    event LoanDefaulted(
        uint256 indexed loanId,
        uint256 remainingBalance
    );

    constructor(address _usdcToken) {
        usdcToken = IERC20(_usdcToken);
        authorizedApprovers[msg.sender] = true;
    }

    modifier onlyAuthorized() {
        require(authorizedApprovers[msg.sender], "Not authorized");
        _;
    }

    /**
     * @notice Worker requests an advance
     * @param amount Amount of USDC requested
     */
    function requestAdvance(uint256 amount) external nonReentrant whenNotPaused returns (uint256 loanId) {
        require(amount > 0, "Amount must be positive");
        require(activeLoan[msg.sender] == 0, "Already have active loan");

        loanId = ++loanCount;

        Loan storage loan = loans[loanId];
        loan.id = loanId;
        loan.worker = msg.sender;
        loan.requestedAmount = amount;
        loan.createdAt = block.timestamp;
        loan.status = LoanStatus.Pending;
        loan.repaymentTasksTarget = DEFAULT_REPAYMENT_TASKS;

        emit LoanRequested(loanId, msg.sender, amount);
    }

    /**
     * @notice Approve a loan (called by risk engine)
     * @param loanId Loan to approve
     * @param approvedAmount Amount approved (may be less than requested)
     * @param feeRateBps Fee rate in basis points
     */
    function approveLoan(
        uint256 loanId,
        uint256 approvedAmount,
        uint256 feeRateBps
    ) external onlyAuthorized nonReentrant whenNotPaused {
        Loan storage loan = loans[loanId];
        require(loan.id != 0, "Loan does not exist");
        require(loan.status == LoanStatus.Pending, "Loan not pending");
        require(approvedAmount > 0 && approvedAmount <= loan.requestedAmount, "Invalid amount");
        require(feeRateBps >= MIN_FEE_BPS && feeRateBps <= MAX_FEE_BPS, "Invalid fee rate");

        loan.approvedAmount = approvedAmount;
        loan.feeRateBps = feeRateBps;
        loan.feeAmount = (approvedAmount * feeRateBps) / 10000;
        loan.totalDue = approvedAmount + loan.feeAmount;
        loan.status = LoanStatus.Approved;

        emit LoanApproved(loanId, approvedAmount, feeRateBps);

        // Auto-disburse
        _disburseLoan(loanId);
    }

    /**
     * @notice Internal function to disburse loan
     */
    function _disburseLoan(uint256 loanId) private {
        Loan storage loan = loans[loanId];
        require(loan.status == LoanStatus.Approved, "Loan not approved");

        // Transfer USDC to worker
        require(
            usdcToken.transfer(loan.worker, loan.approvedAmount),
            "Transfer failed"
        );

        loan.status = LoanStatus.Repaying;
        loan.disbursedAt = block.timestamp;
        loan.dueDate = block.timestamp + DEFAULT_PERIOD;
        activeLoan[loan.worker] = loanId;

        emit LoanDisbursed(loanId, loan.worker, loan.approvedAmount);
    }

    /**
     * @notice Record repayment from worker's task earnings
     * @param loanId Loan to repay
     * @param amount Amount to repay
     */
    function repayFromEarnings(
        uint256 loanId,
        uint256 amount
    ) external onlyAuthorized nonReentrant whenNotPaused {
        Loan storage loan = loans[loanId];
        require(loan.id != 0, "Loan does not exist");
        require(loan.status == LoanStatus.Repaying, "Loan not in repayment");
        require(amount > 0, "Amount must be positive");

        // Transfer USDC from worker (must be pre-approved)
        require(
            usdcToken.transferFrom(loan.worker, address(this), amount),
            "Transfer failed"
        );

        loan.repaidAmount += amount;
        loan.repaymentTasksCompleted++;

        uint256 remaining = loan.totalDue - loan.repaidAmount;

        emit RepaymentMade(loanId, amount, remaining);

        // Check if fully repaid
        if (loan.repaidAmount >= loan.totalDue) {
            loan.status = LoanStatus.Repaid;
            delete activeLoan[loan.worker];
            emit LoanRepaid(loanId, loan.repaidAmount);
        }
    }

    /**
     * @notice Mark loan as defaulted (called by backend or owner)
     */
    function markDefaulted(uint256 loanId) external onlyAuthorized {
        Loan storage loan = loans[loanId];
        require(loan.id != 0, "Loan does not exist");
        require(loan.status == LoanStatus.Repaying, "Loan not in repayment");
        require(block.timestamp > loan.dueDate, "Not past due date");

        loan.status = LoanStatus.Defaulted;
        delete activeLoan[loan.worker];

        uint256 remaining = loan.totalDue - loan.repaidAmount;
        emit LoanDefaulted(loanId, remaining);
    }

    /**
     * @notice Get loan details
     */
    function getLoanDetails(uint256 loanId) external view returns (Loan memory) {
        require(loans[loanId].id != 0, "Loan does not exist");
        return loans[loanId];
    }

    /**
     * @notice Get active loan for a worker
     */
    function getActiveLoan(address worker) external view returns (uint256) {
        return activeLoan[worker];
    }

    /**
     * @notice Add authorized approver
     */
    function addAuthorizedApprover(address approver) external onlyOwner {
        authorizedApprovers[approver] = true;
    }

    /**
     * @notice Fund the contract with USDC for lending
     */
    function fundContract(uint256 amount) external onlyOwner {
        require(
            usdcToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
    }

    /**
     * @notice Withdraw USDC from contract
     */
    function withdrawFunds(uint256 amount) external onlyOwner nonReentrant {
        require(
            usdcToken.transfer(owner(), amount),
            "Transfer failed"
        );
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
```

### 3.5 Deployment Strategy

**Deployment Order:**

1. Deploy USDC mock contract (for testnet) or use existing Arc USDC
2. Deploy ReputationLedger
3. Deploy PaymentStreaming with USDC address
4. Deploy MicroLoan with USDC address
5. Fund MicroLoan contract with test USDC
6. Add backend service address as authorized recorder/approver

**Configuration:**

- Save deployed contract addresses to backend config
- Initialize ReputationLedger with backend address as authorized recorder
- Initialize MicroLoan with backend address as authorized approver
- Verify contracts on Arc explorer

**Testing:**

- Unit tests with Foundry (forge test)
- Integration tests with backend
- Gas profiling with forge --gas-report
- Security scan with Slither

---

## 4. Backend API Specification

### 4.1 API Architecture

**Framework:** Hono (lightweight, edge-optimized framework for Cloudflare Workers)

**Base URL:** `https://api.gigstream.app` (or Cloudflare Workers URL)

**API Versioning:** `/api/v1/...`

**Authentication:**

- Worker endpoints: JWT Bearer token
- Platform endpoints: API Key in `X-API-Key` header
- Admin endpoints: JWT with admin role

**Response Format:** JSON

**Error Handling:** Consistent error response structure

```typescript
interface ErrorResponse {
  error: {
    code: string; // Machine-readable error code
    message: string; // Human-readable message
    details?: any; // Optional additional context
    requestId: string; // Trace ID for debugging
  };
}
```

**Common HTTP Status Codes:**

- 200: Success
- 201: Created
- 400: Bad Request (validation error)
- 401: Unauthorized (missing/invalid auth)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 429: Too Many Requests (rate limited)
- 500: Internal Server Error

### 4.2 Authentication & Authorization

#### 4.2.1 Worker Authentication

**Registration/Login:**

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "worker@example.com",
  "password": "SecurePass123!",
  "displayName": "John Doe",
  "referralCode": "PLATFORM123" // optional
}

Response 201:
{
  "worker": {
    "id": "uuid",
    "email": "worker@example.com",
    "displayName": "John Doe",
    "walletAddress": "0x1234...abcd",
    "reputationScore": 100,
    "createdAt": "2025-10-26T10:00:00Z"
  },
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "expiresIn": 86400
}
```

**Wallet-Based Sign-In:**

```http
POST /api/v1/auth/wallet-login
Content-Type: application/json

{
  "walletAddress": "0x1234...abcd",
  "signature": "0xabc123...",  // Signature of message
  "message": "Sign in to GigStream: [timestamp]"
}

Response 200:
{
  "worker": {...},
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "expiresIn": 86400
}
```

**Token Refresh:**

```http
POST /api/v1/auth/refresh
Content-Type: application/json
{
  "refreshToken": "eyJhbG..."
}

Response 200:
{
  "accessToken": "eyJhbG...",
  "expiresIn": 86400
}
```

#### 4.2.2 Platform Authentication

**Platform Registration:**

```http
POST /api/v1/platforms/register
Content-Type: application/json
X-Admin-Token: [admin-token]

{
  "name": "RideShare Co",
  "companyName": "RideShare Inc",
  "contactEmail": "api@rideshare.com",
  "webhookUrl": "https://rideshare.com/webhooks/gigstream"
}

Response 201:
{
  "platform": {
    "id": "uuid",
    "name": "RideShare Co",
    "createdAt": "2025-10-26T10:00:00Z"
  },
  "apiKey": "gs_live_abc123...",  // Only shown once
  "webhookSecret": "whsec_abc123..."  // For HMAC verification
}
```

### 4.3 Worker Endpoints

#### 4.3.1 Worker Profile

```http
GET /api/v1/workers/{workerId}
Authorization: Bearer {jwt-token}

Response 200:
{
  "id": "uuid",
  "email": "worker@example.com",
  "displayName": "John Doe",
  "walletAddress": "0x1234...abcd",
  "reputationScore": 850,
  "totalTasksCompleted": 127,
  "totalEarningsUsdc": "1234.56",
  "accountAge": "45 days",
  "status": "active",
  "createdAt": "2025-09-10T10:00:00Z",
  "metadata": {}
}
```

#### 4.3.2 Balance Query

```http
GET /api/v1/workers/{workerId}/balance
Authorization: Bearer {jwt-token}

Response 200:
{
  "walletAddress": "0x1234...abcd",
  "balanceUsdc": "245.67",
  "pendingUsdc": "12.50",  // Unreleased stream payments
  "lastUpdated": "2025-10-26T10:30:00Z"
}
```

#### 4.3.3 Earnings History

```http
GET /api/v1/workers/{workerId}/earnings
Authorization: Bearer {jwt-token}
Query Parameters:
  - page: number (default: 1)
  - limit: number (default: 20, max: 100)
  - startDate: ISO date
  - endDate: ISO date
  - type: 'payout' | 'advance' | 'refund'

Response 200:
{
  "earnings": [
    {
      "id": "uuid",
      "type": "payout",
      "amount": "25.00",
      "taskId": "uuid",
      "taskTitle": "Deliver Package #12345",
      "platformName": "DeliverFast",
      "txHash": "0xabc123...",
      "explorerUrl": "https://arc-explorer.circle.com/tx/0xabc123...",
      "status": "confirmed",
      "createdAt": "2025-10-26T09:15:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 127,
    "pages": 7
  },
  "summary": {
    "totalEarnings": "1234.56",
    "thisWeek": "87.50",
    "thisMonth": "342.10"
  }
}
```

#### 4.3.4 Reputation Details

```http
GET /api/v1/workers/{workerId}/reputation
Authorization: Bearer {jwt-token}

Response 200:
{
  "score": 850,
  "maxScore": 1000,
  "percentile": 85,  // Better than 85% of workers
  "breakdown": {
    "tasksCompleted": 127,
    "onTimeRate": 0.94,
    "averageRating": 4.6,
    "disputes": 2,
    "activeStreak": 15  // days
  },
  "recentEvents": [
    {
      "type": "task_completed",
      "pointsDelta": +3,
      "reason": "On-time delivery with 5-star rating",
      "createdAt": "2025-10-26T08:00:00Z"
    }
  ],
  "badges": [
    {
      "name": "Top Performer",
      "description": "Maintained 4.5+ rating for 30 days",
      "earnedAt": "2025-10-20T00:00:00Z"
    }
  ]
}
```

#### 4.3.5 Request Advance

```http
POST /api/v1/workers/{workerId}/advance
Authorization: Bearer {jwt-token}
Content-Type: application/json

{
  "requestedAmount": "100.00"
}

Response 200 (if approved):
{
  "loan": {
    "id": "uuid",
    "approvedAmount": "80.00",  // May be less than requested
    "feeRate": 0.02,  // 2%
    "feeAmount": "1.60",
    "totalDue": "81.60",
    "repaymentPlan": {
      "tasksCount": 5,
      "perTaskAmount": "16.32"
    },
    "dueDate": "2025-11-25T00:00:00Z",
    "status": "disbursed"
  },
  "eligibility": {
    "riskScore": 850,
    "predictedEarnings7d": "120.00",
    "maxEligibleAmount": "96.00",  // 80% of prediction
    "reason": "Good reputation and consistent earnings"
  },
  "transaction": {
    "txHash": "0xdef456...",
    "explorerUrl": "https://arc-explorer.circle.com/tx/0xdef456..."
  }
}

Response 403 (if rejected):
{
  "error": {
    "code": "ADVANCE_NOT_ELIGIBLE",
    "message": "Not eligible for advance at this time",
    "details": {
      "reason": "Existing active loan",
      "activeLoanId": "uuid",
      "remainingBalance": "45.20"
    },
    "requestId": "req_abc123"
  }
}
```

#### 4.3.6 Active Loans

```http
GET /api/v1/workers/{workerId}/loans
Authorization: Bearer {jwt-token}

Response 200:
{
  "activeLoan": {
    "id": "uuid",
    "approvedAmount": "80.00",
    "totalDue": "81.60",
    "repaidAmount": "32.64",
    "remainingBalance": "48.96",
    "progress": 0.40,  // 40% repaid
    "repaymentTasksCompleted": 2,
    "repaymentTasksTarget": 5,
    "disbursedAt": "2025-10-20T10:00:00Z",
    "dueDate": "2025-11-19T00:00:00Z",
    "status": "repaying"
  },
  "loanHistory": [
    {
      "id": "uuid",
      "amount": "50.00",
      "totalRepaid": "51.00",
      "disbursedAt": "2025-09-15T10:00:00Z",
      "repaidAt": "2025-09-25T15:30:00Z",
      "status": "repaid"
    }
  ]
}
```

### 4.4 Platform Endpoints

#### 4.4.1 Task Completion Webhook (Platform→GigStream)

```http
POST /api/v1/tasks/complete
X-API-Key: {platform-api-key}
X-Signature: {hmac-sha256-signature}
Content-Type: application/json

{
  "externalTaskId": "TASK-12345",
  "workerId": "uuid",  // GigStream worker ID
  "completedAt": "2025-10-26T10:15:00Z",
  "amount": "25.00",
  "completionProof": {
    "photos": ["https://..."],
    "gpsCoordinates": {"lat": 40.7128, "lon": -74.0060},
    "duration": 45,  // minutes
    "signature": "0xabc..."
  },
  "rating": 5,
  "metadata": {
    "customField": "value"
  }
}

Response 202:
{
  "taskId": "uuid",  // GigStream internal task ID
  "status": "verifying",
  "message": "Task submitted for verification",
  "estimatedPaymentTime": "2025-10-26T10:15:05Z"
}

Response (async webhook back to platform):
POST {platform.webhookUrl}/gigstream/payment-confirmed
X-GigStream-Signature: {hmac-signature}

{
  "externalTaskId": "TASK-12345",
  "taskId": "uuid",
  "workerId": "uuid",
  "amount": "25.00",
  "txHash": "0xabc123...",
  "explorerUrl": "https://arc-explorer.circle.com/tx/0xabc123...",
  "completedAt": "2025-10-26T10:15:03Z"
}
```

#### 4.4.2 Start Payment Stream

```http
POST /api/v1/tasks/start-stream
X-API-Key: {platform-api-key}
Content-Type: application/json

{
  "workerId": "uuid",
  "totalAmount": "100.00",
  "durationSeconds": 3600,  // 1 hour
  "releaseIntervalSeconds": 60,  // Release every minute
  "metadata": {
    "shiftId": "SHIFT-789",
    "description": "Warehouse shift"
  }
}

Response 201:
{
  "stream": {
    "id": "uuid",
    "streamId": 42,  // Smart contract ID
    "workerId": "uuid",
    "totalAmount": "100.00",
    "releaseInterval": 60,
    "duration": 3600,
    "amountPerRelease": "1.67",
    "status": "active",
    "startedAt": "2025-10-26T10:00:00Z",
    "estimatedCompletionAt": "2025-10-26T11:00:00Z"
  },
  "transaction": {
    "txHash": "0xdef456...",
    "explorerUrl": "https://arc-explorer.circle.com/tx/0xdef456..."
  }
}
```

#### 4.4.3 Platform Workers List

```http
GET /api/v1/platforms/{platformId}/workers
X-API-Key: {platform-api-key}
Query Parameters:
  - status: 'active' | 'suspended'
  - minReputation: number
  - page: number
  - limit: number

Response 200:
{
  "workers": [
    {
      "id": "uuid",
      "displayName": "John Doe",
      "walletAddress": "0x1234...abcd",
      "reputationScore": 850,
      "tasksCompleted": 127,
      "averageRating": 4.6,
      "onTimeRate": 0.94,
      "joinedAt": "2025-09-10T10:00:00Z",
      "lastActiveAt": "2025-10-26T09:00:00Z"
    }
  ],
  "pagination": {...}
}
```

#### 4.4.4 Platform Analytics

```http
GET /api/v1/platforms/{platformId}/analytics
X-API-Key: {platform-api-key}
Query Parameters:
  - startDate: ISO date
  - endDate: ISO date
  - granularity: 'hour' | 'day' | 'week'

Response 200:
{
  "summary": {
    "totalPayouts": "12345.67",
    "tasksCompleted": 542,
    "uniqueWorkers": 87,
    "averagePaymentTime": "2.3s",
    "averageTaskRating": 4.5
  },
  "timeSeries": [
    {
      "timestamp": "2025-10-26T00:00:00Z",
      "payouts": "543.21",
      "tasks": 23,
      "workers": 12
    }
  ],
  "topWorkers": [
    {
      "workerId": "uuid",
      "displayName": "John Doe",
      "tasksCompleted": 45,
      "totalEarned": "1125.00",
      "averageRating": 4.9
    }
  ]
}
```

### 4.5 Webhook Configuration

#### 4.5.1 Register Webhook URL

```http
POST /api/v1/platforms/{platformId}/webhooks
X-API-Key: {platform-api-key}
Content-Type: application/json

{
  "url": "https://platform.com/webhooks/gigstream",
  "events": ["payment.confirmed", "task.verified", "stream.completed"],
  "secret": "custom_secret_123"  // Optional, we generate one if not provided
}

Response 201:
{
  "webhook": {
    "id": "uuid",
    "url": "https://platform.com/webhooks/gigstream",
    "events": ["payment.confirmed", "task.verified", "stream.completed"],
    "secret": "whsec_abc123...",
    "enabled": true,
    "createdAt": "2025-10-26T10:00:00Z"
  },
  "signatureVerification": {
    "algorithm": "HMAC-SHA256",
    "header": "X-GigStream-Signature",
    "example": "sha256=abc123..."
  }
}
```

### 4.6 Rate Limiting

**Implementation:** Token bucket algorithm via Redis

**Limits:**

- Worker endpoints: 100 requests/minute per worker
- Platform endpoints: 1000 requests/minute per platform
- Auth endpoints: 10 requests/minute per IP (prevent brute force)

**Headers:**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1698321600
```

**Rate Limit Error Response:**

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "limit": 100,
      "remaining": 0,
      "resetAt": "2025-10-26T10:05:00Z"
    },
    "requestId": "req_abc123"
  }
}
```

### 4.7 Error Codes Reference

| Code                     | HTTP Status | Description                               |
| ------------------------ | ----------- | ----------------------------------------- |
| `INVALID_REQUEST`        | 400         | Malformed request or validation error     |
| `UNAUTHORIZED`           | 401         | Missing or invalid authentication         |
| `FORBIDDEN`              | 403         | Insufficient permissions                  |
| `NOT_FOUND`              | 404         | Resource not found                        |
| `CONFLICT`               | 409         | Resource already exists or state conflict |
| `RATE_LIMIT_EXCEEDED`    | 429         | Too many requests                         |
| `INTERNAL_ERROR`         | 500         | Server error                              |
| `BLOCKCHAIN_ERROR`       | 502         | Circle/Arc API error                      |
| `ADVANCE_NOT_ELIGIBLE`   | 403         | Worker not eligible for advance           |
| `WALLET_CREATION_FAILED` | 500         | Failed to create Circle wallet            |

---

## 5. AI & Risk Management System

### 5.1 Task Verification Agent

**Purpose:** Automatically verify task completion before payment release to prevent fraud.

#### 5.1.1 Verification Flow

```
Task Completion Event
        ↓
Extract Metadata (photos, GPS, timestamp, duration)
        ↓
    ┌───┴───┐
    │ Rules │ → Fast path checks:
    └───┬───┘   • Required fields present?
        │       • Timestamp reasonable?
        │       • Amount within limits?
        ↓
    [Pass?] → No → Flag for manual review
        ↓ Yes
    ┌───┴────┐
    │   AI   │ → ML model or heuristic:
    │ Model  │   • Photo quality check
    └───┬────┘   • GPS verification
        │        • Pattern anomaly detection
        ↓
 [Confidence Score]
        │
    ┌───┴────┐
    │Verdict │
    └───┬────┘
        ↓
    ┌───┴────────┬──────────┐
    │  Approve   │   Flag   │ Reject
    │  (>90%)    │ (50-90%) │ (<50%)
    └────┬───────┴────┬─────┴────┬──────
         │            │          │
    Auto-pay    Manual Queue   Decline
```

#### 5.1.2 Verification Rules Engine

**Fast Path Rules (deterministic):**

```typescript
interface VerificationRules {
  requiredFields: string[]; // ['completedAt', 'amount', 'gps']
  amountLimits: {
    min: number; // 0.01 USDC
    max: number; // 1000 USDC (flag above this)
  };
  timeLimits: {
    maxFutureOffset: number; // 5 minutes
    maxPastOffset: number; // 24 hours
  };
  gpsValidation: {
    required: boolean;
    geofenceCheck: boolean; // If platform provides expected location
    radiusMeters: number; // Acceptable distance
  };
  photoValidation: {
    required: boolean;
    minCount: number;
    maxSizeMB: number;
    formats: string[]; // ['jpg', 'png', 'webp']
  };
}

function runFastPathChecks(task: TaskCompletion): VerificationResult {
  const issues: string[] = [];

  // Required fields
  if (!task.completedAt) issues.push("Missing completion timestamp");
  if (!task.amount || task.amount <= 0) issues.push("Invalid amount");

  // Amount limits
  if (task.amount > rules.amountLimits.max) {
    issues.push(`Amount exceeds limit: ${task.amount}`);
  }

  // Timestamp validation
  const now = Date.now();
  const completedTime = new Date(task.completedAt).getTime();
  if (completedTime > now + rules.timeLimits.maxFutureOffset) {
    issues.push("Completion time is in the future");
  }
  if (now - completedTime > rules.timeLimits.maxPastOffset) {
    issues.push("Completion time too far in the past");
  }

  // GPS validation
  if (rules.gpsValidation.required && !task.completionProof?.gpsCoordinates) {
    issues.push("Missing GPS coordinates");
  }

  // Photo validation
  if (rules.photoValidation.required) {
    const photos = task.completionProof?.photos || [];
    if (photos.length < rules.photoValidation.minCount) {
      issues.push(
        `Insufficient photos: ${photos.length}/${rules.photoValidation.minCount}`
      );
    }
  }

  return {
    passed: issues.length === 0,
    issues,
    autoApprove: issues.length === 0 && task.amount < 50, // Low-value tasks
  };
}
```

#### 5.1.3 AI Model Integration

**Option 1: Cloudflare Workers AI**

```typescript
interface WorkersAIRequest {
  model: "@cf/meta/llama-3-8b-instruct"; // Or vision model
  messages: Array<{
    role: "system" | "user";
    content: string;
  }>;
}

async function verifyWithAI(task: TaskCompletion): Promise<AIVerdict> {
  const prompt = `
Verify the following gig task completion:
- Task: ${task.title}
- Amount: ${task.amount} USDC
- Duration: ${task.duration} minutes
- GPS: ${task.completionProof.gpsCoordinates}
- Photos: ${task.completionProof.photos.length} provided
- Worker history: ${task.worker.completionRate}% on-time

Respond with JSON:
{
  "verdict": "approve" | "flag" | "reject",
  "confidence": 0-100,
  "reason": "brief explanation"
}
`;

  const response = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
    messages: [
      { role: "system", content: "You are a task verification assistant." },
      { role: "user", content: prompt },
    ],
  });

  return JSON.parse(response.result);
}
```

**Option 2: Heuristic Fallback**

```typescript
function verifyWithHeuristic(task: TaskCompletion): AIVerdict {
  let score = 50; // Base score

  // Worker reputation boost
  if (task.worker.reputationScore > 800) score += 30;
  else if (task.worker.reputationScore > 500) score += 15;

  // Historical performance
  if (task.worker.completionRate > 0.95) score += 10;
  if (task.worker.disputes < 3) score += 10;

  // Task attributes
  if (task.amount < 50) score += 5; // Low-value = lower risk
  if (task.completionProof.photos?.length >= 2) score += 10;
  if (task.completionProof.gpsCoordinates) score += 5;

  // Anomaly detection
  if (task.duration < 1) score -= 20; // Too fast
  if (task.amount > task.estimatedAmount * 2) score -= 15; // Overpaid

  return {
    verdict: score >= 90 ? "approve" : score >= 50 ? "flag" : "reject",
    confidence: score,
    reason: `Heuristic score: ${score}/100`,
  };
}
```

### 5.2 Risk Scoring Model

**Purpose:** Calculate worker creditworthiness for advance eligibility.

#### 5.2.1 Scoring Algorithm

```typescript
interface RiskScoreInputs {
  reputationScore: number; // 0-1000
  accountAgeDays: number;
  totalTasksCompleted: number;
  completionRate: number; // 0-1
  onTimeRate: number; // 0-1
  averageRating: number; // 0-5
  totalDisputes: number;
  activeLoans: number;
  loanRepaymentHistory: number; // 0-1 (% repaid on time)
  earningsVolatility: number; // Standard deviation of weekly earnings
  last30DaysEarnings: number;
}

interface RiskScoreOutput {
  score: number; // 0-1000
  factors: Record<string, number>; // Factor contributions
  eligibleForAdvance: boolean;
  maxAdvanceAmount: number;
  recommendedFeeRate: number; // Basis points
}

function calculateRiskScore(inputs: RiskScoreInputs): RiskScoreOutput {
  const factors: Record<string, number> = {};

  // 1. Reputation (30% weight)
  factors.reputation = (inputs.reputationScore / 1000) * 300;

  // 2. Account maturity (15% weight)
  const maturityScore = Math.min(inputs.accountAgeDays / 90, 1); // Cap at 90 days
  factors.maturity = maturityScore * 150;

  // 3. Task history (25% weight)
  const taskScore = Math.min(inputs.totalTasksCompleted / 50, 1); // Cap at 50 tasks
  factors.taskHistory = taskScore * 250;

  // 4. Performance metrics (20% weight)
  const performanceScore =
    inputs.completionRate * 0.4 +
    inputs.onTimeRate * 0.4 +
    (inputs.averageRating / 5) * 0.2;
  factors.performance = performanceScore * 200;

  // 5. Dispute history (10% weight, negative)
  const disputePenalty = Math.min(inputs.totalDisputes * 20, 100);
  factors.disputes = 100 - disputePenalty;

  // 6. Loan history (bonus/penalty)
  if (inputs.loanRepaymentHistory === 1) {
    factors.loanHistory = 50; // Bonus for perfect repayment
  } else if (inputs.loanRepaymentHistory < 0.8) {
    factors.loanHistory = -50; // Penalty for poor repayment
  } else {
    factors.loanHistory = 0;
  }

  // Total score
  const totalScore = Math.max(
    0,
    Math.min(
      1000,
      factors.reputation +
        factors.maturity +
        factors.taskHistory +
        factors.performance +
        factors.disputes +
        factors.loanHistory
    )
  );

  // Eligibility determination
  const eligible = totalScore >= 600 && inputs.activeLoans === 0;

  // Max advance calculation
  let maxAdvance = 0;
  if (eligible) {
    // 50-80% of last 30 days earnings, based on score
    const ratio = 0.5 + (totalScore / 1000) * 0.3; // 50% to 80%
    maxAdvance = inputs.last30DaysEarnings * ratio;
  }

  // Fee rate (higher risk = higher fee)
  const feeRate =
    totalScore >= 800
      ? 200 // 2% for low risk
      : totalScore >= 600
      ? 350 // 3.5% for medium risk
      : 500; // 5% for high risk

  return {
    score: Math.round(totalScore),
    factors,
    eligibleForAdvance: eligible,
    maxAdvanceAmount: Math.round(maxAdvance * 100) / 100,
    recommendedFeeRate: feeRate,
  };
}
```

#### 5.2.2 Explainability

For transparency, provide factor breakdown to workers:

```typescript
interface ScoreExplanation {
  score: number;
  tier: "Excellent" | "Good" | "Fair" | "Poor";
  factors: Array<{
    name: string;
    value: number;
    maxValue: number;
    impact: "positive" | "negative" | "neutral";
    suggestion?: string;
  }>;
}

function explainScore(
  inputs: RiskScoreInputs,
  output: RiskScoreOutput
): ScoreExplanation {
  const tier =
    output.score >= 800
      ? "Excellent"
      : output.score >= 600
      ? "Good"
      : output.score >= 400
      ? "Fair"
      : "Poor";

  return {
    score: output.score,
    tier,
    factors: [
      {
        name: "Reputation Score",
        value: inputs.reputationScore,
        maxValue: 1000,
        impact: inputs.reputationScore > 700 ? "positive" : "neutral",
        suggestion:
          inputs.reputationScore < 700
            ? "Complete more tasks to improve"
            : undefined,
      },
      {
        name: "Account Age",
        value: inputs.accountAgeDays,
        maxValue: 90,
        impact: inputs.accountAgeDays > 30 ? "positive" : "neutral",
        suggestion:
          inputs.accountAgeDays < 30
            ? "New accounts have lower limits"
            : undefined,
      },
      {
        name: "Completion Rate",
        value: Math.round(inputs.completionRate * 100),
        maxValue: 100,
        impact:
          inputs.completionRate > 0.9
            ? "positive"
            : inputs.completionRate < 0.7
            ? "negative"
            : "neutral",
        suggestion:
          inputs.completionRate < 0.9
            ? "Maintain a high completion rate"
            : undefined,
      },
      {
        name: "Disputes",
        value: inputs.totalDisputes,
        maxValue: 0,
        impact: inputs.totalDisputes > 3 ? "negative" : "positive",
        suggestion:
          inputs.totalDisputes > 0
            ? "Avoid disputes to improve score"
            : "Great! No disputes",
      },
    ],
  };
}
```

### 5.3 Earnings Prediction Engine

**Purpose:** Forecast next 7 days earnings to determine safe advance amounts.

#### 5.3.1 Prediction Algorithm

```typescript
interface EarningsHistory {
  date: string; // ISO date
  earnings: number;
  tasksCompleted: number;
}

interface EarningsPrediction {
  next7Days: number;
  confidence: "high" | "medium" | "low";
  confidenceInterval: [number, number]; // [lower, upper]
  breakdown: Array<{
    date: string;
    predicted: number;
    reasoning: string;
  }>;
}

function predictEarnings(history: EarningsHistory[]): EarningsPrediction {
  if (history.length < 7) {
    // Insufficient data - use conservative estimate
    const avgDaily =
      history.reduce((sum, h) => sum + h.earnings, 0) / history.length;
    return {
      next7Days: avgDaily * 7 * 0.7, // 70% of average for safety
      confidence: "low",
      confidenceInterval: [avgDaily * 5, avgDaily * 9],
      breakdown: [],
    };
  }

  // Calculate day-of-week patterns
  const dayOfWeekAvg: number[] = new Array(7).fill(0);
  const dayOfWeekCount: number[] = new Array(7).fill(0);

  history.forEach((h) => {
    const dayOfWeek = new Date(h.date).getDay();
    dayOfWeekAvg[dayOfWeek] += h.earnings;
    dayOfWeekCount[dayOfWeek]++;
  });

  dayOfWeekAvg.forEach((sum, i) => {
    dayOfWeekAvg[i] = dayOfWeekCount[i] > 0 ? sum / dayOfWeekCount[i] : 0;
  });

  // Calculate trend (simple linear regression)
  const recentDays = history.slice(-14); // Last 2 weeks
  const trend = calculateTrend(recentDays);

  // Predict next 7 days
  const breakdown: Array<{
    date: string;
    predicted: number;
    reasoning: string;
  }> = [];
  let totalPredicted = 0;

  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dayOfWeek = date.getDay();

    // Base prediction from day-of-week average
    let predicted = dayOfWeekAvg[dayOfWeek];

    // Apply trend adjustment
    predicted *= 1 + trend * 0.1; // Dampened trend

    // Apply recency weighting (last 7 days matter more)
    const last7Avg =
      recentDays.slice(-7).reduce((sum, h) => sum + h.earnings, 0) / 7;
    predicted = predicted * 0.6 + last7Avg * 0.4;

    totalPredicted += predicted;
    breakdown.push({
      date: date.toISOString().split("T")[0],
      predicted: Math.round(predicted * 100) / 100,
      reasoning: `${
        ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayOfWeek]
      } avg: $${dayOfWeekAvg[dayOfWeek].toFixed(2)}`,
    });
  }

  // Calculate confidence based on volatility
  const volatility = calculateVolatility(recentDays);
  const confidence =
    volatility < 0.2 ? "high" : volatility < 0.4 ? "medium" : "low";

  // Confidence interval (±20% for high confidence, ±40% for low)
  const interval =
    confidence === "high" ? 0.2 : confidence === "medium" ? 0.3 : 0.4;
  const confidenceInterval: [number, number] = [
    totalPredicted * (1 - interval),
    totalPredicted * (1 + interval),
  ];

  return {
    next7Days: Math.round(totalPredicted * 100) / 100,
    confidence,
    confidenceInterval: confidenceInterval.map(
      (v) => Math.round(v * 100) / 100
    ) as [number, number],
    breakdown,
  };
}

function calculateTrend(data: EarningsHistory[]): number {
  if (data.length < 2) return 0;
  const n = data.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0;
  data.forEach((d, i) => {
    sumX += i;
    sumY += d.earnings;
    sumXY += i * d.earnings;
    sumX2 += i * i;
  });
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const avgY = sumY / n;
  return avgY > 0 ? slope / avgY : 0; // Normalized slope
}

function calculateVolatility(data: EarningsHistory[]): number {
  if (data.length < 2) return 1;
  const mean = data.reduce((sum, d) => sum + d.earnings, 0) / data.length;
  const variance =
    data.reduce((sum, d) => sum + Math.pow(d.earnings - mean, 2), 0) /
    data.length;
  const stdDev = Math.sqrt(variance);
  return mean > 0 ? stdDev / mean : 1; // Coefficient of variation
}
```

### 5.4 Performance Monitoring

**Metrics to Track:**

- Verification accuracy (false positive/negative rates)
- Verification latency (p50, p95, p99)
- Risk score accuracy (predicted defaults vs actual)
- Earnings prediction MAPE (Mean Absolute Percentage Error)
- Auto-approval rate
- Manual review queue depth

**Logging:**

```typescript
interface VerificationLog {
  taskId: string;
  workerId: string;
  amount: number;
  fastPathResult: "pass" | "fail";
  aiVerdict: "approve" | "flag" | "reject";
  aiConfidence: number;
  finalDecision: "approved" | "flagged" | "rejected";
  latencyMs: number;
  timestamp: string;
}
```

---

## 6. Frontend Architecture & UI/UX Design

### 6.1 Technology Stack

**Unified Stack (Next.js 15 Monorepo):**

- **Framework:** Next.js 15 App Router
- **Runtime:** React 19 RC (Server Components, `use()` hook, Actions)
- **Language:** TypeScript 5.3+
- **Deployment:** Cloudflare Pages with Edge Runtime

**State Management:**

- Zustand 4 (client state)
- React Query / TanStack Query 5 (server state caching)
- React 19 native `use()` for async data

**Styling:**

- Tailwind CSS 4 (Oxide engine)
- Headless UI v2 (accessible components)
- Heroicons 2

**Forms & Validation:**

- React Hook Form 7 + Server Actions
- Zod 3 (schema validation)

**Data Visualization:**

- Recharts 2 (charts)
- Framer Motion 11 (animations)

**Circle Integration:**

- @circle-fin/user-controlled-wallets SDK
- Viem 2 (Ethereum interactions)

### 6.2 Application Structure (Unified Next.js Monorepo)

```
gigstream-app/
├── app/
│   ├── (worker)/                    # Worker dashboard routes
│   │   ├── layout.tsx               # Worker-specific layout
│   │   ├── dashboard/
│   │   │   └── page.tsx             # Main dashboard
│   │   ├── tasks/
│   │   │   ├── page.tsx             # Task list
│   │   │   └── [id]/page.tsx        # Task details
│   │   ├── advance/
│   │   │   └── page.tsx             # Request advance
│   │   ├── reputation/
│   │   │   └── page.tsx             # Reputation score
│   │   └── history/
│   │       └── page.tsx             # Transaction history
│   │
│   ├── (platform)/                  # Platform admin routes
│   │   ├── layout.tsx               # Admin-specific layout
│   │   ├── dashboard/
│   │   │   └── page.tsx             # Admin dashboard
│   │   ├── workers/
│   │   │   ├── page.tsx             # Worker list
│   │   │   └── [id]/page.tsx        # Worker details
│   │   ├── analytics/
│   │   │   └── page.tsx             # Analytics dashboard
│   │   └── settings/
│   │       └── page.tsx             # Platform settings
│   │
│   ├── (demo)/                      # Demo simulator routes
│   │   └── simulator/
│   │       └── page.tsx
│   │
│   ├── (auth)/                      # Auth routes
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   │
│   ├── api/                         # API routes (optional, use for SSR helpers)
│   │   └── auth/[...nextauth]/route.ts
│   │
│   └── layout.tsx                   # Root layout
│
├── components/
│   ├── ui/                          # Shadcn-style base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── worker/                      # Worker-specific components
│   │   ├── balance-card.tsx
│   │   ├── earnings-chart.tsx
│   │   ├── task-list.tsx
│   │   └── reputation-gauge.tsx
│   ├── platform/                    # Platform-specific components
│   │   ├── worker-table.tsx
│   │   ├── analytics-cards.tsx
│   │   └── api-key-manager.tsx
│   └── shared/                      # Shared components
│       ├── header.tsx
│       └── navbar.tsx
│
├── lib/
│   ├── api-client.ts               # Backend API client
│   ├── circle-sdk.ts               # Circle wallet integration
│   ├── utils.ts                    # Utility functions
│   └── validation.ts               # Zod schemas
│
├── hooks/
│   ├── use-auth.ts
│   ├── use-balance.ts
│   ├── use-tasks.ts
│   └── use-realtime.ts
│
├── stores/
│   ├── auth-store.ts               # Zustand auth store
│   └── worker-store.ts             # Zustand worker state
│
├── actions/                         # Server Actions
│   ├── advance.ts
│   ├── tasks.ts
│   └── auth.ts
│
├── types/
│   ├── api.ts
│   ├── worker.ts
│   └── platform.ts
│
└── middleware.ts                    # Next.js middleware (auth, routing)
```

### 6.3 Worker Dashboard with React 19

#### 6.3.1 Dashboard Page (Server Component + Client Islands)

```typescript
// app/(worker)/dashboard/page.tsx
import { Suspense } from "react";
import { BalanceCard } from "@/components/worker/balance-card";
import { EarningsChart } from "@/components/worker/earnings-chart";
import { TaskList } from "@/components/worker/task-list";
import { ReputationCard } from "@/components/worker/reputation-card";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

// Server Component - fetches initial data
async function getDashboardData(workerId: string) {
  const res = await fetch(
    `${process.env.API_URL}/workers/${workerId}/dashboard`,
    {
      cache: "no-store", // Always fresh data
    }
  );
  return res.json();
}

export default async function WorkerDashboard() {
  const session = await auth();
  if (!session) redirect("/login");

  const data = await getDashboardData(session.user.id);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Stats Grid - Client components for real-time updates */}
        <div className="grid md:grid-cols-2 gap-6">
          <BalanceCard
            initialBalance={data.balance}
            todayEarnings={data.todayEarnings}
          />
          <QuickActionsCard />
        </div>

        {/* Chart & Tasks */}
        <EarningsChart data={data.weeklyEarnings} />

        <div className="grid lg:grid-cols-2 gap-6">
          <Suspense fallback={<TaskListSkeleton />}>
            <TaskList initialTasks={data.activeTasks} />
          </Suspense>
          <ReputationCard reputation={data.reputation} />
        </div>
      </div>
    </div>
  );
}
```

#### 6.3.2 Balance Card (Client Component with Real-time Updates)

```typescript
// components/worker/balance-card.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import CountUp from "react-countup";

interface BalanceCardProps {
  initialBalance: number;
  todayEarnings: {
    amount: number;
    change: number;
    changePercent: number;
  };
}

export function BalanceCard({
  initialBalance,
  todayEarnings,
}: BalanceCardProps) {
  // Real-time balance updates with polling
  const [balance, setBalance] = useState(initialBalance);

  useEffect(() => {
    let interval = 2000;
    let timeoutId: NodeJS.Timeout;

    const poll = async () => {
      try {
        const res = await fetch("/api/workers/balance");
        const data = await res.json();
        setBalance(data.balanceUsdc);
        interval = 2000; // Reset on success
      } catch {
        interval = Math.min(interval * 1.5, 10000); // Exponential backoff
      }
      timeoutId = setTimeout(poll, interval);
    };

    poll();
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-medium text-muted-foreground">
          Current Balance
        </h3>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold">
          <CountUp
            end={balance}
            decimals={2}
            prefix="$"
            duration={0.5}
            preserveValue
          />
          <span className="text-sm text-muted-foreground ml-2">USDC</span>
        </div>

        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-muted-foreground">Today's Earnings</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-semibold">
              ${todayEarnings.amount.toFixed(2)}
            </span>
            {todayEarnings.change > 0 && (
              <span className="text-sm font-medium text-green-600">
                ↑ ${todayEarnings.change} ({todayEarnings.changePercent}%)
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 6.3.3 Advance Request with Server Actions

```typescript
// app/(worker)/advance/page.tsx
"use client";

import { useActionState } from "react";
import { requestAdvance } from "@/actions/advance";

export default function AdvancePage() {
  const { user } = useAuthStore();
  const [state, formAction, isPending] = useActionState(requestAdvance, {
    success: false,
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Request Advance</h1>
      <AdvanceForm action={formAction} isPending={isPending} state={state} />
    </div>
  );
}

// actions/advance.ts
("use server");

import { revalidatePath } from "next/cache";

export async function requestAdvance(prevState: any, formData: FormData) {
  const amount = Number(formData.get("amount"));

  try {
    const res = await fetch("/api/v1/workers/advance", {
      method: "POST",
      body: JSON.stringify({ amount }),
    });

    if (!res.ok) throw new Error("Request failed");

    const data = await res.json();
    revalidatePath("/dashboard");
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### 6.4 State Management (Zustand)

```typescript
// stores/auth-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  user: Worker | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: Worker, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: "auth-storage" }
  )
);
```

### 6.5 Platform Admin Dashboard

```typescript
// app/(platform)/dashboard/page.tsx
import { Suspense } from "react";
import { AnalyticsCards } from "@/components/platform/analytics-cards";
import { WorkerTable } from "@/components/platform/worker-table";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

async function getAnalytics(platformId: string) {
  const res = await fetch(
    `${process.env.API_URL}/platforms/${platformId}/analytics`,
    {
      cache: "no-store", // Real-time data
    }
  );
  return res.json();
}

export default async function PlatformDashboard() {
  const session = await auth();
  if (!session || session.user.type !== "platform") redirect("/login");

  const analytics = await getAnalytics(session.user.id);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Platform Dashboard</h1>
      <AnalyticsCards data={analytics.summary} />
      <Suspense fallback={<div className="h-96 animate-pulse bg-gray-200" />}>
        <WorkerTable platformId={session.user.id} />
      </Suspense>
    </div>
  );
}
```

### 6.6 Demo Simulator

```typescript
// app/(demo)/simulator/page.tsx
"use client";

import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function DemoSimulator() {
  const [workerId, setWorkerId] = useState("");
  const [amount, setAmount] = useState(25);

  const simulateTask = async () => {
    const res = await fetch("/api/demo/complete-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workerId, amount }),
    });

    if (res.ok) {
      toast.success("✅ Payment sent! Check worker dashboard.");
    } else {
      toast.error("❌ Simulation failed");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold">Demo Simulator</h2>
          <p className="text-sm text-muted-foreground">
            Simulate instant payments for demonstration
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Worker</label>
            <Select value={workerId} onValueChange={setWorkerId}>
              <option value="">Select worker...</option>
              <option value="demo-john">John Doe (850 score)</option>
              <option value="demo-jane">Jane Smith (720 score)</option>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Amount (USDC)</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={1}
              max={1000}
            />
          </div>

          <Button
            onClick={simulateTask}
            disabled={!workerId}
            className="w-full"
          >
            Complete Task & Send Payment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 7. Demo Plan & User Flows

### 7.1 Demo Narrative (5-Minute Walkthrough)

**Act 1: The Problem (30 seconds)**

- Show traditional gig worker pain points
- Delays in payment, high fees, lack of financial flexibility

**Act 2: Meet Our Worker (1 minute)**

- Introduce John, a delivery driver
- Show his GigStream dashboard: reputation score 850, completed 127 tasks
- Current balance: $245.67 USDC in his wallet

**Act 3: Instant Payment Demo (2 minutes)**

- Open Demo Simulator
- Create a delivery task: $25 USDC
- Mark as complete with GPS proof photo
- **Watch the magic:**
  - Backend verifies task (< 500ms)
  - Circle API transfers USDC
  - John's balance updates in real-time: $245.67 → $270.67
  - Transaction appears in history with Arc explorer link
  - **Total time: ~2 seconds** ⚡

**Act 4: Payment Streaming (1 minute)**

- Start a 1-hour warehouse shift: $100 USDC
- Smart contract locks funds in escrow
- Show live counter: payments release every minute ($1.67/min)
- John can claim earnings anytime without waiting for shift end

**Act 5: Financial Flexibility (30 seconds)**

- John needs cash now for an emergency
- Navigate to Advance Center
- AI shows prediction: "You'll earn $120 in next 7 days"
- Request $80 advance (80% of prediction)
- **Instant approval** based on his 850 reputation score
- Fee: 2% ($1.60), repay over next 5 tasks
- Funds hit his wallet immediately

**Finale: The Impact (30 seconds)**

- Recap key metrics:
  - Payment time: <3 seconds (vs 2-14 days traditional)
  - No bank account needed (USDC wallet)
  - Transparent reputation on-chain
  - Access to liquidity when needed
- Vision: Empowering 50M+ gig workers globally

### 7.2 Pre-Demo Setup Checklist

**Smart Contracts:**

- [ ] Deploy PaymentStreaming contract to Arc testnet
- [ ] Deploy ReputationLedger contract
- [ ] Deploy MicroLoan contract
- [ ] Fund MicroLoan with test USDC (500 USDC)
- [ ] Verify all contracts on Arc explorer

**Backend:**

- [ ] Deploy API to Cloudflare Workers
- [ ] Configure Circle SDK with testnet credentials
- [ ] Set up database with seed data
- [ ] Test all API endpoints
- [ ] Configure webhook simulator

**Frontend:**

- [ ] Deploy to Cloudflare Pages
- [ ] Test real-time balance updates
- [ ] Verify all navigation flows
- [ ] Load demo workers and tasks

**Demo Data:**

- [ ] Worker 1: John Doe (ID: demo-john)
  - Reputation: 850
  - Wallet: 0xDemo1...
  - Balance: $245.67
  - Tasks completed: 127
- [ ] Worker 2: Jane Smith (ID: demo-jane)
  - Reputation: 720
  - Wallet: 0xDemo2...
  - Balance: $89.50
  - Tasks completed: 45
- [ ] Platform: DemoRide Co
  - API key configured
  - Webhook URL set
- [ ] Pre-loaded transaction history (last 30 days)

### 7.3 Demo Script (Step-by-Step)

**Scene 1: Dashboard Overview**

1. Open GigStream worker dashboard
2. Point out real-time balance display
3. Show weekly earnings chart with upward trend
4. Highlight reputation score gauge: 850/1000
5. "John is a top performer with 94% on-time rate"

**Scene 2: Instant Payment**

1. Switch to Demo Simulator tab
2. Select Worker: John Doe
3. Task type: Fixed payment
4. Amount: $25
5. Click "Complete Task & Send Payment"
6. **Narrator:** "Watch what happens next..."
7. Switch back to dashboard tab
8. Balance animates: $245.67 → $270.67
9. New transaction appears in history
10. Click transaction → opens Arc explorer in new tab
11. "Payment confirmed on-chain in 2 seconds"

**Scene 3: Payment Streaming**

1. Navigate to Active Tasks page
2. Click "Start New Stream" button
3. Configure:
   - Worker: John Doe
   - Total: $100
   - Duration: 1 hour
   - Release: Every 60 seconds
4. Click "Start Stream"
5. Show loading → Transaction submitted
6. Stream appears in Active Tasks
7. Live progress bar fills up
8. "Released: $3.34 / $100"
9. Show countdown to next release: 00:47
10. Click "Claim Earnings" → Instant transfer to wallet

**Scene 4: Advance Request**

1. Navigate to Advance Center
2. Show eligibility card:
   - Risk score: 850 (Excellent)
   - Predicted earnings chart (next 7 days)
   - Max eligible: $96
3. Drag slider to $80
4. Show fee calculation: 2% = $1.60
5. Repayment plan: 5 tasks × $16.32
6. Click "Request $80 Advance"
7. Loading spinner → Success!
8. Balance updates: $270.67 → $350.67
9. Loan appears in Active Loans section

**Scene 5: Reputation System**

1. Navigate to Reputation page
2. Show score breakdown:
   - Tasks completed: +254 points
   - On-time bonus: +119 points
   - High ratings: +95 points
   - Disputes: -2 points
3. Scroll to recent events
4. Show badges earned
5. "Reputation is portable across all gig platforms"

**Scene 6: Platform Admin (Bonus)**

1. Switch to Platform Dashboard
2. Show analytics:
   - Total payouts: $12,345
   - Active workers: 87
   - Avg payment time: 2.3s
3. Worker list with scores
4. API keys management
5. "Platforms save time and reduce payment friction"

### 7.4 Backup Plans (If Things Go Wrong)

**Issue:** Arc testnet is down

- **Backup:** Pre-recorded video of transactions
- Show transactions on Sepolia or local testnet
- Use mock Circle responses

**Issue:** Real-time updates not working

- **Backup:** Manual refresh button
- Have pre-loaded state changes ready
- Explain it's a demo environment issue

**Issue:** Smart contract interaction fails

- **Backup:** Database-only demo mode
- Simulate blockchain confirmations
- Focus on UX and business logic

**Issue:** Network latency

- **Backup:** Run everything locally
- Use ngrok for public URL if needed
- Have screenshots/GIFs ready

### 7.5 Demo Environment Setup

**URLs:**

- Production: `https://gigstream.app`
- Demo: `https://demo.gigstream.app`
- API: `https://api.gigstream.app`
- Simulator: `https://demo.gigstream.app/simulator`

**Credentials:**

- Demo Worker: demo-john / password123
- Demo Platform: demo-platform / apikey_demo123
- Admin: admin@gigstream.app / (set securely)

**Quick Reset:**

```bash
# Reset demo data to initial state
curl -X POST https://api.gigstream.app/demo/reset \
  -H "X-Admin-Key: ADMIN_KEY"

# Pre-warm caches
curl https://api.gigstream.app/workers/demo-john/balance
curl https://api.gigstream.app/workers/demo-john/reputation
```

---

## 8. Implementation Timeline & Task Breakdown

### 8.1 13-Day Development Schedule

**Overview:**

- Days 1-2: Smart contracts & setup
- Days 3-5: Backend core
- Days 6-8: Frontend MVP
- Days 9-10: AI/Risk integration
- Days 11-12: Integration & testing
- Day 13: Demo polish & submission

### 8.2 Detailed Task List

#### **Phase 1: Foundation (Days 1-2)**

**Day 1: Project Setup & Smart Contracts**

- [ ] Initialize Git repository
- [ ] Set up monorepo structure (Turborepo or Nx)
- [ ] Configure TypeScript, ESLint, Prettier
- [ ] Initialize Foundry for smart contracts (forge init)
- [ ] Write PaymentStreaming contract
  - Core functions: createStream, releasePayment, claimEarnings
  - Unit tests with Foundry (forge test)
- [ ] Write ReputationLedger contract
  - Core functions: recordCompletion, getReputationScore
  - Unit tests with Foundry
- [ ] Deploy to Arc testnet (custom .mjs script)
- [ ] Verify contracts on explorer

**Day 2: Database & Circle Integration**

- [ ] Set up PostgreSQL database (local + hosted)
- [ ] Write schema migrations (all tables from design)
- [ ] Create seed script for demo data
- [ ] Set up Circle Developer Console account
- [ ] Test Circle SDK wallet creation
- [ ] Test Circle SDK USDC transfer
- [ ] Document Circle API patterns

#### **Phase 2: Backend Core (Days 3-5)**

**Day 3: API Foundation**

- [ ] Set up Cloudflare Workers project
- [ ] Configure Hono framework
- [ ] Implement JWT authentication middleware
- [ ] Implement API key authentication
- [ ] Set up Prisma/Drizzle ORM
- [ ] Create database client wrapper
- [ ] Implement error handling middleware
- [ ] Set up request logging

**Day 4: Worker Endpoints**

- [ ] POST /api/v1/auth/register
  - Create worker in DB
  - Call Circle API to create wallet
  - Return JWT token
- [ ] POST /api/v1/auth/login
- [ ] POST /api/v1/auth/wallet-login
- [ ] GET /api/v1/workers/:id
- [ ] GET /api/v1/workers/:id/balance
  - Query Circle API
  - Cache for 5 seconds
- [ ] GET /api/v1/workers/:id/earnings
- [ ] GET /api/v1/workers/:id/reputation
  - Query smart contract
  - Merge with DB data
- [ ] Write integration tests

**Day 5: Platform & Payment Endpoints**

- [ ] POST /api/v1/platforms/register
- [ ] POST /api/v1/tasks/complete
  - Webhook signature verification
  - Queue task for verification
  - Background job: verify + pay
- [ ] POST /api/v1/tasks/start-stream
  - Call PaymentStreaming contract
  - Create stream record in DB
- [ ] GET /api/v1/platforms/:id/workers
- [ ] GET /api/v1/platforms/:id/analytics
- [ ] Implement webhook retry logic
- [ ] Test end-to-end payment flow

#### **Phase 3: Frontend MVP (Days 6-8)**

**Day 6: Frontend Setup & Auth**

- [ ] Initialize Next.js 15 + React 19 + TypeScript
- [ ] Configure Tailwind CSS 4
- [ ] Set up App Router structure with route groups
- [ ] Create folder structure (app, components, lib, actions)
- [ ] Implement Zustand stores (auth, worker)
- [ ] Create auth pages (app/(auth)/login, register)
- [ ] Implement JWT cookies and session handling
- [ ] Create middleware for protected routes
- [ ] Build layout components (Header, Sidebar, shared layouts)

**Day 7: Worker Dashboard**

- [ ] Create Dashboard page
  - Balance card with animated counter
  - Today's earnings card
  - Weekly earnings chart (Recharts)
- [ ] Create Tasks page
  - Active tasks list
  - Task details modal
  - Stream progress bars
- [ ] Create Transaction History page
  - Paginated table
  - Filter controls
  - Export to CSV
- [ ] Implement real-time polling for balance
- [ ] Add loading states and error handling

**Day 8: Advance & Reputation**

- [ ] Create Reputation page
  - Score gauge visualization
  - Breakdown cards
  - Recent events timeline
- [ ] Create Advance Request page
  - Eligibility check
  - Amount slider
  - Fee calculator
  - Repayment plan display
- [ ] Create Active Loans view
- [ ] Implement form validation with Zod
- [ ] Add success/error toasts
- [ ] Mobile responsive testing

#### **Phase 4: AI & Risk (Days 9-10)**

**Day 9: Task Verification**

- [ ] Implement fast-path rules engine
- [ ] Set up Cloudflare Workers AI (or heuristic fallback)
- [ ] Build verification pipeline
  - Extract task metadata
  - Run rules
  - Call AI model
  - Return verdict
- [ ] Integrate with payment orchestrator
- [ ] Add manual review queue (simple admin view)
- [ ] Test with various task scenarios
- [ ] Measure latency (target <500ms)

**Day 10: Risk Scoring & Predictions**

- [ ] Implement risk scoring algorithm
  - Calculate all factors
  - Return explainable scores
- [ ] Implement earnings prediction
  - Day-of-week patterns
  - Trend analysis
  - Confidence intervals
- [ ] Build eligibility check endpoint
- [ ] Integrate with advance request flow
- [ ] Test edge cases (new user, high volatility)
- [ ] Add caching for scores (1 hour TTL)

#### **Phase 5: Integration & Demo (Days 11-13)**

**Day 11: MicroLoan Contract & Integration**

- [ ] Write MicroLoan smart contract
- [ ] Unit tests for loan lifecycle
- [ ] Deploy to Arc testnet
- [ ] Fund contract with test USDC
- [ ] Integrate backend with contract
  - Request advance → contract
  - Auto-repayment from earnings
- [ ] Test full loan flow end-to-end
- [ ] Add loan dashboard to frontend

**Day 12: Demo Simulator & Polish**

- [ ] Build Demo Simulator page
  - Worker selector
  - Task creator
  - Instant completion button
- [ ] Create platform admin dashboard (basic)
  - Worker list
  - Analytics cards
  - API key display
- [ ] Load comprehensive seed data
- [ ] Implement demo reset functionality
- [ ] Add Arc explorer links to all transactions
- [ ] UI/UX polish pass
- [ ] Accessibility testing
- [ ] Cross-browser testing

**Day 13: Testing, Documentation & Submission**

- [ ] End-to-end testing of all flows
- [ ] Load testing (100 concurrent users)
- [ ] Security review
  - Run Slither on smart contracts
  - Check for common vulnerabilities
- [ ] Write comprehensive README
  - Setup instructions
  - Architecture overview
  - API documentation
- [ ] Record demo video (5 minutes)
- [ ] Prepare pitch deck
- [ ] Deploy to production URLs
- [ ] Final smoke tests
- [ ] Submit to hackathon portal

### 8.3 Team Roles (If Team of 3-4)

**Smart Contract Developer**

- Days 1-2: All contracts + tests
- Days 3-5: Help with Circle integration
- Days 9-11: MicroLoan contract + security review

**Backend Developer**

- Days 3-5: Core API + auth
- Days 6-8: Payment orchestration + webhooks
- Days 9-10: AI/Risk integration
- Days 11-13: Integration testing

**Frontend Developer**

- Days 6-8: Worker dashboard + pages
- Days 9-10: Advanced features (advance, reputation)
- Days 11-13: Demo simulator + admin dashboard

**Full-Stack / PM (Optional)**

- Days 1-2: Project setup + documentation
- Days 3-13: Code review, integration, testing
- Days 11-13: Demo preparation, video, pitch deck

### 8.4 Critical Path

The following tasks are on the critical path (any delay blocks progress):

1. Smart contracts deployed to Arc testnet (Day 1)
2. Circle SDK wallet creation working (Day 2)
3. Basic auth + worker registration (Day 3-4)
4. Payment flow working (Day 5)
5. Worker dashboard showing balance (Day 7)
6. End-to-end payment demo (Day 12)

**Risk Mitigation:**

- Start with highest-risk items first (contracts, Circle)
- Have fallback plans (mock contracts, heuristic AI)
- Daily standups to catch blockers early
- Keep MVP scope minimal, defer nice-to-haves

---

## 9. Deployment & Infrastructure

### 9.1 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge Network                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────┐          ┌──────────────────────┐    │
│  │  Cloudflare Pages │          │ Cloudflare Workers   │    │
│  │                   │          │                      │    │
│  │  - React SPA      │◄────────►│  - Hono API          │    │
│  │  - Static assets  │   API    │  - Business logic    │    │
│  │  - CDN cached     │  calls   │  - Auth middleware   │    │
│  └───────────────────┘          └──────────┬───────────┘    │
│                                            │                 │
└────────────────────────────────────────────┼─────────────────┘
                                             │
                    ┌────────────────────────┼────────────────┐
                    │                        │                │
         ┌──────────▼──────────┐  ┌─────────▼────────┐  ┌───▼────┐
         │  PostgreSQL         │  │  Circle APIs     │  │ Redis  │
         │  (Neon/Supabase)    │  │  - Wallets       │  │ (Cache)│
         │  - User data        │  │  - Transfers     │  └────────┘
         │  - Transactions     │  │  - Balance query │
         └─────────────────────┘  └──────────────────┘
                                             │
                                  ┌──────────▼──────────┐
                                  │   Arc Testnet       │
                                  │   - Smart Contracts │
                                  │   - USDC transfers  │
                                  └─────────────────────┘
```

### 9.2 Cloudflare Workers Configuration

**wrangler.toml**

```toml
name = "gigstream-api"
main = "src/index.ts"
compatibility_date = "2025-10-26"

[env.production]
vars = { ENV = "production" }

# Database binding (Cloudflare D1 or external Postgres)
[[d1_databases]]
binding = "DB"
database_name = "gigstream"
database_id = "your-database-id"

# KV for caching (optional)
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"

# Secrets (set via wrangler secret put)
# CIRCLE_API_KEY
# CIRCLE_ENTITY_ID
# JWT_SECRET
# DATABASE_URL

# Workers AI binding
[ai]
binding = "AI"
```

**Deploy Commands:**

```bash
# Deploy backend
cd backend
wrangler publish

# Deploy frontend
cd frontend
npm run build
wrangler pages publish dist
```

### 9.3 Database Hosting Options

**Option 1: Neon (Serverless Postgres)**

- ✅ Free tier suitable for demo
- ✅ Connection pooling built-in
- ✅ Global edge network
- ✅ Easy branching for dev/staging

**Option 2: Supabase**

- ✅ Postgres + real-time subscriptions
- ✅ Built-in auth (can replace our JWT)
- ✅ Free tier generous
- ✅ Dashboard for data inspection

**Option 3: Cloudflare D1**

- ✅ SQLite on the edge
- ❌ No Postgres features (jsonb, etc.)
- ✅ Zero cold starts
- ✅ Ideal for Cloudflare Workers

**Recommendation:** Neon for MVP (Postgres compatibility), migrate to D1 if performance needed.

### 9.4 Environment Variables

**Backend (.env)**

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/gigstream

# Circle
CIRCLE_API_KEY=your_circle_api_key
CIRCLE_ENTITY_ID=your_entity_id
CIRCLE_BASE_URL=https://api.circle.com/v1

# Arc Blockchain
ARC_RPC_URL=https://arc-testnet-rpc.circle.com
PAYMENT_STREAMING_ADDRESS=0x...
REPUTATION_LEDGER_ADDRESS=0x...
MICRO_LOAN_ADDRESS=0x...

# Auth
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d

# AI (if using Cloudflare Workers AI)
# Automatically available via binding, no key needed

# Monitoring
SENTRY_DSN=https://...@sentry.io/project
LOG_LEVEL=info

# Rate Limiting
REDIS_URL=redis://...
RATE_LIMIT_WINDOW=60  # seconds
RATE_LIMIT_MAX=100    # requests per window
```

**Frontend (.env)**

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.gigstream.app
NEXT_PUBLIC_ARC_EXPLORER_URL=https://arc-explorer.circle.com
NEXT_PUBLIC_ENVIRONMENT=production
```

### 9.5 CI/CD Pipeline (GitHub Actions)

**.github/workflows/deploy.yml**

```yaml
name: Deploy GigStream

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
      - name: Install dependencies
        run: cd contracts && npm install
      - name: Run tests
        run: cd contracts && npm test
      - name: Run Slither
        run: |
          pip3 install slither-analyzer
          cd contracts && slither .

  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
      - name: Install dependencies
        run: cd backend && npm install
      - name: Run migrations
        run: cd backend && npm run db:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      - name: Run tests
        run: cd backend && npm test
      - name: Lint
        run: cd backend && npm run lint

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
      - name: Install dependencies
        run: cd frontend && npm install
      - name: Run tests
        run: cd frontend && npm test
      - name: Build
        run: cd frontend && npm run build
      - name: Lint
        run: cd frontend && npm run lint

  deploy-backend:
    needs: [test-contracts, test-backend]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
      - name: Install Wrangler
        run: npm install -g wrangler
      - name: Deploy to Cloudflare Workers
        run: cd backend && wrangler publish
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

  deploy-frontend:
    needs: [test-frontend]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
      - name: Install dependencies
        run: cd frontend && npm install
      - name: Build
        run: cd frontend && npm run build
        env:
          NEXT_PUBLIC_API_BASE_URL: ${{ secrets.API_BASE_URL }}
      - name: Deploy to Cloudflare Pages
        run: cd frontend && npx wrangler pages publish .next/static --project-name=gigstream
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### 9.6 Monitoring & Observability

**Sentry (Error Tracking)**

```typescript
// Backend
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.ENV,
  tracesSampleRate: 0.1,
});

// Frontend
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 0.1,
});
```

**Cloudflare Analytics**

- Automatic request logging
- Performance metrics (p50, p95, p99)
- Geographic distribution
- Error rates

**Custom Metrics**

```typescript
// Track key business metrics
interface Metrics {
  paymentCount: number;
  paymentVolume: number;
  avgPaymentTime: number;
  verificationAccuracy: number;
  advanceRequestCount: number;
}

// Log to datadog/newrelic/custom endpoint
async function logMetrics(metrics: Metrics) {
  await fetch("https://metrics.gigstream.app/log", {
    method: "POST",
    body: JSON.stringify(metrics),
  });
}
```

### 9.7 Security Checklist

**Smart Contracts:**

- [x] Use OpenZeppelin audited libraries
- [x] ReentrancyGuard on all value transfers
- [x] Access control (Ownable, role-based)
- [x] Pausable for emergency stops
- [x] Events for all state changes
- [ ] External audit (if budget allows)
- [x] Slither/Mythril security scan

**Backend:**

- [x] HTTPS/TLS 1.3 only
- [x] JWT with short expiry
- [x] API key rotation capability
- [x] Rate limiting per endpoint
- [x] Input validation (Zod schemas)
- [x] SQL injection prevention (ORM)
- [x] CORS properly configured
- [x] Security headers (Helmet.js)
- [x] Secrets in environment variables (not code)
- [x] Webhook signature verification (HMAC)

**Frontend:**

- [x] XSS prevention (React escapes by default)
- [x] CSRF tokens for state-changing ops
- [x] Content Security Policy
- [x] Subresource Integrity for CDN scripts
- [x] No sensitive data in localStorage
- [x] HTTPS only, HSTS enabled

**Operational:**

- [ ] Database backups (daily automated)
- [ ] Secrets rotation plan
- [ ] Incident response runbook
- [ ] Rate limit monitoring/alerting
- [ ] Abnormal transaction detection

---

## 10. Acceptance Criteria & Success Metrics

### 10.1 Functional Requirements Coverage

**Critical (Must Have):**

- [x] FR-2.1.1: Worker wallet creation via Circle ✅
- [x] FR-2.1.2: Instant USDC payment on task completion ✅
- [x] FR-2.1.3: Time-based payment streaming ✅
- [x] FR-2.2.1: Task verification (AI or heuristic) ✅
- [x] FR-2.2.2: Risk scoring for advance eligibility ✅
- [x] FR-2.3.1: PaymentStreaming smart contract ✅
- [x] FR-2.3.2: ReputationLedger smart contract ✅
- [x] FR-2.3.3: MicroLoan smart contract ✅
- [x] FR-2.4.1: Worker API endpoints ✅
- [x] FR-2.4.2: Platform API endpoints ✅
- [x] FR-2.5.1: Worker dashboard UI ✅

**High Priority:**

- [x] FR-2.2.3: Earnings prediction ✅
- [x] FR-2.5.3: Demo simulator ✅
- [x] FR-2.6.1: User authentication ✅
- [x] FR-2.6.2: API security ✅

**Medium Priority (Nice to Have):**

- [x] FR-2.5.2: Platform admin dashboard ✅
- [ ] Multi-language support (deferred)
- [ ] Mobile native apps (deferred)

### 10.2 Non-Functional Requirements Coverage

**Performance:**

- [x] API response time <200ms (p95) ✅
- [x] Payment time <3 seconds end-to-end ✅
- [x] Dashboard load time <2 seconds ✅
- [x] Task verification <500ms ✅
- [x] Risk scoring <100ms ✅

**Reliability:**

- [x] Database transactions for critical ops ✅
- [x] Retry logic for transient failures ✅
- [x] Error logging and monitoring ✅

**Security:**

- [x] Smart contract security patterns ✅
- [x] API authentication and authorization ✅
- [x] Input validation ✅
- [x] HTTPS enforcement ✅

**Usability:**

- [x] Mobile-responsive design ✅
- [x] Real-time balance updates ✅
- [x] Clear error messages ✅
- [x] Intuitive navigation ✅

### 10.3 Demo Success Criteria

**Technical Demo:**

- [ ] Worker registers and receives wallet
- [ ] Task completion triggers USDC payment in <3s
- [ ] Payment visible on Arc block explorer
- [ ] Payment stream shows live progress
- [ ] Advance request approved instantly for eligible worker
- [ ] Reputation score updates after task completion
- [ ] All transactions confirmed on-chain

**Business Impact Demo:**

- [ ] Clear comparison to traditional payment delays
- [ ] Demonstrate cost savings (no intermediaries)
- [ ] Show financial inclusion (no bank needed)
- [ ] Highlight transparency (on-chain reputation)
- [ ] Prove scalability potential

**Presentation Quality:**

- [ ] Polished UI with no obvious bugs
- [ ] Smooth transitions between screens
- [ ] Realistic demo data
- [ ] Professional branding
- [ ] Clear value proposition

### 10.4 Testing Strategy

**Unit Tests:**

- Smart contracts: 100% coverage of critical paths
- Backend business logic: 80% coverage
- Frontend components: Key flows only (time permitting)

**Integration Tests:**

- Circle SDK wallet creation and transfers
- Smart contract interactions from backend
- End-to-end payment flow
- Webhook delivery and verification

**Manual Testing:**

- All user flows in Worker Dashboard
- Demo Simulator functionality
- Error handling and edge cases
- Cross-browser compatibility (Chrome, Firefox, Safari)
- Mobile responsiveness (iPhone, Android)

**Load Testing (Optional):**

- 100 concurrent users (k6 or Artillery)
- Verify rate limiting works
- Check for memory leaks

### 10.5 Documentation Requirements

**README.md:**

- [ ] Project overview and value proposition
- [ ] Architecture diagram
- [ ] Setup instructions (local development)
- [ ] Deployment guide
- [ ] Demo instructions
- [ ] Team and acknowledgments

**API Documentation:**

- [ ] OpenAPI/Swagger spec
- [ ] Authentication guide
- [ ] Webhook integration guide
- [ ] Error codes reference

**Smart Contract Documentation:**

- [ ] NatSpec comments on all public functions
- [ ] Deployment addresses
- [ ] Interaction examples

**Video Walkthrough:**

- [ ] 5-minute demo video
- [ ] Narrated explanation of key features
- [ ] Show actual transactions on blockchain
- [ ] Uploaded to YouTube/Loom

### 10.6 Hackathon Submission Checklist

**Code Repository:**

- [ ] Clean, organized file structure
- [ ] Comprehensive README
- [ ] All secrets removed (use .env.example)
- [ ] Working demo deployed and accessible
- [ ] License file (MIT or Apache 2.0)
- [ ] CODEOWNERS file

**Submission Portal:**

- [ ] Project description
- [ ] Team member names and roles
- [ ] GitHub repository link
- [ ] Live demo URL
- [ ] Video walkthrough URL
- [ ] Pitch deck (PDF)
- [ ] Screenshots

**Pitch Deck (10-15 slides):**

1. Problem: Gig worker payment pain points
2. Solution: GigStream overview
3. Why Arc: Benefits of Arc blockchain
4. Technology: Architecture diagram
5. Demo: Live walkthrough
6. AI Features: Task verification and risk scoring
7. Smart Contracts: On-chain reputation and streaming
8. Impact: Metrics and vision
9. Business Model: Revenue potential
10. Team: Who we are
11. Ask: What we're seeking (funding, partnerships)

### 10.7 Post-Hackathon Roadmap (If Continuing)

**Short-term (1-3 months):**

- Real gig platform integration (Uber, DoorDash, Upwork)
- Mainnet deployment on Arc
- KYC/AML compliance
- Mobile apps (React Native)
- Advanced ML models with more training data

**Medium-term (3-6 months):**

- Multi-currency support (USDC, EURC)
- Cross-chain via CCTP (Circle's Cross-Chain Transfer Protocol)
- DAO governance for platform parameters
- Insurance/protection products
- Savings and investment features

**Long-term (6-12 months):**

- Expand to 10+ gig platforms
- 100,000+ workers onboarded
- $10M+ in payment volume
- Partnerships with banks and fintechs
- Regulatory approval in key markets
- Series A fundraising

---

## 11. Appendices

### 11.1 Technical Glossary

- **Arc**: Circle's blockchain, optimized for USDC transactions
- **USDC**: USD Coin, a stablecoin pegged 1:1 to US Dollar
- **Developer-Controlled Wallet**: Circle-managed wallet (no private keys exposed)
- **Payment Streaming**: Continuous micro-payments over time (vs lump sum)
- **Gas**: Transaction fee on blockchain (paid in USDC on Arc)
- **Smart Contract**: Self-executing code on blockchain
- **Escrow**: Funds held in contract until conditions met
- **Heuristic**: Rule-based algorithm (vs machine learning)
- **JWT**: JSON Web Token for authentication
- **Webhook**: HTTP callback for event notifications
- **Rate Limiting**: Restrict number of API requests per time window

### 11.2 Key Assumptions

1. Arc testnet is stable and accessible throughout hackathon
2. Circle provides sufficient testnet USDC via faucet
3. Cloudflare Workers AI has capacity for inference requests
4. Demo can use simulated data (no real gig platforms integrated)
5. Judges understand basic blockchain concepts
6. Team has 3-4 members working full-time
7. No regulatory approval needed for testnet demo

### 11.3 Open Questions / Decisions

**Technical:**

- [ ] Cloudflare Workers AI vs heuristic fallback for MVP?
  - **Decision:** Start with heuristic, add AI if time permits
- [ ] PostgreSQL host: Neon vs Supabase vs Cloudflare D1?
  - **Decision:** Neon for Postgres compatibility
- [ ] Frontend state: Zustand vs Redux vs Jotai?
  - **Decision:** Zustand (simplest)

**Business:**

- [ ] Pricing model for platforms (transaction fee vs subscription)?
  - **Decision:** Defer to post-hackathon
- [ ] What fee rate for advances (2-5%)?
  - **Decision:** Risk-based: 2% low risk, 5% high risk
- [ ] Maximum advance amount cap?
  - **Decision:** 80% of 7-day predicted earnings

**Demo:**

- [ ] Pre-record video backup in case of live demo issues?
  - **Decision:** Yes, have backup ready
- [ ] Use real names or fictional for demo workers?
  - **Decision:** Fictional (John Doe, Jane Smith)

### 11.4 References & Resources

**Circle Documentation:**

- Developer-Controlled Wallets: https://developers.circle.com/w3s/docs
- Arc Blockchain: https://developers.circle.com/arc/docs
- USDC: https://developers.circle.com/stablecoins/docs

**Solidity & Smart Contracts:**

- OpenZeppelin: https://docs.openzeppelin.com/contracts
- Foundry: https://book.getfoundry.sh/
- Solidity: https://docs.soliditylang.org

**Frontend:**

- React: https://react.dev
- Tailwind CSS: https://tailwindcss.com/docs
- Zustand: https://docs.pmnd.rs/zustand
- React Query: https://tanstack.com/query

**Backend:**

- Cloudflare Workers: https://developers.cloudflare.com/workers
- Hono: https://hono.dev
- Prisma: https://www.prisma.io/docs

**AI:**

- Cloudflare Workers AI: https://developers.cloudflare.com/workers-ai

### 11.5 Team Contact & Support

**For Questions During Implementation:**

- Circle Developer Support: https://discord.gg/circle-developers
- Arc Documentation: https://developers.circle.com/arc
- Cloudflare Discord: https://discord.gg/cloudflaredev

**Emergency Contacts:**

- Lead Engineer: [Email]
- Project Manager: [Email]
- Design Lead: [Email]

---

## Document Status

**Status:** ✅ **Complete - Ready for Implementation**

**Approval:**

- [ ] Technical Lead
- [ ] Frontend Lead
- [ ] Smart Contract Lead
- [ ] All Team Members

**Next Action:** Begin Phase 1 implementation (Smart Contracts & Setup)

**Last Updated:** October 28, 2025

---

_This detailed design document serves as the blueprint for implementing GigStream. All team members should refer to this document throughout development. Any deviations or clarifications should be documented in Git commits or issue discussions._
