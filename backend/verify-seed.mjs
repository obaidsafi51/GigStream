// Quick verification of seeded data
import { getDb } from "./database/client.js";
import * as schema from "./database/schema.js";
import { eq } from "drizzle-orm";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://gigstream_user:gigstream_password@localhost:5432/gigstream_dev";
const db = getDb(DATABASE_URL);

async function verify() {
  console.log("🔍 Verifying seeded data...\n");

  // Get Alice's data
  const [alice] = await db
    .select()
    .from(schema.workers)
    .where(eq(schema.workers.email, "alice@example.com"));

  if (alice) {
    console.log("✅ Worker Found:");
    console.log(`   Name: ${alice.displayName}`);
    console.log(`   Email: ${alice.email}`);
    console.log(`   Wallet: ${alice.walletAddress}`);
    console.log(`   Reputation: ${alice.reputationScore}`);
    console.log(`   Tasks Completed: ${alice.totalTasksCompleted}`);
    console.log(`   Total Earnings: $${alice.totalEarningsUsdc}`);
    console.log();

    // Get Alice's tasks
    const aliceTasks = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.workerId, alice.id));
    console.log(`📋 Alice's Tasks: ${aliceTasks.length}`);
    aliceTasks.forEach((task) => {
      console.log(
        `   - ${task.title} (${task.status}) - $${task.paymentAmountUsdc}`
      );
    });
    console.log();

    // Get Alice's transactions
    const aliceTxs = await db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.workerId, alice.id));
    console.log(`💰 Alice's Transactions: ${aliceTxs.length}`);
    aliceTxs.forEach((tx) => {
      console.log(`   - ${tx.type}: $${tx.amountUsdc} (${tx.status})`);
    });
    console.log();

    // Get all platforms
    const platforms = await db.select().from(schema.platforms);
    console.log(`🏢 Platforms: ${platforms.length}`);
    platforms.forEach((p) => {
      console.log(
        `   - ${p.name} (${p.totalWorkers} workers, $${p.totalPaymentsUsdc} total)`
      );
    });
    console.log();

    // Get all loans
    const loans = await db.select().from(schema.loans);
    console.log(`💳 Loans: ${loans.length}`);
    loans.forEach((loan) => {
      console.log(`   - $${loan.requestedAmountUsdc} (${loan.status})`);
    });
    console.log();

    // Get total counts
    const [workerCount] = await db
      .select({ count: schema.workers.id })
      .from(schema.workers);
    const [taskCount] = await db
      .select({ count: schema.tasks.id })
      .from(schema.tasks);
    const [streamCount] = await db
      .select({ count: schema.streams.id })
      .from(schema.streams);
    const [txCount] = await db
      .select({ count: schema.transactions.id })
      .from(schema.transactions);

    console.log("📊 Database Summary:");
    console.log("===================");
    console.log(`Workers: ${workerCount ? "Multiple found" : 0}`);
    console.log(`Tasks: ${taskCount ? "Multiple found" : 0}`);
    console.log(`Streams: ${streamCount ? "Multiple found" : 0}`);
    console.log(`Transactions: ${txCount ? "Multiple found" : 0}`);
    console.log();

    console.log("✅ Data verification complete!");
    console.log("\n🔑 Try logging in with:");
    console.log("   Email: alice@example.com");
    console.log("   Password: demo123");
  } else {
    console.log("❌ No data found. Seed may have failed.");
  }

  process.exit(0);
}

verify().catch((e) => {
  console.error("❌ Verification failed:", e);
  process.exit(1);
});
