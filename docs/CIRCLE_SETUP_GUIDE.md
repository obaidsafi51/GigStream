# Circle Developer Account Setup Guide

## Overview

GigStream uses **Circle Developer-Controlled Wallets** to manage USDC payments. This guide walks you through setting up your Circle account and getting the required credentials.

## What You Need

From Circle Developer Console, you need 2 things:
1. **API Key** - Authenticates your application ✅ (You have this)
2. **Entity Secret** - Encrypts wallet operations ❌ (You need this)

## Step-by-Step Setup

### Step 1: Create Circle Developer Account

1. Go to: **https://console.circle.com/**
2. Click "Sign Up" (or "Log In" if you already have an account)
3. Complete registration with your email
4. Verify your email address

### Step 2: Access Developer Console

1. Log in to: **https://console.circle.com/**
2. You should see the main dashboard
3. Look for "Developer Controlled Wallets" section

### Step 3: Get API Key (Already Done ✅)

You already have this in your `.env`:
```
CIRCLE_API_KEY=TEST_API_KEY:64ca17dac6943b82c11f2a1af2932333:098eae3032a2420fe57df6f74b9a23bf
```

### Step 4: Generate Entity Secret (REQUIRED ⚠️)

The Entity Secret is used to encrypt wallet operations. Here's how to get it:

#### Option A: From Console (Recommended)

1. In Circle Developer Console, navigate to:
   - **Wallets** → **Developer Controlled Wallets**
   - Or look for **"API Keys"** or **"Credentials"** section

2. Look for **"Entity Secret"** or **"Entity ID"**
   - This is a UUID-like string (e.g., `550e8400-e29b-41d4-a716-446655440000`)

3. Copy the Entity Secret

4. Update your `.env` file:
   ```bash
   CIRCLE_ENTITY_SECRET=550e8400-e29b-41d4-a716-446655440000
   ```

#### Option B: Generate via API (If not shown in console)

If the console doesn't show the Entity Secret, you may need to generate it:

```bash
# Run the entity secret registration script
node contracts/scripts/register-entity-secret.mjs
```

This will:
1. Call Circle's API to register your entity
2. Store the entity secret in your `.env` file

### Step 5: Update .env File

Your `.env` should look like this:

```bash
# Circle Developer APIs
CIRCLE_API_KEY=TEST_API_KEY:64ca17dac6943b82c11f2a1af2932333:098eae3032a2420fe57df6f74b9a23bf
CIRCLE_ENTITY_SECRET=YOUR_ENTITY_SECRET_HERE
CIRCLE_BASE_URL=https://api.circle.com/v1
```

### Step 6: Test Connection

```bash
node contracts/scripts/test-circle-wallet.mjs
```

**Expected Output:**
```
✓ All required environment variables present
✓ Connected to Circle API
✓ Can query wallet information
```

## Understanding the Components

### API Key
- **What it is:** Authentication token for Circle API
- **Where to get:** Circle Developer Console → API Keys
- **Format:** `TEST_API_KEY:xxxxxxxx:xxxxxxxx`
- **Purpose:** Authenticates your app with Circle

### Entity Secret
- **What it is:** UUID for your organization
- **Where to get:** Circle Developer Console → Developer Controlled Wallets
- **Format:** `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (UUID)
- **Purpose:** Used to encrypt wallet private keys

### Base URL
- **Testnet:** `https://api.circle.com/v1` (sandbox)
- **Production:** `https://api.circle.com/v1` (live)

## Getting Testnet Funds

Once your Circle account is set up, you need testnet funds:

### Get Testnet USDC (Arc's Native Gas Token)

**IMPORTANT:** Arc Network uses USDC as the native gas token (not ETH)!

Your deployer address: `0xA8b28f81726cBF47379669163a9DBE64626D6D43`

Visit: **https://faucet.circle.com/arc-testnet**

1. Paste your address: `0xA8b28f81726cBF47379669163a9DBE64626D6D43`
2. Request testnet USDC
3. Wait for confirmation (usually < 1 minute)

**Why you need USDC:**
- USDC is Arc's native token for gas fees (unlike traditional chains that use ETH)
- Used to deploy contracts, create streams, execute transactions
- Also serves as the payment token for workers (one token, dual purpose!)
- See [ARC_GAS_TOKEN_CLARIFICATION.md](./ARC_GAS_TOKEN_CLARIFICATION.md) for details

**Arc USDC Token Address:** `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`

## Troubleshooting

### Issue: "Missing CIRCLE_ENTITY_SECRET"

**Solution:** Follow Step 4 above to get your Entity Secret

### Issue: "Invalid API Key"

**Possible causes:**
- Wrong API key format
- Using production key instead of testnet key
- API key expired or revoked

**Solution:**
1. Regenerate API key in Circle Console
2. Make sure you're using **testnet/sandbox** credentials
3. Copy the full key including `TEST_API_KEY:` prefix

### Issue: "Entity not found"

**Solution:** Run the entity registration script:
```bash
node contracts/scripts/register-entity-secret.mjs
```

### Issue: "API rate limit exceeded"

**Solution:** Wait a few minutes before retrying

## Quick Reference

```bash
# Test Arc connection (blockchain)
node contracts/scripts/test-arc-connection.mjs

# Test Circle API connection (wallet service)
node contracts/scripts/test-circle-wallet.mjs

# Create a Circle wallet
node contracts/scripts/create-circle-wallet.mjs

# Get testnet funds
# Visit: https://faucet.circle.com/arc-testnet
# Address: 0xA8b28f81726cBF47379669163a9DBE64626D6D43
```

## What's Next?

Once both tests pass:

1. ✅ **Arc Connection Working** - You can deploy smart contracts
2. ✅ **Circle API Working** - You can create wallets and manage USDC

Then you're ready for:
- **Task 2.4:** Deploy contracts to Arc testnet
- **Task 4.1:** Integrate Circle API in backend
- **Full Payment Flow:** Create workers → Fund wallets → Start payment streams

## Important Notes

### Security

⚠️ **NEVER share or commit:**
- Private keys (`DEPLOYER_PRIVATE_KEY`)
- API keys (`CIRCLE_API_KEY`)
- Entity secrets (`CIRCLE_ENTITY_SECRET`)

These are already in `.gitignore` - keep them safe!

### Testnet vs Production

Current setup is for **TESTNET ONLY**:
- No real money
- Free test tokens
- Safe to experiment

For production, you'll need:
- Different API keys
- Real USDC
- Mainnet RPC URL

### Circle SDK Documentation

- **Quickstart:** https://developers.circle.com/wallets/dev-controlled/create-your-first-wallet
- **API Reference:** https://developers.circle.com/api-reference/
- **SDK Explorer:** https://developers.circle.com/sdk-explorer

---

**Questions?** Check the Circle Developer docs or ask in the team chat!

**Status:** Follow this guide to complete Task 1.3 setup ✅
