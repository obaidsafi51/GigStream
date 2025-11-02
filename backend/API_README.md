# Backend API - GigStream

AI-powered real-time USDC payment streaming backend built with Hono + Cloudflare Workers.

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Main Hono app entry point
│   ├── routes/
│   │   ├── auth.ts           # Authentication endpoints
│   │   ├── workers.ts        # Worker endpoints
│   │   ├── platforms.ts      # Platform endpoints
│   │   └── webhooks.ts       # Webhook handlers
│   ├── middleware/
│   │   ├── auth.ts           # JWT & API key authentication
│   │   ├── rateLimit.ts      # Rate limiting (100 req/min)
│   │   ├── validation.ts     # Zod request validation
│   │   └── errorHandler.ts   # Global error handling
│   ├── services/
│   │   ├── circle.ts         # Circle API client
│   │   ├── blockchain.ts     # Smart contract interactions
│   │   └── database.ts       # Database queries
│   └── types/
│       └── api.ts            # TypeScript type definitions
├── prisma/
│   ├── schema.prisma         # Database schema
│   ├── migrations/           # Migration files
│   ├── seed.ts              # Demo data seeder
│   ├── triggers.sql         # Database triggers
│   └── views.sql            # Database views
└── wrangler.toml            # Cloudflare Workers config
```

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Variables

Create `.env` file:

```bash
# Database (Neon.tech PostgreSQL)
DATABASE_URL="postgresql://user:pass@host/gigstream_db?sslmode=require"

# JWT Authentication
JWT_SECRET="your-secret-key-here"
JWT_EXPIRY="24h"

# Circle Developer-Controlled Wallets
CIRCLE_API_KEY="test_api_key_xxx"
CIRCLE_ENTITY_SECRET="xxx"

# Arc Blockchain
ARC_RPC_URL="https://rpc.testnet.arc.network"
ARC_CHAIN_ID="5042002"

# Smart Contracts (after deployment)
PAYMENT_STREAMING_ADDRESS="0x1ab2a328642e0c682ea079ea8821e0efcd378d42"
REPUTATION_LEDGER_ADDRESS="0xbc1ec3a376126d943a5be1370e4208bafc2d6482"
MICRO_LOAN_ADDRESS="0x176887591fBeD5a16E9F178779046ACdd5c9e000"
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Apply triggers and views (manual step)
psql $DATABASE_URL < prisma/triggers.sql
psql $DATABASE_URL < prisma/views.sql

# Seed demo data
npm run db:seed
```

### 4. Development

```bash
# Start local development server
npm run dev

# API available at http://localhost:8787
```

## API Endpoints

### Health Check

```bash
GET /health
```

### Authentication

```bash
POST /api/v1/auth/register      # Register new worker/platform
POST /api/v1/auth/login         # Login with email/password
POST /api/v1/auth/wallet-login  # Wallet-based authentication
POST /api/v1/auth/refresh       # Refresh JWT token
POST /api/v1/auth/logout        # Logout
```

### Workers

```bash
GET  /api/v1/workers/:id                # Get worker profile
GET  /api/v1/workers/:id/balance        # Get USDC balance
GET  /api/v1/workers/:id/earnings       # Get transaction history
GET  /api/v1/workers/:id/reputation     # Get reputation score
POST /api/v1/workers/:id/advance        # Request micro-advance
GET  /api/v1/workers/:id/loans          # Get loan status
```

### Platforms

```bash
POST /api/v1/platforms/register            # Register platform
POST /api/v1/platforms/tasks/complete      # Task completion webhook
POST /api/v1/platforms/tasks/start-stream  # Create payment stream
GET  /api/v1/platforms/:id/workers         # Get worker list
GET  /api/v1/platforms/:id/analytics       # Get analytics
POST /api/v1/platforms/:id/webhooks        # Configure webhooks
```

### Webhooks

```bash
POST /api/v1/webhooks/circle          # Circle transaction notifications
POST /api/v1/webhooks/task-completed  # Task completion from platforms
```

## Authentication

### JWT (Workers)

```bash
# Include in Authorization header
Authorization: Bearer <jwt_token>

# Or use httpOnly cookie
Cookie: auth_token=<jwt_token>
```

### API Key (Platforms)

```bash
# Include in X-API-Key header
X-API-Key: <api_key>
```

## Rate Limiting

- **Limit:** 100 requests/minute per user
- **Headers:**
  - `X-RateLimit-Limit`: Maximum requests
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp
  - `Retry-After`: Seconds until retry (if exceeded)

## Error Handling

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {} // Optional, development only
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` (400): Invalid request data
- `UNAUTHORIZED` (401): Authentication required
- `INVALID_TOKEN` (401): Invalid or expired token
- `INVALID_API_KEY` (401): Invalid API key
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `NOT_FOUND` (404): Resource not found
- `INTERNAL_SERVER_ERROR` (500): Unexpected error

## Deployment

### Deploy to Cloudflare Workers

```bash
# Login to Cloudflare
npx wrangler login

# Deploy to production
npm run deploy

# Deploy to staging
npx wrangler deploy --env staging
```

### Set Secrets

```bash
# Set sensitive environment variables
npx wrangler secret put JWT_SECRET
npx wrangler secret put CIRCLE_API_KEY
npx wrangler secret put CIRCLE_ENTITY_SECRET
npx wrangler secret put DATABASE_URL
```

## Testing

```bash
# Run tests (TODO: Task 3.4+)
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

## Implementation Status

✅ **Task 3.3 COMPLETED** - Backend API Foundation

- [x] Initialize Hono project
- [x] Set up Cloudflare Workers configuration
- [x] Create API structure (routes, middleware, services)
- [x] Implement error handling middleware
- [x] Set up CORS configuration
- [x] Implement rate limiting (100 req/min)
- [x] Create validation middleware with Zod
- [x] Define type definitions
- [x] Set up authentication middleware (stubs)

📋 **Next Tasks**

- Task 3.4: Authentication System (JWT, bcrypt, API keys)
- Task 4.1: Circle API Client Implementation
- Task 4.3: Payment Execution Service
- Task 4.4: Smart Contract Interaction Layer
- Task 5.1: Webhook Handler Implementation
- Task 5.2: Task Verification Agent
- Task 5.3: Risk Scoring Engine

## Notes

- All endpoints currently return 501 (Not Implemented) for logic to be added in Tasks 3.4+
- Database connection via Prisma is configured but queries need to be implemented
- Circle SDK integration is stubbed, will be implemented in Task 4.1
- Smart contract interactions are stubbed, will be implemented in Task 4.4
- Rate limiting uses in-memory store (use Redis for production)

## References

- Design Document: `../project/design.md`
- Requirements: `../project/requirements.md`
- Task Timeline: `../project/tasks.md`
- Circle SDK Docs: https://developers.circle.com/sdk-explorer#server-side-sdks
- Hono Documentation: https://hono.dev/
- Cloudflare Workers: https://developers.cloudflare.com/workers/
