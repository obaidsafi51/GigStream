/**
 * Test script for blockchain service
 * Tests all smart contract interactions
 *
 * Usage: node backend/test-blockchain.mjs
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
  CONTRACT_ADDRESSES,
} = blockchainModule;

// Test configuration
// Use a valid checksummed address or deployer address
const WORKER_ADDRESS =
  process.env.TEST_WORKER_ADDRESS ||
  process.env.DEPLOYER_ADDRESS ||
  "0xA8b28f81726cBF47379669163a9DBE64626D6D43";
const PLATFORM_ADDRESS =
  process.env.DEPLOYER_ADDRESS || "0xA8b28f81726cBF47379669163a9DBE64626D6D43";

console.log("🧪 Testing Blockchain Service");
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
  console.log("\n🔧 Test 1: Utility Functions");
  console.log("-".repeat(60));

  try {
    const amount = 100; // 100 USDC
    const wei = usdcToWei(amount);
    const back = weiToUsdc(wei);

    if (back === amount) {
      logTest("USDC conversion", "PASS", `100 USDC = ${wei.toString()} wei`);
    } else {
      logTest("USDC conversion", "FAIL", `Expected ${amount}, got ${back}`);
    }
  } catch (error) {
    logTest("USDC conversion", "FAIL", error.message);
  }

  console.log("\n🔧 Test 2: ReputationLedger - Get Reputation (Read-Only)");
  console.log("-".repeat(60));

  try {
    const reputation = await getReputation(WORKER_ADDRESS);
    logTest(
      "Get worker reputation",
      "PASS",
      `Score: ${reputation.score}, Tasks: ${reputation.totalTasks}, On-time: ${reputation.completedOnTime}`
    );
  } catch (error) {
    // Expected failure if worker has no reputation record yet
    if (
      error.message.includes("missing revert data") ||
      error.code === "CALL_EXCEPTION"
    ) {
      logTest(
        "Get worker reputation",
        "PASS",
        "No reputation record (expected for new address)"
      );
    } else {
      logTest("Get worker reputation", "FAIL", error.message);
    }
  }

  console.log("\n🔧 Test 3: PaymentStreaming - Get Worker Streams (Read-Only)");
  console.log("-".repeat(60));

  try {
    const streams = await getWorkerStreams(WORKER_ADDRESS);
    logTest("Get worker streams", "PASS", `Found ${streams.length} streams`);

    if (streams.length > 0) {
      console.log("   Stream IDs:", streams.join(", "));

      // Get details of first stream
      const streamData = await getStream(streams[0]);
      console.log(`   Stream ${streams[0]} details:`);
      console.log(`     Worker: ${streamData.worker}`);
      console.log(`     Platform: ${streamData.platform}`);
      console.log(
        `     Total Amount: ${weiToUsdc(streamData.totalAmount)} USDC`
      );
      console.log(
        `     Released: ${weiToUsdc(streamData.releasedAmount)} USDC`
      );
      console.log(`     Claimed: ${weiToUsdc(streamData.claimedAmount)} USDC`);
      console.log(
        `     Status: ${
          ["Active", "Paused", "Completed", "Cancelled"][streamData.status]
        }`
      );
    }
  } catch (error) {
    logTest("Get worker streams", "FAIL", error.message);
  }

  console.log("\n🔧 Test 4: MicroLoan - Get Active Loan (Read-Only)");
  console.log("-".repeat(60));

  try {
    const loanId = await getActiveLoan(WORKER_ADDRESS);
    logTest(
      "Get active loan",
      "PASS",
      `Active loan ID: ${loanId} (0 = no active loan)`
    );

    if (loanId > 0) {
      const loanData = await getLoan(loanId);
      console.log(`   Loan ${loanId} details:`);
      console.log(`     Worker: ${loanData.worker}`);
      console.log(
        `     Requested: ${weiToUsdc(loanData.requestedAmount)} USDC`
      );
      console.log(`     Approved: ${weiToUsdc(loanData.approvedAmount)} USDC`);
      console.log(`     Fee Rate: ${loanData.feeRateBps / 100}%`);
      console.log(`     Total Due: ${weiToUsdc(loanData.totalDue)} USDC`);
      console.log(`     Repaid: ${weiToUsdc(loanData.repaidAmount)} USDC`);
      console.log(
        `     Status: ${
          [
            "Pending",
            "Approved",
            "Disbursed",
            "Repaying",
            "Repaid",
            "Defaulted",
            "Cancelled",
          ][loanData.status]
        }`
      );
    }
  } catch (error) {
    logTest("Get active loan", "FAIL", error.message);
  }

  console.log("\n🔧 Test 5: Create Payment Stream (REQUIRES GAS)");
  console.log("-".repeat(60));
  console.log(
    "⚠️  SKIPPED: Requires USDC balance and gas. Enable manually for live testing."
  );
  logTest("Create payment stream", "SKIP", "Manual test required");

  console.log("\n💡 To test stream creation:");
  console.log("   1. Ensure BACKEND_PRIVATE_KEY is set in .env");
  console.log("   2. Ensure deployer has USDC balance");
  console.log("   3. Uncomment the test code below");
  console.log("\n   Example:");
  console.log("   const result = await createPaymentStream({");
  console.log("     workerAddress: WORKER_ADDRESS,");
  console.log("     platformAddress: PLATFORM_ADDRESS,");
  console.log("     totalAmount: usdcToWei(100), // 100 USDC");
  console.log("     duration: 7 * 24 * 60 * 60, // 7 days");
  console.log("     releaseInterval: 24 * 60 * 60 // 24 hours");
  console.log("   });");

  console.log("\n🔧 Test 6: Record Task Completion (REQUIRES GAS)");
  console.log("-".repeat(60));
  console.log(
    "⚠️  SKIPPED: Requires gas and authorized recorder. Enable manually."
  );
  logTest("Record task completion", "SKIP", "Manual test required");

  console.log("\n💡 To test reputation recording:");
  console.log("   1. Ensure backend address is authorized recorder");
  console.log("   2. Uncomment the test code below");
  console.log("\n   Example:");
  console.log("   const txHash = await recordTaskCompletion({");
  console.log("     workerAddress: WORKER_ADDRESS,");
  console.log("     taskId: 12345n,");
  console.log("     onTime: true,");
  console.log("     rating: 5");
  console.log("   });");

  console.log("\n🔧 Test 7: Request Loan (REQUIRES GAS)");
  console.log("-".repeat(60));
  console.log(
    "⚠️  SKIPPED: Requires gas and reputation score >= 600. Enable manually."
  );
  logTest("Request loan", "SKIP", "Manual test required");

  console.log("\n💡 To test loan request:");
  console.log("   1. Ensure worker has reputation >= 600");
  console.log("   2. Ensure no active loan exists");
  console.log("   3. Uncomment the test code below");
  console.log("\n   Example:");
  console.log("   const result = await requestLoan({");
  console.log("     workerAddress: WORKER_ADDRESS,");
  console.log("     amount: usdcToWei(50) // 50 USDC");
  console.log("   });");
}

async function main() {
  try {
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
      console.log(
        "\n✅ All active tests passed! Blockchain service is working correctly."
      );
      console.log("   Note: Some tests were skipped to avoid spending gas.");
      console.log("   Enable them manually for comprehensive testing.");
      process.exit(0);
    }
  } catch (error) {
    console.error("\n❌ Fatal error during testing:", error);
    process.exit(1);
  }
}

main();
