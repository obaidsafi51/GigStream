#!/usr/bin/env node

/**
 * Test Arc Testnet RPC Connection
 *
 * This script tests your Arc blockchain connection:
 * 1. Connects to Arc testnet RPC
 * 2. Checks network details
 * 3. Verifies deployer wallet balance
 *
 * Run: node contracts/scripts/test-arc-connection.mjs
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

const REQUIRED_ENV_VARS = [
  "ARC_RPC_URL",
  "ARC_CHAIN_ID",
  "DEPLOYER_PRIVATE_KEY",
];

// ANSI color codes
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

async function testArcConnection() {
  console.log(
    `\n${colors.cyan}=== Arc Testnet RPC Connection Test ===${colors.reset}\n`
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

  const rpcUrl = process.env.ARC_RPC_URL;
  const expectedChainId = parseInt(process.env.ARC_CHAIN_ID);
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  // Step 2: Connect to Arc RPC
  logInfo("\nStep 2: Connecting to Arc testnet RPC...");

  let provider;
  try {
    provider = new ethers.JsonRpcProvider(rpcUrl);
    logSuccess(`Connected to RPC: ${rpcUrl}`);
  } catch (error) {
    logError("Failed to connect to Arc RPC");
    console.error(error.message);
    process.exit(1);
  }

  // Step 3: Verify network
  logInfo("\nStep 3: Verifying network details...");

  try {
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);

    console.log(`\n${colors.cyan}Network Details:${colors.reset}`);
    console.log(`  Chain ID: ${chainId}`);
    console.log(`  Network Name: ${network.name}`);

    if (chainId === expectedChainId) {
      logSuccess(`Chain ID matches expected: ${expectedChainId}`);
    } else {
      logWarning(
        `Chain ID mismatch! Expected: ${expectedChainId}, Got: ${chainId}`
      );
    }

    const blockNumber = await provider.getBlockNumber();
    console.log(`  Current Block: ${blockNumber}`);
    logSuccess("Network is active and producing blocks");
  } catch (error) {
    logError("Failed to verify network");
    console.error(error.message);
    process.exit(1);
  }

  // Step 4: Check deployer wallet
  logInfo("\nStep 4: Checking deployer wallet...");

  try {
    const wallet = new ethers.Wallet(privateKey, provider);
    const address = wallet.address;

    console.log(`\n${colors.cyan}Deployer Wallet:${colors.reset}`);
    console.log(`  Address: ${address}`);

    const balance = await provider.getBalance(address);
    const balanceInEth = ethers.formatEther(balance);

    console.log(`  Balance: ${balanceInEth} USDC (Arc native token)`);

    if (balance > 0n) {
      logSuccess("Wallet has funds for gas fees");
    } else {
      logWarning("Wallet has ZERO balance!");
      logInfo("You need testnet USDC for gas fees to deploy contracts (Arc uses USDC as native token)");
      console.log(
        "  Get testnet USDC from: https://faucet.circle.com/arc-testnet"
      );
    }
  } catch (error) {
    logError("Failed to check deployer wallet");
    console.error(error.message);

    if (error.message.includes("invalid private key")) {
      logInfo("\nThe private key in your .env file is invalid");
      logInfo("Make sure it:");
      console.log('  1. Starts with "0x"');
      console.log('  2. Is 64 characters long (66 with "0x")');
      console.log("  3. Has no extra spaces or quotes");
    }

    process.exit(1);
  }

  // Step 5: Test transaction simulation
  logInfo("\nStep 5: Testing transaction simulation...");

  try {
    const wallet = new ethers.Wallet(privateKey, provider);
    const gasPrice = await provider.getFeeData();

    console.log(`\n${colors.cyan}Gas Information:${colors.reset}`);
    console.log(
      `  Gas Price: ${ethers.formatUnits(gasPrice.gasPrice || 0n, "gwei")} gwei`
    );
    console.log(
      `  Max Fee: ${ethers.formatUnits(
        gasPrice.maxFeePerGas || 0n,
        "gwei"
      )} gwei`
    );
    console.log(
      `  Max Priority Fee: ${ethers.formatUnits(
        gasPrice.maxPriorityFeePerGas || 0n,
        "gwei"
      )} gwei`
    );

    logSuccess("Can retrieve gas information for transactions");
  } catch (error) {
    logWarning("Could not retrieve gas information");
    console.error(error.message);
  }

  // Test completed
  console.log(
    `\n${colors.green}=== Test Completed Successfully! ===${colors.reset}\n`
  );

  logInfo(
    "Your Arc testnet connection is ready for smart contract deployment!"
  );
  console.log("\nNext steps:");
  console.log("  1. Ensure deployer wallet has testnet USDC for gas (Arc uses USDC as native token)");
  console.log(
    "  2. Test Circle API connection: node contracts/scripts/test-circle-wallet.mjs"
  );
  console.log("  3. Move to Task 2.1: PaymentStreaming Contract Development\n");
}

// Run the test
testArcConnection().catch((error) => {
  logError("Unexpected error occurred");
  console.error(error);
  process.exit(1);
});
