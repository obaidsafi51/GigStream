# Hardhat to Foundry Migration Checklist

## ✅ Current Status

**Foundry Initialized**: ✅ Complete

- `forge init --force` executed successfully
- Foundry structure created (src/, test/, script/, lib/)
- `foundry.toml` configuration file exists

---

## 📋 Changes Required

### 1. **foundry.toml Configuration** ⚙️

**Status**: Needs update for Arc testnet

**Current**:

```toml
[profile.default]
src = "src"
out = "out"
libs = ["node_modules", "lib"]
remappings = [
    "@openzeppelin/=node_modules/@openzeppelin/",
    "hardhat/=node_modules/hardhat/",
]
```

**Required Changes**:

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.30"
optimizer = true
optimizer_runs = 200

# Remove hardhat remapping, add forge-std
remappings = [
    "@openzeppelin/=lib/openzeppelin-contracts/contracts/",
    "forge-std/=lib/forge-std/src/",
]

# Arc Testnet RPC
[rpc_endpoints]
arc_testnet = "${ARC_RPC_URL}"

# Testing configuration
[fmt]
line_length = 120
tab_width = 4

[fuzz]
runs = 256
```

**Action**:

```bash
# Replace foundry.toml content with the updated version above
```

---

### 2. **Environment Variables** 📝

**Status**: Needs Foundry-compatible names

**Current** (`.env`):

```bash
ARC_RPC_URL=https://rpc.testnet.arc.network
DEPLOYER_PRIVATE_KEY=0x725a19fd9187863e91081364fbd8491f7e5fcdfd4ff6c9f6a52d6ef1e3afbc7f
```

**Add** (Foundry standard):

```bash
# Foundry-compatible names (add these)
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network  # For foundry.toml
PRIVATE_KEY=0x725a19fd9187863e91081364fbd8491f7e5fcdfd4ff6c9f6a52d6ef1e3afbc7f  # For forge scripts

# Keep existing for backward compatibility
ARC_RPC_URL=https://rpc.testnet.arc.network
DEPLOYER_PRIVATE_KEY=0x725a19fd9187863e91081364fbd8491f7e5fcdfd4ff6c9f6a52d6ef1e3afbc7f
```

**Action**: Add the new variables to `.env` file

---

### 3. **OpenZeppelin Contracts** 📚

**Status**: Currently in node_modules, needs to be in lib/

**Current**: `node_modules/@openzeppelin/contracts/`

**Required**: Install via Foundry

**Action**:

```bash
cd contracts/

# Install OpenZeppelin via forge
forge install OpenZeppelin/openzeppelin-contracts --no-commit

# Verify installation
ls lib/openzeppelin-contracts/
```

---

### 4. **Delete Foundry Sample Files** 🗑️

**Status**: Default Counter example not needed

**Files to Delete**:

- `src/Counter.sol` ← Delete (Foundry sample)
- `test/Counter.t.sol` ← Delete (Foundry sample)
- `script/Counter.s.sol` ← Delete (Foundry sample)

**Action**:

```bash
cd contracts/
rm src/Counter.sol
rm test/Counter.t.sol
rm script/Counter.s.sol
```

---

### 5. **Hardhat Files** 📁

**Status**: Keep for now (Circle scripts need Node.js)

**Files**:

- `hardhat.config.js` ← **KEEP** (may need for reference)
- `package.json` ← **KEEP** (Circle SDK needs npm)
- `contracts/` folder ← **KEEP** (has Lock.sol from Hardhat)
- `scripts/` folder ← **KEEP** (Circle API scripts)

**Decision**: Keep Hardhat files because:

1. Circle API scripts need Node.js/npm
2. No conflict with Foundry
3. Can clean up later if not needed

**Action**: No action required (keep as-is)

---

### 6. **package.json Scripts** 📦

**Status**: Update to include Foundry commands

**Current**:

```json
"scripts": {
  "test": "hardhat test",
  "compile": "hardhat compile",
  "clean": "hardhat clean",
  "deploy:local": "hardhat run scripts/deploy.ts --network localhost",
  "deploy:testnet": "hardhat run scripts/deploy.ts --network arcTestnet"
}
```

**Add Foundry Scripts**:

```json
"scripts": {
  "test": "forge test",
  "test:gas": "forge test --gas-report",
  "test:coverage": "forge coverage",
  "build": "forge build",
  "clean": "forge clean",
  "deploy:arc": "forge script script/Deploy.s.sol:DeployScript --rpc-url arc_testnet --broadcast",
  "deploy:verify": "forge script script/Deploy.s.sol:DeployScript --rpc-url arc_testnet --broadcast --verify",

  // Keep these for Circle integration
  "circle:test": "node scripts/test-circle-wallet.mjs",
  "circle:verify": "node scripts/verify-task-1.3.mjs"
}
```

**Action**: Update package.json with new scripts

---

### 7. **contracts/contracts/ Folder** 📂

**Status**: Contains old Hardhat contracts

**Current Structure**:

```
contracts/
├── contracts/       ← Old Hardhat location
│   └── Lock.sol
└── src/            ← New Foundry location
    └── (empty after deleting Counter.sol)
```

**Decision**:

- Keep `contracts/Lock.sol` as reference
- Create new contracts in `src/` folder

**Action**: No immediate action needed

---

### 8. **New Smart Contracts** 💼

**Status**: To be created in Task 2.1-2.3

**Create These Files**:

```
src/
├── PaymentStreaming.sol     ← Task 2.1
├── ReputationLedger.sol     ← Task 2.3
└── MicroLoan.sol            ← Task 3.1
```

**Test Files**:

```
test/
├── PaymentStreaming.t.sol
├── ReputationLedger.t.sol
└── MicroLoan.t.sol
```

**Action**: Will be created during Task 2.1-3.1

---

### 9. **Deployment Script** 🚀

**Status**: To be created

**Create**: `script/Deploy.s.sol`

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

**Action**: Will be created during Task 2.4

---

### 10. **contracts/scripts/ Folder** 🔧

**Status**: Keep (Circle API scripts)

**Files**:

- `test-arc-connection.mjs` ← Keep
- `test-circle-wallet.mjs` ← Keep
- `verify-task-1.3.mjs` ← Keep
- `generate-deployer-wallet.mjs` ← Keep
- `create-circle-wallet.mjs` ← Keep
- etc.

**These use Node.js/npm, not Foundry**

**Action**: No changes needed

---

### 11. **.gitignore** 📝

**Status**: Already configured for Foundry

**Current** (contracts/.gitignore):

```ignore
# Compiler files
cache/
out/

# Ignores development broadcast logs
!/broadcast
/broadcast/*/31337/
/broadcast/**/dry-run/

# Docs
docs/

# Dotenv file
.env
```

**Status**: ✅ Good as-is (Foundry format)

---

### 12. **Documentation Updates** 📚

**Files to Update**:

1. `project/tasks.md` - Task 1.2
   - Change: "Install Hardhat" → "Install Foundry"
2. `summary/TASK_1.1_COMPLETED.md`
   - Update mentions of Hardhat to Foundry
3. `contracts/scripts/deploy.mjs`
   - Update or delete (superseded by forge scripts)

**Action**: Will update during documentation phase

---

## 🎯 Immediate Actions (Do Now)

### Priority 1: Configuration (5 minutes)

```bash
cd contracts/

# 1. Update foundry.toml
# (Copy the updated config from section 1 above)

# 2. Install OpenZeppelin
forge install OpenZeppelin/openzeppelin-contracts --no-commit

# 3. Delete sample files
rm src/Counter.sol
rm test/Counter.t.sol
rm script/Counter.s.sol

# 4. Test Foundry setup
forge build
```

### Priority 2: Environment Variables (2 minutes)

Add to `.env`:

```bash
# Foundry-compatible names
ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
PRIVATE_KEY=0x725a19fd9187863e91081364fbd8491f7e5fcdfd4ff6c9f6a52d6ef1e3afbc7f
```

### Priority 3: Update package.json (3 minutes)

Update scripts section with Foundry commands (see section 6)

---

## ⏭️ Later Actions (During Task 2.1+)

- Create `src/PaymentStreaming.sol` (Task 2.1)
- Create `test/PaymentStreaming.t.sol` (Task 2.2)
- Create `src/ReputationLedger.sol` (Task 2.3)
- Create `script/Deploy.s.sol` (Task 2.4)
- Deploy to Arc testnet (Task 2.4)

---

## 🧪 Verification Commands

After making changes, verify everything works:

```bash
# Test Foundry installation
forge --version

# Build contracts (should work even with no contracts yet)
forge build

# Check OpenZeppelin installation
ls lib/openzeppelin-contracts/contracts/

# Verify environment variables
source .env && echo $ARC_TESTNET_RPC_URL

# Test Circle scripts still work
node scripts/test-circle-wallet.mjs
```

---

## 📊 Summary

| Item                | Status                 | Action                  | Priority  |
| ------------------- | ---------------------- | ----------------------- | --------- |
| **foundry.toml**    | ⚠️ Needs update        | Update config           | 🔴 High   |
| **.env variables**  | ⚠️ Add Foundry names   | Add ARC_TESTNET_RPC_URL | 🔴 High   |
| **OpenZeppelin**    | ❌ Not installed       | `forge install`         | 🔴 High   |
| **Sample files**    | ⚠️ Delete Counter.sol  | Delete 3 files          | 🔴 High   |
| **package.json**    | ⚠️ Add Foundry scripts | Update scripts          | 🟡 Medium |
| **Hardhat files**   | ✅ Keep as-is          | No action               | ⚪ None   |
| **Circle scripts**  | ✅ Working             | No action               | ⚪ None   |
| **Smart contracts** | ⏳ Not created yet     | Create in Task 2.1+     | 🟢 Later  |
| **Deploy script**   | ⏳ Not created yet     | Create in Task 2.4      | 🟢 Later  |

---

## 🎯 Next Steps

1. ✅ **Complete immediate actions** (10 minutes)

   - Update foundry.toml
   - Add environment variables
   - Install OpenZeppelin
   - Delete sample files

2. ✅ **Verify setup** (2 minutes)

   - Run `forge build`
   - Test Circle scripts

3. 🚀 **Start Task 2.1** (Smart Contract Development)
   - Create PaymentStreaming.sol in src/
   - Use Foundry for testing and deployment

---

**Created**: October 29, 2025  
**Status**: Ready for execution  
**Time to complete**: 15 minutes
