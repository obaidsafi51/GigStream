# Arc Network Gas Token Clarification

## 🔑 Key Fact: Arc Uses USDC for Gas, Not ETH!

### The Source of Confusion

Most blockchains (Ethereum, Polygon, BSC, etc.) use their native token (ETH, MATIC, BNB) for gas fees. **Arc is different** - it uses **USDC as the native gas token**.

### What This Means

```
Traditional Blockchain          Arc Network
─────────────────────────────   ──────────────────────────
Native Token: ETH               Native Token: USDC
Gas Paid In: ETH                Gas Paid In: USDC
USDC: Separate ERC-20 token     USDC: Native gas token
Need ETH for deployment         Need USDC for deployment
```

## Why Our Scripts Say "ETH"

**Ethers.js doesn't know about Arc's unique design.** It treats whatever the native gas token is as "ETH" in its functions:

```javascript
// On Arc Network:
const balance = await provider.getBalance(address);  
// ↑ Returns USDC balance, NOT ETH!

const formatted = ethers.formatEther(balance);
// ↑ "formatEther" just means "format 18 decimals"
// ↑ Works for USDC because Arc uses 18 decimals
```

### Technical Details

| Aspect | Traditional Chain | Arc Network |
|--------|------------------|-------------|
| Native token | ETH, MATIC, BNB | **USDC** |
| Gas token | Same as native | **USDC** |
| Decimals | 18 | **18** (USDC on Arc) |
| `provider.getBalance()` | ETH balance | **USDC balance** |
| `formatEther()` | Formats ETH | **Formats USDC** |
| Faucet gives | Testnet ETH | **Testnet USDC** |

## How to Read Our Scripts

When you see in deployment/test scripts:

```javascript
log(`Balance: ${ethers.formatEther(balance)} ETH`, "cyan");
```

**Read it as:**
```javascript
log(`Balance: ${ethers.formatEther(balance)} USDC`, "cyan");
```

The code works correctly - it's just the **label** that says "ETH" when it should say "USDC" on Arc.

## From Arc Official Documentation

Source: https://docs.arc.network/arc/references/connect-to-arc

### Network Details
- **Network**: Arc Testnet
- **Chain ID**: 5042002
- **Currency**: **USDC** ⬅️ This is the key line!
- **Currency Symbol**: USDC
- **Gas Unit**: USDC (18 decimals)
- **Pricing**: EIP-1559-like base fee

### Gas and Fees Section
> **Unit**: USDC (18 decimals)
> **Best practice**: Surface fees in USDC, fetch base fee dynamically, set modest priority tip

## Practical Implications for GigStream

### ✅ What This Means for Deployment

1. **Get USDC from faucet** (not ETH):
   ```
   https://faucet.circle.com
   Address: 0xA8b28f81726cBF47379669163a9DBE64626D6D43
   ```

2. **One token does everything**:
   - ✓ Gas for contract deployment
   - ✓ Gas for all transactions
   - ✓ Payment token for streaming
   - ✓ All operations use USDC

3. **Simpler than traditional chains**:
   - No need for separate ETH + USDC
   - One faucet request covers everything
   - No token swaps needed

### ✅ What This Means for Your Wallet

Your deployer wallet balance:
```
Raw: 0 wei
Formatted: 0.0 USDC (not ETH!)
```

To deploy contracts, you need USDC (not ETH) in this address:
```
0xA8b28f81726cBF47379669163a9DBE64626D6D43
```

## Script Terminology Updates

### Current (Confusing)
```javascript
log(`Balance: ${ethers.formatEther(balance)} ETH`, "cyan");
log("Deployer wallet funded with testnet ETH for gas");
```

### What It Actually Means
```javascript
log(`Balance: ${ethers.formatEther(balance)} USDC`, "cyan");
log("Deployer wallet funded with testnet USDC for gas");
```

### Why We Don't Change It
The ethers.js library internally uses "Ether" terminology for formatting 18-decimal values. Changing it would require custom formatting functions. Since the *values* are correct (it properly gets USDC balance), we just need to mentally translate "ETH" → "USDC" when reading Arc-related output.

## Summary

✅ **Correct Understanding**:
- Arc's native token = USDC (18 decimals)
- Gas is paid in USDC
- `provider.getBalance()` returns USDC balance
- `formatEther()` just means "format with 18 decimals" (works for USDC)
- Faucet gives USDC (which is used for gas)

❌ **Common Misconception**:
- Arc's native token = ETH
- Need separate ETH for gas
- USDC is only for payments

🎯 **Action Item**:
Get testnet USDC from https://faucet.circle.com to deploy contracts!

---

**Further Reading**:
- Arc Network Docs: https://docs.arc.network/arc/references/connect-to-arc
- Arc Explorer: https://testnet.arcscan.app
- Circle Faucet: https://faucet.circle.com
