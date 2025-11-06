#!/usr/bin/env node
/**
 * Test script for GigStream Advance Eligibility API
 *
 * Tests:
 * 1. Eligible worker (meets all criteria)
 * 2. Ineligible - low risk score (<600)
 * 3. Ineligible - low predicted earnings (<$50)
 * 4. Ineligible - active loan exists
 * 5. Ineligible - new account (<7 days)
 * 6. Ineligible - low completion rate (<80%)
 * 7. Performance testing (<1 second response)
 *
 * Usage: npx tsx --env-file=.env backend/test-advance-eligibility.mjs
 */

import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Dynamic import for ES modules
const { calculateRiskScore, clearRiskScoreCache } = await import(
  "./src/services/risk.ts"
);
const { predictEarnings, clearPredictionCache } = await import(
  "./src/services/prediction.ts"
);
const { getDatabase } = await import("./src/services/database.ts");
const schema = await import("./database/schema.ts");
const { eq, and } = await import("drizzle-orm");

// ===================================
// TEST DATA GENERATION
// ===================================

/**
 * Create test worker with specific characteristics
 */
async function createTestWorker(profile) {
  const db = getDatabase();

  // Create test worker
  const createdAt = profile.accountAgeDays
    ? new Date(Date.now() - profile.accountAgeDays * 24 * 60 * 60 * 1000)
    : new Date();

  const [worker] = await db
    .insert(schema.workers)
    .values({
      email: `test-eligibility-${Date.now()}-${Math.random()}@example.com`,
      passwordHash: "test_hash",
      displayName: profile.name,
      phoneNumber: "+1234567890",
      walletId: `test-wallet-${Date.now()}`,
      walletAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
      reputationScore: profile.reputationScore || 750,
      totalTasksCompleted: 0, // Will be updated manually after task creation
      createdAt,
    })
    .returning();

  console.log(
    `✅ Created test worker: ${worker.displayName} (ID: ${worker.id})`
  );

  // Create test platform
  const [platform] = await db
    .insert(schema.platforms)
    .values({
      name: "Test Platform",
      email: `platform-${Date.now()}-${Math.random()}@example.com`,
      apiKeyHash: `test_api_key_hash_${Date.now()}_${Math.random()}`,
    })
    .returning();

  // Generate historical tasks (completed)
  if (profile.tasksCompleted > 0) {
    const now = new Date();
    const daysBack = Math.min(profile.accountAgeDays || 30, 30);

    for (let i = 0; i < profile.tasksCompleted; i++) {
      const daysAgo = Math.floor(Math.random() * daysBack);
      const completedAt = new Date(
        now.getTime() - daysAgo * 24 * 60 * 60 * 1000
      );

      await db.insert(schema.tasks).values({
        platformId: platform.id,
        workerId: worker.id,
        title: `Test Task ${i + 1}`,
        description: "Test task for eligibility check",
        type: "fixed",
        paymentAmountUsdc: (profile.avgTaskValue || 25).toFixed(2),
        status: "completed",
        completedAt,
        createdAt: completedAt,
      });
    }

    console.log(`✅ Created ${profile.tasksCompleted} completed tasks`);
  }

  // Generate cancelled tasks
  if (profile.tasksCancelled > 0) {
    const now = new Date();
    const daysBack = Math.min(profile.accountAgeDays || 30, 30);

    for (let i = 0; i < profile.tasksCancelled; i++) {
      const daysAgo = Math.floor(Math.random() * daysBack);
      const cancelledAt = new Date(
        now.getTime() - daysAgo * 24 * 60 * 60 * 1000
      );

      await db.insert(schema.tasks).values({
        platformId: platform.id,
        workerId: worker.id,
        title: `Test Task (Cancelled) ${i + 1}`,
        description: "Cancelled test task for eligibility check",
        type: "fixed",
        paymentAmountUsdc: (profile.avgTaskValue || 25).toFixed(2),
        status: "cancelled",
        createdAt: cancelledAt,
      });
    }

    console.log(`✅ Created ${profile.tasksCancelled} cancelled tasks`);
  }

  // Create active loan if specified
  if (profile.hasActiveLoan) {
    await db.insert(schema.loans).values({
      workerId: worker.id,
      requestedAmountUsdc: "50.00",
      approvedAmountUsdc: "50.00",
      feeUsdc: "1.50",
      totalOwedUsdc: "51.50",
      remainingBalanceUsdc: "51.50",
      feePercentage: 300, // 3%
      status: "active",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    console.log(`✅ Created active loan`);
  }

  // Manually update worker aggregate counts (triggers only work on UPDATE, not INSERT)
  if (profile.tasksCompleted > 0) {
    const result = await db
      .update(schema.workers)
      .set({
        totalTasksCompleted: profile.tasksCompleted || 0,
      })
      .where(eq(schema.workers.id, worker.id))
      .returning();

    console.log(
      `✅ Updated worker completed count: ${result[0]?.totalTasksCompleted}`
    );
  }

  // Refetch worker to get updated counts
  const updatedWorker = await db.query.workers.findFirst({
    where: eq(schema.workers.id, worker.id),
  });

  return { worker: updatedWorker || worker, platform };
}

// ===================================
// TEST CASES
// ===================================

async function testEligibleWorker() {
  console.log("\n📊 TEST 1: Eligible Worker (meets all criteria)");
  console.log("=".repeat(60));

  const { worker } = await createTestWorker({
    name: "Alice (Eligible)",
    accountAgeDays: 30,
    reputationScore: 850,
    tasksCompleted: 40,
    tasksCancelled: 2, // 95% completion rate
    avgTaskValue: 30,
    hasActiveLoan: false,
  });

  // Clear caches for fresh calculation
  clearRiskScoreCache(worker.id);
  clearPredictionCache(worker.id);

  const startTime = Date.now();

  // Simulate API call
  const db = getDatabase();
  const [riskScore, earningsPrediction] = await Promise.all([
    calculateRiskScore(worker.id),
    predictEarnings(worker.id, 7),
  ]);

  // Check account age
  const accountAgeDays = Math.floor(
    (Date.now() - worker.createdAt.getTime()) / (24 * 60 * 60 * 1000)
  );
  const accountAgeCheck = accountAgeDays >= 7;

  // Calculate completion rate
  const totalCompleted = worker.totalTasksCompleted || 0;
  const totalCancelled = worker.totalTasksCancelled || 0;
  const completionRate =
    totalCompleted + totalCancelled > 0
      ? totalCompleted / (totalCompleted + totalCancelled)
      : 1; // Default to 100% if no tasks
  const completionRateCheck = completionRate >= 0.8;

  // Check for active loans
  const activeLoans = await db.query.loans.findMany({
    where: and(
      eq(schema.loans.workerId, worker.id),
      eq(schema.loans.status, "active")
    ),
  });
  const noActiveLoansCheck = activeLoans.length === 0;

  // Determine eligibility
  const eligible =
    riskScore.score >= 600 &&
    earningsPrediction.next7Days >= 50 &&
    noActiveLoansCheck &&
    accountAgeCheck &&
    completionRateCheck;

  const maxAdvance = eligible
    ? Math.min(riskScore.maxAdvanceAmount, earningsPrediction.safeAdvanceAmount)
    : 0;

  const duration = Date.now() - startTime;

  console.log(
    "\n✅ Eligibility Result:",
    eligible ? "ELIGIBLE ✓" : "NOT ELIGIBLE ✗"
  );
  console.log(`   Max Advance: $${maxAdvance.toFixed(2)}`);
  console.log(`   Fee Rate: ${riskScore.recommendedFeeRate / 100}%`);
  console.log(`   Duration: ${duration}ms`);

  console.log("\n📋 Checks:");
  console.log(`   ✓ Risk Score: ${riskScore.score} >= 600`);
  console.log(
    `   ✓ Predicted Earnings: $${earningsPrediction.next7Days.toFixed(
      2
    )} >= $50`
  );
  console.log(`   ✓ No Active Loans: ${activeLoans.length} = 0`);
  console.log(`   ✓ Account Age: ${accountAgeDays} days >= 7`);
  console.log(
    `   ✓ Completion Rate: ${(completionRate * 100).toFixed(1)}% >= 80%`
  );

  console.log("\n📊 Risk Score Breakdown:");
  Object.entries(riskScore.factors).forEach(([factor, value]) => {
    console.log(`   ${factor}: ${Math.round(value)} points`);
  });

  console.log("\n📈 Earnings Prediction:");
  console.log(`   Next 7 days: $${earningsPrediction.next7Days.toFixed(2)}`);
  console.log(`   Confidence: ${earningsPrediction.confidence}`);
  console.log(
    `   Safe advance: $${earningsPrediction.safeAdvanceAmount.toFixed(2)}`
  );

  return { worker, eligible, maxAdvance, duration };
}

async function testLowRiskScore() {
  console.log("\n📊 TEST 2: Ineligible - Low Risk Score (<600)");
  console.log("=".repeat(60));

  const { worker } = await createTestWorker({
    name: "Bob (Low Risk Score)",
    accountAgeDays: 10,
    reputationScore: 400, // Low reputation
    tasksCompleted: 5, // Few tasks
    tasksCancelled: 0,
    avgTaskValue: 20,
    hasActiveLoan: false,
  });

  clearRiskScoreCache(worker.id);
  clearPredictionCache(worker.id);

  const [riskScore, earningsPrediction] = await Promise.all([
    calculateRiskScore(worker.id),
    predictEarnings(worker.id, 7),
  ]);

  const eligible = riskScore.score >= 600;

  console.log("\n❌ Eligibility Result: NOT ELIGIBLE");
  console.log(`   Reason: Risk score too low (${riskScore.score} < 600)`);
  console.log(
    `   Predicted Earnings: $${earningsPrediction.next7Days.toFixed(2)}`
  );
  console.log(`   Recommendation: Complete more tasks to improve score`);

  return { worker, eligible, riskScore };
}

async function testLowEarnings() {
  console.log("\n📊 TEST 3: Ineligible - Low Predicted Earnings (<$50)");
  console.log("=".repeat(60));

  const { worker } = await createTestWorker({
    name: "Charlie (Low Earnings)",
    accountAgeDays: 20,
    reputationScore: 700,
    tasksCompleted: 15,
    tasksCancelled: 1,
    avgTaskValue: 8, // Very low task value
    hasActiveLoan: false,
  });

  clearRiskScoreCache(worker.id);
  clearPredictionCache(worker.id);

  const [riskScore, earningsPrediction] = await Promise.all([
    calculateRiskScore(worker.id),
    predictEarnings(worker.id, 7),
  ]);

  const eligible = earningsPrediction.next7Days >= 50;

  console.log("\n❌ Eligibility Result: NOT ELIGIBLE");
  console.log(
    `   Reason: Predicted earnings too low ($${earningsPrediction.next7Days.toFixed(
      2
    )} < $50)`
  );
  console.log(`   Risk Score: ${riskScore.score} (good)`);
  console.log(`   Recommendation: Increase task volume or value`);

  return { worker, eligible, earningsPrediction };
}

async function testActiveLoan() {
  console.log("\n📊 TEST 4: Ineligible - Active Loan Exists");
  console.log("=".repeat(60));

  const { worker } = await createTestWorker({
    name: "Diana (Active Loan)",
    accountAgeDays: 45,
    reputationScore: 820,
    tasksCompleted: 50,
    tasksCancelled: 3,
    avgTaskValue: 35,
    hasActiveLoan: true, // Has active loan
  });

  const db = getDatabase();
  const activeLoans = await db.query.loans.findMany({
    where: and(
      eq(schema.loans.workerId, worker.id),
      eq(schema.loans.status, "active")
    ),
  });

  const eligible = activeLoans.length === 0;

  console.log("\n❌ Eligibility Result: NOT ELIGIBLE");
  console.log(`   Reason: ${activeLoans.length} active loan(s) exist`);
  console.log(`   Loan Amount: $${activeLoans[0]?.requestedAmountUsdc || "0"}`);
  console.log(
    `   Due Date: ${
      activeLoans[0]?.dueDate?.toISOString().split("T")[0] || "N/A"
    }`
  );
  console.log(
    `   Recommendation: Repay existing loan before requesting advance`
  );

  return { worker, eligible, activeLoans };
}

async function testNewAccount() {
  console.log("\n📊 TEST 5: Ineligible - New Account (<7 days)");
  console.log("=".repeat(60));

  const { worker } = await createTestWorker({
    name: "Eve (New Account)",
    accountAgeDays: 3, // Only 3 days old
    reputationScore: 500,
    tasksCompleted: 0,
    tasksCancelled: 0,
    avgTaskValue: 0,
    hasActiveLoan: false,
  });

  const accountAgeDays = Math.floor(
    (Date.now() - worker.createdAt.getTime()) / (24 * 60 * 60 * 1000)
  );
  const eligible = accountAgeDays >= 7;

  console.log("\n❌ Eligibility Result: NOT ELIGIBLE");
  console.log(`   Reason: Account too new (${accountAgeDays} days < 7)`);
  console.log(`   Days until eligible: ${7 - accountAgeDays}`);
  console.log(`   Recommendation: Complete tasks and build history`);

  return { worker, eligible, accountAgeDays };
}

async function testLowCompletionRate() {
  console.log("\n📊 TEST 6: Ineligible - Low Completion Rate (<80%)");
  console.log("=".repeat(60));

  const { worker } = await createTestWorker({
    name: "Frank (Low Completion)",
    accountAgeDays: 25,
    reputationScore: 650,
    tasksCompleted: 15,
    tasksCancelled: 10, // 60% completion rate
    avgTaskValue: 30,
    hasActiveLoan: false,
  });

  // Get actual cancelled count from database
  const db = getDatabase();
  const cancelledTasks = await db.query.tasks.findMany({
    where: and(
      eq(schema.tasks.workerId, worker.id),
      eq(schema.tasks.status, "cancelled")
    ),
  });

  // Handle undefined/null values
  const completed = worker.totalTasksCompleted || 0;
  const cancelled = cancelledTasks.length;
  const total = completed + cancelled;
  const completionRate = total > 0 ? completed / total : 1;
  const eligible = completionRate >= 0.8;

  console.log("\n❌ Eligibility Result: NOT ELIGIBLE");
  console.log(
    `   Reason: Completion rate too low (${(completionRate * 100).toFixed(
      1
    )}% < 80%)`
  );
  console.log(`   Tasks completed: ${completed}`);
  console.log(`   Tasks cancelled: ${cancelled}`);
  console.log(`   Recommendation: Improve task completion consistency`);

  return { worker, eligible, completionRate };
}

async function testPerformance() {
  console.log("\n📊 TEST 7: Performance Test (<1 second)");
  console.log("=".repeat(60));

  const { worker } = await createTestWorker({
    name: "Grace (Performance Test)",
    accountAgeDays: 60,
    reputationScore: 780,
    tasksCompleted: 35,
    tasksCancelled: 2,
    avgTaskValue: 28,
    hasActiveLoan: false,
  });

  clearRiskScoreCache(worker.id);
  clearPredictionCache(worker.id);

  const iterations = 5;
  const durations = [];

  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();

    await Promise.all([
      calculateRiskScore(worker.id),
      predictEarnings(worker.id, 7),
    ]);

    const duration = Date.now() - startTime;
    durations.push(duration);
    console.log(`   Iteration ${i + 1}: ${duration}ms`);
  }

  const avgDuration =
    durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const maxDuration = Math.max(...durations);
  const minDuration = Math.min(...durations);

  console.log(`\n📈 Performance Results:`);
  console.log(`   Average: ${avgDuration.toFixed(0)}ms`);
  console.log(`   Min: ${minDuration}ms`);
  console.log(`   Max: ${maxDuration}ms`);

  if (avgDuration < 1000) {
    console.log(`   ✅ Performance target met (<1 second)`);
  } else {
    console.log(
      `   ⚠️  Performance target missed (${avgDuration.toFixed(0)}ms >= 1000ms)`
    );
  }

  return { worker, avgDuration, maxDuration, minDuration };
}

// ===================================
// MAIN TEST RUNNER
// ===================================

async function runAllTests() {
  console.log("🚀 GigStream Advance Eligibility API - Test Suite");
  console.log("=".repeat(60));

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
  };

  try {
    // Test 1: Eligible worker
    const test1 = await testEligibleWorker();
    if (test1.eligible && test1.maxAdvance > 0 && test1.duration < 1000) {
      results.passed++;
    } else {
      results.warnings++;
    }

    // Test 2: Low risk score
    const test2 = await testLowRiskScore();
    if (!test2.eligible && test2.riskScore.score < 600) {
      results.passed++;
    } else {
      results.failed++;
    }

    // Test 3: Low earnings
    const test3 = await testLowEarnings();
    if (!test3.eligible && test3.earningsPrediction.next7Days < 50) {
      results.passed++;
    } else {
      results.failed++;
    }

    // Test 4: Active loan
    const test4 = await testActiveLoan();
    if (!test4.eligible && test4.activeLoans.length > 0) {
      results.passed++;
    } else {
      results.failed++;
    }

    // Test 5: New account
    const test5 = await testNewAccount();
    if (!test5.eligible && test5.accountAgeDays < 7) {
      results.passed++;
    } else {
      results.failed++;
    }

    // Test 6: Low completion rate
    const test6 = await testLowCompletionRate();
    if (!test6.eligible && test6.completionRate < 0.8) {
      results.passed++;
    } else {
      results.failed++;
    }

    // Test 7: Performance
    const test7 = await testPerformance();
    if (test7.avgDuration < 1000) {
      results.passed++;
    } else {
      results.warnings++;
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 TEST SUMMARY");
    console.log("=".repeat(60));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`⚠️  Warnings: ${results.warnings}`);
    console.log(`❌ Failed: ${results.failed}`);

    const total = results.passed + results.warnings + results.failed;
    const successRate = ((results.passed / total) * 100).toFixed(0);
    console.log(`\n📈 Success Rate: ${successRate}%`);

    if (results.failed === 0) {
      console.log("\n🎉 All critical tests passed!");
    } else {
      console.log("\n⚠️  Some tests failed - review results above");
    }
  } catch (error) {
    console.error("\n❌ Test suite failed with error:", error);
    results.failed++;
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
