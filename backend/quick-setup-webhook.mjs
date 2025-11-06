import { getDb } from "./database/client.js";
import * as schema from "./database/schema.js";
import { createHmac } from "crypto";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://gigstream_user:gigstream_password@localhost:5432/gigstream_dev";
const db = getDb(DATABASE_URL);

// Test platform credentials
const TEST_API_KEY = "test_platform_key_12345";
const API_KEY_HASH = createHmac("sha256", "gigstream-api-key-salt")
  .update(TEST_API_KEY)
  .digest("hex");
const WEBHOOK_SECRET = "test_webhook_secret_12345";

const [platform] = await db
  .insert(schema.platforms)
  .values({
    name: "Test Platform (Webhook)",
    email: `test-webhook-${Date.now()}@example.com`,
    apiKeyHash: API_KEY_HASH,
    webhookUrl: "http://localhost:8787/api/v1/webhooks/task-completed",
    webhookSecret: WEBHOOK_SECRET,
    status: "active",
  })
  .onConflictDoUpdate({
    target: schema.platforms.apiKeyHash,
    set: {
      webhookSecret: WEBHOOK_SECRET,
      status: "active",
    },
  })
  .returning();

console.log("✅ Test platform ready:");
console.log("  ID:", platform.id);
console.log("  Name:", platform.name);
console.log("  Status:", platform.status);
console.log("\nCredentials:");
console.log("  API Key:", TEST_API_KEY);
console.log("  Webhook Secret:", WEBHOOK_SECRET);
console.log("  API Key Hash:", API_KEY_HASH);
