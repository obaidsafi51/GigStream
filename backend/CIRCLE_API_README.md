# Circle API Integration Guide

This document provides a comprehensive guide to using the Circle API client in GigStream's backend.

## Overview

GigStream uses **Circle Developer-Controlled Wallets** for managing USDC wallets and payments. All wallet operations are server-side only and NEVER exposed to the frontend.

## Architecture

```
User Request → Backend API → Circle Service → Circle SDK → Circle Servers → Arc Blockchain
```

**Key Principle:** Backend controls all wallets via Circle's Developer-Controlled Wallets API. Users never directly access private keys or wallet operations.

**Important:** Arc blockchain is **EVM-compatible**, so we use `EVM-TESTNET` wallet type in Circle SDK. Arc wallets work with all EVM chains using the appropriate Chain ID (Arc Testnet: 5042002).

## Setup

### 1. Install Dependencies

```bash
npm install @circle-fin/developer-controlled-wallets
```

### 2. Environment Variables

Add to `.env`:

```bash
CIRCLE_API_KEY=TEST_API_KEY:id:secret
CIRCLE_ENTITY_SECRET=your-entity-secret-here
```

**How to get credentials:**
1. Sign up at https://console.circle.com/
2. Create a new project
3. Generate API keys (use testnet keys for development)
4. Generate entity secret: `node contracts/scripts/generate-ciphertext-manual.mjs`

### 3. Test Connection

```bash
node backend/test-circle-api.mjs
```

## Usage

### Import the Service

```typescript
import {
  createWallet,
  getWalletBalance,
  executeTransfer,
  getTransactionStatus,
  verifyWebhookSignature,
  withRetry,
} from './services/circle';
```

### Create a Wallet

```typescript
// When a worker registers
const { walletId, address } = await createWallet(userId);

// Store in database
await prisma.worker.update({
  where: { id: userId },
  data: {
    wallet_id: walletId,
    wallet_address: address,
  },
});
```

**Returns:**
- `walletId`: Circle's internal wallet ID
- `address`: Blockchain address (may be "pending" initially)

**Notes:**
- Automatically creates a wallet set for the user
- Uses EOA (Externally Owned Account) type
- **Arc-compatible:** Uses `EVM-TESTNET` wallet type (Arc is EVM-compatible with Chain ID 5042002)
- Wallet can be used on any EVM testnet chain, including Arc testnet

### Check Wallet Balance

```typescript
const balance = await getWalletBalance(walletId);
console.log(`Balance: ${balance} USDC`);
```

**Returns:** Number representing USDC balance (e.g., 100.50)

**Notes:**
- Queries token balances from Circle API
- Filters for USDC token
- Returns 0 if no USDC balance found

### Execute Transfer (Future)

```typescript
const { transactionId, transactionHash } = await executeTransfer({
  fromWalletId: platformWalletId,
  toAddress: workerWalletAddress,
  amount: 25.50, // USDC amount
});
```

**Current Status:** Returns mock transaction ID  
**Reason:** Circle SDK pending Arc blockchain support  
**Production:** Will use smart contract interactions via Task 4.4

### Check Transaction Status

```typescript
const { status, transactionHash } = await getTransactionStatus(transactionId);

if (status === 'confirmed') {
  console.log('Payment confirmed!', transactionHash);
}
```

**Status Values:**
- `'pending'` - Transaction submitted, awaiting confirmation
- `'confirmed'` - Transaction confirmed on blockchain
- `'failed'` - Transaction failed or was rejected

### Verify Webhook Signature

```typescript
// In webhook handler
const payload = await request.text(); // Raw body
const signature = request.headers.get('X-Signature');
const secret = process.env.WEBHOOK_SECRET;

const isValid = await verifyWebhookSignature(payload, signature, secret);

if (!isValid) {
  return new Response('Invalid signature', { status: 401 });
}
```

**Security:** Uses HMAC-SHA256 with timing-safe comparison

### Retry Failed Requests

```typescript
// Wrap any Circle API call with retry logic
const result = await withRetry(async () => {
  return await createWallet(userId);
}, 3); // Max 3 retries
```

**Features:**
- Exponential backoff (2s, 4s, 8s delays)
- Skips retry on 4xx client errors
- Comprehensive error logging

## Error Handling

All functions throw descriptive errors with context:

```typescript
try {
  await createWallet(userId);
} catch (error) {
  console.error('Wallet creation failed:', error.message);
  // Error includes original Circle API error details
}
```

**Common Errors:**
- `CIRCLE_API_KEY not configured` - Missing environment variable
- `CIRCLE_ENTITY_SECRET not configured` - Missing environment variable
- `Wallet creation failed` - API error from Circle
- `Insufficient balance` - Not enough USDC for transfer

## Integration with Backend Routes

### Worker Registration Example

```typescript
// backend/src/routes/auth.ts
import { createWallet } from '../services/circle';

app.post('/api/v1/auth/register', async (c) => {
  const { email, password, name } = await c.req.json();
  
  // 1. Validate input
  // 2. Hash password
  
  // 3. Create Circle wallet
  const { walletId, address } = await createWallet(email);
  
  // 4. Store worker in database
  const worker = await prisma.worker.create({
    data: {
      email,
      password_hash: hashedPassword,
      name,
      wallet_id: walletId,
      wallet_address: address,
    },
  });
  
  // 5. Return JWT + wallet info
  return c.json({
    token: generateToken(worker.id),
    wallet: { id: walletId, address },
  });
});
```

### Payment Execution Example

```typescript
// backend/src/services/payment.ts
import { executeTransfer, getTransactionStatus } from './circle';

export async function processPayment(taskId: string, workerId: string) {
  // 1. Get task and worker details
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  const worker = await prisma.worker.findUnique({ where: { id: workerId } });
  
  // 2. Execute transfer
  const { transactionId } = await executeTransfer({
    fromWalletId: task.platform.wallet_id,
    toAddress: worker.wallet_address,
    amount: task.amount,
  });
  
  // 3. Store transaction
  await prisma.transaction.create({
    data: {
      worker_id: workerId,
      task_id: taskId,
      amount: task.amount,
      tx_hash: transactionId,
      status: 'pending',
    },
  });
  
  // 4. Poll for confirmation (or use webhooks)
  const { status, transactionHash } = await getTransactionStatus(transactionId);
  
  return { transactionId, status };
}
```

## Testing

### Unit Tests (Future)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createWallet } from './services/circle';

describe('Circle API Client', () => {
  it('should create a wallet', async () => {
    const { walletId, address } = await createWallet('test-user-123');
    
    expect(walletId).toBeDefined();
    expect(address).toBeDefined();
  });
  
  it('should handle wallet creation errors', async () => {
    // Mock Circle SDK to throw error
    await expect(createWallet('invalid')).rejects.toThrow();
  });
});
```

### Manual Testing

```bash
# Test Circle API connection
node backend/test-circle-api.mjs

# Test via cURL (when backend is running)
curl -X POST http://localhost:8787/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "name": "Test User"
  }'
```

## Monitoring & Logging

All Circle API operations are logged:

```
✓ Circle SDK initialized
✓ Wallet set created: 67eb6eac-a7f5-4c04-9200-2fbf969426b0
✓ Wallet created: 82e533eb-54f1-52c1-a3af-2605f993985d
  Address: 0xf7c3a55da9f549cdb0dd46fb8b9a4785bc530f91
  State: LIVE
✓ Wallet balance: 100.50 USDC
⚠ Attempt 1 failed, retrying in 2000ms...
✗ Failed to create wallet: Insufficient privileges
```

**Sensitive data is automatically masked:**
- Wallet IDs: Show first 8 characters only
- Addresses: Show first 10 characters only
- API keys: Never logged

## Security Best Practices

### ✅ DO:
- Keep CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET in `.env`
- Use server-side only (backend)
- Validate all inputs before Circle API calls
- Verify webhook signatures
- Log all operations for audit trail
- Use retry logic for transient failures

### ❌ DON'T:
- Expose Circle SDK to frontend
- Store API keys in code or frontend
- Trust webhooks without signature verification
- Skip balance checks before transfers
- Log sensitive data (keys, full wallet IDs)

## Troubleshooting

### "CIRCLE_API_KEY not configured"

**Solution:** Add to `.env`:
```bash
CIRCLE_API_KEY=TEST_API_KEY:your-id:your-secret
```

### "CIRCLE_ENTITY_SECRET not configured"

**Solution:** Generate entity secret:
```bash
node contracts/scripts/generate-ciphertext-manual.mjs
```

### "Wallet creation failed - no ID returned"

**Possible causes:**
- Invalid API credentials
- API rate limit exceeded
- Circle API downtime

**Solution:**
1. Verify credentials in Circle Console
2. Check API status: https://status.circle.com/
3. Review error logs for details

### "Insufficient balance"

**Solution:** 
1. Check wallet balance: `await getWalletBalance(walletId)`
2. Fund wallet via Circle faucet or transfer
3. Verify correct wallet ID is being used

## References

- **Circle SDK Docs:** https://developers.circle.com/sdk-explorer#server-side-sdks
- **Developer-Controlled Wallets Guide:** https://developers.circle.com/wallets/dev-controlled/create-your-first-wallet
- **Circle Console:** https://console.circle.com/
- **Circle API Status:** https://status.circle.com/

## Next Steps

1. **Task 4.2:** Integrate wallet creation into worker registration
2. **Task 4.3:** Build payment execution service
3. **Task 4.4:** Connect Circle wallets with smart contracts
4. **Task 5.1:** Implement webhook handlers
5. **Add unit tests:** Test all Circle API functions

---

**For questions or issues, refer to:**
- `summary/TASK_4.1_COMPLETED.md` - Implementation details
- `backend/src/services/circle.ts` - Source code
- `backend/test-circle-api.mjs` - Test examples
