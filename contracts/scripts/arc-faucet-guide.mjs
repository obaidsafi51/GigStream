#!/usr/bin/env node

/**
 * Arc Testnet Faucet Guide
 * Get testnet USDC on Arc testnet (Arc uses USDC as native token for gas)
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { Wallet } from "ethers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

console.log(
  `\n${colors.cyan}=== Arc Testnet Faucet Guide ===${colors.reset}\n`
);

const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;

if (!deployerKey) {
  console.log(`${colors.yellow}⚠${colors.reset} No deployer key found.\n`);
  process.exit(1);
}

const wallet = new Wallet(deployerKey);
const deployerAddress = wallet.address;

console.log(`${colors.cyan}📍 Arc Testnet Details:${colors.reset}`);
console.log(`  Chain ID: 613`);
console.log(`  RPC URL: https://arc-testnet.rpc.circle.com`);
console.log(`  Explorer: https://explorer.circle.com/arc-testnet\n`);

console.log(`${colors.cyan}Your Deployer Address:${colors.reset}`);
console.log(`  ${colors.green}${deployerAddress}${colors.reset}\n`);

console.log(
  `${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`
);

console.log(`${colors.cyan}🪙 Get Arc Testnet USDC${colors.reset}`);
console.log(
  `${colors.yellow}⚠️  IMPORTANT: Arc uses USDC as native gas!${colors.reset}`
);
console.log(
  `${colors.green}✓ USDC is used for BOTH payments AND gas fees${colors.reset}\n`
);
console.log(`1. Go to Arc testnet faucet:`);
console.log(`   ${colors.green}https://faucet.circle.com/${colors.reset}\n`);
console.log(`2. Select network: ${colors.green}Arc Testnet${colors.reset}`);
console.log(
  `3. Enter your address: ${colors.green}${deployerAddress}${colors.reset}`
);
console.log(`4. Request ${colors.green}USDC${colors.reset}`);
console.log(`5. You'll receive: ${colors.green}~10,000 USDC${colors.reset}\n`);
console.log(`${colors.blue}ℹ${colors.reset} This USDC will be used for:`);
console.log(`  • ${colors.green}Gas fees${colors.reset} for all transactions`);
console.log(`  • ${colors.green}Payments${colors.reset} in your application`);
console.log(`  • ${colors.green}Smart contract deployments${colors.reset}\n`);

console.log(
  `${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`
);

console.log(`${colors.cyan}✅ After receiving funds:${colors.reset}\n`);
console.log(`1. Verify your balance:`);
console.log(
  `   ${colors.green}node contracts/scripts/test-arc-connection.mjs${colors.reset}\n`
);
console.log(`2. Check on Arc explorer:`);
console.log(
  `   ${colors.green}https://explorer.circle.com/arc-testnet/address/${deployerAddress}${colors.reset}\n`
);
console.log(`3. Mark Task 1.3 as complete in tasks.md\n`);
console.log(`4. Move to Task 1.4: Database Schema Implementation\n`);

console.log(
  `${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`
);

console.log(`${colors.yellow}💡 Quick Link:${colors.reset}`);
console.log(`   Open faucet: xdg-open "https://faucet.circle.com/"\n`);
