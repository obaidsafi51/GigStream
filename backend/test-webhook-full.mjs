#!/usr/bin/env node

/**
 * Complete webhook test - creates task then completes it via webhook
 */

import { getDb } from "./database/client.js";
import * as schema from "./database/schema.js";
import { eq } from "drizzle-orm";
import { createHmac } from "crypto";
import bcrypt from "bcryptjs";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://gigstream_user:gigstream_password@localhost:5432/gigstream_dev";
const db = getDb(DATABASE_URL);

const API_BASE = "http://localhost:8787";
const TEST_API_KEY = "test_platform_key_12345";
const WEBHOOK_SECRET = "test_webhook_secret_12345";

console.log("🧪 Complete Webhook Test Flow\n");

// Step 1: Get platform
console.log("Step 1: Getting test platform...");
const apiKeyHash = createHmac("sha256", "gigstream-api-key-salt")
  .update(TEST_API_KEY)
  .digest("hex");
const [platform] = await db
  .select()
  .from(schema.platforms)
  .where(eq(schema.platforms.apiKeyHash, apiKeyHash))
  .limit(1);

if (!platform) {
  console.error(
    "❌ Test platform not found. Run quick-setup-webhook.mjs first"
  );
  process.exit(1);
}
console.log(`✅ Platform: ${platform.name} (${platform.id})\n`);

// Step 2: Create test worker
console.log("Step 2: Creating test worker...");
const [worker] = await db
  .insert(schema.workers)
  .values({
    email: `worker-webhook-test-${Date.now()}@example.com`,
    displayName: "Webhook Test Worker",
    walletAddress: `0x${Math.random()
      .toString(16)
      .substring(2, 42)
      .padEnd(40, "0")}`,
    passwordHash: await bcrypt.hash("test123", 10),
    reputationScore: 750,
    status: "active",
  })
  .returning();

console.log(`✅ Worker: ${worker.displayName} (${worker.id})\n`);

// Step 3: Create test task
console.log("Step 3: Creating test task...");
const externalTaskId = `task_${Date.now()}`;
const [task] = await db
  .insert(schema.tasks)
  .values({
    workerId: worker.id,
    platformId: platform.id,
    externalTaskId: externalTaskId,
    title: "Test Delivery Task",
    description: "Test task for webhook verification",
    type: "fixed",
    paymentAmountUsdc: "25.50",
    status: "assigned",
  })
  .returning();

console.log(`✅ Task: ${task.title} (${task.id})`);
console.log(`   External ID: ${externalTaskId}`);
console.log(`   Amount: $${task.paymentAmountUsdc} USDC\n`);

// Step 4: Send webhook to complete task
console.log("Step 4: Sending webhook to complete task...");

const payload = {
  externalTaskId: externalTaskId,
  workerId: worker.id,
  completedAt: new Date().toISOString(),
  amount: 25.5,
  completionProof: {
    photos: ["https://example.com/delivery-photo.jpg"],
    gpsCoordinates: {
      lat: 40.7128,
      lon: -74.006,
    },
    duration: 1800, // 30 minutes
    metadata: {
      timestamp: Date.now(),
      deviceId: "test-device-123",
    },
  },
  rating: 5,
  metadata: {
    notes: "Task completed successfully",
    testMode: true,
  },
};

const signature =
  "sha256=" +
  createHmac("sha256", WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest("hex");

const response = await fetch(`${API_BASE}/api/v1/webhooks/task-completed`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": TEST_API_KEY,
    "X-Signature": signature,
  },
  body: JSON.stringify(payload),
});

const result = await response.json();

console.log(`Response Status: ${response.status}`);
console.log("Response Data:", JSON.stringify(result, null, 2));

if (response.status === 202 || response.status === 200) {
  console.log("\n✅ Webhook accepted for processing!");
  console.log("\n⏳ Waiting 3 seconds for async processing...");

  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Check task status
  console.log("\nStep 5: Checking task status...");
  const [updatedTask] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, task.id));

  console.log(`Task Status: ${updatedTask.status}`);
  console.log(`Paid Amount: $${updatedTask.paidAmountUsdc} USDC`);
  console.log(
    `Verification Status: ${updatedTask.verificationStatus || "N/A"}`
  );

  if (updatedTask.status === "completed") {
    console.log("\n✅ SUCCESS! Task completed via webhook");
  } else {
    console.log("\n⚠️  Task not completed yet - check audit_logs for details");
  }
} else {
  console.log("\n❌ Webhook failed");
  process.exit(1);
}

console.log("\n✅ Full webhook test complete!");
