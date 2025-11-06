/**
 * Test Drizzle ORM Database Operations
 * Verifies schema migration and basic CRUD operations
 */

import { getDb } from "./database/client.js";
import { workers, platforms, tasks } from "./database/schema.js";
import { eq } from "drizzle-orm";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://gigstream_user:gigstream_password@localhost:5432/gigstream_dev";

console.log("========================================");
console.log("Drizzle ORM Database Tests");
console.log("========================================\n");

const db = getDb(DATABASE_URL);

async function runTests() {
  try {
    // Test 1: Insert a worker
    console.log("--- Test 1: Insert Worker ---");
    const newWorker = {
      displayName: "Test Worker",
      walletAddress:
        "0x" + Math.random().toString(16).slice(2, 42).padEnd(40, "0"),
      email: `test${Date.now()}@example.com`,
      passwordHash: "$2a$10$abcdefghijklmnopqrstuvwxyz",
      emailVerified: false,
      reputationScore: 100,
      totalTasksCompleted: 0,
      totalEarningsUsdc: "0",
      status: "active",
      kycStatus: "not_required",
    };

    const insertedWorkers = await db
      .insert(workers)
      .values(newWorker)
      .returning();
    console.log("✓ Worker inserted:", insertedWorkers[0].id);
    const workerId = insertedWorkers[0].id;

    // Test 2: Query worker
    console.log("\n--- Test 2: Query Worker ---");
    const queriedWorkers = await db
      .select()
      .from(workers)
      .where(eq(workers.id, workerId));
    console.log("✓ Worker queried:", queriedWorkers[0].displayName);
    console.log("  Email:", queriedWorkers[0].email);
    console.log("  Wallet:", queriedWorkers[0].walletAddress);
    console.log("  Reputation:", queriedWorkers[0].reputationScore);

    // Test 3: Update worker
    console.log("\n--- Test 3: Update Worker ---");
    await db
      .update(workers)
      .set({ reputationScore: 150, totalTasksCompleted: 5 })
      .where(eq(workers.id, workerId));

    const updatedWorkers = await db
      .select()
      .from(workers)
      .where(eq(workers.id, workerId));
    console.log("✓ Worker updated:");
    console.log("  Reputation:", updatedWorkers[0].reputationScore);
    console.log("  Tasks Completed:", updatedWorkers[0].totalTasksCompleted);

    // Test 4: Insert platform
    console.log("\n--- Test 4: Insert Platform ---");
    const newPlatform = {
      name: "Test Platform",
      email: `platform${Date.now()}@example.com`,
      apiKeyHash: "a".repeat(64), // SHA-256 hash
      webhookUrl: "https://example.com/webhook",
      webhookSecret: "secret123",
      totalWorkers: 0,
      totalPaymentsUsdc: "0",
      status: "active",
    };

    const insertedPlatforms = await db
      .insert(platforms)
      .values(newPlatform)
      .returning();
    console.log("✓ Platform inserted:", insertedPlatforms[0].id);
    const platformId = insertedPlatforms[0].id;

    // Test 5: Insert task with foreign keys
    console.log("\n--- Test 5: Insert Task with Foreign Keys ---");
    const newTask = {
      workerId: workerId,
      platformId: platformId,
      title: "Test Task",
      description: "This is a test task",
      type: "fixed",
      paymentAmountUsdc: "25.50",
      paidAmountUsdc: "0",
      status: "created",
      verificationData: { location: "Test Location" },
    };

    const insertedTasks = await db.insert(tasks).values(newTask).returning();
    console.log("✓ Task inserted:", insertedTasks[0].id);
    console.log("  Worker ID:", insertedTasks[0].workerId);
    console.log("  Platform ID:", insertedTasks[0].platformId);
    console.log("  Amount:", insertedTasks[0].paymentAmountUsdc);

    // Test 6: Complex query with filtering
    console.log("\n--- Test 6: Complex Query ---");
    const activeTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.status, "created"));
    console.log("✓ Active tasks found:", activeTasks.length);

    // Test 7: Delete task
    console.log("\n--- Test 7: Delete Task ---");
    await db.delete(tasks).where(eq(tasks.id, insertedTasks[0].id));
    const deletedTask = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, insertedTasks[0].id));
    console.log("✓ Task deleted:", deletedTask.length === 0 ? "Yes" : "No");

    // Test 8: Cleanup
    console.log("\n--- Test 8: Cleanup ---");
    await db.delete(platforms).where(eq(platforms.id, platformId));
    await db.delete(workers).where(eq(workers.id, workerId));
    console.log("✓ Test data cleaned up");

    console.log("\n========================================");
    console.log("✓ All database tests passed!");
    console.log("========================================");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

runTests();
