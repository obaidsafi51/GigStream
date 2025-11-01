#!/usr/bin/env node

/**
 * Create Circle Wallet via API
 *
 * This script creates a wallet using the Circle API
 *
 * Run: node contracts/scripts/create-circle-wallet.mjs
 */

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
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function logSuccess(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function logError(message) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

function logInfo(message) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

async function createWallet() {
  console.log(`\n${colors.cyan}=== Create Circle Wallet ===${colors.reset}\n`);

  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

  if (!apiKey) {
    logError("CIRCLE_API_KEY not found in .env");
    process.exit(1);
  }

  if (!entitySecret) {
    logError("CIRCLE_ENTITY_SECRET not found in .env");
    logInfo("Run: node contracts/scripts/register-entity-secret.mjs");
    process.exit(1);
  }

  try {
    logInfo("Initializing Circle SDK...");
    const circleClient = initiateDeveloperControlledWalletsClient({
      apiKey: apiKey,
      entitySecret: entitySecret,
    });
    logSuccess("Circle SDK initialized");

    logInfo("\nCreating wallet set...");
    const walletSetName = `gigstream-${Date.now()}`;

    const walletSetResponse = await circleClient.createWalletSet({
      name: walletSetName,
    });

    const walletSetId = walletSetResponse.data?.walletSet?.id;

    if (!walletSetId) {
      logError("Failed to create wallet set");
      console.log("Response:", JSON.stringify(walletSetResponse.data, null, 2));
      process.exit(1);
    }

    logSuccess(`Wallet set created: ${walletSetId}`);

    logInfo("\nCreating wallet...");
    const walletResponse = await circleClient.createWallets({
      accountType: "EOA",
      blockchains: ["ETH-SEPOLIA"], // Sepolia testnet
      count: 1,
      walletSetId: walletSetId,
    });

    if (
      walletResponse.data?.wallets &&
      walletResponse.data.wallets.length > 0
    ) {
      const wallet = walletResponse.data.wallets[0];

      console.log(
        `\n${colors.green}=== Wallet Created Successfully! ===${colors.reset}\n`
      );
      console.log(`${colors.cyan}Wallet Details:${colors.reset}`);
      console.log(`  ID: ${wallet.id}`);
      console.log(`  Address: ${wallet.address || "Generating..."}`);
      console.log(`  State: ${wallet.state}`);
      console.log(`  Blockchain: ${wallet.blockchain}`);
      console.log(`  Wallet Set: ${walletSetId}`);

      console.log(`\n${colors.cyan}Next Steps:${colors.reset}`);
      console.log("  1. Save this wallet address");
      console.log("  2. Request testnet USDC (Arc uses USDC as native token): https://faucet.circle.com/");
      console.log(
        "  3. Run verification: node contracts/scripts/test-circle-wallet.mjs\n"
      );
    } else {
      logError("Wallet creation failed");
      console.log("Response:", JSON.stringify(walletResponse.data, null, 2));
    }
  } catch (error) {
    logError("Failed to create wallet");
    console.error("\nError:", error.message);

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    }

    process.exit(1);
  }
}

createWallet();
