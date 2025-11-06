// GigStream Database Seed Script
// Populates database with realistic demo data for testing and development
// Converted from Prisma to Drizzle ORM

import { getDb } from "./database/client.js";
import * as schema from "./database/schema.js";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://gigstream_user:gigstream_password@localhost:5432/gigstream_dev";
const db = getDb(DATABASE_URL);

// Helper function to hash passwords with bcrypt
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

// Helper function to generate API key
function generateApiKey(name) {
  return createHash("sha256")
    .update(`${name}_${Date.now()}`)
    .digest("hex")
    .substring(0, 32);
}

// Helper function to get random date in range
function randomDate(start, end) {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

async function main() {
  console.log("🌱 Starting database seed...\n");

  // Clean existing data (in reverse order of dependencies)
  console.log("🧹 Cleaning existing data...");
  await db.delete(schema.auditLogs);
  await db.delete(schema.reputationEvents);
  await db.delete(schema.loans);
  await db.delete(schema.streams);
  await db.delete(schema.transactions);
  await db.delete(schema.tasks);
  await db.delete(schema.platforms);
  await db.delete(schema.workers);
  console.log("✅ Cleaned existing data\n");

  // ============================================
  // 1. Create Workers (10 demo workers)
  // ============================================
  console.log("👷 Creating 10 demo workers...");

  const workerData = [
    {
      name: "Alice Johnson",
      email: "alice@example.com",
      reputation: 850,
      completionRate: 95,
      rating: 4.8,
    },
    {
      name: "Bob Martinez",
      email: "bob@example.com",
      reputation: 720,
      completionRate: 88,
      rating: 4.5,
    },
    {
      name: "Charlie Chen",
      email: "charlie@example.com",
      reputation: 650,
      completionRate: 82,
      rating: 4.3,
    },
    {
      name: "Diana Patel",
      email: "diana@example.com",
      reputation: 780,
      completionRate: 91,
      rating: 4.6,
    },
    {
      name: "Eve Williams",
      email: "eve@example.com",
      reputation: 920,
      completionRate: 98,
      rating: 4.9,
    },
    {
      name: "Frank Brown",
      email: "frank@example.com",
      reputation: 580,
      completionRate: 75,
      rating: 4.0,
    },
    {
      name: "Grace Lee",
      email: "grace@example.com",
      reputation: 810,
      completionRate: 93,
      rating: 4.7,
    },
    {
      name: "Henry Davis",
      email: "henry@example.com",
      reputation: 690,
      completionRate: 85,
      rating: 4.4,
    },
    {
      name: "Iris Kumar",
      email: "iris@example.com",
      reputation: 550,
      completionRate: 72,
      rating: 3.9,
    },
    {
      name: "Jack Wilson",
      email: "jack@example.com",
      reputation: 760,
      completionRate: 89,
      rating: 4.5,
    },
  ];

  const passwordHash = await hashPassword("demo123");
  const workers = [];

  for (let index = 0; index < workerData.length; index++) {
    const data = workerData[index];
    const accountAgeDays = 7 + Math.floor(Math.random() * 90); // 7-97 days
    const createdAt = new Date(
      Date.now() - accountAgeDays * 24 * 60 * 60 * 1000
    );

    const [worker] = await db
      .insert(schema.workers)
      .values({
        displayName: data.name,
        email: data.email,
        emailVerified: true,
        passwordHash: passwordHash,
        walletId: `wallet_w_${index.toString().padStart(4, "0")}`,
        walletAddress: `0x${createHash("sha256")
          .update(data.email)
          .digest("hex")
          .substring(0, 40)}`,
        reputationScore: data.reputation,
        totalTasksCompleted: Math.floor(data.completionRate * 1.5), // Approximate tasks
        totalEarningsUsdc: String((Math.random() * 2000 + 500).toFixed(2)), // $500-$2500
        status: "active",
        kycStatus: "not_required",
        createdAt: createdAt,
        lastLoginAt: randomDate(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          new Date()
        ),
      })
      .returning();

    workers.push(worker);
  }

  console.log(`✅ Created ${workers.length} workers\n`);

  // ============================================
  // 2. Create Platforms (5 demo platforms)
  // ============================================
  console.log("🏢 Creating 5 demo platforms...");

  const platformData = [
    { name: "QuickTask", contactEmail: "api@quicktask.com" },
    { name: "DeliveryHub", contactEmail: "dev@deliveryhub.com" },
    { name: "FieldOps", contactEmail: "tech@fieldops.com" },
    { name: "MicroGigs", contactEmail: "support@microgigs.com" },
    { name: "TaskRunner", contactEmail: "api@taskrunner.io" },
  ];

  const platforms = [];

  for (const data of platformData) {
    const apiKey = generateApiKey(data.name);
    const createdAt = new Date(
      Date.now() - (30 + Math.floor(Math.random() * 60)) * 24 * 60 * 60 * 1000
    );

    const [platform] = await db
      .insert(schema.platforms)
      .values({
        name: data.name,
        email: data.contactEmail,
        apiKeyHash: createHash("sha256").update(apiKey).digest("hex"),
        webhookUrl: `https://webhook.${data.name.toLowerCase()}.com/gigstream`,
        webhookSecret: createHash("sha256")
          .update(`${data.name}_secret`)
          .digest("hex")
          .substring(0, 32),
        totalWorkers: Math.floor(Math.random() * 50 + 10), // 10-60 workers
        totalPaymentsUsdc: String((Math.random() * 50000 + 10000).toFixed(2)), // $10k-$60k
        status: "active",
        createdAt: createdAt,
      })
      .returning();

    platforms.push(platform);
  }

  console.log(`✅ Created ${platforms.length} platforms\n`);

  // ============================================
  // 3. Create Tasks (20 demo tasks)
  // ============================================
  console.log("📋 Creating 20 demo tasks...");

  const taskTypes = ["fixed", "time_based", "milestone"];
  const taskStatuses = [
    "completed",
    "completed",
    "completed",
    "in_progress",
    "created",
  ];
  const taskTitles = [
    "Delivery to Downtown",
    "Data Entry - 100 records",
    "Photo Verification",
    "Package Pickup",
    "Survey Completion",
    "Product Assembly",
    "Inventory Check",
    "Customer Feedback Collection",
    "Document Scanning",
    "Quality Inspection",
  ];

  const tasks = [];
  for (let i = 0; i < 20; i++) {
    const worker = workers[Math.floor(Math.random() * workers.length)];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
    const status =
      taskStatuses[Math.floor(Math.random() * taskStatuses.length)];
    const amount = (Math.random() * 95 + 5).toFixed(2); // $5 - $100
    const createdAt = randomDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date()
    );

    let completedAt = null;

    if (status === "completed") {
      completedAt = new Date(
        createdAt.getTime() + Math.random() * 7200000 + 1800000
      ); // Complete 30min-2.5hr later
    }

    const [task] = await db
      .insert(schema.tasks)
      .values({
        platformId: platform.id,
        workerId: worker.id,
        externalTaskId: `ext_task_${i + 1}`,
        title: taskTitles[i % taskTitles.length] + ` #${i + 1}`,
        description: `Demo task for ${worker.displayName} via ${platform.name}`,
        type: taskType,
        paymentAmountUsdc: amount,
        paidAmountUsdc: status === "completed" ? amount : "0",
        status: status,
        completedAt: completedAt,
        verificationData: {
          priority: Math.random() > 0.7 ? "high" : "normal",
          category: ["delivery", "data-entry", "verification", "inspection"][
            Math.floor(Math.random() * 4)
          ],
        },
        verificationStatus: status === "completed" ? "approved" : null,
        workerRating:
          status === "completed" ? Math.floor(Math.random() * 2 + 4) : null, // 4-5 stars
        createdAt: createdAt,
      })
      .returning();

    tasks.push(task);
  }

  console.log(`✅ Created ${tasks.length} tasks\n`);

  // ============================================
  // 4. Create Streams (for time-based tasks)
  // ============================================
  console.log("🌊 Creating payment streams...");

  const streamingTasks = tasks.filter(
    (t) =>
      t.type === "time_based" &&
      (t.status === "in_progress" || t.status === "completed")
  );
  const streams = [];

  for (const task of streamingTasks) {
    const startTime = task.createdAt;
    const durationHours = 4 + Math.floor(Math.random() * 20); // 4-24 hours
    const endTime = new Date(startTime.getTime() + durationHours * 3600000);
    const totalAmount = parseFloat(task.paymentAmountUsdc);
    const releaseInterval = 3600; // 1 hour in seconds

    let releasedAmount = 0;
    if (task.status === "completed") {
      releasedAmount = totalAmount;
    } else {
      // For active streams, release proportionally to time elapsed
      const elapsed = Date.now() - startTime.getTime();
      const totalDuration = endTime.getTime() - startTime.getTime();
      releasedAmount = Math.min(
        totalAmount,
        (elapsed / totalDuration) * totalAmount
      );
    }

    const [stream] = await db
      .insert(schema.streams)
      .values({
        taskId: task.id,
        workerId: task.workerId,
        platformId: task.platformId,
        contractAddress: `0x${createHash("sha256")
          .update(`stream_${task.id}`)
          .digest("hex")
          .substring(0, 40)}`,
        contractStreamId: streams.length + 1,
        totalAmountUsdc: String(totalAmount.toFixed(2)),
        releasedAmountUsdc: String(releasedAmount.toFixed(2)),
        claimedAmountUsdc:
          task.status === "completed" ? String(releasedAmount.toFixed(2)) : "0",
        startTime: startTime,
        endTime: endTime,
        releaseInterval: releaseInterval,
        nextReleaseAt:
          task.status === "in_progress" ? new Date(Date.now() + 3600000) : null,
        status: task.status === "completed" ? "completed" : "active",
        completedAt: task.completedAt,
      })
      .returning();

    streams.push(stream);
  }

  console.log(`✅ Created ${streams.length} payment streams\n`);

  // ============================================
  // 5. Create Transactions
  // ============================================
  console.log("💰 Creating transactions...");

  const completedTasks = tasks.filter((t) => t.status === "completed");
  const transactions = [];

  for (const task of completedTasks) {
    const worker = workers.find((w) => w.id === task.workerId);
    const platform = platforms.find((p) => p.id === task.platformId);
    const amount = parseFloat(task.paymentAmountUsdc);
    const fee = amount * 0.02; // 2% platform fee

    const [transaction] = await db
      .insert(schema.transactions)
      .values({
        workerId: worker.id,
        platformId: platform.id,
        taskId: task.id,
        type: "payout",
        status: "confirmed",
        amountUsdc: String(amount.toFixed(2)),
        feeUsdc: String(fee.toFixed(2)),
        fromWallet: `0x${createHash("sha256")
          .update("platform_treasury")
          .digest("hex")
          .substring(0, 40)}`,
        toWallet: worker.walletAddress,
        txHash: `0x${createHash("sha256")
          .update(`tx_${task.id}_${Date.now()}`)
          .digest("hex")}`,
        blockNumber: 1000000 + Math.floor(Math.random() * 100000),
        confirmations: 12,
        createdAt: task.completedAt,
        confirmedAt: new Date(task.completedAt.getTime() + 30000), // 30 seconds later
      })
      .returning();

    transactions.push(transaction);
  }

  console.log(`✅ Created ${transactions.length} transactions\n`);

  // ============================================
  // 6. Create Reputation Events
  // ============================================
  console.log("⭐ Creating reputation events...");

  const reputationEvents = [];

  for (const task of completedTasks) {
    const worker = workers.find((w) => w.id === task.workerId);
    const pointsDelta = Math.random() > 0.8 ? 15 : 10; // Sometimes bonus points
    const previousScore = worker.reputationScore - pointsDelta;

    const [event] = await db
      .insert(schema.reputationEvents)
      .values({
        workerId: task.workerId,
        taskId: task.id,
        eventType: "task_completed",
        pointsDelta: pointsDelta,
        previousScore: previousScore,
        newScore: worker.reputationScore,
        description: `Completed task: ${task.title}`,
        triggeredBy: "system",
        createdAt: task.completedAt,
      })
      .returning();

    reputationEvents.push(event);
  }

  // Add some rating events
  for (let i = 0; i < 10; i++) {
    const worker = workers[Math.floor(Math.random() * workers.length)];
    const rating = 3 + Math.floor(Math.random() * 3); // 3-5 stars
    const delta = (rating - 3) * 5; // -10 to +10 based on rating

    const [event] = await db
      .insert(schema.reputationEvents)
      .values({
        workerId: worker.id,
        eventType: "rating_received",
        pointsDelta: delta,
        previousScore: worker.reputationScore - delta,
        newScore: worker.reputationScore,
        description: `Received ${rating}-star rating`,
        triggeredBy: "platform",
        createdAt: randomDate(
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          new Date()
        ),
      })
      .returning();

    reputationEvents.push(event);
  }

  console.log(`✅ Created ${reputationEvents.length} reputation events\n`);

  // ============================================
  // 7. Create Loans
  // ============================================
  console.log("💳 Creating demo loans...");

  const loans = [];
  const eligibleWorkers = workers.filter((w) => w.reputationScore >= 600);

  for (let i = 0; i < 5; i++) {
    const worker = eligibleWorkers[i % eligibleWorkers.length];
    const requestedAmount = (Math.random() * 150 + 50).toFixed(2); // $50 - $200
    const fee = (parseFloat(requestedAmount) * 0.03).toFixed(2); // 3% fee
    const totalDue = (parseFloat(requestedAmount) + parseFloat(fee)).toFixed(2);

    const loanStatuses = ["repaid", "repaying", "active"];
    const status = loanStatuses[i % loanStatuses.length];
    const createdAt = randomDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date()
    );
    const disbursedAt = new Date(createdAt.getTime() + 3600000); // 1 hour later

    let amountRepaid = "0";
    let repaidAt = null;

    if (status === "repaid") {
      amountRepaid = totalDue;
      repaidAt = new Date(disbursedAt.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days
    } else if (status === "repaying") {
      amountRepaid = (parseFloat(totalDue) * 0.5).toFixed(2);
    }

    const [loan] = await db
      .insert(schema.loans)
      .values({
        workerId: worker.id,
        requestedAmountUsdc: requestedAmount,
        approvedAmountUsdc: requestedAmount,
        feeUsdc: fee,
        totalOwedUsdc: totalDue,
        remainingBalanceUsdc: String(
          (parseFloat(totalDue) - parseFloat(amountRepaid)).toFixed(2)
        ),
        riskScore: worker.reputationScore,
        predictedEarnings7d: (parseFloat(requestedAmount) * 1.5).toFixed(2),
        feePercentage: "3.00",
        status: status,
        requestedAt: createdAt,
        approvedAt: new Date(createdAt.getTime() + 1800000), // 30 min later
        disbursedAt: disbursedAt,
        dueDate: new Date(disbursedAt.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days
        repaymentTaskCount: 5,
        tasksRepaid: status === "repaid" ? 5 : status === "repaying" ? 2 : 0,
        repaidAt: repaidAt,
        createdAt: createdAt,
      })
      .returning();

    loans.push(loan);
  }

  console.log(`✅ Created ${loans.length} loans\n`);

  // ============================================
  // 8. Create Audit Logs
  // ============================================
  console.log("📝 Creating audit logs...");

  const auditLogs = [];
  const actions = [
    "create_task",
    "complete_task",
    "approve_loan",
    "disburse_loan",
    "process_payment",
  ];

  for (let i = 0; i < 30; i++) {
    const worker = workers[Math.floor(Math.random() * workers.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];

    const [log] = await db
      .insert(schema.auditLogs)
      .values({
        actorType: "worker",
        actorId: worker.id,
        action: action,
        resourceType: action.includes("task")
          ? "task"
          : action.includes("loan")
          ? "loan"
          : "transaction",
        resourceId: tasks[i % tasks.length]?.id,
        success: true,
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(
          Math.random() * 255
        )}`,
        userAgent: "Mozilla/5.0 (Demo/Seed)",
        requestId: `req_${i.toString().padStart(6, "0")}`,
        metadata: {
          timestamp: new Date().toISOString(),
          action_details: `Demo ${action} by ${worker.displayName}`,
        },
        createdAt: randomDate(
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          new Date()
        ),
      })
      .returning();

    auditLogs.push(log);
  }

  console.log(`✅ Created ${auditLogs.length} audit logs\n`);

  // ============================================
  // Summary
  // ============================================
  console.log("📊 SEED SUMMARY:");
  console.log("================");
  console.log(`👷 Workers: ${workers.length}`);
  console.log(`🏢 Platforms: ${platforms.length}`);
  console.log(`📋 Tasks: ${tasks.length}`);
  console.log(`🌊 Streams: ${streams.length}`);
  console.log(`💰 Transactions: ${transactions.length}`);
  console.log(`⭐ Reputation Events: ${reputationEvents.length}`);
  console.log(`💳 Loans: ${loans.length}`);
  console.log(`📝 Audit Logs: ${auditLogs.length}`);
  console.log("\n✨ Database seeding completed successfully!\n");

  // Print sample login credentials
  console.log("🔑 DEMO LOGIN CREDENTIALS:");
  console.log("==========================");
  console.log("Email: alice@example.com");
  console.log("Password: demo123");
  console.log("\nAll demo accounts use password: demo123\n");
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    console.error(e.stack);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
