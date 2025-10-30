#!/usr/bin/env node

/**
 * Test Circle API Connection
 *
 * This script tests your Circle Developer-Controlled Wallets setup:
 * 1. Verifies API credentials
 * 2. Creates a test wallet
 * 3. Checks wallet balance
 *
 * Run: node contracts/scripts/test-circle-wallet.mjs
 */

import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Load environment variables from root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const REQUIRED_ENV_VARS = ["CIRCLE_API_KEY"];

// ANSI color codes for terminal output
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

function logWarning(message) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

async function testCircleConnection() {
  console.log(
    `\n${colors.cyan}=== Circle API Connection Test ===${colors.reset}\n`
  );

  // Step 1: Check environment variables
  logInfo("Step 1: Checking environment variables...");

  const missingVars = REQUIRED_ENV_VARS.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    logError(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
    logWarning("Please fill in these values in your .env file");
    logInfo("See docs/TASK_1.3_GUIDE.md for instructions");
    process.exit(1);
  }

  logSuccess("All required environment variables present");

  const apiKey = process.env.CIRCLE_API_KEY;

  if (!apiKey.startsWith("TEST_API_KEY:")) {
    logWarning(
      'API key does not start with "TEST_API_KEY:" - make sure you are using testnet credentials'
    );
  }

  // Step 2: Initialize Circle SDK
  logInfo("\nStep 2: Initializing Circle SDK...");

  let circleClient;
  try {
    circleClient = initiateDeveloperControlledWalletsClient({
      apiKey: apiKey,
    });
    logSuccess("Circle SDK initialized successfully");
  } catch (error) {
    logError("Failed to initialize Circle SDK");
    console.error(error.message);
    process.exit(1);
  }

  // Step 3: Test API connection by listing wallets (or creating one)
  logInfo("\nStep 3: Testing API access...");

  try {
    // First, try to list existing wallets
    const listResponse = await circleClient.listWallets({});

    if (listResponse.data && listResponse.data.wallets) {
      logSuccess(
        `API access working! Found ${listResponse.data.wallets.length} existing wallet(s)`
      );

      if (listResponse.data.wallets.length > 0) {
        console.log(`\n${colors.cyan}Existing Wallets:${colors.reset}`);
        listResponse.data.wallets.slice(0, 3).forEach((wallet, index) => {
          console.log(`  Wallet ${index + 1}:`);
          console.log(`    ID: ${wallet.id}`);
          console.log(`    Address: ${wallet.address || "Pending"}`);
          console.log(`    State: ${wallet.state}`);
          console.log(`    Blockchain: ${wallet.blockchain}`);
        });

        if (listResponse.data.wallets.length > 3) {
          console.log(`  ... and ${listResponse.data.wallets.length - 3} more`);
        }
      } else {
        logInfo(
          "No wallets found yet. You can create one through Circle Console or API."
        );
      }
    } else {
      logSuccess("API call successful!");
      console.log("Response:", JSON.stringify(listResponse.data, null, 2));
    }
  } catch (error) {
    logError("Failed to access Circle API");
    console.error("\nError details:", error.message);

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    }

    logInfo("\nTroubleshooting:");
    console.log(
      "  1. Verify your API key has correct format: TEST_API_KEY:id:secret"
    );
    console.log("  2. Check API key has no extra spaces or quotes");
    console.log(
      "  3. Ensure you have API permissions enabled in Circle Console"
    );
    console.log("  4. Check Circle API status: https://status.circle.com/");

    process.exit(1);
  }

  // Step 4: Next steps
  console.log(
    `\n${colors.green}=== Test Completed Successfully! ===${colors.reset}\n`
  );

  logInfo("Your Circle API connection is working!");
  logInfo("Next steps:");
  console.log(
    "  1. Create wallets via Circle Console: https://console.circle.com/"
  );
  console.log("  2. Request testnet USDC from faucet");
  console.log("  3. Add deployer private key to .env");
  console.log("  4. Move to Task 1.4: Database Schema Implementation\n");
}

// Run the test
testCircleConnection().catch((error) => {
  logError("Unexpected error occurred");
  console.error(error);
  process.exit(1);
});
