# 🚀 Task 1.3 Quick Reference Card

## What's Already Done ✅

```bash
✓ Circle SDK installed
✓ .env file created
✓ JWT_SECRET generated
✓ Test scripts ready
✓ Verification script ready
```

## What You Need To Do (30 mins)

### 1️⃣ Get Circle API Keys (10 min)

```
→ https://console.circle.com/
→ Sign up → API Keys → Generate
→ Copy CIRCLE_API_KEY & CIRCLE_ENTITY_SECRET
→ Paste into .env file
```

### 2️⃣ Get Deployer Private Key (5 min)

```
→ Open MetaMask
→ ⋮ → Account Details → Export Private Key
→ Copy the key (starts with 0x)
→ Paste into .env as DEPLOYER_PRIVATE_KEY
```

### 3️⃣ Test Circle Connection (2 min)

```bash
node contracts/scripts/test-circle-wallet.mjs
```

**Expected:** ✓ Test wallet created successfully!

### 4️⃣ Request Testnet Funds (10 min)

```
USDC: https://faucet.circle.com/
ETH:  https://faucet.circle.com/arc-testnet
```

### 5️⃣ Verify Everything (2 min)

```bash
bash scripts/verify-setup.sh
```

**Expected:** ✓ Your development environment is ready!

---

## Commands Cheat Sheet

```bash
# Verify full setup
bash scripts/verify-setup.sh

# Test Circle API
node contracts/scripts/test-circle-wallet.mjs

# Test Arc RPC
node contracts/scripts/test-arc-connection.mjs

# Generate new JWT secret (if needed)
openssl rand -base64 32

# Check database connection
psql -U gigstream -d gigstream_dev -h localhost -c "SELECT 1;"
```

---

## Your .env File Status

```bash
✅ DATABASE_URL          # Already set
✅ ARC_RPC_URL           # Already set
✅ ARC_CHAIN_ID          # Already set
✅ JWT_SECRET            # Already set
⏳ CIRCLE_API_KEY       # ← YOU NEED THIS
⏳ CIRCLE_ENTITY_SECRET  # ← YOU NEED THIS
⏳ DEPLOYER_PRIVATE_KEY  # ← YOU NEED THIS
```

---

## Need Help?

📖 **Full Guide:** `docs/TASK_1.3_GUIDE.md`  
📊 **Progress:** `docs/TASK_1.3_PROGRESS.md`  
🔍 **Troubleshooting:** See guide Section "Troubleshooting"

---

## Next Task After This

→ **Task 1.4:** Database Schema Implementation  
→ **Task 2.1:** PaymentStreaming Contract Development
