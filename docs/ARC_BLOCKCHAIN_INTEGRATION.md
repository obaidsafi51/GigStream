# Arc Blockchain Integration Guide

**Date:** November 2, 2025  
**Status:** ✅ Arc is FULLY EVM-compatible and LIVE on testnet

---

## Overview

Arc is a **fully EVM-compatible blockchain** developed by Circle. This means:

✅ Arc works with **all standard Ethereum tools** (MetaMask, ethers.js, Foundry, etc.)  
✅ Arc uses **USDC as the native gas token** (18 decimals)  
✅ Arc supports **all EVM smart contracts** without modification  
✅ Arc wallets are **standard EVM wallets** (same as Ethereum addresses)

**Key Insight:** When using Circle's Developer-Controlled Wallets SDK, we use the `EVM-TESTNET` wallet type, which is fully compatible with Arc blockchain.

---

## Arc Testnet Network Details

### Connection Parameters

| Parameter | Value |
|-----------|-------|
| **Network Name** | Arc Testnet |
| **RPC Endpoint** | `https://rpc.testnet.arc.network` |
| **Alternative RPCs** | `https://rpc.blockdaemon.testnet.arc.network`<br>`https://rpc.drpc.testnet.arc.network`<br>`https://rpc.quicknode.testnet.arc.network` |
| **WebSocket** | `wss://rpc.testnet.arc.network` |
| **Chain ID** | `5042002` |
| **Native Currency** | USDC (18 decimals) |
| **Currency Symbol** | USDC |
| **Block Explorer** | https://testnet.arcscan.app |
| **Faucet** | https://faucet.circle.com |

### Gas & Fees

- **Gas Token:** USDC (not ETH!)
- **Decimals:** 18 (same as ETH)
- **Fee Model:** EIP-1559-like with dynamic base fee
- **Best Practice:** Display fees in USDC, not "gwei" or "ETH"

---

## Circle Developer-Controlled Wallets Integration

### How Arc Works with Circle SDK

Circle's Developer-Controlled Wallets SDK creates **EVM wallets** that work across all EVM-compatible chains, including Arc.

#### Wallet Creation

```typescript
// Create an EVM-compatible wallet (works on Arc, Ethereum, Polygon, etc.)
const request: CreateWalletsInput = {
  accountType: 'EOA',           // Externally Owned Account
  blockchains: ['EVM-TESTNET'], // EVM testnet wallet
  count: 1,
  walletSetId: walletSetId,
};

const response = await client.createWallets(request);
```

**Important:** The wallet created is an **EVM wallet** that can interact with:
- Arc Testnet (Chain ID: 5042002)
- Ethereum Sepolia (Chain ID: 11155111)
- Any other EVM testnet

#### Signing Transactions for Arc

When you need to sign a transaction for Arc:

```typescript
// The wallet address from Circle is an EVM address
const walletAddress = '0xf7c3a55da9f549cdb0dd46fb8b9a4785bc530f91';

// Connect to Arc using ethers.js
const provider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.network');

// Create wallet instance
const wallet = new ethers.Wallet(privateKey, provider);

// Send transaction on Arc
const tx = await wallet.sendTransaction({
  to: recipientAddress,
  value: ethers.parseUnits('10', 6), // 10 USDC
  // Arc will automatically use USDC for gas
});
```

---

## GigStream Implementation

### Current Setup ✅

Our implementation is **already Arc-compatible**:

1. **Smart Contracts:** Deployed to Arc Testnet (Chain ID: 5042002)
   - PaymentStreaming: `0x1ab2a328642e0c682ea079ea8821e0efcd378d42`
   - ReputationLedger: `0xbc1ec3a376126d943a5be1370e4208bafc2d6482`
   - MicroLoan: `0x176887591fBeD5a16E9F178779046ACdd5c9e000`

2. **Circle Wallets:** Using `EVM-TESTNET` wallet type
   - These wallets can sign transactions for Arc blockchain
   - Wallet addresses are standard EVM addresses (0x...)

3. **Backend Integration:**
   - ethers.js connects to Arc RPC: `https://rpc.testnet.arc.network`
   - Smart contracts interact with Arc-deployed contracts
   - Circle wallets sign transactions on Arc

### Transaction Flow

```
1. Worker completes task
   ↓
2. Backend creates USDC transfer transaction
   ↓
3. Circle Developer-Controlled Wallet signs transaction
   ↓
4. Transaction submitted to Arc blockchain via RPC
   ↓
5. Arc processes transaction (gas paid in USDC)
   ↓
6. Transaction confirmed on Arc (< 1 second)
   ↓
7. Worker receives USDC payment
```

---

## Why This Works

### Arc is EVM-Compatible

Arc implements the **Ethereum Virtual Machine (EVM)**, which means:

✅ **Same address format:** 0x... (42 characters)  
✅ **Same transaction format:** RLP-encoded  
✅ **Same smart contract bytecode:** Solidity compiles identically  
✅ **Same JSON-RPC interface:** eth_sendTransaction, eth_call, etc.  
✅ **Same tools:** MetaMask, Hardhat, Foundry, ethers.js all work

### Circle Wallets are Multi-Chain

When you create an `EVM-TESTNET` wallet with Circle:
- You get a **single private key**
- That key controls the **same address** on ALL EVM chains
- You can use it on Arc, Ethereum, Polygon, etc.
- Just connect to different RPC endpoints

### Example: Same Wallet, Multiple Chains

```typescript
const walletAddress = '0xf7c3a55da9f549cdb0dd46fb8b9a4785bc530f91';

// Use on Arc Testnet
const arcProvider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.network');
// Chain ID: 5042002

// Use on Ethereum Sepolia
const ethProvider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/...');
// Chain ID: 11155111

// Same wallet address works on both!
```

---

## Testing Arc Connectivity

### 1. Test RPC Connection

```bash
node contracts/scripts/test-arc-connection.mjs
```

**Expected Output:**
```
✓ Connected to RPC: https://rpc.testnet.arc.network
✓ Chain ID matches expected: 5042002
  Current Block: 123456
✓ Network is active and producing blocks
```

### 2. Test Circle Wallet

```bash
node backend/test-circle-api.mjs
```

**Expected Output:**
```
✓ Circle SDK client initialized
✓ Found 1 existing wallet(s)
  Wallet 1:
    Address: 0xf7c3a55da9f549cdb0dd46fb8b9a4785bc530f91
    State: LIVE
    Blockchain: EVM-TESTNET
```

### 3. Verify Wallet on Arc

Use the wallet address on Arc explorer:
```
https://testnet.arcscan.app/address/0xf7c3a55da9f549cdb0dd46fb8b9a4785bc530f91
```

---

## Common Misconceptions Clarified

### ❌ Misconception 1: "Arc requires a special wallet type"
**✅ Reality:** Arc uses standard EVM wallets. Any Ethereum wallet works on Arc.

### ❌ Misconception 2: "Circle SDK doesn't support Arc"
**✅ Reality:** Circle SDK's `EVM-TESTNET` wallets work perfectly with Arc (Chain ID: 5042002).

### ❌ Misconception 3: "We need ETH for gas on Arc"
**✅ Reality:** Arc uses **USDC for gas**, not ETH. This is Arc's unique feature.

### ❌ Misconception 4: "Arc is a separate blockchain like Bitcoin"
**✅ Reality:** Arc is **EVM-compatible**, meaning it's technically similar to Ethereum/Polygon.

---

## Key Differences from Ethereum

While Arc is EVM-compatible, there are important differences:

| Feature | Ethereum | Arc |
|---------|----------|-----|
| **Gas Token** | ETH | **USDC** |
| **Gas Decimals** | 18 | 18 |
| **Block Time** | ~12 seconds | **< 1 second** |
| **Finality** | ~13 minutes (2 epochs) | **< 2 seconds** |
| **Fee Display** | "0.001 ETH" | **"0.50 USDC"** |
| **Developer** | Ethereum Foundation | **Circle** |

---

## Best Practices for Arc

### 1. Always Display Gas in USDC

```typescript
// ❌ Wrong (users expect ETH)
console.log(`Gas: ${ethers.formatEther(gasCost)} ETH`);

// ✅ Correct (Arc uses USDC)
console.log(`Gas: ${ethers.formatEther(gasCost)} USDC`);
```

### 2. Use Arc-Specific Block Explorer

```typescript
// Link to Arc explorer, not Etherscan
const explorerUrl = `https://testnet.arcscan.app/tx/${txHash}`;
```

### 3. Handle Fast Block Times

```typescript
// Arc confirms in < 1 second, much faster than Ethereum
const receipt = await tx.wait(1); // 1 confirmation is enough
```

### 4. Request USDC from Arc Faucet

```
https://faucet.circle.com
```

- Select "Arc Testnet"
- Enter your wallet address
- Receive testnet USDC for gas

---

## Integration Checklist

- [x] Smart contracts deployed to Arc Testnet (Chain ID: 5042002)
- [x] Circle SDK using `EVM-TESTNET` wallet type
- [x] Backend connects to Arc RPC: `https://rpc.testnet.arc.network`
- [x] Frontend displays Arc Testnet in network selector
- [x] Transaction links point to https://testnet.arcscan.app
- [x] Gas fees displayed in USDC (not ETH)
- [x] Faucet link points to https://faucet.circle.com
- [x] Documentation clarifies Arc is EVM-compatible

---

## Troubleshooting

### Issue: "Wallet not working on Arc"

**Solution:** Ensure you're connecting to the correct RPC:
```typescript
const provider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.network');
```

### Issue: "Insufficient funds for gas"

**Solution:** Get testnet USDC from faucet:
```
https://faucet.circle.com
```

### Issue: "Transaction not found on explorer"

**Solution:** Use Arc-specific explorer:
```
https://testnet.arcscan.app/tx/YOUR_TX_HASH
```

### Issue: "Circle wallet shows 'ETH-SEPOLIA' blockchain"

**Solution:** This is normal! `EVM-TESTNET` wallets work on ALL EVM testnets including Arc. Just connect to Arc's RPC endpoint.

---

## Resources

- **Arc Documentation:** https://docs.arc.network
- **Arc Testnet Explorer:** https://testnet.arcscan.app
- **Arc Faucet:** https://faucet.circle.com
- **Circle Developer Docs:** https://developers.circle.com/wallets
- **Arc RPC Endpoint:** https://rpc.testnet.arc.network
- **Arc Chain ID:** 5042002

---

## Summary

**Key Takeaway:** Arc is a fully EVM-compatible blockchain that uses USDC as the native gas token. Circle's Developer-Controlled Wallets SDK creates EVM wallets that work seamlessly with Arc using the `EVM-TESTNET` wallet type.

**No special integration needed** - Arc works with standard Ethereum tools and Circle wallets out of the box! 🎉

---

**Document Status:** ✅ Complete and Verified  
**Last Updated:** November 2, 2025  
**Verified On:** Arc Testnet (Chain ID: 5042002)
