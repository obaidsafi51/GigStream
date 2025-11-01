#!/usr/bin/env node

/**
 * Update Deployment Configuration
 * 
 * This script parses Foundry deployment output and updates configuration files.
 * Run after: forge script script/Deploy.s.sol:DeployScript --rpc-url $ARC_RPC_URL --broadcast --legacy
 */

import fs from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "../..");

// Load environment
dotenv.config({ path: resolve(rootDir, ".env") });

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  log("\n╔════════════════════════════════════════════╗", "cyan");
  log("║   Update Deployment Configuration         ║", "cyan");
  log("╚════════════════════════════════════════════╝\n", "cyan");

  // Read broadcast file (latest run)
  const chainId = process.env.ARC_CHAIN_ID || "5042002";
  const broadcastDir = resolve(__dirname, `../broadcast/Deploy.s.sol/${chainId}`);
  
  if (!fs.existsSync(broadcastDir)) {
    log("✗ No deployment found!", "red");
    log("  Run deployment first:", "yellow");
    log("  forge script script/Deploy.s.sol:DeployScript --rpc-url $ARC_RPC_URL --broadcast --legacy", "yellow");
    process.exit(1);
  }

  // Find latest run file
  const files = fs.readdirSync(broadcastDir)
    .filter(f => f.startsWith("run-latest.json"))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    log("✗ No deployment run file found!", "red");
    process.exit(1);
  }

  const runFile = resolve(broadcastDir, files[0]);
  log(`Reading deployment from: ${runFile}`, "cyan");
  
  const deployment = JSON.parse(fs.readFileSync(runFile, "utf-8"));
  
  // Extract contract addresses
  const contracts = {};
  
  for (const tx of deployment.transactions) {
    if (tx.transactionType === "CREATE") {
      const contractName = tx.contractName;
      const contractAddress = tx.contractAddress;
      
      if (contractName === "ReputationLedger") {
        contracts.reputationLedger = contractAddress;
      } else if (contractName === "PaymentStreaming") {
        contracts.paymentStreaming = contractAddress;
      }
    }
  }
  
  if (!contracts.reputationLedger || !contracts.paymentStreaming) {
    log("✗ Could not find all contract addresses!", "red");
    console.log("Found:", contracts);
    process.exit(1);
  }
  
  log("\n✓ Contract addresses extracted:", "green");
  log(`  ReputationLedger: ${contracts.reputationLedger}`, "green");
  log(`  PaymentStreaming: ${contracts.paymentStreaming}`, "green");
  
  // Update .env file
  const envPath = resolve(rootDir, ".env");
  let envContent = fs.readFileSync(envPath, "utf-8");
  
  envContent = envContent.replace(
    /CONTRACT_PAYMENT_STREAMING=.*/,
    `CONTRACT_PAYMENT_STREAMING=${contracts.paymentStreaming}`
  );
  envContent = envContent.replace(
    /CONTRACT_REPUTATION_LEDGER=.*/,
    `CONTRACT_REPUTATION_LEDGER=${contracts.reputationLedger}`
  );
  
  fs.writeFileSync(envPath, envContent);
  log("\n✓ .env file updated", "green");
  
  // Create deployments.json
  const deploymentsConfig = {
    network: "arc-testnet",
    chainId: chainId,
    timestamp: new Date().toISOString(),
    deployer: deployment.transactions[0]?.transaction?.from || "unknown",
    usdcToken: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    contracts: {
      ReputationLedger: {
        address: contracts.reputationLedger,
        txHash: deployment.transactions.find(t => t.contractName === "ReputationLedger")?.hash || ""
      },
      PaymentStreaming: {
        address: contracts.paymentStreaming,
        txHash: deployment.transactions.find(t => t.contractName === "PaymentStreaming")?.hash || ""
      }
    }
  };
  
  const deploymentsPath = resolve(rootDir, "contracts/deployments.json");
  fs.writeFileSync(deploymentsPath, JSON.stringify(deploymentsConfig, null, 2));
  log("✓ deployments.json created", "green");
  
  // Create TypeScript config for frontend
  const tsConfig = `// Auto-generated contract addresses from deployment
// DO NOT EDIT MANUALLY - Generated on ${new Date().toISOString()}

export const CONTRACTS = {
  PaymentStreaming: "${contracts.paymentStreaming}",
  ReputationLedger: "${contracts.reputationLedger}",
  USDCToken: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
} as const;

export const NETWORK = {
  chainId: ${chainId},
  name: "Arc Testnet",
  rpcUrl: "${process.env.ARC_RPC_URL}",
  explorerUrl: "https://testnet.arcscan.app",
} as const;
`;
  
  const frontendLibDir = resolve(rootDir, "frontend/lib");
  if (!fs.existsSync(frontendLibDir)) {
    fs.mkdirSync(frontendLibDir, { recursive: true });
  }
  
  const tsConfigPath = resolve(frontendLibDir, "contracts.ts");
  fs.writeFileSync(tsConfigPath, tsConfig);
  log("✓ frontend/lib/contracts.ts created", "green");
  
  // Display summary
  log("\n╔════════════════════════════════════════════╗", "green");
  log("║   Deployment Configuration Updated         ║", "green");
  log("╚════════════════════════════════════════════╝", "green");
  
  log("\n📋 Deployment Summary:", "cyan");
  log("─────────────────────────────────────────────", "cyan");
  log(`PaymentStreaming:  ${contracts.paymentStreaming}`, "green");
  log(`ReputationLedger:  ${contracts.reputationLedger}`, "green");
  log(`USDC Token:        0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`, "yellow");
  log("─────────────────────────────────────────────", "cyan");
  
  log("\n🔗 Explorer Links:", "cyan");
  log(`PaymentStreaming: https://testnet.arcscan.app/address/${contracts.paymentStreaming}`, "cyan");
  log(`ReputationLedger: https://testnet.arcscan.app/address/${contracts.reputationLedger}`, "cyan");
  
  log("\n📝 Next Steps:", "cyan");
  log("  1. Test deployed contracts:", "reset");
  log("     node contracts/scripts/test-deployed-contracts.mjs", "yellow");
  log("  2. Update Task 2.4 status in tasks.md", "reset");
  log("  3. Move to Task 3.1: MicroLoan Contract Development", "reset");
  
  log("\n✨ Task 2.4 COMPLETED!", "green");
  log("", "reset");
}

main().catch(console.error);
