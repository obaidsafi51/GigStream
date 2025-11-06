#!/usr/bin/env node

/**
 * Setup script for webhook handler tests
 * Creates test platform with API key and webhook secret
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./database/schema.js";
import { createHmac } from "crypto";
import { eq } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

// Test platform credentials
const TEST_PLATFORM_API_KEY = "test_platform_key_12345";
const TEST_WEBHOOK_SECRET = "test_webhook_secret_12345";

function hashApiKey(apiKey) {
  return createHmac("sha256", "gigstream-api-key-salt")
    .update(apiKey)
    .digest("hex");
}

async function setupTestPlatform() {
  console.log("🔧 Setting up test platform for webhook tests...\n");

  try {
    const sql = neon(DATABASE_URL);
    const db = drizzle(sql, { schema });

    const apiKeyHash = hashApiKey(TEST_PLATFORM_API_KEY);

    // Check if platform already exists
    const existing = await db.query.platforms.findFirst({
      where: eq(schema.platforms.apiKeyHash, apiKeyHash),
    });

    if (existing) {
      console.log("✅ Test platform already exists");
      console.log(`   ID: ${existing.id}`);
      console.log(`   Name: ${existing.name}`);
      console.log(`   Status: ${existing.status}`);
      console.log(`   Has Webhook Secret: ${!!existing.webhookSecret}`);
      return;
    }

    // Create test platform
    const [platform] = await db
      .insert(schema.platforms)
      .values({
        name: "Test Platform (Webhook)",
        email: `test-webhook-${Date.now()}@example.com`,
        apiKeyHash: apiKeyHash,
        webhookUrl: "http://localhost:8787/api/v1/webhooks/task-completed",
        webhookSecret: TEST_WEBHOOK_SECRET,
        status: "active",
        totalWorkers: 0,
        totalPaymentsUsdc: "0",
      })
      .returning();

    console.log("✅ Test platform created successfully!\n");
    console.log("Platform Details:");
    console.log(`  ID: ${platform.id}`);
    console.log(`  Name: ${platform.name}`);
    console.log(`  Email: ${platform.email}`);
    console.log(`  Status: ${platform.status}`);
    console.log(`  Webhook URL: ${platform.webhookUrl}`);
    console.log("\nTest Credentials:");
    console.log(`  API Key: ${TEST_PLATFORM_API_KEY}`);
    console.log(`  Webhook Secret: ${TEST_WEBHOOK_SECRET}`);
    console.log(`  API Key Hash: ${apiKeyHash}`);
    console.log("\n✅ Setup complete! You can now run webhook tests.");
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    if (error.code === "ECONNREFUSED") {
      console.error(
        "\n💡 Make sure your database is running and DATABASE_URL is correct"
      );
    }
    process.exit(1);
  }
}

setupTestPlatform();
