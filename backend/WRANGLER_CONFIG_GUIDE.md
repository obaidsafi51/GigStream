# Cloudflare Workers Environment Variables Guide

## Overview

Cloudflare Workers handles environment variables differently than traditional Node.js applications:

1. **`wrangler.toml` [vars]** - Non-sensitive, committed to git
2. **`.dev.vars` file** - Sensitive secrets for local development (like .env)
3. **`wrangler secret put`** - Production secrets (encrypted storage)

## Current Configuration

### 1. wrangler.toml [vars] (Public Config)

```toml
[vars]
# Wallet Service
WALLET_SERVICE_URL = "http://localhost:3001"
WALLET_SERVICE_SECRET = "dev-secret-change-in-production"

# Arc Blockchain
ARC_RPC_URL = "https://rpc.testnet.arc.network"
ARC_CHAIN_ID = "5042002"
ARC_EXPLORER_URL = "https://explorer.circle.com/arc-testnet"

# Application Settings
NODE_ENV = "development"
API_PORT = "8787"
API_BASE_URL = "http://localhost:8787"
LOG_LEVEL = "debug"

# Feature Flags
ENABLE_PAYMENT_STREAMING = "true"
ENABLE_MICRO_LOANS = "true"
ENABLE_AI_VERIFICATION = "false"
DEMO_MODE_ENABLED = "true"

# JWT Settings
JWT_ACCESS_TOKEN_EXPIRY = "24h"
JWT_REFRESH_TOKEN_EXPIRY = "7d"
```

### 2. .dev.vars (Sensitive Local Secrets)

```bash
# Database
DATABASE_URL=postgresql://gigstream_user:gigstream_password@localhost:5432/gigstream_dev

# Circle Wallet Service
WALLET_SERVICE_URL=http://localhost:3001
WALLET_SERVICE_SECRET=dev-secret-change-in-production

# Circle APIs
CIRCLE_API_KEY=TEST_API_KEY:...
CIRCLE_ENTITY_SECRET=1be869a684bd5e6996dded629e94980098b83b9e5b9842e2894b91e5da0f2b60

# JWT Secret
JWT_SECRET=dev-secret-key-change-in-production-123456789

# Smart Contracts (after deployment)
CONTRACT_PAYMENT_STREAMING=
CONTRACT_REPUTATION_LEDGER=
CONTRACT_MICRO_LOAN=
```

## How It Works

### Local Development (`npm run dev`)

```bash
cd backend
npm run dev  # Runs: wrangler dev --port 8787
```

**Loading Priority:**

1. `.dev.vars` (sensitive secrets) - loaded automatically
2. `wrangler.toml [vars]` (public config) - always loaded
3. If same key in both: `.dev.vars` takes precedence

### Production Deployment

```bash
# Set secrets one-time (encrypted storage)
wrangler secret put DATABASE_URL
wrangler secret put CIRCLE_API_KEY
wrangler secret put JWT_SECRET
wrangler secret put WALLET_SERVICE_SECRET

# Deploy with environment
wrangler deploy --env production
```

## Why Split Configuration?

### ✅ In wrangler.toml [vars] (Safe to Commit)

- Public API URLs
- Feature flags
- Non-sensitive defaults
- Timeout/limit values
- Blockchain RPC URLs (public endpoints)

### ⛔ In .dev.vars / wrangler secret (NEVER Commit)

- Database credentials
- API keys (Circle, external services)
- JWT secrets
- Private keys
- Wallet service authentication secrets

## Environment Variable Usage in Code

### Option 1: From Hono Context (Recommended)

```typescript
app.post("/api/endpoint", async (c) => {
  const dbUrl = c.env.DATABASE_URL; // ✅ Type-safe
  const jwtSecret = c.env.JWT_SECRET;
});
```

### Option 2: From process.env (Fallback)

```typescript
const dbUrl = process.env.DATABASE_URL; // Works in local dev
```

## Common Issues & Solutions

### Issue: "Environment variable not found"

**Cause:** Variable not in `.dev.vars` or `wrangler.toml [vars]`

**Solution:**

```bash
# Check if .dev.vars exists
ls -la backend/.dev.vars

# Check wrangler.toml [vars] section
cat backend/wrangler.toml
```

### Issue: "401 Unauthorized" from wallet service

**Cause:** `WALLET_SERVICE_SECRET` mismatch

**Check:**

1. `.dev.vars`: `WALLET_SERVICE_SECRET=dev-secret-change-in-production`
2. `wrangler.toml [vars]`: Same value
3. `wallet-service.mjs`: Expects same secret
4. Backend code default: `process.env.WALLET_SERVICE_SECRET || 'dev-secret-change-in-production'`

**Fix:** Ensure all 4 places use identical secret

### Issue: Variables work locally but not in production

**Cause:** Forgot to set production secrets

**Solution:**

```bash
# Set all sensitive secrets for production
wrangler secret put DATABASE_URL --env production
wrangler secret put CIRCLE_API_KEY --env production
wrangler secret put JWT_SECRET --env production
wrangler secret put WALLET_SERVICE_SECRET --env production
```

## Best Practices

### 1. Never Hardcode Secrets

❌ Bad:

```typescript
const apiKey = "TEST_API_KEY:64ca17dac6943b82c11f2a1af2932333";
```

✅ Good:

```typescript
const apiKey = c.env.CIRCLE_API_KEY || process.env.CIRCLE_API_KEY;
```

### 2. Provide Safe Defaults

```typescript
const walletServiceUrl =
  process.env.WALLET_SERVICE_URL || "http://localhost:3001";
const nodeEnv = process.env.NODE_ENV || "development";
```

### 3. Validate Critical Variables

```typescript
if (!c.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}
```

### 4. Use Type Definitions

```typescript
type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  CIRCLE_API_KEY: string;
  WALLET_SERVICE_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();
```

## Migration Checklist

When moving to production:

- [ ] Set all secrets via `wrangler secret put`
- [ ] Update `WALLET_SERVICE_URL` to production URL
- [ ] Update `DATABASE_URL` to production database (Neon, etc.)
- [ ] Update `API_BASE_URL` to production domain
- [ ] Change all secrets from `dev-*` to strong random values
- [ ] Set `NODE_ENV=production`
- [ ] Review and update `[env.production.vars]` in wrangler.toml
- [ ] Test thoroughly in staging environment first

## Quick Reference

| Variable              | Source        | Type   | Required       |
| --------------------- | ------------- | ------ | -------------- |
| DATABASE_URL          | .dev.vars     | Secret | ✅ Yes         |
| JWT_SECRET            | .dev.vars     | Secret | ✅ Yes         |
| CIRCLE_API_KEY        | .dev.vars     | Secret | ✅ Yes         |
| CIRCLE_ENTITY_SECRET  | .dev.vars     | Secret | ✅ Yes         |
| WALLET_SERVICE_SECRET | .dev.vars     | Secret | ✅ Yes         |
| WALLET_SERVICE_URL    | wrangler.toml | Public | ✅ Yes         |
| ARC_RPC_URL           | wrangler.toml | Public | ✅ Yes         |
| NODE_ENV              | wrangler.toml | Public | ⚠️ Recommended |
| ENABLE\_\* (flags)    | wrangler.toml | Public | ⚠️ Optional    |

## Related Documentation

- Cloudflare Workers Secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Wrangler Configuration: https://developers.cloudflare.com/workers/wrangler/configuration/
- Local Development: https://developers.cloudflare.com/workers/wrangler/commands/#dev
