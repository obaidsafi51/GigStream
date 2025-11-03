/**
 * FULL Test script for blockchain service (INCLUDING GAS-REQUIRING TESTS)
 * Tests all smart contract interactions WITH LIVE TRANSACTIONS
 *
 * ⚠️  WARNING: This script WILL SPEND GAS on Arc testnet
 *
 * Prerequisites:
 * 1. BACKEND_PRIVATE_KEY set in .env
 * 2. Backend wallet has Arc testnet gas
 * 3. Backend wallet has testnet USDC for stream creation
 * 4. Backend is authorized as recorder/approver on contracts
 *
 * Usage: node backend/test-blockchain-full.mjs
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, "../.env") });

// Import blockchain service
const blockchainModule = await import("./src/services/blockchain.ts");
const {
  createPaymentStream,
  releaseStreamPayment,
  pauseStream,
  resumeStream,
  cancelStream,
  getStream,
  getWorkerStreams,
  getPlatformStreams,
  recordTaskCompletion,
  recordDispute,
  getReputation,
  requestLoan,
  approveLoan,
  repayLoan,
  getLoan,
  getActiveLoan,
  usdcToWei,
  weiToUsdc,
  getCurrentBlock,
  CONTRACT_ADDRESSES,
} = blockchainModule;

// Test configuration
const WORKER_ADDRESS =
  process.env.TEST_WORKER_ADDRESS ||
  process.env.DEPLOYER_ADDRESS ||
  "0xA8b28f81726cBF47379669163a9DBE64626D6D43";
const PLATFORM_ADDRESS =
  process.env.DEPLOYER_ADDRESS || "0xA8b28f81726cBF47379669163a9DBE64626D6D43";

console.log("🧪 FULL BLOCKCHAIN SERVICE TEST (WITH GAS)");
console.log("=".repeat(60));
console.log("⚠️  WARNING: This will spend gas on Arc testnet!");
console.log("=".repeat(60));
console.log("\n📋 Configuration:");
console.log("   Worker Address:", WORKER_ADDRESS);
console.log("   Platform Address:", PLATFORM_ADDRESS);
console.log("\n📦 Contract Addresses:");
console.log("   PaymentStreaming:", CONTRACT_ADDRESSES.paymentStreaming);
console.log("   ReputationLedger:", CONTRACT_ADDRESSES.reputationLedger);
console.log("   MicroLoan:", CONTRACT_ADDRESSES.microLoan);
console.log("   USDC Token:", CONTRACT_ADDRESSES.usdcToken);
console.log("\n" + "=".repeat(60));

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
};

function logTest(name, status, details = "") {
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⏭️ ";
  console.log(`${icon} ${name}`);
  if (details) {
    console.log(`   ${details}`);
  }

  if (status === "PASS") results.passed++;
  else if (status === "FAIL") results.failed++;
  else results.skipped++;
}

async function runTests() {
  let createdStreamId = null;
  let createdLoanId = null;

  console.log("\n🔧 Test 1: Check Wallet Balance");
  console.log("-".repeat(60));

  try {
    const provider = new ethers.JsonRpcProvider(
      process.env.ARC_RPC_URL || "https://rpc.testnet.arc.network"
    );
    const balance = await provider.getBalance(PLATFORM_ADDRESS);
    logTest(
      "Check gas balance",
      "PASS",
      `Balance: ${ethers.formatEther(balance)} ETH`
    );

    if (balance === 0n) {
      console.log("⚠️  WARNING: No gas in wallet! Tests will fail.");
      console.log("   Get testnet gas first before continuing.");
    }
  } catch (error) {
    logTest("Check gas balance", "FAIL", error.message);
  }

  console.log("\n🔧 Test 2: Record Task Completion (LIVE TRANSACTION)");
  console.log("-".repeat(60));

  try {
    console.log("⚠️  This will spend ~50k gas (~$0.008 USDC)");
    console.log("   Recording task for worker:", WORKER_ADDRESS);

    const txHash = await recordTaskCompletion({
      workerAddress: WORKER_ADDRESS,
      taskId: BigInt(Math.floor(Math.random() * 1000000)), // Random task ID
      onTime: true,
      rating: 5,
    });

    logTest("Record task completion", "PASS", `Transaction: ${txHash}`);

    // Query updated reputation
    console.log("\n   Querying updated reputation...");
    const rep = await getReputation(WORKER_ADDRESS);
    console.log(`   New Score: ${rep.score}`);
    console.log(`   Total Tasks: ${rep.totalTasks}`);
    console.log(`   Completed On-Time: ${rep.completedOnTime}`);
  } catch (error) {
    if (error.message.includes("Not authorized")) {
      logTest(
        "Record task completion",
        "SKIP",
        "Backend not authorized as recorder (expected)"
      );
      console.log(
        '   To authorize: cast send $REPUTATION_LEDGER_ADDRESS "addAuthorizedRecorder(address)" $BACKEND_ADDRESS --private-key $DEPLOYER_PRIVATE_KEY --rpc-url $ARC_RPC_URL'
      );
    } else {
      logTest("Record task completion", "FAIL", error.message);
    }
  }

  console.log("\n🔧 Test 3: Create Payment Stream (LIVE TRANSACTION)");
  console.log("-".repeat(60));

  try {
    console.log("⚠️  This will spend ~400k gas (~$0.066 USDC)");
    console.log("   Creating stream: 10 USDC over 7 days, release every 24h");

    const result = await createPaymentStream({
      workerAddress: WORKER_ADDRESS,
      platformAddress: PLATFORM_ADDRESS,
      totalAmount: usdcToWei(10), // 10 USDC
      duration: 7 * 24 * 60 * 60, // 7 days
      releaseInterval: 24 * 60 * 60, // 24 hours
    });

    createdStreamId = result.streamId;

    logTest(
      "Create payment stream",
      "PASS",
      `Stream ID: ${result.streamId}, Gas: ${result.gasUsed.toString()}`
    );

    // Query stream details
    console.log("\n   Querying stream details...");
    const stream = await getStream(result.streamId);
    console.log(`   Worker: ${stream.worker}`);
    console.log(`   Total Amount: ${weiToUsdc(stream.totalAmount)} USDC`);
    console.log(
      `   Status: ${
        ["Active", "Paused", "Completed", "Cancelled"][stream.status]
      }`
    );
  } catch (error) {
    if (
      error.message.includes("Transfer failed") ||
      error.message.includes("insufficient")
    ) {
      logTest(
        "Create payment stream",
        "SKIP",
        "Insufficient USDC balance (expected)"
      );
      console.log("   To fund: Get testnet USDC from faucet first");
    } else {
      logTest("Create payment stream", "FAIL", error.message);
    }
  }

  console.log("\n🔧 Test 4: Release Payment (LIVE TRANSACTION)");
  console.log("-".repeat(60));

  if (createdStreamId) {
    try {
      console.log("⚠️  This will spend ~30k gas (~$0.005 USDC)");
      console.log(`   Releasing payment for stream ${createdStreamId}`);

      const result = await releaseStreamPayment(createdStreamId);
      logTest(
        "Release stream payment",
        "PASS",
        `Transaction: ${
          result.transactionHash
        }, Gas: ${result.gasUsed.toString()}`
      );
    } catch (error) {
      if (error.message.includes("Too soon to release")) {
        logTest(
          "Release stream payment",
          "SKIP",
          "Release interval not elapsed yet (expected)"
        );
      } else {
        logTest("Release stream payment", "FAIL", error.message);
      }
    }
  } else {
    logTest(
      "Release stream payment",
      "SKIP",
      "No stream created in previous test"
    );
  }

  console.log("\n🔧 Test 5: Pause Stream (LIVE TRANSACTION)");
  console.log("-".repeat(60));

  if (createdStreamId) {
    try {
      console.log("⚠️  This will spend ~25k gas (~$0.004 USDC)");
      console.log(`   Pausing stream ${createdStreamId}`);

      const txHash = await pauseStream(createdStreamId);
      logTest("Pause stream", "PASS", `Transaction: ${txHash}`);

      // Query stream status
      const stream = await getStream(createdStreamId);
      console.log(
        `   New Status: ${
          ["Active", "Paused", "Completed", "Cancelled"][stream.status]
        }`
      );
    } catch (error) {
      logTest("Pause stream", "FAIL", error.message);
    }
  } else {
    logTest("Pause stream", "SKIP", "No stream created in previous test");
  }

  console.log("\n🔧 Test 6: Resume Stream (LIVE TRANSACTION)");
  console.log("-".repeat(60));

  if (createdStreamId) {
    try {
      console.log("⚠️  This will spend ~25k gas (~$0.004 USDC)");
      console.log(`   Resuming stream ${createdStreamId}`);

      const txHash = await resumeStream(createdStreamId);
      logTest("Resume stream", "PASS", `Transaction: ${txHash}`);
    } catch (error) {
      logTest("Resume stream", "FAIL", error.message);
    }
  } else {
    logTest("Resume stream", "SKIP", "No stream created in previous test");
  }

  console.log("\n🔧 Test 7: Request Loan (LIVE TRANSACTION)");
  console.log("-".repeat(60));

  try {
    console.log("⚠️  This will spend ~170k gas (~$0.028 USDC)");
    console.log("   Requesting 50 USDC loan");

    const result = await requestLoan({
      workerAddress: WORKER_ADDRESS,
      amount: usdcToWei(50),
    });

    createdLoanId = result.loanId;

    logTest(
      "Request loan",
      "PASS",
      `Loan ID: ${result.loanId}, Gas: ${result.gasUsed.toString()}`
    );

    // Query loan details
    console.log("\n   Querying loan details...");
    const loan = await getLoan(result.loanId);
    console.log(`   Requested: ${weiToUsdc(loan.requestedAmount)} USDC`);
    console.log(
      `   Status: ${
        [
          "Pending",
          "Approved",
          "Disbursed",
          "Repaying",
          "Repaid",
          "Defaulted",
          "Cancelled",
        ][loan.status]
      }`
    );
  } catch (error) {
    if (
      error.message.includes("Reputation too low") ||
      error.message.includes("score")
    ) {
      logTest(
        "Request loan",
        "SKIP",
        "Insufficient reputation score (< 600) - expected for new worker"
      );
      console.log("   To qualify: Complete more tasks to increase reputation");
    } else if (error.message.includes("Active loan exists")) {
      logTest("Request loan", "SKIP", "Worker already has an active loan");
    } else {
      logTest("Request loan", "FAIL", error.message);
    }
  }

  console.log("\n🔧 Test 8: Approve Loan (LIVE TRANSACTION)");
  console.log("-".repeat(60));

  if (createdLoanId) {
    try {
      console.log("⚠️  This will spend ~234k gas (~$0.039 USDC)");
      console.log(`   Approving loan ${createdLoanId} with 3% fee`);

      const txHash = await approveLoan(
        createdLoanId,
        usdcToWei(45), // Approve 45 USDC (less than 50 requested)
        300 // 3% fee
      );

      logTest("Approve loan", "PASS", `Transaction: ${txHash}`);
    } catch (error) {
      if (error.message.includes("Not authorized")) {
        logTest(
          "Approve loan",
          "SKIP",
          "Backend not authorized as approver (expected)"
        );
        console.log(
          '   To authorize: cast send $MICRO_LOAN_ADDRESS "addAuthorizedApprover(address)" $BACKEND_ADDRESS --private-key $DEPLOYER_PRIVATE_KEY --rpc-url $ARC_RPC_URL'
        );
      } else {
        logTest("Approve loan", "FAIL", error.message);
      }
    }
  } else {
    logTest("Approve loan", "SKIP", "No loan created in previous test");
  }

  console.log("\n🔧 Test 9: Get Current Block");
  console.log("-".repeat(60));

  try {
    const blockNumber = await getCurrentBlock();
    logTest("Get current block", "PASS", `Block: ${blockNumber}`);
  } catch (error) {
    logTest("Get current block", "FAIL", error.message);
  }
}

async function main() {
  try {
    // Safety confirmation
    console.log("\n⚠️  SAFETY CONFIRMATION");
    console.log("This test will execute REAL transactions on Arc testnet.");
    console.log("Estimated gas cost: ~$0.15-0.20 USDC");
    console.log("\nPress Ctrl+C within 5 seconds to cancel...\n");

    await new Promise((resolve) => setTimeout(resolve, 5000));

    await runTests();

    console.log("\n" + "=".repeat(60));
    console.log("📊 Test Summary:");
    console.log(`   ✅ Passed: ${results.passed}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   ⏭️  Skipped: ${results.skipped}`);
    console.log(
      `   📈 Total: ${results.passed + results.failed + results.skipped}`
    );
    console.log("=".repeat(60));

    if (results.failed > 0) {
      console.log(
        "\n❌ Some tests failed. Check the output above for details."
      );
      process.exit(1);
    } else {
      console.log("\n✅ All executed tests passed!");
      if (results.skipped > 0) {
        console.log("   Note: Some tests were skipped due to prerequisites.");
      }
      process.exit(0);
    }
  } catch (error) {
    console.error("\n❌ Fatal error during testing:", error);
    process.exit(1);
  }
}

main();
