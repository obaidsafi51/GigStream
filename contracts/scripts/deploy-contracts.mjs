#!/usr/bin/env node

/**
 * Deploy Smart Contracts to Arc Testnet
 *
 * This script deploys PaymentStreaming and ReputationLedger contracts
 * to Arc testnet using Foundry (forge).
 *
 * Prerequisites:
 * 1. Foundry installed (forge, cast)
 * 2. DEPLOYER_PRIVATE_KEY in .env
 * 3. ARC_RPC_URL configured
 * 4. Deployer wallet funded with testnet USDC for gas (Arc uses USDC as native token)
 * 5. USDC token address for Arc testnet
 *
 * Run: node contracts/scripts/deploy-contracts.mjs
 */

import { exec } from "child_process";
import { promisify } from "util";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";
import { ethers } from "ethers";

const execAsync = promisify(exec);

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "../..");
const envPath = resolve(rootDir, ".env");
dotenv.config({ path: envPath });

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

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

// Arc Testnet USDC token address (this is the official USDC on Arc testnet)
const ARC_TESTNET_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

async function checkPrerequisites() {
  log("\n=== Checking Prerequisites ===", "cyan");

  // Check Foundry installation
  try {
    const { stdout } = await execAsync("forge --version");
    logSuccess(`Foundry installed: ${stdout.trim().split("\n")[0]}`);
  } catch (error) {
    logError("Foundry not installed or not in PATH");
    logInfo(
      "Install Foundry: https://book.getfoundry.sh/getting-started/installation"
    );
    process.exit(1);
  }

  // Check environment variables
  const requiredVars = ["DEPLOYER_PRIVATE_KEY", "ARC_RPC_URL"];
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    logError(`Missing environment variables: ${missingVars.join(", ")}`);
    logInfo("Copy .env.example to .env and fill in the values");
    process.exit(1);
  }

  logSuccess("All required environment variables present");

  // Check deployer wallet balance
  const rpcUrl = process.env.ARC_RPC_URL;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);

    log(`\nDeployer Address: ${wallet.address}`, "cyan");
    log(`Balance: ${ethers.formatEther(balance)} USDC (Arc native token)`, "cyan");

    if (balance === 0n) {
      logWarning("Deployer wallet has ZERO balance!");
      logInfo("Get testnet USDC from: https://faucet.circle.com/arc-testnet");
      logWarning("Deployment will likely fail without gas funds (Arc uses USDC for gas)");

      // Ask user to confirm
      const readline = await import("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise((resolve) => {
        rl.question("\nContinue anyway? (y/N): ", resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== "y") {
        log("\nDeployment cancelled", "yellow");
        process.exit(0);
      }
    } else {
      logSuccess("Deployer wallet has sufficient balance");
    }
  } catch (error) {
    logError("Failed to check deployer balance");
    console.error(error.message);
    process.exit(1);
  }
}

async function buildContracts() {
  log("\n=== Building Contracts ===", "cyan");

  try {
    logInfo("Running forge build...");
    const { stdout } = await execAsync("forge build", {
      cwd: resolve(rootDir, "contracts"),
    });

    logSuccess("Contracts compiled successfully");
    if (stdout.trim()) {
      console.log(stdout);
    }
  } catch (error) {
    logError("Contract compilation failed");
    console.error(error.stdout || error.message);
    process.exit(1);
  }
}

async function deployContract(contractName, constructorArgs = []) {
  log(`\n=== Deploying ${contractName} ===`, "magenta");

  const rpcUrl = process.env.ARC_RPC_URL;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  // Build forge create command
  const args =
    constructorArgs.length > 0
      ? `--constructor-args ${constructorArgs.join(" ")}`
      : "";
  const command = `forge create --rpc-url ${rpcUrl} --private-key ${privateKey} ${args} src/${contractName}.sol:${contractName}`;

  try {
    logInfo(`Deploying ${contractName}...`);
    const { stdout, stderr } = await execAsync(command, {
      cwd: resolve(rootDir, "contracts"),
    });

    // Parse deployment output
    const output = stdout + stderr;
    const addressMatch = output.match(/Deployed to: (0x[a-fA-F0-9]{40})/);
    const txHashMatch = output.match(/Transaction hash: (0x[a-fA-F0-9]{64})/);

    if (!addressMatch) {
      throw new Error("Could not parse contract address from output");
    }

    const contractAddress = addressMatch[1];
    const txHash = txHashMatch ? txHashMatch[1] : "N/A";

    logSuccess(`${contractName} deployed!`);
    log(`  Address: ${contractAddress}`, "green");
    log(`  Tx Hash: ${txHash}`, "green");

    return {
      address: contractAddress,
      txHash: txHash,
    };
  } catch (error) {
    logError(`Failed to deploy ${contractName}`);
    console.error(error.stdout || error.message);
    throw error;
  }
}

async function verifyContract(
  contractAddress,
  contractName,
  constructorArgs = []
) {
  log(`\n=== Verifying ${contractName} ===`, "magenta");

  const rpcUrl = process.env.ARC_RPC_URL;

  // Note: Contract verification on Arc testnet might not be available yet
  // This is a placeholder for when it becomes available
  logWarning("Contract verification on Arc testnet may not be available yet");
  logInfo(`Contract Address: ${contractAddress}`);
  logInfo(
    `View on Explorer: https://explorer.testnet.arc.network/address/${contractAddress}`
  );

  // Uncomment when verification is available:
  /*
  try {
    const args = constructorArgs.length > 0 ? `--constructor-args ${constructorArgs.join(" ")}` : "";
    const command = `forge verify-contract --rpc-url ${rpcUrl} ${contractAddress} src/${contractName}.sol:${contractName} ${args}`;
    
    logInfo(`Verifying ${contractName}...`);
    const { stdout } = await execAsync(command, {
      cwd: resolve(rootDir, "contracts"),
    });
    
    logSuccess(`${contractName} verified!`);
  } catch (error) {
    logWarning(`Could not verify ${contractName}`);
    console.error(error.message);
  }
  */
}

async function saveDeploymentInfo(deployments) {
  log("\n=== Saving Deployment Info ===", "cyan");

  // Update .env file
  const envContent = fs.readFileSync(envPath, "utf-8");
  let updatedContent = envContent;

  // Update contract addresses
  updatedContent = updatedContent.replace(
    /CONTRACT_PAYMENT_STREAMING=.*/,
    `CONTRACT_PAYMENT_STREAMING=${deployments.PaymentStreaming.address}`
  );
  updatedContent = updatedContent.replace(
    /CONTRACT_REPUTATION_LEDGER=.*/,
    `CONTRACT_REPUTATION_LEDGER=${deployments.ReputationLedger.address}`
  );

  fs.writeFileSync(envPath, updatedContent);
  logSuccess(".env file updated with contract addresses");

  // Create deployment config file
  const configPath = resolve(rootDir, "contracts/deployments.json");
  const config = {
    network: "arc-testnet",
    chainId: process.env.ARC_CHAIN_ID || "5042002",
    timestamp: new Date().toISOString(),
    deployer: new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY).address,
    usdcToken: ARC_TESTNET_USDC,
    contracts: deployments,
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  logSuccess(`Deployment config saved to contracts/deployments.json`);

  // Create TypeScript config for frontend
  const tsConfigPath = resolve(rootDir, "frontend/lib/contracts.ts");
  const tsConfig = `// Auto-generated contract addresses from deployment
// DO NOT EDIT MANUALLY - Generated on ${new Date().toISOString()}

export const CONTRACTS = {
  PaymentStreaming: "${deployments.PaymentStreaming.address}",
  ReputationLedger: "${deployments.ReputationLedger.address}",
  USDCToken: "${ARC_TESTNET_USDC}",
} as const;

export const NETWORK = {
  chainId: ${process.env.ARC_CHAIN_ID || "5042002"},
  name: "Arc Testnet",
  rpcUrl: "${process.env.ARC_RPC_URL}",
  explorerUrl: "https://explorer.testnet.arc.network",
} as const;
`;

  const frontendLibDir = resolve(rootDir, "frontend/lib");
  if (!fs.existsSync(frontendLibDir)) {
    fs.mkdirSync(frontendLibDir, { recursive: true });
  }
  fs.writeFileSync(tsConfigPath, tsConfig);
  logSuccess("TypeScript config created for frontend");
}

async function main() {
  log("\n╔═══════════════════════════════════════════╗", "cyan");
  log("║  GigStream Smart Contract Deployment     ║", "cyan");
  log("║  Arc Testnet - Foundry Deploy Script     ║", "cyan");
  log("╚═══════════════════════════════════════════╝", "cyan");

  try {
    // Step 1: Check prerequisites
    await checkPrerequisites();

    // Step 2: Build contracts
    await buildContracts();

    // Step 3: Deploy contracts
    const deployments = {};

    // Deploy ReputationLedger (no constructor args)
    const reputationLedger = await deployContract("ReputationLedger");
    deployments.ReputationLedger = reputationLedger;

    // Deploy PaymentStreaming (requires USDC address)
    log(`\nUsing USDC Token Address: ${ARC_TESTNET_USDC}`, "yellow");
    const paymentStreaming = await deployContract("PaymentStreaming", [
      ARC_TESTNET_USDC,
    ]);
    deployments.PaymentStreaming = paymentStreaming;

    // Step 4: Verify contracts (optional)
    await verifyContract(reputationLedger.address, "ReputationLedger");
    await verifyContract(paymentStreaming.address, "PaymentStreaming", [
      ARC_TESTNET_USDC,
    ]);

    // Step 5: Save deployment info
    await saveDeploymentInfo(deployments);

    // Success summary
    log("\n╔═══════════════════════════════════════════╗", "green");
    log("║     ✓ Deployment Completed Successfully!  ║", "green");
    log("╚═══════════════════════════════════════════╝", "green");

    log("\n📋 Deployment Summary:", "cyan");
    log("─────────────────────────────────────────────", "cyan");
    log(`PaymentStreaming:  ${deployments.PaymentStreaming.address}`, "green");
    log(`ReputationLedger:  ${deployments.ReputationLedger.address}`, "green");
    log(`USDC Token:        ${ARC_TESTNET_USDC}`, "yellow");
    log("─────────────────────────────────────────────", "cyan");

    log("\n🔗 Explorer Links:", "cyan");
    log(
      `PaymentStreaming: https://explorer.testnet.arc.network/address/${deployments.PaymentStreaming.address}`,
      "blue"
    );
    log(
      `ReputationLedger: https://explorer.testnet.arc.network/address/${deployments.ReputationLedger.address}`,
      "blue"
    );

    log("\n📝 Next Steps:", "cyan");
    log("  1. Verify contracts on Arc Explorer (if available)", "reset");
    log("  2. Test contract interactions:", "reset");
    log("     node contracts/scripts/test-deployed-contracts.mjs", "yellow");
    log("  3. Move to Task 3.1: MicroLoan Contract Development", "reset");
    log("  4. Update backend to use deployed contract addresses", "reset");

    log("\n✨ Task 2.4 COMPLETED!", "green");
    log("", "reset");
  } catch (error) {
    log("\n╔═══════════════════════════════════════════╗", "red");
    log("║     ✗ Deployment Failed                   ║", "red");
    log("╚═══════════════════════════════════════════╝", "red");
    console.error(error);
    process.exit(1);
  }
}

// Run deployment
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
