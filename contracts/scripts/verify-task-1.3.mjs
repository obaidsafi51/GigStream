#!/usr/bin/env node

/**
 * Complete Task 1.3 Verification
 * Final check for all Task 1.3 requirements
 */

import { JsonRpcProvider, Wallet } from "ethers";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
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
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

async function verifyTask13() {
  console.log(`\n${colors.cyan}=== Task 1.3 Verification ===${colors.reset}\n`);

  let passed = 0;
  let failed = 0;

  // Check 1: Circle API Key
  console.log("1. Checking Circle API Key...");
  if (
    process.env.CIRCLE_API_KEY &&
    process.env.CIRCLE_API_KEY.startsWith("TEST_API_KEY:")
  ) {
    console.log(`   ${colors.green}✓${colors.reset} Circle API Key present`);
    passed++;
  } else {
    console.log(
      `   ${colors.red}✗${colors.reset} Circle API Key missing or invalid`
    );
    failed++;
  }

  // Check 2: Entity Secret
  console.log("2. Checking Entity Secret...");
  if (
    process.env.CIRCLE_ENTITY_SECRET &&
    process.env.CIRCLE_ENTITY_SECRET.length === 64
  ) {
    console.log(`   ${colors.green}✓${colors.reset} Entity Secret present`);
    passed++;
  } else {
    console.log(
      `   ${colors.red}✗${colors.reset} Entity Secret missing or invalid`
    );
    failed++;
  }

  // Check 3: Circle SDK
  console.log("3. Testing Circle API connection...");
  try {
    const circleClient = initiateDeveloperControlledWalletsClient({
      apiKey: process.env.CIRCLE_API_KEY,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET,
    });
    const response = await circleClient.listWallets({});
    const walletCount = response.data?.wallets?.length || 0;
    console.log(
      `   ${colors.green}✓${colors.reset} Circle API working (${walletCount} wallet(s) found)`
    );
    passed++;
  } catch (error) {
    console.log(
      `   ${colors.red}✗${colors.reset} Circle API error: ${error.message}`
    );
    failed++;
  }

  // Check 4: Deployer Private Key
  console.log("4. Checking Deployer Private Key...");
  if (process.env.DEPLOYER_PRIVATE_KEY) {
    try {
      const wallet = new Wallet(process.env.DEPLOYER_PRIVATE_KEY);
      console.log(
        `   ${colors.green}✓${colors.reset} Deployer wallet: ${wallet.address}`
      );
      passed++;
    } catch {
      console.log(
        `   ${colors.red}✗${colors.reset} Invalid deployer private key`
      );
      failed++;
    }
  } else {
    console.log(
      `   ${colors.red}✗${colors.reset} Deployer private key missing`
    );
    failed++;
  }

  // Check 5: Arc RPC Connection
  console.log("5. Testing Arc testnet connection...");
  try {
    const provider = new JsonRpcProvider(process.env.ARC_RPC_URL);
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    console.log(
      `   ${colors.green}✓${colors.reset} Arc testnet connected (chain ${network.chainId}, block ${blockNumber})`
    );
    passed++;
  } catch (error) {
    console.log(
      `   ${colors.red}✗${colors.reset} Arc RPC error: ${error.message}`
    );
    failed++;
  }

  // Check 6: Deployer Balance
  console.log("6. Checking deployer wallet balance...");
  try {
    const provider = new JsonRpcProvider(process.env.ARC_RPC_URL);
    const wallet = new Wallet(process.env.DEPLOYER_PRIVATE_KEY);
    const balance = await provider.getBalance(wallet.address);
    // Arc stores USDC with 18 decimals (EVM standard) even though docs say 6 decimals
    const balanceInUsdc = (Number(balance) / 1e18).toFixed(2);

    if (balance > 0n) {
      console.log(
        `   ${colors.green}✓${colors.reset} Deployer has ${balanceInUsdc} USDC for gas`
      );
      console.log(
        `      ${colors.blue}ℹ Arc uses USDC as native gas token (18 decimal storage)${colors.reset}`
      );
      passed++;
    } else {
      console.log(
        `   ${colors.yellow}⚠${colors.reset} Deployer has 0 USDC (need funds from faucet)`
      );
      console.log(`      Get from: https://faucet.circle.com/`);
      console.log(
        `      ${colors.yellow}⚠ Arc uses USDC as native gas!${colors.reset}`
      );
      failed++;
    }
  } catch (error) {
    console.log(
      `   ${colors.red}✗${colors.reset} Balance check error: ${error.message}`
    );
    failed++;
  }

  // Summary
  console.log(
    `\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`
  );
  console.log(
    `Results: ${colors.green}${passed} passed${colors.reset}, ${colors.red}${failed} failed${colors.reset}\n`
  );

  if (failed === 0) {
    console.log(`${colors.green}🎉 Task 1.3 is COMPLETE!${colors.reset}\n`);
    console.log(`${colors.cyan}Next Steps:${colors.reset}`);
    console.log(`  1. Mark Task 1.3 as complete in project/tasks.md`);
    console.log(`  2. Start Task 1.4: Database Schema Implementation`);
    console.log(`  3. Start Task 2.1: PaymentStreaming Contract Development\n`);
  } else {
    console.log(`${colors.yellow}⚠ Task 1.3 needs attention${colors.reset}\n`);
    console.log(`Please fix the failed items above.\n`);
  }
}

verifyTask13().catch(console.error);
