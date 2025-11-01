# Smart Contract Deployment Guide

This guide covers deploying GigStream smart contracts to Arc testnet using Foundry.

## Prerequisites

### 1. Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Verify installation:

```bash
forge --version
cast --version
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in:

```bash
# Required for deployment
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002
DEPLOYER_PRIVATE_KEY=0x...  # Your deployer wallet private key

# Optional - USDC address (already configured)
ARC_TESTNET_USDC=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
```

### 3. Fund Deployer Wallet

Get testnet USDC for gas fees (Arc uses USDC as native gas token):

1. Copy your deployer address (run script, it will show you)
2. Visit: https://faucet.circle.com/arc-testnet
3. Request testnet USDC

**Note:** Arc Network uniquely uses USDC for gas fees, not ETH. See [docs/ARC_GAS_TOKEN_CLARIFICATION.md](../docs/ARC_GAS_TOKEN_CLARIFICATION.md) for details.

## Deployment Steps

### Step 1: Test Arc Connection

```bash
node contracts/scripts/test-arc-connection.mjs
```

This verifies:

- RPC connectivity
- Deployer wallet balance
- Network details

### Step 2: Deploy Contracts

```bash
node contracts/scripts/deploy-contracts.mjs
```

This will:

1. Check prerequisites (Foundry, env vars, balance)
2. Compile contracts with `forge build`
3. Deploy ReputationLedger contract
4. Deploy PaymentStreaming contract (with USDC address)
5. Update `.env` with deployed addresses
6. Create `contracts/deployments.json` with full deployment info
7. Generate `frontend/lib/contracts.ts` for frontend integration

**Expected Output:**

```
╔═══════════════════════════════════════════╗
║     ✓ Deployment Completed Successfully!  ║
╚═══════════════════════════════════════════╝

📋 Deployment Summary:
─────────────────────────────────────────────
PaymentStreaming:  0x1234...5678
ReputationLedger:  0xabcd...efgh
USDC Token:        0x1c7D...7238
─────────────────────────────────────────────
```

### Step 3: Verify Deployment

```bash
node contracts/scripts/test-deployed-contracts.mjs
```

This tests:

- **PaymentStreaming:** USDC address, constants, pause status
- **ReputationLedger:** Scoring constants, authorization
- **Gas Estimates:** Expected costs for operations

**Expected Output:**

```
╔═══════════════════════════════════════════╗
║  ✓ All Contract Tests Passed!             ║
╚═══════════════════════════════════════════╝
```

## Deployment Artifacts

After successful deployment, you'll have:

### 1. Environment Variables (`.env`)

```bash
CONTRACT_PAYMENT_STREAMING=0x...
CONTRACT_REPUTATION_LEDGER=0x...
```

### 2. Deployment Config (`contracts/deployments.json`)

```json
{
  "network": "arc-testnet",
  "chainId": "5042002",
  "timestamp": "2025-11-01T...",
  "deployer": "0x...",
  "usdcToken": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  "contracts": {
    "PaymentStreaming": {
      "address": "0x...",
      "txHash": "0x..."
    },
    "ReputationLedger": {
      "address": "0x...",
      "txHash": "0x..."
    }
  }
}
```

### 3. Frontend Config (`frontend/lib/contracts.ts`)

```typescript
export const CONTRACTS = {
  PaymentStreaming: "0x...",
  ReputationLedger: "0x...",
  USDCToken: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
} as const;
```

## Contract Addresses (Arc Testnet)

### Official Tokens

- **USDC:** `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`

### Your Deployed Contracts

After deployment, check:

- `contracts/deployments.json`
- `.env` file

## Useful Commands

### Compile Contracts

```bash
cd contracts
forge build
```

### Run Tests

```bash
cd contracts
forge test
forge test --gas-report  # With gas usage
forge test -vvv          # Verbose output
```

### Check Contract Code

```bash
cast code <contract_address> --rpc-url $ARC_RPC_URL
```

### Get Contract Info

```bash
# Get stream count
cast call <payment_streaming_address> "streamCount()" --rpc-url $ARC_RPC_URL

# Get USDC address
cast call <payment_streaming_address> "usdcToken()" --rpc-url $ARC_RPC_URL

# Get reputation score
cast call <reputation_ledger_address> "getReputationScore(address)" <worker_address> --rpc-url $ARC_RPC_URL
```

### Monitor Transactions

View on Arc Explorer:

```
https://explorer.testnet.arc.network/tx/<tx_hash>
https://explorer.testnet.arc.network/address/<contract_address>
```

## Troubleshooting

### Issue: "Foundry not found"

**Solution:** Install Foundry or add to PATH

```bash
export PATH="$HOME/.foundry/bin:$PATH"
```

### Issue: "Insufficient funds for gas"

**Solution:** Fund your deployer wallet with USDC (Arc's native gas token)

1. Get your address: Check deployment script output
2. Visit: https://faucet.circle.com/arc-testnet
3. Request testnet USDC

### Issue: "RPC connection failed"

**Solution:** Check RPC URL in `.env`

```bash
ARC_RPC_URL=https://rpc.testnet.arc.network
```

### Issue: "Contract already exists at address"

**Solution:** This is normal - contracts deploy with new addresses each time

- Previous deployments remain on-chain
- Update your `.env` and `deployments.json` with new addresses

### Issue: "Invalid private key"

**Solution:** Check your private key format

- Must start with `0x`
- Must be 66 characters long (including `0x`)
- No extra spaces or quotes

## Gas Cost Estimates

Based on test results (approximate):

| Operation         | Gas Used | Cost (at 1 gwei) |
| ----------------- | -------- | ---------------- |
| Create Stream     | ~348,000 | ~0.000348 ETH    |
| Release Payment   | ~29,000  | ~0.000029 ETH    |
| Claim Earnings    | ~53,000  | ~0.000053 ETH    |
| Record Completion | ~27,000  | ~0.000027 ETH    |
| Record Dispute    | ~15,000  | ~0.000015 ETH    |

**Total for Full Flow:** ~500,000 gas ≈ 0.0005 ETH

## Backend Integration

After deployment, use in backend:

```typescript
import { ethers } from "ethers";
import PaymentStreamingABI from "./contracts/out/PaymentStreaming.sol/PaymentStreaming.json";

const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
const contract = new ethers.Contract(
  process.env.CONTRACT_PAYMENT_STREAMING,
  PaymentStreamingABI.abi,
  provider
);

// Read operations
const streamCount = await contract.streamCount();

// Write operations (with signer)
const signer = new ethers.Wallet(privateKey, provider);
const contractWithSigner = contract.connect(signer);
await contractWithSigner.createStream(worker, amount, duration, interval);
```

## Next Steps

After successful deployment:

1. ✅ **Task 2.4 COMPLETE** - Contracts deployed
2. 🔄 **Task 3.1** - Develop MicroLoan contract
3. 🔄 **Task 4.4** - Integrate contracts with backend
4. 🔄 **Frontend** - Use generated `contracts.ts` config

## Additional Resources

- **Foundry Book:** https://book.getfoundry.sh
- **Arc Testnet Explorer:** https://explorer.testnet.arc.network
- **Circle Docs:** https://developers.circle.com
- **Task 2.4 Report:** `summary/TASK_2.4_COMPLETED.md`

## Support

For issues:

1. Check deployment script output for specific errors
2. Run test script to verify contracts
3. Check Arc explorer for transaction status
4. Review `.env` configuration

---

**Last Updated:** November 1, 2025  
**Version:** 1.0  
**Status:** Production Ready ✅
