#!/usr/bin/env node
/**
 * Simple Authentication Service Test
 * Tests core auth functions without requiring server
 */

import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  validatePasswordStrength,
  generateApiKey,
  hashApiKey,
} from "./src/services/auth.ts";

console.log("========================================");
console.log("GigStream Authentication Service Tests");
console.log("========================================\n");

let testsPassed = 0;
let testsFailed = 0;

function printResult(passed, testName) {
  if (passed) {
    console.log(`✓ PASSED: ${testName}`);
    testsPassed++;
  } else {
    console.log(`✗ FAILED: ${testName}`);
    testsFailed++;
  }
}

async function runTests() {
  // Test 1: Password Strength Validation
  console.log("\n--- Test 1: Password Strength Validation ---");
  const weakPassword = validatePasswordStrength("weak");
  printResult(!weakPassword.valid, "Weak password rejected");

  const strongPassword = validatePasswordStrength("StrongPass123");
  printResult(strongPassword.valid, "Strong password accepted");

  // Test 2: Password Hashing
  console.log("\n--- Test 2: Password Hashing ---");
  const password = "TestPassword123";
  const hash = await hashPassword(password);
  printResult(
    hash.startsWith("$2a$") || hash.startsWith("$2b$"),
    "Password hashed with bcrypt"
  );
  printResult(hash !== password, "Hash is different from plaintext");

  // Test 3: Password Verification
  console.log("\n--- Test 3: Password Verification ---");
  const isValid = await verifyPassword(password, hash);
  printResult(isValid, "Correct password verified");

  const isInvalid = await verifyPassword("WrongPassword", hash);
  printResult(!isInvalid, "Wrong password rejected");

  // Test 4: JWT Token Generation
  console.log("\n--- Test 4: JWT Token Generation ---");
  const payload = {
    sub: "user123",
    type: "worker",
    wallet: "0x1234567890abcdef",
  };
  const accessToken = generateAccessToken(payload);
  printResult(
    accessToken.split(".").length === 3,
    "Access token has 3 parts (JWT format)"
  );

  const refreshToken = generateRefreshToken(payload);
  printResult(
    refreshToken.split(".").length === 3,
    "Refresh token has 3 parts (JWT format)"
  );

  // Test 5: JWT Token Verification
  console.log("\n--- Test 5: JWT Token Verification ---");
  const decoded = verifyToken(accessToken);
  printResult(decoded !== null, "Token verified successfully");
  printResult(decoded?.sub === "user123", "Token contains correct user ID");
  printResult(decoded?.type === "worker", "Token contains correct type");

  const invalidToken = verifyToken("invalid.token.here");
  printResult(invalidToken === null, "Invalid token rejected");

  // Test 6: API Key Generation
  console.log("\n--- Test 6: API Key Generation ---");
  const testApiKey = generateApiKey(true);
  printResult(
    testApiKey.startsWith("gs_test_"),
    "Test API key has correct prefix"
  );
  printResult(
    testApiKey.length === 40,
    "API key has correct length (40 chars)"
  );

  const liveApiKey = generateApiKey(false);
  printResult(
    liveApiKey.startsWith("gs_live_"),
    "Live API key has correct prefix"
  );

  // Test 7: API Key Hashing
  console.log("\n--- Test 7: API Key Hashing ---");
  const apiKeyHash = await hashApiKey(testApiKey);
  printResult(
    apiKeyHash.length === 64,
    "API key hash is SHA-256 (64 hex chars)"
  );
  printResult(apiKeyHash !== testApiKey, "Hash is different from plaintext");
  printResult(/^[a-f0-9]{64}$/.test(apiKeyHash), "Hash is valid hex string");

  // Test 8: Multiple Hashes are Different
  console.log("\n--- Test 8: Hash Uniqueness ---");
  const hash1 = await hashPassword(password);
  const hash2 = await hashPassword(password);
  printResult(
    hash1 !== hash2,
    "Same password produces different hashes (salt)"
  );

  // Summary
  console.log("\n========================================");
  console.log("Test Summary");
  console.log("========================================");
  console.log(`✓ Passed: ${testsPassed}`);
  console.log(`✗ Failed: ${testsFailed}`);
  console.log(`Total: ${testsPassed + testsFailed}`);

  if (testsFailed === 0) {
    console.log("\n✓ All tests passed!");
    process.exit(0);
  } else {
    console.log("\n✗ Some tests failed");
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error("\nTest suite error:", error);
  process.exit(1);
});
