# GigStream - Technical Requirements Document

**Version:** 1.0  
**Date:** October 28, 2025  
**Based on:** PRD v1.0  
**Purpose:** Detailed technical requirements for hackathon implementation

---

## 1. System Overview

GigStream is an AI-powered real-time payment streaming system for gig workers, built on Circle's Arc blockchain. This document outlines the specific technical requirements for the hackathon MVP (13-day timeline).

---

## 2. Functional Requirements

### 2.1 Core Payment System

#### FR-2.1.1: Wallet Management

- **ID**: FR-2.1.1
- **Priority**: Critical
- **Description**: System must create and manage developer-controlled wallets for workers and platforms
- **Requirements**:
  - Create Circle Developer-Controlled Wallet on worker registration
  - Store wallet address securely in database
  - Support wallet balance queries in real-time
  - Enable wallet-to-wallet USDC transfers
  - Display wallet QR code for external deposits
- **Acceptance Criteria**:
  - Wallet creation completes in < 2 seconds
  - Balance updates reflect within 1 second of transaction
  - All wallet operations are idempotent
  - Support for at least 100 concurrent wallet operations

#### FR-2.1.2: Instant Payment Execution

- **ID**: FR-2.1.2
- **Priority**: Critical
- **Description**: Execute USDC payments immediately upon task completion
- **Requirements**:
  - Listen to task completion webhooks
  - Calculate payment amount based on task parameters
  - Execute USDC transfer via Arc blockchain
  - Confirm transaction and update database
  - Send notification to worker
- **Acceptance Criteria**:
  - End-to-end payment time < 3 seconds
  - 99.9% transaction success rate
  - All failed transactions are logged and alertable
  - Transaction receipts include blockchain explorer links

#### FR-2.1.3: Payment Streaming (Time-Based)

- **ID**: FR-2.1.3
- **Priority**: High
- **Description**: Support continuous payment streams for hourly/time-based work
- **Requirements**:
  - Smart contract escrow for total job amount
  - Automated release per time interval (e.g., every minute)
  - Worker can trigger early withdrawal of earned portion
  - Platform can pause/cancel stream with proper safeguards
- **Acceptance Criteria**:
  - Payment releases execute within 10 seconds of scheduled time
  - Worker receives accurate pro-rata amount
  - No double-payment scenarios possible
  - Gas costs for releases: ~29k gas (~$0.005 USDC per release on Arc testnet)

### 2.2 AI & Risk Management

#### FR-2.2.1: Task Verification Agent

- **ID**: FR-2.2.1
- **Priority**: High
- **Description**: AI agent monitors platform APIs and validates task completion before payment release
- **Requirements**:
  - **Monitoring**: Continuously monitor platform APIs for task completion events
  - **Automatic Verification**: AI-powered verification via API integration
  - **Fraud Detection**: Pattern recognition for anomalous behavior using ML models
  - **Metadata Validation**: Verify task metadata (photos, GPS, timestamp)
  - **ML Classification**: Binary classifier (approve/flag/reject) with confidence scores
  - **Auto-approval**: Low-risk tasks approved automatically
- **Acceptance Criteria**:
  - Verification latency < 500ms for auto-approved tasks
  - Auto-approval rate > 90% for valid tasks
  - False positive rate < 2%
  - Manual review queue for flagged items
  - Fraud detection accuracy > 95%

#### FR-2.2.2: Risk Scoring Model

- **ID**: FR-2.2.2
- **Priority**: High
- **Description**: ML model assesses worker creditworthiness for advances using Gradient Boosting
- **Requirements**:
  - **Algorithm**: Gradient Boosting (XGBoost) for risk assessment
  - **Input Features**:
    - Completion rate (last 30 days)
    - Average task value
    - Account age
    - Dispute count
    - Rating variance
    - Time-of-day patterns
  - **Training Data**: Simulated historical completion data
  - **Retraining**: Weekly model updates
  - Calculate risk score (0-1000) based on multiple factors
  - Real-time inference via Cloudflare Workers AI
  - Score updates after each completed task
  - Threshold-based advance eligibility determination (score >= 600)
- **Acceptance Criteria**:
  - Inference latency < 100ms
  - Model accuracy > 85% on test set (for demo purposes)
  - Scores are explainable (show factor contributions)
  - API endpoint for score retrieval

#### FR-2.2.3: Earnings Prediction Engine

- **ID**: FR-2.2.3
- **Priority**: Medium
- **Description**: Forecast worker earnings for advance calculation using time series forecasting
- **Requirements**:
  - **Algorithm**: Time series forecasting (Prophet or ARIMA)
  - **Input Features**:
    - Historical daily earnings
    - Day of week patterns
    - Seasonal patterns
    - Platform-specific trends
  - **Target**: Predicted earnings for next 7 days
  - **Accuracy Goal**: Mean Absolute Percentage Error (MAPE) < 15%
  - Predict next 7 days earnings based on historical data
  - Consider day-of-week patterns, seasonality, trends
  - Provide confidence intervals for predictions
  - Update predictions daily
  - Calculate safe advance amount (50-80% of prediction)
- **Acceptance Criteria**:
  - Mean Absolute Percentage Error (MAPE) < 15% on demo data (improved from 20%)
  - Predictions include confidence intervals
  - Real-time prediction API < 500ms response time
  - Clear visualization of prediction vs actual

#### FR-2.2.3: Earnings Prediction Engine

- **ID**: FR-2.2.3
- **Priority**: Medium
- **Description**: Forecast worker earnings for advance calculation
- **Requirements**:
  - Predict next 7 days earnings based on historical data
  - Consider day-of-week patterns, seasonality, trends
  - Provide confidence intervals for predictions
  - Update predictions daily
  - Calculate safe advance amount (e.g., 50-80% of prediction)
- **Acceptance Criteria**:
  - Mean Absolute Percentage Error (MAPE) < 20% on demo data
  - Predictions generated in < 2 seconds
  - Conservative estimates to minimize default risk
  - Clear visualization of prediction vs actual

### 2.3 Smart Contracts

#### FR-2.3.1: PaymentStreaming Contract

- **ID**: FR-2.3.1
- **Priority**: Critical
- **Description**: Manage escrow and automated payment releases
- **Requirements**:
  ```solidity
  // Key functions required:
  - createStream(address worker, uint256 amount, uint256 duration, uint256 releaseInterval)
  - releasePayment(uint256 streamId) // automated or manual trigger
  - pauseStream(uint256 streamId) // platform only
  - cancelStream(uint256 streamId) // with proper refund logic
  - getStreamDetails(uint256 streamId) returns (StreamData)
  - claimEarnings(uint256 streamId) // worker can claim early
  ```
- **State Management**:
  - Track total amount, released amount, remaining balance
  - Store worker address, platform address, timestamps
  - Maintain stream status (active, paused, completed, cancelled)
- **Events**:
  - StreamCreated, PaymentReleased, StreamPaused, StreamCancelled
- **Acceptance Criteria**:
  - Gas costs (actual measurements):
    - createStream: ~348k gas (includes USDC transfer ~21k + storage)
    - releasePayment: ~29k gas
    - claimEarnings: ~53k gas
    - pauseStream/cancelStream: ~30-40k gas
  - No re-entrancy vulnerabilities
  - Comprehensive unit test coverage (>90%)
  - Emergency pause functionality

**Note:** Initial requirement of <50k gas per operation was revised after testing. USDC transfers inherently cost ~21k gas, and storage operations add significant overhead. Current gas costs are optimized and acceptable for Arc testnet.

#### FR-2.3.2: ReputationLedger Contract

- **ID**: FR-2.3.2
- **Priority**: High
- **Description**: On-chain worker reputation tracking
- **Requirements**:
  ```solidity
  // Key functions required:
  - recordCompletion(address worker, uint256 taskId, bool onTime, uint8 rating)
  - recordDispute(address worker, uint256 taskId, uint8 severity)
  - getReputationScore(address worker) returns (uint256 score, uint256 tasksCompleted)
  - getCompletionRate(address worker) returns (uint256 percentage)
  - getAverageRating(address worker) returns (uint256 rating)
  ```
- **Scoring Algorithm**:
  - Base score: 100
  - Completed task: +2 points
  - On-time completion: +1 bonus point
  - High rating (4-5 stars): +1 bonus point
  - Dispute: -10 to -50 points (severity-based)
  - Score range: 0-1000
- **Events**:
  - TaskCompleted, DisputeRecorded, ScoreUpdated
- **Acceptance Criteria**:
  - Score calculations are deterministic
  - Historical data is immutable (append-only)
  - Gas costs (actual measurements):
    - First recordCompletion: ~45k gas (initial storage)
    - Subsequent calls: ~6-27k gas (updates only)
    - View functions: free (no gas cost)
  - Gas-efficient batch updates supported

#### FR-2.3.3: MicroLoan Contract

- **ID**: FR-2.3.3
- **Priority**: Medium
- **Description**: Manage advance payments and repayments
- **Requirements**:
  ```solidity
  // Key functions required:
  - requestAdvance(uint256 amount) returns (uint256 loanId)
  - calculateEligibility(address worker) returns (uint256 maxAmount, uint256 feeRate)
  - approveLoan(uint256 loanId) // automated based on risk score
  - repayFromEarnings(uint256 loanId, uint256 amount) // auto-deduct
  - getLoanDetails(uint256 loanId) returns (LoanData)
  - getActiveLoan(address worker) returns (uint256 loanId)
  ```
- **Business Logic**:
  - Max advance: 80% of predicted 7-day earnings
  - Fee: 2% (low risk) to 5% (high risk)
  - Repayment: Auto-deduct from next 5 completed tasks
  - Only one active loan per worker
  - Default threshold: 30 days overdue
- **Events**:
  - LoanRequested, LoanApproved, LoanDisbursed, RepaymentMade, LoanDefaulted
- **Acceptance Criteria**:
  - Eligibility checks complete in < 1 second
  - Automated repayment triggers reliably
  - Gas costs (actual measurements):
    - requestAdvance: ~170k gas
    - approveLoan: ~234k gas (includes USDC disbursement)
    - repayFromEarnings: ~52k gas
  - Proper default handling and penalties
  - Integration with reputation system

### 2.4 Backend API

#### FR-2.4.1: Worker API Endpoints

- **ID**: FR-2.4.1
- **Priority**: Critical
- **Description**: RESTful API for worker operations
- **Endpoints Required**:
  ```
  POST   /api/workers/register          # Create new worker account
  GET    /api/workers/:id                # Get worker profile
  GET    /api/workers/:id/balance        # Get current USDC balance
  GET    /api/workers/:id/earnings       # Get earnings history
  GET    /api/workers/:id/reputation     # Get reputation score details
  POST   /api/workers/:id/advance        # Request advance payment
  GET    /api/workers/:id/loans          # Get loan history
  ```
- **Authentication**: JWT tokens with 24-hour expiry
- **Rate Limiting**: 100 requests/minute per worker
- **Response Format**: JSON with standardized error codes
- **Acceptance Criteria**:
  - All endpoints respond in < 200ms (p95)
  - Proper error handling with descriptive messages
  - Input validation on all requests
  - Comprehensive API documentation (Swagger/OpenAPI)

#### FR-2.4.2: Platform API Endpoints

- **ID**: FR-2.4.2
- **Priority**: High
- **Description**: API for gig platforms to integrate GigStream
- **Endpoints Required**:
  ```
  POST   /api/platforms/register         # Register new platform
  POST   /api/platforms/webhooks         # Configure webhook URLs
  POST   /api/tasks/complete             # Notify task completion
  POST   /api/tasks/start                # Start payment stream
  GET    /api/platforms/:id/workers      # List workers on platform
  GET    /api/platforms/:id/analytics    # Payment analytics
  ```
- **Authentication**: API keys with IP whitelisting
- **Webhooks**: Support for task events, payment confirmations
- **Acceptance Criteria**:
  - Webhook delivery retry logic (3 attempts)
  - Webhook signature verification for security
  - Platform dashboard for API key management
  - Real-time analytics with 5-minute lag max

#### FR-2.4.3: Blockchain Integration Layer

- **ID**: FR-2.4.3
- **Priority**: Critical
- **Description**: Backend services for blockchain interaction
- **Requirements**:
  - Circle SDK integration for wallet operations
  - Smart contract deployment and management
  - Transaction monitoring and confirmation tracking
  - Event listener for smart contract events
  - Gas estimation and optimization
  - Transaction retry logic for failed submissions
- **Acceptance Criteria**:
  - Transaction submission success rate > 99%
  - Automatic retry on network errors (max 3 attempts)
  - Real-time event processing with < 2 second lag
  - Comprehensive logging of all blockchain operations

### 2.5 Frontend Application

#### FR-2.5.1: Worker Dashboard

- **ID**: FR-2.5.1
- **Priority**: High
- **Description**: Web-based dashboard for gig workers
- **Required Views**:

  1. **Home/Overview**:

     - Today's earnings (real-time counter with animation)
     - Weekly earnings chart
     - Current USDC balance
     - Quick actions: Request Advance, View Tasks

  2. **Active Tasks**:

     - List of ongoing tasks
     - Timer for time-based tasks
     - Complete task button
     - Estimated payout display

  3. **Advance Center**:

     - Predicted earnings visualization (7-day forecast)
     - Available advance amount with slider
     - Fee breakdown
     - Request advance form
     - Active loan status and repayment schedule

  4. **Reputation**:

     - Current score with visual gauge
     - Score breakdown by component (completion rate, ratings, etc.)
     - Task history with ratings
     - Achievement badges

  5. **Transaction History**:
     - Paginated list of all payments
     - Filter by date, type, status
     - Export to CSV functionality
     - Blockchain explorer links
     - Tax category labels

- **Technical Requirements**:
  - Built with Next.js 15 App Router (React 19 RC Server Components)
  - TypeScript 5+ for type safety
  - Responsive design (mobile-first with Tailwind CSS 4)
  - Real-time updates via polling (not WebSocket for MVP)
  - Circle wallet operations are server-side only (no client SDK)
  - Progressive Web App (PWA) capabilities
  - Zustand for client-side state management
- **Acceptance Criteria**:
  - Page load time < 2 seconds
  - Mobile usable on screens down to 320px width
  - WCAG 2.1 AA accessibility compliance
  - Works on Chrome, Firefox, Safari (latest 2 versions)

#### FR-2.5.2: Platform Admin Dashboard

- **ID**: FR-2.5.2
- **Priority**: Medium
- **Description**: Dashboard for gig platform administrators
- **Required Views**:

  1. **Overview**:

     - Total payouts today/week/month
     - Active workers count
     - Average payment time
     - System health indicators

  2. **Worker Management**:

     - Searchable/filterable worker list
     - Reputation scores
     - Payment history per worker
     - Block/suspend functionality

  3. **Analytics**:

     - Payment volume trends (charts)
     - Worker retention metrics
     - Cost savings vs traditional payroll
     - Geographic distribution map

  4. **Settings**:
     - Webhook configuration
     - API key management
     - Payout rules configuration
     - Fee structure settings

- **Acceptance Criteria**:
  - Real-time metrics update every 30 seconds
  - Export reports to PDF/Excel
  - Role-based access control
  - Audit log of all admin actions

#### FR-2.5.3: Demo/Simulation Mode

- **ID**: FR-2.5.3
- **Priority**: Critical (for hackathon)
- **Description**: Simulated gig platform for demonstration
- **Requirements**:
  - Mock task creation interface
  - Simulate task completion events
  - Generate realistic transaction patterns
  - Pre-populated demo data for presentation
  - Toggle between real and simulated modes
- **Acceptance Criteria**:
  - Can demonstrate full user flow in < 5 minutes
  - Realistic task types (delivery, freelance, ride-share)
  - Convincing UI/UX mimicking real gig platforms

### 2.6 Security & Authentication

#### FR-2.6.1: User Authentication

- **ID**: FR-2.6.1
- **Priority**: Critical
- **Description**: Secure authentication for workers and platforms
- **Requirements**:
  - JWT-based authentication
  - Wallet-based sign-in option (sign message to verify ownership)
  - Email/password fallback
  - Password hashing (bcrypt with salt)
  - Session management with refresh tokens
  - Two-factor authentication (optional for MVP)
- **Acceptance Criteria**:
  - No plaintext passwords stored
  - Token expiry and rotation implemented
  - Account lockout after 5 failed attempts
  - Secure password reset flow

#### FR-2.6.2: API Security

- **ID**: FR-2.6.2
- **Priority**: Critical
- **Description**: Protect all API endpoints
- **Requirements**:
  - HTTPS/TLS 1.3 enforcement
  - API key authentication for platform endpoints
  - Rate limiting per endpoint and per user
  - Input validation and sanitization
  - SQL injection prevention
  - CORS configuration
  - Request/response logging
- **Acceptance Criteria**:
  - All endpoints require authentication
  - Rate limits enforced at infrastructure level
  - Security headers configured (CSP, X-Frame-Options, etc.)
  - No sensitive data in logs

#### FR-2.6.3: Smart Contract Security

- **ID**: FR-2.6.3
- **Priority**: Critical
- **Description**: Secure smart contract implementation
- **Requirements**:
  - Use OpenZeppelin audited libraries
  - Implement re-entrancy guards
  - Access control for administrative functions
  - Emergency pause mechanism
  - Time-locks on critical operations
  - Event emission for all state changes
- **Acceptance Criteria**:
  - Pass automated security scanner (Slither/Mythril)
  - Comprehensive unit tests with edge cases
  - No compiler warnings
  - Code review by team member

---

## 3. Non-Functional Requirements

### 3.1 Performance

#### NFR-3.1.1: Response Times

- **ID**: NFR-3.1.1
- **Priority**: High
- **Requirements**:
  - API endpoints: < 200ms response time (p95)
  - Blockchain transactions: < 1 second confirmation
  - Dashboard page load: < 2 seconds
  - Real-time updates: < 500ms latency
- **Measurement**: Use monitoring tools (Cloudflare Analytics, custom metrics)

#### NFR-3.1.2: Throughput

- **ID**: NFR-3.1.2
- **Priority**: Medium
- **Requirements**:
  - Support 100 concurrent users (for demo)
  - Process 1,000 transactions per hour
  - Handle 10 webhook events per second
- **Measurement**: Load testing with k6 or Artillery

#### NFR-3.1.3: Scalability

- **ID**: NFR-3.1.3
- **Priority**: Low (for MVP, High post-launch)
- **Requirements**:
  - Stateless API design for horizontal scaling
  - Database connection pooling
  - Caching strategy for frequently accessed data
  - CDN for static assets
- **Measurement**: Architecture review, stress testing

### 3.2 Reliability

#### NFR-3.2.1: Availability

- **ID**: NFR-3.2.1
- **Priority**: High
- **Requirements**:
  - Target: 99.9% uptime (acceptable downtime: 43 minutes/month)
  - Graceful degradation if external services fail
  - Health check endpoints for monitoring
- **Measurement**: Uptime monitoring service (UptimeRobot, Pingdom)

#### NFR-3.2.2: Data Integrity

- **ID**: NFR-3.2.2
- **Priority**: Critical
- **Requirements**:
  - Database transactions for critical operations
  - Blockchain as source of truth for financial data
  - Automated daily backups
  - Point-in-time recovery capability
- **Measurement**: Regular backup tests, audit logs

#### NFR-3.2.3: Error Handling

- **ID**: NFR-3.2.3
- **Priority**: High
- **Requirements**:
  - All errors logged with context
  - User-friendly error messages
  - Automatic retry for transient failures
  - Dead letter queue for failed webhooks
  - Alerting for critical errors
- **Measurement**: Error rate monitoring, incident response time

### 3.3 Usability

#### NFR-3.3.1: User Experience

- **ID**: NFR-3.3.1
- **Priority**: High
- **Requirements**:
  - Intuitive navigation (max 3 clicks to any feature)
  - Consistent UI components and patterns
  - Loading indicators for async operations
  - Helpful tooltips and onboarding guidance
  - Mobile-friendly touch targets (min 44x44px)
- **Measurement**: User testing feedback, heuristic evaluation

#### NFR-3.3.2: Accessibility

- **ID**: NFR-3.3.2
- **Priority**: Medium
- **Requirements**:
  - WCAG 2.1 AA compliance
  - Keyboard navigation support
  - Screen reader compatibility
  - Sufficient color contrast (4.5:1 for text)
  - Alt text for images
- **Measurement**: Automated accessibility testing (axe, Lighthouse)

#### NFR-3.3.3: Internationalization (Future)

- **ID**: NFR-3.3.3
- **Priority**: Low (for MVP)
- **Requirements**:
  - UI text externalized for translation
  - Multi-currency display support
  - Date/time localization
  - RTL language support
- **Measurement**: Code review, i18n framework integration

### 3.4 Maintainability

#### NFR-3.4.1: Code Quality

- **ID**: NFR-3.4.1
- **Priority**: Medium
- **Requirements**:
  - TypeScript for type safety
  - ESLint/Prettier for code formatting
  - Meaningful variable and function names
  - Comprehensive inline comments
  - Code review for all changes
- **Measurement**: Code coverage reports, linting scores

#### NFR-3.4.2: Documentation

- **ID**: NFR-3.4.2
- **Priority**: Medium
- **Requirements**:
  - README with setup instructions
  - API documentation (Swagger/OpenAPI)
  - Smart contract documentation (NatSpec)
  - Architecture diagrams
  - Deployment runbooks
- **Measurement**: Documentation completeness checklist

#### NFR-3.4.3: Testing

- **ID**: NFR-3.4.3
- **Priority**: High
- **Requirements**:
  - Unit tests for business logic (target: 80% coverage)
  - Integration tests for API endpoints
  - Smart contract tests with Foundry (100% coverage for critical paths)
  - End-to-end tests for key user flows
  - Automated testing in CI/CD pipeline
- **Measurement**: Test coverage reports (forge coverage for contracts, Jest/Vitest for backend/frontend), test execution time

---

## 4. Technical Constraints

### 4.1 Technology Stack

#### Platform & Infrastructure

- **Blockchain**: Arc Testnet (Circle)
- **Smart Contracts**: Solidity 0.8.20+
- **Smart Contract Framework**: Foundry (forge, cast, anvil)
- **Backend Runtime**: Node.js 18+ / Cloudflare Workers
- **Database**: PostgreSQL 16+ (Neon serverless)
- **Caching**: Redis (optional - not implemented in MVP)
- **Hosting**: Cloudflare Pages (frontend), Cloudflare Workers (backend)

#### Frontend

- **Framework**: Next.js 15 App Router
- **Runtime**: React 19 RC (Server Components)
- **Language**: TypeScript 5+
- **State Management**: Zustand (client state)
- **Styling**: Tailwind CSS 4 (Oxide engine)
- **Build Tool**: Next.js built-in (Turbopack)
- **Circle SDK**: Not required (wallet management is server-side only)

#### Backend

- **Framework**: Hono (lightweight framework for Cloudflare Workers)
- **Language**: TypeScript 5+
- **Circle SDK**: `@circle-fin/developer-controlled-wallets` v9.2.0 (Node.js SDK)
- **SDK Documentation**: https://developers.circle.com/sdk-explorer#server-side-sdks
- **ORM**: Prisma with @prisma/adapter-neon (edge-compatible via Neon HTTP driver)
  - **Note**: Using Prisma with Neon's HTTP adapter for Cloudflare Workers compatibility
  - **Alternative**: Drizzle ORM (recommended for production edge deployments)
- **API Docs**: Swagger/OpenAPI
- **Testing**: Jest / Vitest

#### AI/ML

- **Platform**: Cloudflare Workers AI
- **Models**: Pre-trained models from Cloudflare catalog
- **Fallback**: Simple heuristic-based scoring if ML unavailable

#### DevOps

- **Version Control**: Git / GitHub
- **CI/CD**: GitHub Actions
- **Monitoring**: Cloudflare Analytics / Sentry
- **Deployment**: Automated via CI/CD

### 4.2 External Dependencies

#### Circle APIs

- **Developer-Controlled Wallets API**: Wallet creation and management (server-side)
  - SDK: `@circle-fin/developer-controlled-wallets` (TypeScript/Node.js)
  - API Reference: https://developers.circle.com/api-reference
  - Quickstart Guide: https://developers.circle.com/wallets/dev-controlled/create-your-first-wallet
- **USDC Transfer API**: Transaction execution
- **Arc RPC**: Blockchain interaction
- **Webhook System**: Transaction notifications

#### Arc Blockchain

- **Network**: Arc Testnet
- **Gas Token**: USDC
- **RPC Endpoint**: Provided by Circle
- **Explorer**: Arc block explorer

#### Third-Party Services (Optional)

- **Email**: SendGrid / Resend for notifications
- **SMS**: Twilio for 2FA (if implemented)
- **Analytics**: Mixpanel / PostHog for product analytics

### 4.3 Compliance Requirements

#### Data Privacy

- GDPR considerations (even for testnet/demo)
- No storage of sensitive personal data without encryption
- Clear privacy policy and terms of service

#### Financial Regulations

- Testnet only (no real money for hackathon)
- Disclaimer that this is a demo/prototype
- No guarantee of funds or services

#### Licensing

- Open-source license (MIT or Apache 2.0)
- Proper attribution for third-party libraries
- Circle API usage within terms of service

---

## 5. Assumptions & Dependencies

### 5.1 Assumptions

1. Arc testnet is stable and accessible during hackathon period
2. Circle Developer Console provides testnet USDC faucet
3. Cloudflare Workers AI has available capacity for inference
4. Team has sufficient testnet USDC for gas fees
5. Demo can use simulated gig platform data
6. Judges/users are familiar with basic crypto concepts (wallets, transactions)

### 5.2 Dependencies

1. **Circle SDK Documentation**: Clear guides for wallet creation and transactions
2. **Arc Testnet Access**: Ability to deploy and interact with smart contracts
3. **Cloudflare Account**: Workers AI and Pages access
4. **GitHub Repository**: For version control and collaboration
5. **Development Environment**: Team members have required tools installed

### 5.3 Out of Scope (for MVP)

- Real gig platform integrations (will use simulation)
- Production deployment on Arc mainnet
- KYC/AML implementation
- Fiat on/off-ramp integration
- Mobile native apps (iOS/Android)
- Advanced ML model training (will use pre-trained or simple models)
- Multi-language support
- Cross-chain functionality via CCTP
- DAO governance features

---

## 6. Success Criteria

### 6.1 Functional Completeness

- [ ] Worker can register and receive a wallet
- [ ] Simulated task completion triggers instant USDC payment
- [ ] Payment appears in worker's balance within 3 seconds
- [ ] Worker can request and receive advance payment
- [ ] Reputation score updates after each task
- [ ] Dashboard displays real-time earnings and balance
- [ ] All transactions are viewable on Arc block explorer
- [ ] Smart contracts deployed on Arc testnet

### 6.2 Technical Quality

- [ ] No critical security vulnerabilities
- [ ] Smart contracts pass automated security analysis
- [ ] API endpoints have >80% test coverage
- [ ] Frontend is mobile-responsive
- [ ] Documentation is complete and clear
- [ ] Code follows consistent style guidelines

### 6.3 Demo Readiness

- [ ] Can demonstrate full user flow in < 5 minutes
- [ ] Pre-populated demo data looks realistic
- [ ] UI/UX is polished and professional
- [ ] Video walkthrough is clear and compelling
- [ ] Pitch deck tells cohesive story
- [ ] GitHub repository is well-organized

### 6.4 Innovation & Impact

- [ ] Demonstrates clear advantage of Arc blockchain
- [ ] AI features are functional and add value
- [ ] Solution addresses real pain points from PRD
- [ ] Scalability potential is evident
- [ ] Social impact story is compelling

---

## 7. Risk Assessment

### 7.1 Technical Risks

| Risk                                | Probability | Impact   | Mitigation                                    |
| ----------------------------------- | ----------- | -------- | --------------------------------------------- |
| Arc testnet downtime during demo    | Medium      | High     | Record backup video, have screenshots ready   |
| Circle SDK integration difficulties | Medium      | High     | Start integration early, have fallback plan   |
| Cloudflare Workers AI rate limits   | Low         | Medium   | Implement simple heuristic fallback           |
| Smart contract bugs                 | Medium      | Critical | Extensive testing, use OpenZeppelin libraries |
| Performance issues with demo        | Low         | Medium   | Load test early, optimize critical paths      |

### 7.2 Project Risks

| Risk                               | Probability | Impact | Mitigation                               |
| ---------------------------------- | ----------- | ------ | ---------------------------------------- |
| Scope creep beyond MVP             | High        | High   | Strict prioritization, regular check-ins |
| Team member unavailable            | Medium      | Medium | Clear task assignments, documentation    |
| Underestimating time requirements  | Medium      | High   | Buffer time in schedule, daily standups  |
| Last-minute bugs before submission | Medium      | High   | Code freeze 24 hours before deadline     |

---

## 8. Acceptance & Approval

### 8.1 Stakeholder Sign-off

**Prepared By**: [Team Member Name]  
**Review Required By**: All team members  
**Target Approval Date**: October 28, 2025

### 8.2 Review Checklist

- [ ] All team members have reviewed requirements
- [ ] Technical stack is agreed upon
- [ ] Scope is realistic for 13-day timeline
- [ ] Priorities are clearly defined
- [ ] Success criteria are measurable
- [ ] Risks are identified and mitigations planned
- [ ] Ready to proceed to design phase

---

## 9. Next Steps

After approval of this requirements document:

1. **Design Phase** (design.md):

   - System architecture diagrams
   - Database schema design
   - Smart contract architecture
   - UI/UX wireframes and mockups
   - API specifications

2. **Task Breakdown** (tasks.md):
   - Detailed task list with time estimates
   - Task dependencies and critical path
   - Team member assignments
   - Daily milestone targets
   - Definition of done for each task

---

**Document Status**: ✅ Approved (Updated November 5, 2025)  
**Approved By**: Project Team (collective sign-off)  
**Original Approval Date**: October 28, 2025  
**Last Updated**: November 5, 2025

---

## 10. Implementation Deviations & Updates

This section documents changes made during implementation that deviate from original requirements.

### 10.1 Technology Stack Updates

**Frontend Framework Upgrade:**

- **Original**: React 18+, Tailwind CSS 3+
- **Implemented**: Next.js 15 App Router with React 19 RC, Tailwind CSS 4
- **Rationale**: React 19 Server Components provide better performance and SEO. Tailwind CSS 4 offers improved build times with Oxide engine.

**State Management Decision:**

- **Original**: "React Context / Zustand" (both options)
- **Implemented**: Zustand exclusively
- **Rationale**: Simpler API, better performance, and easier testing compared to Context API.

**Backend Framework:**

- **Original**: "Express.js / Hono" (both options)
- **Implemented**: Hono exclusively
- **Rationale**: Hono is specifically designed for Cloudflare Workers edge runtime with better performance.

**Database & ORM:**

- **Original**: PostgreSQL 15+, "Prisma / Drizzle" (both options)
- **Implemented**: PostgreSQL 16.10 (Neon serverless), Prisma with @prisma/adapter-neon
- **Rationale**: PostgreSQL 16 offers better performance. Prisma chosen for mature ecosystem and better TypeScript support.
- **⚠️ Critical Note**: Prisma + Cloudflare Workers has known compatibility issues:
  - Using Neon's HTTP driver adapter (`@prisma/adapter-neon`) as workaround
  - Slower cold starts and larger bundle size compared to native edge ORMs
  - **Recommended for production**: Migrate to Drizzle ORM (purpose-built for edge)
  - Current setup works for MVP but not optimal for production scale

### 10.2 Gas Cost Adjustments

**Smart Contract Gas Costs:**

- **Original Requirement**: <50,000 gas per operation
- **Actual Measurements**:
  - `createStream`: ~348k gas (7x original estimate)
  - `releasePayment`: ~29k gas (within spec)
  - `claimEarnings`: ~53k gas (slightly over)
  - `requestAdvance`: ~170k gas
  - `approveLoan`: ~234k gas

**Rationale**: Original estimates did not account for:

- USDC ERC-20 transfer operations (~21k base gas)
- Storage slot initialization (SSTORE cold: 20k gas)
- Complex struct storage
- Event emissions

**Impact**: Gas costs are still economically viable on Arc testnet (~$0.005-0.06 per operation). Costs are optimized using OpenZeppelin libraries and gas-efficient patterns.

### 10.3 Real-time Updates Implementation

**Original**: "WebSocket or polling"
**Implemented**: Polling (30-60 second intervals)
**Rationale**: Cloudflare Workers has limitations on persistent WebSocket connections. Polling is simpler for MVP and sufficient for demo purposes.

### 10.4 Circle SDK Integration

**Clarification**: Circle Developer-Controlled Wallets SDK is server-side only (backend). Frontend never touches private keys or SDK directly. All wallet operations are proxied through backend API.

### 10.5 Cloudflare Workers + Prisma Compatibility

**⚠️ Known Limitation**: Prisma was not originally designed for edge runtimes like Cloudflare Workers.

**Current Workaround:**

- Using `@prisma/adapter-neon` with Neon's HTTP driver
- This enables Prisma to work in Cloudflare Workers via HTTP queries instead of WebSocket connections
- Connection pooling handled by Neon serverless, not Prisma Client

**Limitations:**

- ❌ Slower cold starts (Prisma Client bundle ~1MB+)
- ❌ Increased response latency vs native edge ORMs
- ❌ Some Prisma features unavailable (interactive transactions, middleware)
- ❌ Not utilizing Workers' distributed edge network optimally

**Why This Works for MVP:**

- ✅ Prisma Studio provides excellent database GUI for development
- ✅ Mature migration tooling and extensive documentation
- ✅ Team familiarity with Prisma reduces development time
- ✅ Neon adapter makes it functional (not optimal, but functional)

**Production Recommendation:**

- Migrate to **Drizzle ORM** for production deployment
- Drizzle is purpose-built for edge runtimes:
  - ~100KB bundle size (10x smaller)
  - Native WebSocket support with Neon
  - Fast cold starts (<50ms)
  - Full TypeScript type safety
  - SQL-like syntax for complex queries

**Migration Path:**

1. Keep Prisma for MVP completion (deadline: Nov 8)
2. Create Drizzle schema from existing Prisma schema (post-hackathon)
3. Generate migrations using `drizzle-kit`
4. Gradually replace Prisma queries with Drizzle
5. Test thoroughly in staging environment
6. Deploy to production

**Resources:**

- Neon + Prisma: https://neon.tech/docs/guides/prisma
- Drizzle ORM: https://orm.drizzle.team/
- Migration guide: https://orm.drizzle.team/docs/prisma

### 10.6 Completed vs Planned Features

**Fully Implemented (as of Nov 5, 2025):**

- ✅ All 3 smart contracts deployed to Arc testnet
- ✅ Backend API with Hono + Cloudflare Workers
- ✅ Authentication system (JWT + API keys)
- ✅ Circle wallet integration
- ✅ Payment execution service
- ✅ Blockchain interaction layer
- ✅ Database with Prisma (8 tables, triggers, views)
- ✅ Frontend auth pages and layout components

**In Progress:**

- 🚧 Worker dashboard UI (Tasks 7.1-8.5)
- 🚧 Platform admin dashboard (Tasks 9.1-9.2)
- 🚧 AI/ML verification and risk scoring (Tasks 5.1-5.3)

**Deferred to Post-MVP:**

- ⏸️ Redis caching (using in-memory for MVP)
- ⏸️ Advanced monitoring/alerting
- ⏸️ Two-factor authentication
- ⏸️ PWA features
- ⏸️ Export to CSV functionality

---

_This requirements document has been updated to reflect actual implementation decisions and real-world testing results. All deviations are documented and justified._
**Next Action**: Proceed to design phase (see `project/design.md`)

---

_This requirements document serves as the contract between PRD vision and actual implementation. Any deviations should be documented and approved._
