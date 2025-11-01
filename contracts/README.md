# GigStream Smart Contracts

**Solidity contracts for real-time USDC payment streaming on Arc blockchain.**

## Overview

GigStream's smart contracts enable:

- ⚡ **Payment Streaming** - Time-based USDC releases for gig workers
- 🏆 **Reputation System** - On-chain worker reputation tracking
- 💰 **Micro-Loans** - Advance payments based on reputation (coming soon)

## Deployed Contracts (Arc Testnet)

| Contract         | Address                | Status         |
| ---------------- | ---------------------- | -------------- |
| PaymentStreaming | See `deployments.json` | ✅ Deployed    |
| ReputationLedger | See `deployments.json` | ✅ Deployed    |
| MicroLoan        | TBD                    | 🔄 In Progress |

**Arc Testnet USDC:** `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`

## Quick Start

### 1. Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. Build Contracts

```bash
forge build
```

### 3. Run Tests

```bash
forge test                 # Run all tests
forge test --gas-report    # With gas usage
forge test -vvv            # Verbose output
```

**Test Results:**

- ✅ 28/28 tests passing
- ✅ 100% success rate
- ✅ Gas optimized

### 4. Deploy to Arc Testnet

```bash
# Configure .env first (see DEPLOYMENT_GUIDE.md)
node scripts/deploy-contracts.mjs
```

See [**DEPLOYMENT_GUIDE.md**](./DEPLOYMENT_GUIDE.md) for detailed instructions.

## Project Structure

```
contracts/
├── src/
│   ├── PaymentStreaming.sol    # Time-based payment releases
│   ├── ReputationLedger.sol    # On-chain reputation tracking
│   └── MicroLoan.sol           # Advance payment system (WIP)
├── test/
│   ├── PaymentStreaming.t.sol  # 19 tests, all passing
│   └── ReputationLedger.t.sol  # 9 tests, all passing
├── scripts/
│   ├── deploy-contracts.mjs           # Main deployment script
│   ├── test-deployed-contracts.mjs    # Post-deployment verification
│   ├── test-arc-connection.mjs        # RPC connectivity test
│   ├── create-circle-wallet.mjs       # Circle wallet setup
│   └── ...                            # Additional utilities
├── out/                        # Compiled artifacts
├── deployments.json           # Deployment addresses (auto-generated)
└── foundry.toml              # Foundry configuration
```

## Contract Documentation

### PaymentStreaming

Manages escrow and time-based payment releases.

**Key Functions:**

- `createStream()` - Escrow USDC and start payment stream
- `releasePayment()` - Release next payment installment
- `claimEarnings()` - Worker claims released funds
- `pauseStream()` / `resumeStream()` - Platform controls
- `cancelStream()` - Early termination with refunds

**Gas Usage:**

- Create Stream: ~348k gas
- Release Payment: ~29k gas
- Claim Earnings: ~53k gas

**See:** [README_PAYMENT_STREAMING.md](./README_PAYMENT_STREAMING.md)

### ReputationLedger

Tracks worker reputation on-chain.

**Key Functions:**

- `recordCompletion()` - Log completed task
- `recordDispute()` - Log dispute (penalties)
- `getReputationScore()` - Query worker score (0-1000)
- `getCompletionRate()` - On-time completion percentage

**Scoring:**

- Base score: 100
- Task completion: +2 points
- On-time bonus: +1 point
- 5-star rating: +3 points
- Dispute: -10 to -50 points

**See:** [README_REPUTATION_LEDGER.md](./README_REPUTATION_LEDGER.md)

## Testing

### Run All Tests

```bash
forge test
```

**Output:**

```
Ran 28 tests for test/PaymentStreaming.t.sol:PaymentStreamingTest
[PASS] testBasicStreamCreation() (gas: 348123)
[PASS] testPaymentRelease() (gas: 29456)
...
Test result: ok. 28 passed; 0 failed; 0 skipped;
```

### Gas Report

```bash
forge test --gas-report
```

### Test Coverage

```bash
forge coverage
```

## Deployment

### Prerequisites

1. ✅ Foundry installed
2. ✅ `.env` configured (see `.env.example`)
3. ✅ Deployer wallet funded with testnet USDC (Arc uses USDC as native gas token)

### Deploy Contracts

```bash
node scripts/deploy-contracts.mjs
```

### Verify Deployment

```bash
node scripts/test-deployed-contracts.mjs
```

**Full Guide:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## Interacting with Contracts

### Using Cast

```bash
# Get stream count
cast call $CONTRACT_PAYMENT_STREAMING "streamCount()" --rpc-url $ARC_RPC_URL

# Get reputation score
cast call $CONTRACT_REPUTATION_LEDGER "getReputationScore(address)" $WORKER_ADDRESS --rpc-url $ARC_RPC_URL
```

### Using Ethers.js

```typescript
import { ethers } from "ethers";
import PaymentStreamingABI from "./out/PaymentStreaming.sol/PaymentStreaming.json";

const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
const contract = new ethers.Contract(
  process.env.CONTRACT_PAYMENT_STREAMING,
  PaymentStreamingABI.abi,
  provider
);

const streamCount = await contract.streamCount();
```

## Development Workflow

### 1. Write Contract

Edit files in `src/`

### 2. Write Tests

Create test file in `test/`

### 3. Run Tests

```bash
forge test --match-contract YourTest -vvv
```

### 4. Check Gas

```bash
forge test --gas-report
```

### 5. Deploy

```bash
node scripts/deploy-contracts.mjs
```

## Security

All contracts implement:

- ✅ **ReentrancyGuard** - Prevent reentrancy attacks
- ✅ **Pausable** - Emergency pause functionality
- ✅ **Ownable** - Access control
- ✅ **Transfer-Before-State** - CEI pattern
- ✅ **Event Emission** - Comprehensive logging

## Foundry Reference

### Build

```bash
forge build
```

### Test

```bash
forge test
forge test --match-test testSpecificFunction
forge test --gas-report
forge test -vvv  # Verbose
```

### Format

```bash
forge fmt
```

### Gas Snapshots

```bash
forge snapshot
```

### Local Node

```bash
anvil
```

### Cast

```bash
cast <subcommand>
cast --help
```

### Help

```bash
forge --help
anvil --help
cast --help
```

## Additional Resources

- **Foundry Book:** https://book.getfoundry.sh/
- **Arc Testnet Explorer:** https://explorer.testnet.arc.network
- **Circle Developer Docs:** https://developers.circle.com
- **OpenZeppelin Contracts:** https://docs.openzeppelin.com/contracts

## Task Completion

- ✅ **Task 2.1** - PaymentStreaming Contract (28 tests passing)
- ✅ **Task 2.2** - Contract Testing (100% pass rate)
- ✅ **Task 2.3** - ReputationLedger Contract
- ✅ **Task 2.4** - Deployment Scripts & Documentation
- 🔄 **Task 3.1** - MicroLoan Contract (In Progress)

See `summary/TASK_2.4_COMPLETED.md` for full deployment report.

---

**Version:** 1.0  
**Last Updated:** November 1, 2025  
**Status:** Production Ready ✅
