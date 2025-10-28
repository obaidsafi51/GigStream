# GigStream Smart Contracts

This directory contains the smart contracts for the GigStream payment platform.

## Structure

```
contracts/
├── contracts/          # Solidity smart contracts
│   ├── PaymentStreaming.sol   (Task 2.1 - to be created)
│   ├── ReputationLedger.sol   (Task 2.3 - to be created)
│   └── MicroLoan.sol          (Task 3.1 - to be created)
├── scripts/            # Deployment scripts
│   └── deploy.js      (to be created)
├── test/               # Contract tests (ignored by git)
├── hardhat.config.js   # Hardhat configuration
└── package.json        # Dependencies
```

## Contracts to Implement

### 1. PaymentStreaming.sol (Task 2.1)
Handles instant and streaming payments to workers using Circle USDC.

**Key Functions:**
- `createStream()` - Create a payment stream
- `releasePayment()` - Release scheduled payment
- `pauseStream()` - Pause an active stream
- `cancelStream()` - Cancel and refund stream
- `claimEarnings()` - Worker claims earnings
- `getStreamDetails()` - Query stream info

### 2. ReputationLedger.sol (Task 2.3)
Tracks worker reputation scores on-chain.

**Key Functions:**
- `recordCompletion()` - Record task completion
- `recordDispute()` - Record dispute event
- `getReputationScore()` - Get worker reputation
- `updateScore()` - Update reputation score

### 3. MicroLoan.sol (Task 3.1)
Manages micro-advances against future earnings.

**Key Functions:**
- `requestAdvance()` - Request earnings advance
- `approveLoan()` - Approve loan request
- `disburseLoan()` - Disburse approved loan
- `repayFromEarnings()` - Auto-repay from earnings
- `calculateEligibility()` - Check loan eligibility
- `getLoanStatus()` - Query loan status

## Development

### Compile Contracts
```bash
npm run compile
```

### Run Tests
```bash
npm run test
```

### Deploy to Arc Testnet
```bash
npm run deploy:testnet
```

### Deploy to Local Network
```bash
# Terminal 1: Start local node
npm run node

# Terminal 2: Deploy
npm run deploy:local
```

## Configuration

Configured for Circle's Arc testnet:
- **RPC URL:** https://arc-testnet.rpc.circle.com
- **Chain ID:** 613
- **Currency:** USDC

## Security

All contracts use OpenZeppelin libraries for:
- ReentrancyGuard (prevent reentrancy attacks)
- Pausable (emergency pause functionality)
- Ownable (access control)

## Testing

Test files are excluded from git (see `.gitignore`).

Create tests in `test/` directory:
- `test/PaymentStreaming.test.js`
- `test/ReputationLedger.test.js`
- `test/MicroLoan.test.js`

Target: >90% code coverage
