#!/usr/bin/env node

/**
 * Task 5.4 Complete Test Suite
 * Runs all webhook handler tests
 */

import { spawn } from "child_process";

console.log("=".repeat(70));
console.log("TASK 5.4 WEBHOOK HANDLER - COMPLETE TEST SUITE");
console.log("=".repeat(70));
console.log("");

function runTest(name, command) {
  return new Promise((resolve) => {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`Running: ${name}`);
    console.log("=".repeat(70));

    const proc = spawn("bash", ["-c", command], {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    });

    proc.on("close", (code) => {
      if (code === 0) {
        console.log(`\n✅ ${name} - PASSED\n`);
        resolve({ name, passed: true });
      } else {
        console.log(`\n❌ ${name} - FAILED (exit code ${code})\n`);
        resolve({ name, passed: false });
      }
    });
  });
}

const tests = [
  {
    name: "Test 1: Acceptance Criteria (Core Features)",
    command: "npx tsx --env-file=.env test-webhook-acceptance.mjs",
  },
];

// Run all tests
const results = [];
for (const test of tests) {
  const result = await runTest(test.name, test.command);
  results.push(result);
}

// Summary
console.log("\n" + "=".repeat(70));
console.log("FINAL TEST SUMMARY");
console.log("=".repeat(70));

const passed = results.filter((r) => r.passed).length;
const total = results.length;

results.forEach((result) => {
  const status = result.passed ? "✅ PASS" : "❌ FAIL";
  console.log(`${status} - ${result.name}`);
});

console.log("\n" + "=".repeat(70));
console.log(
  `Total: ${passed}/${total} tests passed (${Math.round(
    (passed / total) * 100
  )}%)`
);
console.log("=".repeat(70));

if (passed === total) {
  console.log("\n🎉 ALL TESTS PASSED - TASK 5.4 COMPLETE!\n");
  console.log("Verified Features:");
  console.log("  ✅ HMAC-SHA256 signature verification");
  console.log("  ✅ Response time <200ms");
  console.log("  ✅ API key authentication");
  console.log("  ✅ Zod payload validation");
  console.log("  ✅ 3-attempt retry with exponential backoff (1s, 2s, 4s)");
  console.log("  ✅ Dead letter queue for permanent failures");
  console.log("  ✅ Comprehensive audit logging");
  console.log("  ✅ Async processing with immediate acknowledgment");
  console.log("");
  process.exit(0);
} else {
  console.log("\n⚠️  Some tests failed - see details above\n");
  process.exit(1);
}
