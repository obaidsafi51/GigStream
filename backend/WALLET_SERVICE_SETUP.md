# Circle Wallet Service Setup Guide

## Architecture

GigStream uses a **hybrid architecture** for Circle wallet creation:

```
Frontend (Next.js) → Cloudflare Workers (Hono) → Wallet Service (Node.js) → Circle API
```

### Why Two Services?

- **Cloudflare Workers**: Fast edge API, but limited Node.js compatibility
- **Wallet Service**: Full Node.js with Circle SDK support

## Setup Instructions

### 1. Start the Wallet Service (Port 3001)

```bash
cd backend
node wallet-service.mjs
```

You should see:

```
✓ Circle SDK initialized
🚀 Circle Wallet Service Started
   Port: 3001
```

### 2. Start the Backend API (Port 8787)

In a new terminal:

```bash
cd backend
npm run dev
```

### 3. Start the Frontend (Port 3000)

In a new terminal:

```bash
cd frontend
npm run dev
```

## Test Wallet Creation

### Test the wallet service directly:

```bash
curl -X POST http://localhost:3001/create-wallet \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: dev-secret-change-in-production" \
  -d '{"userId":"test-123"}' | jq .
```

Expected output:

```json
{
  "success": true,
  "data": {
    "walletId": "fe072a86-...",
    "address": "0x180cd1e6c8e8b33fa8221f0b78a07cb96fdb059e",
    "state": "LIVE",
    "blockchain": "MATIC-AMOY",
    "arcCompatible": true
  }
}
```

### Test registration with real wallet:

```bash
curl -X POST http://localhost:8787/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"TestPass123!","type":"worker"}' | jq .
```

Check that `walletAddress` starts with `0x` and is NOT a hex-encoded email.

## Environment Variables

Add to `backend/.env`:

```
WALLET_SERVICE_URL=http://localhost:3001
WALLET_SERVICE_SECRET=dev-secret-change-in-production
```

## Production Deployment

For production, deploy the wallet service to:

- Heroku / Railway / Render (Node.js hosting)
- AWS Lambda / Google Cloud Functions
- Your own VPS

Update `WALLET_SERVICE_URL` to the production URL.

## Troubleshooting

### "Wallet service appears to be offline"

- Make sure `node wallet-service.mjs` is running on port 3001
- Check firewall isn't blocking port 3001

### "Still getting temp wallets"

- Restart backend after starting wallet service: `pkill -f wrangler && npm run dev`
- Check backend logs for wallet service connection errors

### "Circle API errors"

- Verify `CIRCLE_API_KEY` and `CIRCLE_ENTITY_SECRET` in `.env`
- Check Circle API console for rate limits

## How It Works

1. User registers on frontend
2. Frontend → Backend API (Cloudflare Workers)
3. Backend calls Wallet Service: `POST /create-wallet`
4. Wallet Service uses Circle SDK to create wallet
5. Returns real Ethereum address (works on Arc blockchain)
6. Backend stores wallet address in database
7. Frontend receives user with real wallet address

## Arc Blockchain Compatibility

The wallet addresses created are **EVM-compatible** (Ethereum-style):

- Format: `0x` + 40 hex characters
- Works on any EVM blockchain including **Arc Testnet** (Chain ID: 5042002)
- Can receive USDC on Arc blockchain
- Can interact with GigStream smart contracts

**No Arc-specific setup needed** - Circle creates standard Ethereum addresses that work everywhere!
