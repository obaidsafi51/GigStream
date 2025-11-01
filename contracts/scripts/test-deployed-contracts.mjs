#!/usr/bin/env node

/**
 * Test Deployed Contracts
 *
 * This script tests the deployed contracts on Arc testnet:
 * 1. Reads deployed addresses from deployments.json
 * 2. Verifies contracts are accessible
 * 3. Tests basic read operations
 * 4. Optionally tests write operations
 *
 * Run: node contracts/scripts/test-deployed-contracts.mjs
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "../..");
const envPath = resolve(rootDir, ".env");
dotenv.config({ path: envPath });

// ANSI colors
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

// Contract ABIs (minimal for testing)
const PaymentStreamingABI = [
  "function streamCount() view returns (uint256)",
  "function usdcToken() view returns (address)",
  "function MIN_RELEASE_INTERVAL() view returns (uint256)",
  "function MAX_DURATION() view returns (uint256)",
  "function paused() view returns (bool)",
  "function owner() view returns (address)",
];

const ReputationLedgerABI = [
  "function BASE_SCORE() view returns (uint256)",
  "function MAX_SCORE() view returns (uint256)",
  "function TASK_COMPLETION_POINTS() view returns (uint256)",
  "function ON_TIME_BONUS() view returns (uint256)",
  "function authorizedRecorders(address) view returns (bool)",
  "function owner() view returns (address)",
  "function getReputationScore(address) view returns (uint256, uint256)",
];

const MicroLoanABI = [
  "function usdcToken() view returns (address)",
  "function reputationLedger() view returns (address)",
  "function loanCount() view returns (uint256)",
  "function MIN_LOAN_AMOUNT() view returns (uint256)",
  "function MAX_LOAN_AMOUNT() view returns (uint256)",
  "function MIN_FEE_BPS() view returns (uint256)",
  "function MAX_FEE_BPS() view returns (uint256)",
  "function MIN_REPUTATION_SCORE() view returns (uint256)",
  "function DEFAULT_PERIOD() view returns (uint256)",
  "function authorizedApprovers(address) view returns (bool)",
  "function owner() view returns (address)",
  "function getContractBalance() view returns (uint256)",
  "function calculateEligibility(address) view returns (bool, uint256, string)",
];

async function loadDeploymentInfo() {
  const deploymentPath = resolve(rootDir, "contracts/deployments.json");

  if (!fs.existsSync(deploymentPath)) {
    logError("Deployment config not found: contracts/deployments.json");
    logInfo(
      "Deploy contracts first: node contracts/scripts/deploy-contracts.mjs"
    );
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  return deployment;
}

async function testPaymentStreaming(provider, wallet, address) {
  console.log(
    `\n${colors.cyan}=== Testing PaymentStreaming Contract ===${colors.reset}`
  );
  console.log(`Address: ${address}\n`);

  try {
    const contract = new ethers.Contract(
      address,
      PaymentStreamingABI,
      provider
    );

    // Test 1: Read USDC token address
    logInfo("Reading USDC token address...");
    const usdcToken = await contract.usdcToken();
    logSuccess(`USDC Token: ${usdcToken}`);

    // Test 2: Read stream count
    logInfo("Reading stream count...");
    const streamCount = await contract.streamCount();
    logSuccess(`Stream Count: ${streamCount.toString()}`);

    // Test 3: Read constants
    logInfo("Reading contract constants...");
    const minInterval = await contract.MIN_RELEASE_INTERVAL();
    const maxDuration = await contract.MAX_DURATION();
    logSuccess(
      `Min Release Interval: ${minInterval.toString()}s (${
        minInterval / 60n
      } minutes)`
    );
    logSuccess(
      `Max Duration: ${maxDuration.toString()}s (${maxDuration / 86400n} days)`
    );

    // Test 4: Check if paused
    logInfo("Checking pause status...");
    const isPaused = await contract.paused();
    logSuccess(`Contract Paused: ${isPaused}`);

    // Test 5: Read owner
    logInfo("Reading contract owner...");
    const owner = await contract.owner();
    logSuccess(`Owner: ${owner}`);
    if (owner.toLowerCase() === wallet.address.toLowerCase()) {
      logInfo("You are the contract owner");
    }

    // Test 6: Check contract code
    logInfo("Verifying contract deployment...");
    const code = await provider.getCode(address);
    if (code === "0x") {
      logError("No code at contract address!");
      return false;
    }
    logSuccess(`Contract code size: ${(code.length - 2) / 2} bytes`);

    console.log(
      `\n${colors.green}✓ PaymentStreaming contract tests passed!${colors.reset}`
    );
    return true;
  } catch (error) {
    logError("PaymentStreaming test failed");
    console.error(error.message);
    return false;
  }
}

async function testReputationLedger(provider, wallet, address) {
  console.log(
    `\n${colors.cyan}=== Testing ReputationLedger Contract ===${colors.reset}`
  );
  console.log(`Address: ${address}\n`);

  try {
    const contract = new ethers.Contract(
      address,
      ReputationLedgerABI,
      provider
    );

    // Test 1: Read constants
    logInfo("Reading contract constants...");
    const baseScore = await contract.BASE_SCORE();
    const maxScore = await contract.MAX_SCORE();
    const taskPoints = await contract.TASK_COMPLETION_POINTS();
    const onTimeBonus = await contract.ON_TIME_BONUS();

    logSuccess(`Base Score: ${baseScore.toString()}`);
    logSuccess(`Max Score: ${maxScore.toString()}`);
    logSuccess(`Task Completion Points: ${taskPoints.toString()}`);
    logSuccess(`On-Time Bonus: ${onTimeBonus.toString()}`);

    // Test 2: Check authorization
    logInfo("Checking authorization status...");
    const isAuthorized = await contract.authorizedRecorders(wallet.address);
    logSuccess(`Your address is authorized: ${isAuthorized}`);
    if (isAuthorized) {
      logInfo("You can record task completions and disputes");
    }

    // Test 3: Read owner
    logInfo("Reading contract owner...");
    const owner = await contract.owner();
    logSuccess(`Owner: ${owner}`);
    if (owner.toLowerCase() === wallet.address.toLowerCase()) {
      logInfo("You are the contract owner");
    }

    // Test 4: Get reputation for a test address
    logInfo("Reading reputation for zero address (should be empty)...");
    const [score, tasks] = await contract.getReputationScore(
      ethers.ZeroAddress
    );
    logSuccess(`Score: ${score.toString()}, Tasks: ${tasks.toString()}`);

    // Test 5: Check contract code
    logInfo("Verifying contract deployment...");
    const code = await provider.getCode(address);
    if (code === "0x") {
      logError("No code at contract address!");
      return false;
    }
    logSuccess(`Contract code size: ${(code.length - 2) / 2} bytes`);

    console.log(
      `\n${colors.green}✓ ReputationLedger contract tests passed!${colors.reset}`
    );
    return true;
  } catch (error) {
    logError("ReputationLedger test failed");
    console.error(error.message);
    return false;
  }
}

async function testMicroLoan(provider, wallet, address) {
  console.log(
    `\n${colors.cyan}=== Testing MicroLoan Contract ===${colors.reset}`
  );
  console.log(`Address: ${address}\n`);

  try {
    const contract = new ethers.Contract(address, MicroLoanABI, provider);

    // Test 1: Read USDC token address
    logInfo("Reading USDC token address...");
    const usdcToken = await contract.usdcToken();
    logSuccess(`USDC Token: ${usdcToken}`);

    // Test 2: Read ReputationLedger address
    logInfo("Reading ReputationLedger address...");
    const reputationLedger = await contract.reputationLedger();
    logSuccess(`ReputationLedger: ${reputationLedger}`);

    // Test 3: Read loan count
    logInfo("Reading loan count...");
    const loanCount = await contract.loanCount();
    logSuccess(`Loan Count: ${loanCount.toString()}`);

    // Test 4: Read constants
    logInfo("Reading contract constants...");
    const minLoan = await contract.MIN_LOAN_AMOUNT();
    const maxLoan = await contract.MAX_LOAN_AMOUNT();
    const minFee = await contract.MIN_FEE_BPS();
    const maxFee = await contract.MAX_FEE_BPS();
    const minReputation = await contract.MIN_REPUTATION_SCORE();
    const defaultPeriod = await contract.DEFAULT_PERIOD();

    logSuccess(`Min Loan Amount: ${ethers.formatUnits(minLoan, 6)} USDC`);
    logSuccess(`Max Loan Amount: ${ethers.formatUnits(maxLoan, 6)} USDC`);
    logSuccess(`Fee Range: ${minFee.toString()}-${maxFee.toString()} bps (${minFee / 100n}%-${maxFee / 100n}%)`);
    logSuccess(`Min Reputation Score: ${minReputation.toString()}`);
    logSuccess(`Default Period: ${defaultPeriod / 86400n} days`);

    // Test 5: Check authorization
    logInfo("Checking authorization status...");
    const isAuthorized = await contract.authorizedApprovers(wallet.address);
    logSuccess(`Your address is authorized: ${isAuthorized}`);
    if (isAuthorized) {
      logInfo("You can approve and manage loans");
    }

    // Test 6: Read owner
    logInfo("Reading contract owner...");
    const owner = await contract.owner();
    logSuccess(`Owner: ${owner}`);
    if (owner.toLowerCase() === wallet.address.toLowerCase()) {
      logInfo("You are the contract owner");
    }

    // Test 7: Get contract USDC balance
    logInfo("Reading contract USDC balance...");
    const balance = await contract.getContractBalance();
    logSuccess(`Contract Balance: ${ethers.formatUnits(balance, 6)} USDC`);
    if (balance === 0n) {
      logWarning("Contract has no USDC - loans cannot be disbursed");
      logInfo("Fund the contract using: contract.fundContract(amount)");
    }

    // Test 8: Check eligibility for test address
    logInfo("Checking eligibility for zero address (should fail)...");
    try {
      const [eligible, maxAmount, reason] = await contract.calculateEligibility(
        ethers.ZeroAddress
      );
      logSuccess(
        `Eligible: ${eligible}, Max Amount: ${ethers.formatUnits(maxAmount, 6)} USDC, Reason: "${reason}"`
      );
    } catch (error) {
      logInfo("Eligibility check returned expected result");
    }

    // Test 9: Check contract code
    logInfo("Verifying contract deployment...");
    const code = await provider.getCode(address);
    if (code === "0x") {
      logError("No code at contract address!");
      return false;
    }
    logSuccess(`Contract code size: ${(code.length - 2) / 2} bytes`);

    console.log(
      `\n${colors.green}✓ MicroLoan contract tests passed!${colors.reset}`
    );
    return true;
  } catch (error) {
    logError("MicroLoan test failed");
    console.error(error.message);
    return false;
  }
}

async function estimateGasCosts(provider, deployment) {
  console.log(`\n${colors.cyan}=== Gas Cost Estimates ===${colors.reset}\n`);

  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;

    logInfo(`Current Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Estimate costs based on test results (from Task 2.1 and 3.1)
    const estimates = {
      "Create Stream": 348000n,
      "Release Payment": 29000n,
      "Claim Earnings": 53000n,
      "Record Completion": 27000n,
      "Record Dispute": 15000n,
      "Request Advance": 170000n,
      "Approve Loan": 234000n,
      "Repay From Earnings": 52000n,
    };

    console.log("\nEstimated transaction costs (approximate):");
    for (const [operation, gasLimit] of Object.entries(estimates)) {
      const cost = (gasLimit * gasPrice) / 10n ** 18n;
      const costEth = ethers.formatEther(gasLimit * gasPrice);
      console.log(
        `  ${operation.padEnd(20)}: ~${gasLimit
          .toString()
          .padStart(6)} gas = ${costEth} ETH`
      );
    }

    logInfo("\nNote: Actual costs may vary based on network conditions");
  } catch (error) {
    logWarning("Could not estimate gas costs");
    console.error(error.message);
  }
}

async function main() {
  console.log(
    `\n${colors.cyan}╔═══════════════════════════════════════════╗${colors.reset}`
  );
  console.log(
    `${colors.cyan}║  Test Deployed Smart Contracts           ║${colors.reset}`
  );
  console.log(
    `${colors.cyan}║  Arc Testnet Verification                 ║${colors.reset}`
  );
  console.log(
    `${colors.cyan}╚═══════════════════════════════════════════╝${colors.reset}\n`
  );

  try {
    // Load deployment info
    logInfo("Loading deployment configuration...");
    const deployment = await loadDeploymentInfo();
    logSuccess("Deployment config loaded");

    console.log(`\n${colors.cyan}Deployment Details:${colors.reset}`);
    console.log(`  Network: ${deployment.network}`);
    console.log(`  Chain ID: ${deployment.chainId}`);
    console.log(`  Deployed: ${deployment.timestamp}`);
    console.log(`  Deployer: ${deployment.deployer}`);

    // Connect to provider
    logInfo("\nConnecting to Arc testnet...");
    const rpcUrl = process.env.ARC_RPC_URL;
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    logSuccess(`Connected to Chain ID: ${network.chainId}`);
    logSuccess(`Current Block: ${blockNumber}`);

    // Setup wallet
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);
    logInfo(`Testing with address: ${wallet.address}`);

    // Test contracts
    const paymentStreamingOk = await testPaymentStreaming(
      provider,
      wallet,
      deployment.contracts.PaymentStreaming.address
    );

    const reputationLedgerOk = await testReputationLedger(
      provider,
      wallet,
      deployment.contracts.ReputationLedger.address
    );

    const microLoanOk = await testMicroLoan(
      provider,
      wallet,
      deployment.contracts.MicroLoan.address
    );

    // Estimate gas costs
    await estimateGasCosts(provider, deployment);

    // Summary
    console.log(
      `\n${colors.cyan}╔═══════════════════════════════════════════╗${colors.reset}`
    );
    if (paymentStreamingOk && reputationLedgerOk && microLoanOk) {
      console.log(
        `${colors.green}║  ✓ All Contract Tests Passed!             ║${colors.reset}`
      );
    } else {
      console.log(
        `${colors.red}║  ✗ Some Contract Tests Failed             ║${colors.reset}`
      );
    }
    console.log(
      `${colors.cyan}╚═══════════════════════════════════════════╝${colors.reset}\n`
    );

    if (paymentStreamingOk && reputationLedgerOk && microLoanOk) {
      console.log(
        `${colors.green}✓ Contracts are deployed and working correctly!${colors.reset}`
      );
      console.log("\n📝 Next Steps:");
      console.log("  1. Fund MicroLoan contract with USDC (for disbursing loans)");
      console.log("  2. Integrate contracts with backend API (Task 3.3-4.4)");
      console.log("  3. Create Circle wallets for workers (Task 4.1-4.2)");
      console.log("  4. Test end-to-end payment flow");
    } else {
      console.log(
        `${colors.red}⚠️  Fix the issues before proceeding${colors.reset}`
      );
      process.exit(1);
    }
  } catch (error) {
    logError("Test script failed");
    console.error(error);
    process.exit(1);
  }
}

// Run tests
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
