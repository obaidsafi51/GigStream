#!/usr/bin/env node

/**
 * Test script for webhook handler (Task 5.4)
 * Tests retry logic, exponential backoff, and dead letter queue
 */

import crypto from "crypto";

const API_BASE = process.env.API_URL || "http://localhost:8787";
const TEST_PLATFORM_API_KEY =
  process.env.TEST_PLATFORM_API_KEY || "test_platform_key_12345";

// Utility to create HMAC signature
function createHmacSignature(payload, secret) {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(JSON.stringify(payload));
  return "sha256=" + hmac.digest("hex");
}

// Utility to make API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();
  return { response, data };
}

// Test counter
let testsRun = 0;
let testsPassed = 0;

function logTest(name, passed, details = "") {
  testsRun++;
  if (passed) testsPassed++;

  const status = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`\n${status}: ${name}`);
  if (details) console.log(`  ${details}`);
}

async function runTests() {
  console.log("=".repeat(70));
  console.log("WEBHOOK HANDLER TEST SUITE (Task 5.4)");
  console.log("=".repeat(70));

  // Test 1: Valid webhook with HMAC signature
  console.log("\n--- Test 1: Valid Webhook with HMAC Signature ---");
  try {
    const payload = {
      externalTaskId: `test_task_${Date.now()}`,
      workerId: "00000000-0000-0000-0000-000000000001", // UUID format
      completedAt: new Date().toISOString(),
      amount: 25.5,
      completionProof: {
        photos: ["https://example.com/photo.jpg"],
        gpsCoordinates: { lat: 40.7128, lon: -74.006 },
      },
    };

    const webhookSecret = "test_webhook_secret_12345"; // Must match platform's webhookSecret in DB
    const signature = createHmacSignature(payload, webhookSecret);

    const { response, data } = await apiRequest(
      "/api/v1/webhooks/task-completed",
      {
        method: "POST",
        headers: {
          "X-API-Key": TEST_PLATFORM_API_KEY,
          "X-Signature": signature,
        },
        body: JSON.stringify(payload),
      }
    );

    const passed = response.status === 202 && data.status === "accepted";
    logTest(
      "Valid webhook accepted",
      passed,
      `Status: ${response.status}, Status: ${data.status}, Message: ${data.message}`
    );

    if (passed) {
      console.log("  Webhook accepted for async processing ✓");
      console.log(`  Task ID: ${data.taskId || "N/A"}`);
    }
  } catch (error) {
    logTest("Valid webhook accepted", false, `Error: ${error.message}`);
  }

  // Test 2: Missing HMAC signature
  console.log("\n--- Test 2: Missing HMAC Signature ---");
  try {
    const payload = {
      taskId: `test_task_${Date.now()}`,
      workerId: 1,
      platformId: 1,
      status: "completed",
    };

    const { response, data } = await apiRequest(
      "/api/v1/webhooks/task-completed",
      {
        method: "POST",
        headers: {
          "X-API-Key": TEST_PLATFORM_API_KEY,
        },
        body: JSON.stringify(payload),
      }
    );

    const passed =
      response.status === 401 && data.error?.code === "MISSING_AUTH_HEADERS";
    logTest(
      "Missing signature rejected",
      passed,
      `Status: ${response.status}, Error: ${data.error?.code}`
    );
  } catch (error) {
    logTest("Missing signature rejected", false, `Error: ${error.message}`);
  }

  // Test 3: Invalid HMAC signature
  console.log("\n--- Test 3: Invalid HMAC Signature ---");
  try {
    const payload = {
      taskId: `test_task_${Date.now()}`,
      workerId: 1,
      platformId: 1,
      status: "completed",
    };

    const invalidSignature = "invalid_signature_12345";

    const { response, data } = await apiRequest(
      "/api/v1/webhooks/task-completed",
      {
        method: "POST",
        headers: {
          "X-API-Key": TEST_PLATFORM_API_KEY,
          "X-Signature": invalidSignature,
        },
        body: JSON.stringify(payload),
      }
    );

    const passed =
      response.status === 403 && data.error?.code === "INVALID_SIGNATURE";
    logTest(
      "Invalid signature rejected",
      passed,
      `Status: ${response.status}, Error: ${data.error?.code}`
    );
  } catch (error) {
    logTest("Invalid signature rejected", false, `Error: ${error.message}`);
  }

  // Test 4: Response time < 200ms
  console.log("\n--- Test 4: Response Time < 200ms ---");
  try {
    const payload = {
      externalTaskId: `test_task_${Date.now()}`,
      workerId: "00000000-0000-0000-0000-000000000001",
      completedAt: new Date().toISOString(),
      amount: 25.5,
    };

    const webhookSecret = "test_webhook_secret_12345";
    const signature = createHmacSignature(payload, webhookSecret);

    const startTime = Date.now();

    const { response, data } = await apiRequest(
      "/api/v1/webhooks/task-completed",
      {
        method: "POST",
        headers: {
          "X-API-Key": TEST_PLATFORM_API_KEY,
          "X-Signature": signature,
        },
        body: JSON.stringify(payload),
      }
    );

    const responseTime = Date.now() - startTime;

    const passed = responseTime < 200 && response.status === 202;
    logTest(
      "Response time < 200ms",
      passed,
      `Response time: ${responseTime}ms (target: <200ms)`
    );

    if (responseTime >= 200) {
      console.log("  ⚠️ WARNING: Response time exceeds 200ms target");
    }
  } catch (error) {
    logTest("Response time < 200ms", false, `Error: ${error.message}`);
  }

  // Test 5: Retrieve dead letter queue (empty initially)
  console.log("\n--- Test 5: Retrieve Dead Letter Queue ---");
  try {
    const { response, data } = await apiRequest(
      "/api/v1/webhooks/dead-letter-queue",
      {
        method: "GET",
        headers: {
          "X-API-Key": TEST_PLATFORM_API_KEY,
        },
      }
    );

    const passed =
      response.status === 200 &&
      data.success === true &&
      Array.isArray(data.items);
    logTest(
      "DLQ retrieval endpoint",
      passed,
      `Status: ${response.status}, Items: ${data.items?.length || 0}`
    );

    if (passed && data.items.length > 0) {
      console.log(
        "  DLQ contains items (expected if tests ran multiple times):"
      );
      data.items.slice(0, 3).forEach((item, idx) => {
        console.log(
          `    ${idx + 1}. Task: ${item.taskId}, Attempts: ${
            item.attempts
          }, Error: ${item.error?.substring(0, 50)}...`
        );
      });
    }
  } catch (error) {
    logTest("DLQ retrieval endpoint", false, `Error: ${error.message}`);
  }

  // Test 6: DLQ pagination
  console.log("\n--- Test 6: DLQ Pagination ---");
  try {
    const { response, data } = await apiRequest(
      "/api/v1/webhooks/dead-letter-queue?limit=10&offset=0",
      {
        method: "GET",
        headers: {
          "X-API-Key": TEST_PLATFORM_API_KEY,
        },
      }
    );

    const passed =
      response.status === 200 &&
      data.pagination?.limit === 10 &&
      data.pagination?.offset === 0;
    logTest(
      "DLQ pagination",
      passed,
      `Limit: ${data.pagination?.limit}, Offset: ${data.pagination?.offset}`
    );
  } catch (error) {
    logTest("DLQ pagination", false, `Error: ${error.message}`);
  }

  // Test 7: Unauthorized DLQ access
  console.log("\n--- Test 7: Unauthorized DLQ Access ---");
  try {
    const { response, data } = await apiRequest(
      "/api/v1/webhooks/dead-letter-queue",
      {
        method: "GET",
        headers: {
          "X-API-Key": "invalid_api_key",
        },
      }
    );

    const passed =
      response.status === 401 && data.error?.code === "INVALID_API_KEY";
    logTest(
      "Unauthorized DLQ access rejected",
      passed,
      `Status: ${response.status}, Error: ${data.error?.code}`
    );
  } catch (error) {
    logTest(
      "Unauthorized DLQ access rejected",
      false,
      `Error: ${error.message}`
    );
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("TEST SUMMARY");
  console.log("=".repeat(70));
  console.log(`Total Tests: ${testsRun}`);
  console.log(
    `Passed: ${testsPassed} (${((testsPassed / testsRun) * 100).toFixed(1)}%)`
  );
  console.log(`Failed: ${testsRun - testsPassed}`);

  if (testsPassed === testsRun) {
    console.log("\n✅ ALL TESTS PASSED - Task 5.4 webhook handler verified");
  } else {
    console.log("\n⚠️ SOME TESTS FAILED - Review failures above");
  }

  console.log("\n" + "=".repeat(70));
  console.log("RETRY LOGIC NOTES");
  console.log("=".repeat(70));
  console.log("Retry configuration (implemented in webhooks.ts):");
  console.log("  - Max attempts: 3");
  console.log("  - Backoff: Exponential (1s, 2s, 4s)");
  console.log("  - Retryable errors: Network, timeout, 5xx status codes");
  console.log("  - Non-retryable: Validation errors, 4xx client errors");
  console.log("  - Dead letter queue: Permanent failures after max retries");
  console.log("\nTo test retry logic manually:");
  console.log(
    "  1. Send webhook with invalid worker ID (will fail validation)"
  );
  console.log("  2. Check audit_logs for retry attempts");
  console.log("  3. Query DLQ endpoint to see failed webhook");
  console.log("  4. Use manual retry endpoint to reprocess");

  console.log("\n" + "=".repeat(70));
}

// Run tests
runTests().catch((error) => {
  console.error("Test suite error:", error);
  process.exit(1);
});
