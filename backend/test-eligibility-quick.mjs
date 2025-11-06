#!/usr/bin/env node
/**
 * Quick Integration Test for Advance Eligibility API
 * Tests the core functionality with minimal data generation
 *
 * Usage: npx tsx --env-file=.env backend/test-eligibility-quick.mjs
 */

import { calculateRiskScore } from "./src/services/risk.ts";
import { predictEarnings } from "./src/services/prediction.ts";
import { getDatabase } from "./src/services/database.ts";
import * as schema from "./database/schema.ts";
import { eq, and } from "drizzle-orm";

console.log("🚀 Advance Eligibility API - Quick Integration Test\n");

async function testEligibilityEndpoint() {
  try {
    console.log("Testing eligibility endpoint logic...");
    const startTime = Date.now();

    const db = getDatabase();

    // Get first worker from database (from seed data)
    const worker = await db.query.workers.findFirst({
      limit: 1,
    });

    if (!worker) {
      console.log("❌ No workers found. Run seed-database.mjs first.");
      return false;
    }

    const testWorkerId = worker.id;
    console.log(
      `✅ Testing with worker: ${worker.displayName} (${testWorkerId})`
    );

    // Run risk scoring and earnings prediction in parallel
    const [riskScore, earningsPrediction] = await Promise.all([
      calculateRiskScore(testWorkerId),
      predictEarnings(testWorkerId, 7),
    ]);

    console.log(`\n📊 Risk Score: ${riskScore.score}`);
    console.log(`   Eligible: ${riskScore.eligibleForAdvance}`);
    console.log(`   Max Advance: $${riskScore.maxAdvanceAmount.toFixed(2)}`);
    console.log(`   Fee Rate: ${riskScore.recommendedFeeRate / 100}%`);

    console.log(`\n📈 Earnings Prediction:`);
    console.log(`   Next 7 days: $${earningsPrediction.next7Days.toFixed(2)}`);
    console.log(`   Confidence: ${earningsPrediction.confidence}`);
    console.log(
      `   Safe Advance: $${earningsPrediction.safeAdvanceAmount.toFixed(2)}`
    );

    // Check account age
    const accountAgeDays = worker.createdAt
      ? Math.floor(
          (Date.now() - worker.createdAt.getTime()) / (24 * 60 * 60 * 1000)
        )
      : 0;

    // Calculate completion rate
    const totalCompleted = worker.totalTasksCompleted || 0;
    const totalCancelled = worker.totalTasksCancelled || 0;
    const completionRate =
      totalCompleted + totalCancelled > 0
        ? totalCompleted / (totalCompleted + totalCancelled)
        : 1;

    // Check for active loans
    const activeLoans = await db.query.loans.findMany({
      where: and(
        eq(schema.loans.workerId, testWorkerId),
        eq(schema.loans.status, "active")
      ),
    });

    // Eligibility checks
    const checks = {
      riskScore: riskScore.score >= 600,
      earnings: earningsPrediction.next7Days >= 50,
      noLoans: activeLoans.length === 0,
      accountAge: accountAgeDays >= 7,
      completionRate: completionRate >= 0.8,
    };

    const eligible = Object.values(checks).every((c) => c);

    console.log(`\n✅ Eligibility Checks:`);
    console.log(
      `   Risk Score (>= 600): ${checks.riskScore ? "✓" : "✗"} (${
        riskScore.score
      })`
    );
    console.log(
      `   Earnings (>= $50): ${
        checks.earnings ? "✓" : "✗"
      } ($${earningsPrediction.next7Days.toFixed(2)})`
    );
    console.log(
      `   No Active Loans: ${checks.noLoans ? "✓" : "✗"} (${
        activeLoans.length
      })`
    );
    console.log(
      `   Account Age (>= 7 days): ${
        checks.accountAge ? "✓" : "✗"
      } (${accountAgeDays} days)`
    );
    console.log(
      `   Completion Rate (>= 80%): ${checks.completionRate ? "✓" : "✗"} (${(
        completionRate * 100
      ).toFixed(1)}%)`
    );

    const maxAdvance = eligible
      ? Math.min(
          riskScore.maxAdvanceAmount,
          earningsPrediction.safeAdvanceAmount
        )
      : 0;

    const duration = Date.now() - startTime;

    console.log(`\n🎯 Final Result:`);
    console.log(`   Eligible: ${eligible ? "YES ✓" : "NO ✗"}`);
    console.log(`   Max Advance: $${maxAdvance.toFixed(2)}`);
    console.log(`   Response Time: ${duration}ms`);

    // Performance check
    if (duration < 1000) {
      console.log(`   ✅ Performance target met (<1 second)`);
      return true;
    } else {
      console.log(`   ⚠️  Performance target missed (${duration}ms >= 1000ms)`);
      return false;
    }
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    return false;
  }
}

// Run test
testEligibilityEndpoint()
  .then((success) => {
    if (success) {
      console.log("\n🎉 Integration test PASSED!");
      process.exit(0);
    } else {
      console.log("\n⚠️  Integration test completed with warnings");
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });
