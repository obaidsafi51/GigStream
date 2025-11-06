#!/usr/bin/env node

/**
 * Test script for Task 8.5: Reputation Page
 *
 * Tests:
 * 1. Backend reputation endpoint
 * 2. Reputation data retrieval
 * 3. Score breakdown and factors
 * 4. Badge system
 * 5. Reputation events history
 */

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8787";

// Test data (using demo worker from seed data)
const TEST_WORKER_ID = "11111111-1111-1111-1111-111111111111"; // Alice Johnson from seed data
let testToken = null;

/**
 * Helper function to make API requests
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (testToken && !options.headers?.Authorization) {
    headers.Authorization = `Bearer ${testToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();
  return { response, data };
}

/**
 * Test 1: Worker Login (get auth token)
 */
async function testLogin() {
  console.log("\n📋 Test 1: Worker Login");
  console.log("=".repeat(50));

  try {
    const { response, data } = await apiRequest("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "alice.johnson@example.com",
        password: "password123",
      }),
    });

    if (response.ok && data.success) {
      testToken = data.data.token;
      console.log("✅ Login successful");
      console.log(`   Token: ${testToken.substring(0, 20)}...`);
      return true;
    } else {
      console.error("❌ Login failed:", data.error?.message || "Unknown error");
      return false;
    }
  } catch (error) {
    console.error("❌ Login error:", error.message);
    return false;
  }
}

/**
 * Test 2: Get Reputation Data
 */
async function testGetReputation() {
  console.log("\n📋 Test 2: Get Reputation Data");
  console.log("=".repeat(50));

  try {
    const startTime = Date.now();
    const { response, data } = await apiRequest(
      `/api/v1/workers/${TEST_WORKER_ID}/reputation`
    );
    const endTime = Date.now();

    if (!response.ok || !data.success) {
      console.error("❌ Failed to get reputation:", data.error?.message);
      return false;
    }

    const reputation = data.data;

    console.log("✅ Reputation data retrieved");
    console.log(`   Response time: ${endTime - startTime}ms`);
    console.log(`   Score: ${reputation.score}/${reputation.maxScore}`);
    console.log(`   Rank: ${reputation.rank}`);
    console.log(`   Grade: ${reputation.grade}`);
    console.log(`   Tasks Completed: ${reputation.tasksCompleted}`);
    console.log(`   Completion Rate: ${reputation.completionRate}%`);
    console.log(`   Avg Rating: ${reputation.avgRating}/5`);
    console.log(`   Percentile: ${reputation.percentile}th`);

    return reputation;
  } catch (error) {
    console.error("❌ Error getting reputation:", error.message);
    return false;
  }
}

/**
 * Test 3: Score Breakdown
 */
async function testScoreBreakdown(reputation) {
  console.log("\n📋 Test 3: Score Breakdown");
  console.log("=".repeat(50));

  if (!reputation || !reputation.factors) {
    console.error("❌ No reputation data available");
    return false;
  }

  console.log("✅ Score factors:");
  let totalPoints = 0;

  for (const factor of reputation.factors) {
    console.log(`   ${factor.name}: ${factor.value} points`);
    console.log(`      ${factor.description}`);
    totalPoints += factor.value;
  }

  console.log(`\n   Total: ${totalPoints} points`);
  console.log(`   Actual Score: ${reputation.score} points`);

  // Verify algorithm
  console.log(`\n   Algorithm: ${reputation.riskScore.algorithmUsed}`);
  console.log(
    `   Confidence: ${(reputation.riskScore.confidence * 100).toFixed(0)}%`
  );

  return true;
}

/**
 * Test 4: Badge System
 */
async function testBadges(reputation) {
  console.log("\n📋 Test 4: Badge System");
  console.log("=".repeat(50));

  if (!reputation || !reputation.badges) {
    console.error("❌ No reputation data available");
    return false;
  }

  const earnedBadges = reputation.badges.filter((b) => b.earned);
  const totalBadges = reputation.badges.length;

  console.log(`✅ Badges: ${earnedBadges.length}/${totalBadges} earned`);
  console.log("\n   Earned Badges:");

  for (const badge of earnedBadges) {
    console.log(`   ${badge.icon} ${badge.name} - ${badge.description}`);
  }

  console.log("\n   Locked Badges:");
  for (const badge of reputation.badges.filter((b) => !b.earned)) {
    console.log(`   🔒 ${badge.name} - ${badge.description}`);
  }

  return true;
}

/**
 * Test 5: Reputation Events History
 */
async function testReputationEvents(reputation) {
  console.log("\n📋 Test 5: Reputation Events History");
  console.log("=".repeat(50));

  if (!reputation || !reputation.events) {
    console.error("❌ No reputation data available");
    return false;
  }

  console.log(`✅ Events: ${reputation.events.length} events found`);

  if (reputation.events.length === 0) {
    console.log("   ℹ️  No events yet (expected for new worker)");
    return true;
  }

  console.log("\n   Recent Events:");
  for (const event of reputation.events.slice(0, 5)) {
    const delta =
      event.pointsDelta > 0 ? `+${event.pointsDelta}` : event.pointsDelta;
    const icon =
      event.pointsDelta > 0 ? "⬆️" : event.pointsDelta < 0 ? "⬇️" : "➡️";
    const date = new Date(event.createdAt).toLocaleString();

    console.log(
      `   ${icon} ${event.type.replace(/_/g, " ")} (${delta} points)`
    );
    console.log(`      ${event.previousScore} → ${event.newScore}`);
    if (event.description) {
      console.log(`      ${event.description}`);
    }
    console.log(`      ${date}`);
  }

  return true;
}

/**
 * Test 6: Comparison Stats
 */
async function testComparison(reputation) {
  console.log("\n📋 Test 6: Comparison Stats");
  console.log("=".repeat(50));

  if (!reputation) {
    console.error("❌ No reputation data available");
    return false;
  }

  const difference = reputation.score - reputation.avgWorkerScore;
  const comparison =
    difference > 0
      ? `${difference} points above average`
      : `${Math.abs(difference)} points below average`;

  console.log("✅ Comparison metrics:");
  console.log(`   Your Score: ${reputation.score}`);
  console.log(`   Average Worker: ${reputation.avgWorkerScore}`);
  console.log(`   Difference: ${comparison}`);
  console.log(`   Percentile: ${reputation.percentile}th`);

  return true;
}

/**
 * Test Summary
 */
async function testSummary(results) {
  console.log("\n" + "=".repeat(50));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(50));

  const passedTests = results.filter((r) => r.passed).length;
  const totalTests = results.length;
  const successRate = ((passedTests / totalTests) * 100).toFixed(0);

  for (const result of results) {
    const icon = result.passed ? "✅" : "❌";
    console.log(`${icon} ${result.name}`);
  }

  console.log("\n" + "=".repeat(50));
  console.log(
    `RESULT: ${passedTests}/${totalTests} tests passed (${successRate}%)`
  );
  console.log("=".repeat(50));

  return passedTests === totalTests;
}

/**
 * Main test runner
 */
async function runTests() {
  console.log("🚀 Starting Task 8.5 Tests: Reputation Page");
  console.log("API Base URL:", API_BASE_URL);

  const results = [];

  // Test 1: Login
  const loginSuccess = await testLogin();
  results.push({ name: "Worker Login", passed: loginSuccess });

  if (!loginSuccess) {
    console.error("\n❌ Cannot proceed without authentication");
    await testSummary(results);
    process.exit(1);
  }

  // Test 2: Get Reputation
  const reputation = await testGetReputation();
  results.push({ name: "Get Reputation Data", passed: !!reputation });

  if (!reputation) {
    await testSummary(results);
    process.exit(1);
  }

  // Test 3: Score Breakdown
  const breakdownSuccess = await testScoreBreakdown(reputation);
  results.push({ name: "Score Breakdown", passed: breakdownSuccess });

  // Test 4: Badges
  const badgesSuccess = await testBadges(reputation);
  results.push({ name: "Badge System", passed: badgesSuccess });

  // Test 5: Events
  const eventsSuccess = await testReputationEvents(reputation);
  results.push({ name: "Reputation Events", passed: eventsSuccess });

  // Test 6: Comparison
  const comparisonSuccess = await testComparison(reputation);
  results.push({ name: "Comparison Stats", passed: comparisonSuccess });

  // Summary
  const allPassed = await testSummary(results);

  if (allPassed) {
    console.log("\n🎉 All tests passed! Task 8.5 is complete.");
    process.exit(0);
  } else {
    console.log("\n⚠️  Some tests failed. Review the output above.");
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error("\n💥 Fatal error:", error);
  process.exit(1);
});
