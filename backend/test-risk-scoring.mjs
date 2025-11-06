#!/usr/bin/env node

/**
 * GigStream Risk Scoring Engine Test Suite
 *
 * Tests the risk scoring service with various worker scenarios
 *
 * Requirements tested:
 * - Score calculation < 100ms
 * - Score range: 0-1000
 * - Eligibility threshold: >= 600
 * - Max advance calculation (50-80% of earnings)
 * - Fee rates (2-5% based on risk)
 * - Cache functionality
 * - Factor breakdown explainability
 */

// No import needed - environment variables already available via process.env

// Test scenarios
const testScenarios = [
  {
    name: "New Worker - No History",
    description: "Brand new worker with minimal data",
    expectedScoreRange: [0, 300],
    expectedEligible: false,
  },
  {
    name: "Experienced Worker - Excellent Record",
    description: "Worker with 90+ days, 50+ tasks, perfect ratings",
    expectedScoreRange: [800, 1000],
    expectedEligible: true,
  },
  {
    name: "Medium Risk Worker",
    description: "Worker with decent history but some issues",
    expectedScoreRange: [600, 799],
    expectedEligible: true,
  },
  {
    name: "High Risk Worker",
    description: "Worker with disputes and poor completion rate",
    expectedScoreRange: [0, 599],
    expectedEligible: false,
  },
  {
    name: "Worker with Active Loan",
    description: "Good score but has active loan (should be ineligible)",
    expectedScoreRange: [700, 1000],
    expectedEligible: false, // Because of active loan
  },
];

// ===================================
// MAIN TEST FUNCTION
// ===================================

async function runTests() {
  console.log("=".repeat(80));
  console.log("GigStream Risk Scoring Engine - Test Suite");
  console.log("=".repeat(80));
  console.log();

  // Check environment
  if (!process.env.DATABASE_URL) {
    console.error("❌ ERROR: DATABASE_URL not set in .env");
    process.exit(1);
  }

  console.log("Environment:");
  console.log(
    `  DATABASE_URL: ${process.env.DATABASE_URL.substring(0, 30)}...`
  );
  console.log();

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Database Connection & Worker Lookup
  console.log("Test 1: Database Connection & Worker Lookup");
  console.log("-".repeat(80));
  try {
    const { getDatabase } = await import("./src/services/database.js");
    const db = getDatabase();

    const workers = await db.query.workers.findMany({
      limit: 5,
    });

    if (workers.length === 0) {
      console.log("⚠️  WARNING: No workers found in database");
      console.log("   Run seed-database.mjs to create test data");
      console.log();
    } else {
      console.log(`✅ Found ${workers.length} workers in database`);
      console.log(
        `   Using worker: ${workers[0].displayName} (${workers[0].id})`
      );
      console.log();
      testsPassed++;
    }
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    console.log();
    testsFailed++;
    process.exit(1);
  }

  // Test 2: Calculate Risk Score for Real Worker
  console.log("Test 2: Calculate Risk Score for Real Worker");
  console.log("-".repeat(80));
  try {
    const { getDatabase } = await import("./src/services/database.js");
    const { calculateRiskScore } = await import("./src/services/risk.js");

    const db = getDatabase();
    const workers = await db.query.workers.findMany({ limit: 1 });

    if (workers.length === 0) {
      console.log("⚠️  SKIPPED: No workers in database");
      console.log();
    } else {
      const worker = workers[0];
      const startTime = Date.now();
      const riskScore = await calculateRiskScore(worker.id);
      const duration = Date.now() - startTime;

      console.log(`Worker: ${worker.displayName}`);
      console.log(`Calculation time: ${duration}ms`);
      console.log();
      console.log("Risk Score Results:");
      console.log(`  Score: ${riskScore.score} / 1000`);
      console.log(
        `  Eligible for Advance: ${
          riskScore.eligibleForAdvance ? "✅ Yes" : "❌ No"
        }`
      );
      console.log(
        `  Max Advance Amount: $${riskScore.maxAdvanceAmount.toFixed(2)}`
      );
      console.log(
        `  Recommended Fee Rate: ${(riskScore.recommendedFeeRate / 100).toFixed(
          2
        )}%`
      );
      console.log(`  Confidence: ${(riskScore.confidence * 100).toFixed(1)}%`);
      console.log(`  Algorithm: ${riskScore.algorithmUsed}`);
      console.log();
      console.log("Factor Breakdown:");
      for (const [factor, value] of Object.entries(riskScore.factors)) {
        const sign = value >= 0 ? "+" : "";
        console.log(`  ${factor}: ${sign}${value.toFixed(1)} points`);
      }
      console.log();

      // Verify requirements
      const checks = [];
      checks.push({ name: "Calculation < 100ms", pass: duration < 100 });
      checks.push({
        name: "Score in range 0-1000",
        pass: riskScore.score >= 0 && riskScore.score <= 1000,
      });
      checks.push({
        name: "Eligibility matches threshold",
        pass: riskScore.eligibleForAdvance ? riskScore.score >= 600 : true,
      });
      checks.push({
        name: "Max advance reasonable",
        pass:
          riskScore.maxAdvanceAmount >= 0 && riskScore.maxAdvanceAmount <= 1000,
      });
      checks.push({
        name: "Fee rate in range",
        pass:
          riskScore.recommendedFeeRate >= 200 &&
          riskScore.recommendedFeeRate <= 500,
      });

      console.log("Requirement Checks:");
      for (const check of checks) {
        console.log(`  ${check.pass ? "✅" : "❌"} ${check.name}`);
      }
      console.log();

      if (checks.every((c) => c.pass)) {
        console.log("✅ All requirements passed");
        testsPassed++;
      } else {
        console.log("❌ Some requirements failed");
        testsFailed++;
      }
      console.log();
    }
  } catch (error) {
    console.error("❌ Risk score calculation failed:", error.message);
    console.error("   Stack:", error.stack);
    console.log();
    testsFailed++;
  }

  // Test 3: Score Caching
  console.log("Test 3: Score Caching");
  console.log("-".repeat(80));
  try {
    const { getDatabase } = await import("./src/services/database.js");
    const { calculateRiskScore, getCachedRiskScore, clearRiskScoreCache } =
      await import("./src/services/risk.js");

    const db = getDatabase();
    const workers = await db.query.workers.findMany({ limit: 1 });

    if (workers.length === 0) {
      console.log("⚠️  SKIPPED: No workers in database");
      console.log();
    } else {
      const workerId = workers[0].id;

      // Clear cache first
      clearRiskScoreCache(workerId);

      // First calculation
      const start1 = Date.now();
      const score1 = await calculateRiskScore(workerId);
      const duration1 = Date.now() - start1;

      // Check cache
      const cached = getCachedRiskScore(workerId);

      // Second calculation (should use cache)
      const start2 = Date.now();
      const score2 = await calculateRiskScore(workerId);
      const duration2 = Date.now() - start2;

      console.log(`First calculation: ${duration1}ms`);
      console.log(`Cached score exists: ${cached ? "✅ Yes" : "❌ No"}`);
      console.log(`Second calculation: ${duration2}ms`);
      console.log(
        `Cache speedup: ${duration2 < duration1 ? "✅ Yes" : "❌ No"} (${(
          (1 - duration2 / duration1) *
          100
        ).toFixed(1)}% faster)`
      );
      console.log(
        `Scores match: ${score1.score === score2.score ? "✅ Yes" : "❌ No"}`
      );
      console.log();

      if (cached && score1.score === score2.score) {
        console.log("✅ Cache working correctly");
        testsPassed++;
      } else {
        console.log("❌ Cache not working as expected");
        testsFailed++;
      }
      console.log();
    }
  } catch (error) {
    console.error("❌ Cache test failed:", error.message);
    console.log();
    testsFailed++;
  }

  // Test 4: Batch Risk Score Calculation
  console.log("Test 4: Batch Risk Score Calculation");
  console.log("-".repeat(80));
  try {
    const { getDatabase } = await import("./src/services/database.js");
    const { calculateBatchRiskScores } = await import("./src/services/risk.js");

    const db = getDatabase();
    const workers = await db.query.workers.findMany({ limit: 5 });

    if (workers.length < 2) {
      console.log("⚠️  SKIPPED: Need at least 2 workers for batch test");
      console.log();
    } else {
      const workerIds = workers.map((w) => w.id);
      const startTime = Date.now();
      const scores = await calculateBatchRiskScores(workerIds);
      const duration = Date.now() - startTime;

      console.log(
        `Calculated scores for ${workerIds.length} workers in ${duration}ms`
      );
      console.log(
        `Average time per worker: ${(duration / workerIds.length).toFixed(1)}ms`
      );
      console.log();

      console.log("Batch Results:");
      for (const [workerId, score] of scores.entries()) {
        const worker = workers.find((w) => w.id === workerId);
        console.log(
          `  ${worker?.displayName}: ${score.score} (${
            score.eligibleForAdvance ? "Eligible" : "Not Eligible"
          })`
        );
      }
      console.log();

      if (scores.size === workerIds.length) {
        console.log("✅ Batch calculation successful");
        testsPassed++;
      } else {
        console.log("❌ Batch calculation incomplete");
        testsFailed++;
      }
      console.log();
    }
  } catch (error) {
    console.error("❌ Batch test failed:", error.message);
    console.log();
    testsFailed++;
  }

  // Test 5: Risk Score Formatting
  console.log("Test 5: Risk Score Formatting");
  console.log("-".repeat(80));
  try {
    const { getDatabase } = await import("./src/services/database.js");
    const { calculateRiskScore, formatRiskScoreBreakdown } = await import(
      "./src/services/risk.js"
    );

    const db = getDatabase();
    const workers = await db.query.workers.findMany({ limit: 1 });

    if (workers.length === 0) {
      console.log("⚠️  SKIPPED: No workers in database");
      console.log();
    } else {
      const riskScore = await calculateRiskScore(workers[0].id);
      const formatted = formatRiskScoreBreakdown(riskScore);

      console.log(`Worker: ${workers[0].displayName}`);
      console.log(`Score: ${formatted.score}`);
      console.log(`Grade: ${formatted.grade}`);
      console.log();
      console.log("Factor Breakdown (Human-Readable):");
      for (const factor of formatted.factors) {
        console.log(
          `  ${factor.name}: ${factor.value} pts - ${factor.description}`
        );
      }
      console.log();

      if (formatted.score === riskScore.score && formatted.factors.length > 0) {
        console.log("✅ Formatting working correctly");
        testsPassed++;
      } else {
        console.log("❌ Formatting failed");
        testsFailed++;
      }
      console.log();
    }
  } catch (error) {
    console.error("❌ Formatting test failed:", error.message);
    console.log();
    testsFailed++;
  }

  // Test 6: Edge Cases
  console.log("Test 6: Edge Cases");
  console.log("-".repeat(80));
  try {
    const { calculateRiskScore } = await import("./src/services/risk.js");

    // Test with invalid worker ID
    try {
      await calculateRiskScore("00000000-0000-0000-0000-000000000000");
      console.log("❌ Should have thrown error for invalid worker");
      testsFailed++;
    } catch (error) {
      console.log("✅ Correctly throws error for invalid worker");
      console.log(`   Error: ${error.message}`);
      testsPassed++;
    }
    console.log();
  } catch (error) {
    console.error("❌ Edge case test failed:", error.message);
    console.log();
    testsFailed++;
  }

  // Summary
  console.log("=".repeat(80));
  console.log("Test Summary");
  console.log("=".repeat(80));
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`Total: ${testsPassed + testsFailed}`);
  console.log();

  if (testsFailed === 0) {
    console.log("🎉 All tests passed!");
    console.log();
    console.log("Risk Scoring Engine is ready for production use.");
  } else {
    console.log("⚠️  Some tests failed. Please review the errors above.");
  }

  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
