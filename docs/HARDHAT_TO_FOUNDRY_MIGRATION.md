# Migration Plan: Hardhat → Foundry for Arc Deployment

## 🚨 CRITICAL UPDATE

**Arc's official documentation uses Foundry, not Hardhat!**

Source: https://docs.arc.network/arc/tutorials/deploy-on-arc

---

## Why Foundry?

1. **Arc Official Documentation**: All Arc tutorials use Foundry
2. **Performance**: Foundry is faster (written in Rust)
3. **Native Support**: Better Arc testnet integration
4. **Testing**: Built-in fuzzing and gas optimization
5. **Tooling**: `cast` and `anvil` are powerful CLI tools

---

## Current Setup (Hardhat)

```
contracts/
├── hardhat.config.js       ← Hardhat configuration
├── package.json            ← Hardhat dependencies
├── contracts/
│   └── Lock.sol           ← Sample Hardhat contract
├── scripts/
│   └── deploy.mjs         ← Hardhat deployment script
└── test/                  ← Hardhat test structure
```

---

## Target Setup (Foundry)

```
contracts/
├── foundry.toml           ← Foundry configuration
├── .env                   ← Environment variables
├── src/
│   ├── PaymentStreaming.sol
│   ├── ReputationLedger.sol
│   └── MicroLoan.sol
├── test/
│   ├── PaymentStreaming.t.sol
│   ├── ReputationLedger.t.sol
│   └── MicroLoan.t.sol
├── script/
│   ├── Deploy.s.sol       ← Foundry deployment script
│   └── Interact.s.sol     ← Contract interaction script
└── lib/                   ← Dependencies (OpenZeppelin, etc.)
```

---

## Migration Steps

### Phase 1: Install Foundry (15 minutes)

#### Step 1.1: Install Foundry

```bash
# Download foundryup installer
curl -L https://foundry.paradigm.xyz | bash

# Install forge, cast, anvil, chisel
foundryup

# Verify installation
forge --version
cast --version
```

#### Step 1.2: Initialize Foundry in Project

```bash
cd contracts/

# Initialize Foundry (creates foundry.toml, src/, test/, script/, lib/)
forge init --force

# This will create:
# - foundry.toml (config)
# - src/ (contracts)
# - test/ (tests)
# - script/ (deployment scripts)
# - lib/ (dependencies)
```

#### Step 1.3: Configure Foundry for Arc

Edit `foundry.toml`:

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.30"

# Arc Testnet RPC
[rpc_endpoints]
arc_testnet = "${ARC_TESTNET_RPC_URL}"

# Optimizer settings
optimizer = true
optimizer_runs = 200

# Testing
verbosity = 3
```

---

### Phase 2: Migrate Environment Variables (5 minutes)

Update `.env` file:

```bash
# Arc Testnet Configuration (Foundry format)
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
PRIVATE_KEY=0x725a19fd9187863e91081364fbd8491f7e5fcdfd4ff6c9f6a52d6ef1e3afbc7f

# Circle APIs (keep as-is)
CIRCLE_API_KEY=TEST_API_KEY:72ef67e5a9a9cbce95fd0e07a635a0f3:b114b62d7bee9c69de90a0f3350dc535
CIRCLE_ENTITY_SECRET=13245ded4af7e489143ba13f1799a498a59fe3bb845614fd209d0607afe89f61

# Contract Addresses (will be filled after deployment)
PAYMENT_STREAMING_ADDRESS=
REPUTATION_LEDGER_ADDRESS=
MICRO_LOAN_ADDRESS=
```

---

### Phase 3: Install Dependencies (5 minutes)

#### Step 3.1: Install OpenZeppelin Contracts

```bash
# Foundry uses git submodules for dependencies
forge install OpenZeppelin/openzeppelin-contracts --no-commit

# This installs to lib/openzeppelin-contracts/
```

#### Step 3.2: Configure Remappings

Edit `foundry.toml` or create `remappings.txt`:

```
@openzeppelin/=lib/openzeppelin-contracts/
forge-std/=lib/forge-std/src/
```

---

### Phase 4: Create Smart Contracts (Day 2-3)

#### File Structure

```
src/
├── PaymentStreaming.sol
├── ReputationLedger.sol
└── MicroLoan.sol
```

#### Example: PaymentStreaming.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PaymentStreaming is ReentrancyGuard, Pausable, Ownable {
    // Contract implementation
}
```

---

### Phase 5: Write Tests (Day 2-3)

#### Example: test/PaymentStreaming.t.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/PaymentStreaming.sol";

contract PaymentStreamingTest is Test {
    PaymentStreaming public streaming;

    function setUp() public {
        streaming = new PaymentStreaming();
    }

    function testCreateStream() public {
        // Test implementation
    }

    function testReleasePayment() public {
        // Test implementation
    }

    // Add fuzzing tests
    function testFuzz_StreamAmount(uint256 amount) public {
        // Fuzz testing
    }
}
```

#### Run Tests

```bash
# Run all tests
forge test

# Run with gas report
forge test --gas-report

# Run specific test
forge test --match-test testCreateStream

# Run with verbosity
forge test -vvv
```

---

### Phase 6: Create Deployment Scripts (Day 2-3)

#### script/Deploy.s.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../src/PaymentStreaming.sol";
import "../src/ReputationLedger.sol";
import "../src/MicroLoan.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy contracts
        PaymentStreaming streaming = new PaymentStreaming();
        ReputationLedger reputation = new ReputationLedger();
        MicroLoan loan = new MicroLoan(address(reputation));

        vm.stopBroadcast();

        // Log addresses
        console.log("PaymentStreaming:", address(streaming));
        console.log("ReputationLedger:", address(reputation));
        console.log("MicroLoan:", address(loan));
    }
}
```

#### Deploy to Arc Testnet

```bash
# Load environment variables
source .env

# Deploy contracts
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $ARC_TESTNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify

# Or use named RPC endpoint
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url arc_testnet \
  --private-key $PRIVATE_KEY \
  --broadcast
```

---

### Phase 7: Update Tasks.md (5 minutes)

Update Task 1.2 in `project/tasks.md`:

```markdown
### Task 1.2: Development Environment Setup

**Deliverables:**

- [x] Install Node.js 18+ and npm/yarn
- [x] ~~Install Hardhat~~ **Install Foundry** for smart contract development
- [x] Set up Arc testnet RPC access
- [x] Install PostgreSQL 15+ locally or via Docker
- [x] Set up VS Code with recommended extensions
- [x] Create `.env.example` file with required variables
```

---

## Comparison: Hardhat vs Foundry

| Feature         | Hardhat               | Foundry                 |
| --------------- | --------------------- | ----------------------- |
| **Language**    | JavaScript/TypeScript | Rust                    |
| **Speed**       | Slower                | **Much Faster**         |
| **Testing**     | Mocha/Chai            | Solidity (native)       |
| **Gas Reports** | Plugin required       | Built-in                |
| **Fuzzing**     | Not built-in          | **Built-in**            |
| **CLI Tools**   | Limited               | **cast, anvil, chisel** |
| **Arc Support** | Generic EVM           | **Official Arc docs**   |
| **Deployment**  | JavaScript scripts    | Solidity scripts        |

---

## Benefits of Foundry for GigStream

1. **Faster Development**: Tests run 10-100x faster
2. **Arc Native**: Official Arc documentation uses Foundry
3. **Better Testing**: Built-in fuzzing, invariant testing
4. **Gas Optimization**: Built-in gas profiling
5. **Simpler Deployment**: Solidity deployment scripts
6. **Cast Tool**: Easy contract interaction from CLI

---

## Migration Checklist

### Immediate (Today)

- [ ] Install Foundry (`curl -L https://foundry.paradigm.xyz | bash`)
- [ ] Run `foundryup` to install forge, cast, anvil
- [ ] Initialize Foundry in contracts/ directory
- [ ] Update `.env` with `ARC_TESTNET_RPC_URL`
- [ ] Install OpenZeppelin contracts via forge
- [ ] Update `project/tasks.md` to reflect Foundry usage

### Day 2 (Smart Contract Development)

- [ ] Create `src/PaymentStreaming.sol`
- [ ] Create `src/ReputationLedger.sol`
- [ ] Create `src/MicroLoan.sol`
- [ ] Write Foundry tests in `test/`
- [ ] Run `forge test` to verify

### Day 2-3 (Deployment)

- [ ] Create `script/Deploy.s.sol`
- [ ] Test deployment on Arc testnet
- [ ] Verify contracts with `forge verify`
- [ ] Save contract addresses to `.env`

### Cleanup (Optional)

- [ ] Remove Hardhat dependencies from package.json
- [ ] Delete `hardhat.config.js`
- [ ] Delete `contracts/Lock.sol`
- [ ] Keep `contracts/scripts/` for Circle integration

---

## Coexistence Strategy

**IMPORTANT**: Keep both temporarily!

- **Foundry**: For smart contract development and deployment
- **Node.js/npm**: For Circle API integration and backend scripts

```
GigStream/
├── contracts/
│   ├── foundry.toml       ← Foundry config
│   ├── src/               ← Solidity contracts (Foundry)
│   ├── test/              ← Solidity tests (Foundry)
│   ├── script/            ← Deployment scripts (Foundry)
│   └── scripts/           ← Circle API scripts (Node.js) ✅ Keep!
├── backend/               ← Node.js backend ✅ Keep!
└── frontend/              ← Next.js frontend ✅ Keep!
```

---

## Commands Reference

### Foundry Commands

```bash
# Compile contracts
forge build

# Run tests
forge test

# Run tests with gas report
forge test --gas-report

# Run tests with coverage
forge coverage

# Deploy contract
forge create src/PaymentStreaming.sol:PaymentStreaming \
  --rpc-url $ARC_TESTNET_RPC_URL \
  --private-key $PRIVATE_KEY

# Run deployment script
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url arc_testnet \
  --broadcast

# Interact with contract
cast call $CONTRACT_ADDRESS "getBalance(address)" $WALLET_ADDRESS \
  --rpc-url $ARC_TESTNET_RPC_URL

# Send transaction
cast send $CONTRACT_ADDRESS "transfer(address,uint256)" $RECIPIENT $AMOUNT \
  --rpc-url $ARC_TESTNET_RPC_URL \
  --private-key $PRIVATE_KEY

# Get contract storage
cast storage $CONTRACT_ADDRESS 0 \
  --rpc-url $ARC_TESTNET_RPC_URL

# Check gas price
cast gas-price --rpc-url $ARC_TESTNET_RPC_URL

# Convert hex to decimal
cast to-dec 0x1234

# Generate wallet
cast wallet new
```

---

## VS Code Extensions for Foundry

Add to `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "JuanBlanco.solidity", // Solidity syntax
    "NomicFoundation.hardhat-solidity", // Can still use for syntax
    "tintinweb.solidity-visual-auditor" // Security auditing
  ]
}
```

---

## Resources

- **Foundry Book**: https://book.getfoundry.sh/
- **Arc Deploy Tutorial**: https://docs.arc.network/arc/tutorials/deploy-on-arc
- **Foundry GitHub**: https://github.com/foundry-rs/foundry
- **Foundry Discord**: https://discord.gg/foundry

---

## Timeline Impact

**Original Task 1.2**: 2 hours (Hardhat)  
**Updated Task 1.2**: 2.5 hours (Foundry + Hardhat cleanup)

**Task 2.1-2.4** (Smart Contracts): No time change, just different syntax

**Net Impact**: +30 minutes total, but better Arc integration

---

## Summary

✅ **DO THIS NOW**:

1. Install Foundry
2. Initialize Foundry in contracts/
3. Update environment variables
4. Update Task 1.2 in tasks.md

⚠️ **KEEP BOTH**:

- Foundry for smart contracts
- Node.js for Circle API and backend

🚀 **BENEFITS**:

- Official Arc support
- Faster development
- Better testing
- Native gas optimization

---

**Status**: Ready for Implementation  
**Priority**: HIGH - Required for Arc deployment  
**Estimated Time**: 30 minutes setup, then proceed with Day 2 tasks  
**Last Updated**: October 29, 2025
