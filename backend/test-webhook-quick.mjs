#!/usr/bin/env node

/**
 * Quick webhook test - Tests the webhook endpoint with correct payload format
 */

import crypto from "crypto";
import { getDb } from "./database/client.js";
import * as schema from "./database/schema.js";

const API_BASE = "http://localhost:8787";
const TEST_PLATFORM_API_KEY = "test_platform_key_12345";
const WEBHOOK_SECRET = "test_webhook_secret_12345";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://gigstream_user:gigstream_password@localhost:5432/gigstream_dev";
const db = getDb(DATABASE_URL);

// Create test worker
console.log("Creating test worker...");
const [worker] = await db
  .insert(schema.workers)
  .values({
    email: `test-${Date.now()}@example.com`,
    displayName: "Test Worker",
    walletAddress: `0x${crypto.randomBytes(20).toString("hex")}`,
    passwordHash: "test_hash",
  })
  .returning();

console.log(`✅ Test worker created: ${worker.id}\n`);

// Create HMAC signature
function createHmacSignature(payload, secret) {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(JSON.stringify(payload));
  return "sha256=" + hmac.digest("hex");
}

// Test payload matching TaskCompletionSchema
const payload = {
  externalTaskId: `task_${Date.now()}`,
  workerId: worker.id,
  completedAt: new Date().toISOString(),
  amount: 25.5,
  completionProof: {
    photos: ["https://example.com/photo1.jpg"],
    gpsCoordinates: {
      lat: 40.7128,
      lon: -74.006,
    },
    duration: 3600,
  },
  rating: 5,
};

const signature = createHmacSignature(payload, WEBHOOK_SECRET);

console.log("Sending webhook...");
const response = await fetch(`${API_BASE}/api/v1/webhooks/task-completed`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": TEST_PLATFORM_API_KEY,
    "X-Signature": signature,
  },
  body: JSON.stringify(payload),
});

const data = await response.json();

console.log(`\nResponse Status: ${response.status}`);
console.log("Response Data:", JSON.stringify(data, null, 2));

if (response.status === 202) {
  console.log("\n✅ Webhook accepted for async processing!");
} else if (response.status === 200) {
  console.log("\n✅ Webhook processed successfully!");
} else {
  console.log("\n❌ Webhook failed");
}
