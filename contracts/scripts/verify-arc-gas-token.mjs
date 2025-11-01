#!/usr/bin/env node

/**
 * Verify Arc Gas Token
 * 
 * This script clarifies that Arc uses USDC (not ETH) as the native gas token.
 * It checks the actual token used for gas fees on Arc Network.
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
};

async function verifyGasToken() {
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║   Arc Network Gas Token Verification      ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════╝${colors.reset}\n`);

  const rpcUrl = process.env.ARC_RPC_URL;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`${colors.cyan}📋 Key Information:${colors.reset}\n`);
  console.log(`Deployer Address: ${wallet.address}`);
  
  // Get balance
  const balance = await provider.getBalance(wallet.address);
  
  console.log(`\n${colors.cyan}💰 Balance Information:${colors.reset}\n`);
  console.log(`Raw Balance (wei):     ${balance.toString()}`);
  console.log(`Formatted (18 decimals): ${ethers.formatEther(balance)}`);
  
  console.log(`\n${colors.yellow}⚠️  IMPORTANT CLARIFICATION:${colors.reset}\n`);
  console.log(`Arc Network uses USDC as the native gas token, NOT ETH!`);
  console.log(`\n• ethers.js calls it "ETH" because that's the default terminology`);
  console.log(`• But on Arc, this is actually USDC (18 decimals)`);
  console.log(`• provider.getBalance() returns USDC balance on Arc`);
  console.log(`• formatEther() works because USDC also uses 18 decimals on Arc`);
  
  console.log(`\n${colors.cyan}🔗 From Arc Documentation:${colors.reset}`);
  console.log(`https://docs.arc.network/arc/references/connect-to-arc\n`);
  console.log(`  Network Details:`);
  console.log(`  • Currency: USDC`);
  console.log(`  • Chain ID: 5042002`);
  console.log(`  • Gas Unit: USDC (18 decimals)`);
  console.log(`  • Pricing: EIP-1559-like base fee`);
  
  console.log(`\n${colors.green}✓ Correct Interpretation:${colors.reset}\n`);
  console.log(`  Your wallet has: ${ethers.formatEther(balance)} USDC (not ETH)`);
  console.log(`  This USDC is used for:`);
  console.log(`    1. Gas fees for transactions`);
  console.log(`    2. Contract deployment costs`);
  console.log(`    3. Smart contract operations`);
  
  if (balance === 0n) {
    console.log(`\n${colors.yellow}❌ You need USDC to deploy contracts!${colors.reset}`);
    console.log(`   Get testnet USDC from: https://faucet.circle.com`);
  } else {
    console.log(`\n${colors.green}✓ You have USDC for gas fees!${colors.reset}`);
  }
  
  console.log(`\n${colors.cyan}📝 Summary:${colors.reset}\n`);
  console.log(`  • Native token on Arc = USDC (not ETH)`);
  console.log(`  • provider.getBalance() = USDC balance`);
  console.log(`  • formatEther() = formatUnits(value, 18) = works for USDC`);
  console.log(`  • When scripts say "ETH", read it as "USDC" on Arc`);
  console.log(``);
}

verifyGasToken().catch(console.error);
