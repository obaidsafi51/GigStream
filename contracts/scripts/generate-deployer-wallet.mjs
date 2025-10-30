#!/usr/bin/env node

/**
 * Generate Deployer Wallet
 * Creates a new Ethereum wallet for deploying smart contracts
 */

import { Wallet } from "ethers";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

console.log(
  `\n${colors.cyan}=== Generate Deployer Wallet ===${colors.reset}\n`
);

// Check if deployer key already exists
const existingKey = process.env.DEPLOYER_PRIVATE_KEY;
if (existingKey && existingKey.length > 0) {
  console.log(
    `${colors.yellow}⚠${colors.reset} Deployer private key already exists in .env`
  );
  console.log(
    `\nExisting deployer address: ${new Wallet(existingKey).address}`
  );
  console.log(
    "\nIf you want to generate a new one, remove DEPLOYER_PRIVATE_KEY from .env first.\n"
  );
  process.exit(0);
}

// Generate new wallet
console.log("Generating new wallet...\n");
const wallet = Wallet.createRandom();

console.log(`${colors.green}✓ Wallet generated successfully!${colors.reset}\n`);
console.log(`${colors.cyan}Wallet Details:${colors.reset}`);
console.log(`  Address:     ${wallet.address}`);
console.log(`  Private Key: ${wallet.privateKey}`);
console.log(`  Mnemonic:    ${wallet.mnemonic.phrase}\n`);

console.log(`${colors.yellow}⚠️  SECURITY WARNING:${colors.reset}`);
console.log("  • This is a TEST wallet for development only");
console.log("  • Do NOT use this wallet for real funds");
console.log("  • Save the mnemonic phrase securely\n");

// Update .env file
console.log("Updating .env file...");
const envContent = fs.readFileSync(envPath, "utf-8");
const updatedContent = envContent.replace(
  /DEPLOYER_PRIVATE_KEY=.*/,
  `DEPLOYER_PRIVATE_KEY=${wallet.privateKey}`
);

fs.writeFileSync(envPath, updatedContent);
console.log(`${colors.green}✓ .env file updated${colors.reset}\n`);

console.log(`${colors.cyan}Next Steps:${colors.reset}`);
console.log(`  1. Request testnet ETH for gas fees:`);
console.log(`     https://faucet.circle.com/arc-testnet`);
console.log(`     Address: ${wallet.address}`);
console.log(`  2. Test Arc connection:`);
console.log(`     node contracts/scripts/test-arc-connection.mjs`);
console.log(`  3. Deploy contracts (Task 2.4)\n`);

console.log(`${colors.yellow}⚠️  Save this mnemonic phrase:${colors.reset}`);
console.log(`${colors.green}${wallet.mnemonic.phrase}${colors.reset}\n`);
