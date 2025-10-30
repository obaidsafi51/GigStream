// GigStream Database Seed Script
// Populates database with realistic demo data for testing and development

import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

// Helper function to create deterministic IDs
function generateId(prefix: string, index: number): string {
  return `${prefix}_${index.toString().padStart(4, '0')}`;
}

// Helper function to hash passwords (bcrypt alternative for demo)
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

// Helper function to generate API key
function generateApiKey(name: string): string {
  return createHash('sha256').update(`${name}_${Date.now()}`).digest('hex').substring(0, 32);
}

// Helper function to get random date in range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clean existing data (in reverse order of dependencies)
  console.log('🧹 Cleaning existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.reputationEvent.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.stream.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.task.deleteMany();
  await prisma.platform.deleteMany();
  await prisma.worker.deleteMany();
  console.log('✅ Cleaned existing data\n');

  // ============================================
  // 1. Create Workers (10 demo workers)
  // ============================================
  console.log('👷 Creating 10 demo workers...');
  
  const workerData = [
    { name: 'Alice Johnson', email: 'alice@example.com', reputation: 850, completionRate: 95, rating: 4.8 },
    { name: 'Bob Martinez', email: 'bob@example.com', reputation: 720, completionRate: 88, rating: 4.5 },
    { name: 'Charlie Chen', email: 'charlie@example.com', reputation: 650, completionRate: 82, rating: 4.3 },
    { name: 'Diana Patel', email: 'diana@example.com', reputation: 780, completionRate: 91, rating: 4.6 },
    { name: 'Eve Williams', email: 'eve@example.com', reputation: 920, completionRate: 98, rating: 4.9 },
    { name: 'Frank Brown', email: 'frank@example.com', reputation: 580, completionRate: 75, rating: 4.0 },
    { name: 'Grace Lee', email: 'grace@example.com', reputation: 810, completionRate: 93, rating: 4.7 },
    { name: 'Henry Davis', email: 'henry@example.com', reputation: 690, completionRate: 85, rating: 4.4 },
    { name: 'Iris Kumar', email: 'iris@example.com', reputation: 550, completionRate: 72, rating: 3.9 },
    { name: 'Jack Wilson', email: 'jack@example.com', reputation: 760, completionRate: 89, rating: 4.5 },
  ];

  const workers = await Promise.all(
    workerData.map(async (data, index) => {
      const accountAgeMin = 7 + Math.floor(Math.random() * 90); // 7-97 days
      const createdAt = new Date(Date.now() - accountAgeMin * 24 * 60 * 60 * 1000);
      
      return prisma.worker.create({
        data: {
          name: data.name,
          email: data.email,
          password_hash: hashPassword('demo123'), // All demo accounts use 'demo123'
          wallet_id: `wallet_${generateId('w', index)}`,
          wallet_address: `0x${createHash('sha256').update(data.email).digest('hex').substring(0, 40)}`,
          reputation_score: data.reputation,
          account_age_days: accountAgeMin,
          completion_rate: data.completionRate,
          average_rating: data.rating,
          dispute_rate: Math.random() * 5, // 0-5%
          created_at: createdAt,
          last_active_at: randomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()),
        },
      });
    })
  );

  console.log(`✅ Created ${workers.length} workers\n`);

  // ============================================
  // 2. Create Platforms (5 demo platforms)
  // ============================================
  console.log('🏢 Creating 5 demo platforms...');

  const platformData = [
    { name: 'QuickTask', contactEmail: 'api@quicktask.com' },
    { name: 'DeliveryHub', contactEmail: 'dev@deliveryhub.com' },
    { name: 'FieldOps', contactEmail: 'tech@fieldops.com' },
    { name: 'MicroGigs', contactEmail: 'support@microgigs.com' },
    { name: 'TaskRunner', contactEmail: 'api@taskrunner.io' },
  ];

  const platforms = await Promise.all(
    platformData.map(async (data) => {
      const apiKey = generateApiKey(data.name);
      const createdAt = new Date(Date.now() - (30 + Math.floor(Math.random() * 60)) * 24 * 60 * 60 * 1000);
      
      return prisma.platform.create({
        data: {
          name: data.name,
          api_key: apiKey,
          api_key_hash: createHash('sha256').update(apiKey).digest('hex'),
          webhook_url: `https://webhook.${data.name.toLowerCase()}.com/gigstream`,
          webhook_secret: createHash('sha256').update(`${data.name}_secret`).digest('hex').substring(0, 32),
          contact_email: data.contactEmail,
          wallet_address: `0x${createHash('sha256').update(data.contactEmail).digest('hex').substring(0, 40)}`,
          is_active: true,
          created_at: createdAt,
        },
      });
    })
  );

  console.log(`✅ Created ${platforms.length} platforms\n`);

  // ============================================
  // 3. Create Tasks (20 demo tasks)
  // ============================================
  console.log('📋 Creating 20 demo tasks...');

  const taskTypes = ['fixed', 'streaming'];
  const taskStatuses = ['completed', 'completed', 'completed', 'active', 'pending']; // More completed for realism
  const taskTitles = [
    'Delivery to Downtown',
    'Data Entry - 100 records',
    'Photo Verification',
    'Package Pickup',
    'Survey Completion',
    'Product Assembly',
    'Inventory Check',
    'Customer Feedback Collection',
    'Document Scanning',
    'Quality Inspection',
  ];

  const tasks = [];
  for (let i = 0; i < 20; i++) {
    const worker = workers[Math.floor(Math.random() * workers.length)];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
    const status = taskStatuses[Math.floor(Math.random() * taskStatuses.length)];
    const amount = (Math.random() * 95 + 5).toFixed(2); // $5 - $100
    const createdAt = randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
    
    let completedAt = null;
    let startedAt = null;
    
    if (status === 'completed') {
      startedAt = new Date(createdAt.getTime() + Math.random() * 3600000); // Start within 1 hour
      completedAt = new Date(startedAt.getTime() + Math.random() * 7200000 + 1800000); // Complete 30min-2.5hr later
    } else if (status === 'active') {
      startedAt = new Date(createdAt.getTime() + Math.random() * 3600000);
    }

    const task = await prisma.task.create({
      data: {
        platform_id: platform.id,
        worker_id: worker.id,
        task_type: taskType,
        amount: amount,
        status: status,
        title: taskTitles[i % taskTitles.length] + ` #${i + 1}`,
        description: `Demo task for ${worker.name} via ${platform.name}`,
        metadata: {
          priority: Math.random() > 0.7 ? 'high' : 'normal',
          category: ['delivery', 'data-entry', 'verification', 'inspection'][Math.floor(Math.random() * 4)],
        },
        created_at: createdAt,
        started_at: startedAt,
        completed_at: completedAt,
      },
    });

    tasks.push(task);
  }

  console.log(`✅ Created ${tasks.length} tasks\n`);

  // ============================================
  // 4. Create Streams (for streaming tasks)
  // ============================================
  console.log('🌊 Creating payment streams...');

  const streamingTasks = tasks.filter(t => t.task_type === 'streaming' && (t.status === 'active' || t.status === 'completed'));
  const streams = [];

  for (const task of streamingTasks) {
    const startTime = task.started_at || task.created_at;
    const durationHours = 4 + Math.floor(Math.random() * 20); // 4-24 hours
    const endTime = new Date(startTime.getTime() + durationHours * 3600000);
    const totalAmount = parseFloat(task.amount.toString());
    const releaseInterval = 3600; // 1 hour in seconds
    
    let releasedAmount = 0;
    if (task.status === 'completed') {
      releasedAmount = totalAmount;
    } else {
      // For active streams, release proportionally to time elapsed
      const elapsed = Date.now() - startTime.getTime();
      const totalDuration = endTime.getTime() - startTime.getTime();
      releasedAmount = Math.min(totalAmount, (elapsed / totalDuration) * totalAmount);
    }

    const stream = await prisma.stream.create({
      data: {
        task_id: task.id,
        contract_address: `0x${createHash('sha256').update(`stream_${task.id}`).digest('hex').substring(0, 40)}`,
        start_time: startTime,
        end_time: endTime,
        total_amount: totalAmount,
        released_amount: releasedAmount,
        remaining_amount: totalAmount - releasedAmount,
        release_interval: releaseInterval,
        next_release_at: task.status === 'active' ? new Date(Date.now() + 3600000) : null,
        status: task.status === 'completed' ? 'completed' : 'active',
      },
    });

    streams.push(stream);
  }

  console.log(`✅ Created ${streams.length} payment streams\n`);

  // ============================================
  // 5. Create Transactions
  // ============================================
  console.log('💰 Creating transactions...');

  const completedTasks = tasks.filter(t => t.status === 'completed');
  const transactions: any[] = [];

  for (const task of completedTasks) {
    const worker = workers.find(w => w.id === task.worker_id)!;
    const amount = parseFloat(task.amount.toString());
    const fee = amount * 0.02; // 2% platform fee

    const transaction = await prisma.transaction.create({
      data: {
        worker_id: worker.id,
        task_id: task.id,
        tx_hash: `0x${createHash('sha256').update(`tx_${task.id}_${Date.now()}`).digest('hex')}`,
        tx_type: 'payout',
        amount: amount,
        fee: fee,
        status: 'completed',
        from_address: `0x${createHash('sha256').update('platform_treasury').digest('hex').substring(0, 40)}`,
        to_address: worker.wallet_address!,
        circle_tx_id: `circle_${generateId('tx', transactions.length)}`,
        blockchain_confirmations: 12,
        processed_at: task.completed_at,
        created_at: task.completed_at!,
      },
    });

    transactions.push(transaction);
  }

  console.log(`✅ Created ${transactions.length} transactions\n`);

  // ============================================
  // 6. Create Reputation Events
  // ============================================
  console.log('⭐ Creating reputation events...');

  const reputationEvents = [];
  
  for (const task of completedTasks) {
    const event = await prisma.reputationEvent.create({
      data: {
        worker_id: task.worker_id,
        event_type: 'task_completed',
        delta: Math.random() > 0.8 ? 15 : 10, // Sometimes bonus points
        reason: `Completed task: ${task.title}`,
        related_id: task.id,
        created_at: task.completed_at!,
      },
    });
    reputationEvents.push(event);
  }

  // Add some rating events
  for (let i = 0; i < 10; i++) {
    const worker = workers[Math.floor(Math.random() * workers.length)];
    const rating = 3 + Math.floor(Math.random() * 3); // 3-5 stars
    const delta = (rating - 3) * 5; // -10 to +10 based on rating
    
    const event = await prisma.reputationEvent.create({
      data: {
        worker_id: worker.id,
        event_type: 'rating_received',
        delta: delta,
        reason: `Received ${rating}-star rating`,
        created_at: randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()),
      },
    });
    reputationEvents.push(event);
  }

  console.log(`✅ Created ${reputationEvents.length} reputation events\n`);

  // ============================================
  // 7. Create Loans
  // ============================================
  console.log('💳 Creating demo loans...');

  const loans = [];
  const eligibleWorkers = workers.filter(w => w.reputation_score >= 600);

  for (let i = 0; i < 5; i++) {
    const worker = eligibleWorkers[i % eligibleWorkers.length];
    const amount = (Math.random() * 150 + 50).toFixed(2); // $50 - $200
    const fee = (parseFloat(amount) * 0.03).toFixed(2); // 3% fee
    const totalDue = (parseFloat(amount) + parseFloat(fee)).toFixed(2);
    
    const loanStatuses = ['repaid', 'repaying', 'disbursed'];
    const status = loanStatuses[i % loanStatuses.length];
    const createdAt = randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
    
    const loan = await prisma.loan.create({
      data: {
        worker_id: worker.id,
        amount: amount,
        fee: fee,
        total_due: totalDue,
        amount_repaid: status === 'repaid' ? totalDue : (status === 'repaying' ? (parseFloat(totalDue) * 0.5).toFixed(2) : '0'),
        status: status,
        risk_score: worker.reputation_score,
        predicted_earnings: (parseFloat(amount) * 1.5).toFixed(2),
        contract_address: `0x${createHash('sha256').update(`loan_${worker.id}_${i}`).digest('hex').substring(0, 40)}`,
        disbursed_at: createdAt,
        repayment_due: new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days
        repaid_at: status === 'repaid' ? new Date(createdAt.getTime() + 10 * 24 * 60 * 60 * 1000) : null,
        created_at: createdAt,
      },
    });

    loans.push(loan);
  }

  console.log(`✅ Created ${loans.length} loans\n`);

  // ============================================
  // 8. Create Audit Logs
  // ============================================
  console.log('📝 Creating audit logs...');

  const auditLogs = [];
  const actions = ['create_task', 'complete_task', 'approve_loan', 'disburse_loan', 'process_payment'];

  for (let i = 0; i < 30; i++) {
    const worker = workers[Math.floor(Math.random() * workers.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    
    const log = await prisma.auditLog.create({
      data: {
        actor_id: worker.id,
        actor_type: 'worker',
        action: action,
        resource_type: action.includes('task') ? 'task' : (action.includes('loan') ? 'loan' : 'transaction'),
        resource_id: generateId('res', i),
        metadata: {
          timestamp: new Date().toISOString(),
          action_details: `Demo ${action} by ${worker.name}`,
        },
        ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        user_agent: 'Mozilla/5.0 (Demo/Seed)',
        created_at: randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()),
      },
    });

    auditLogs.push(log);
  }

  console.log(`✅ Created ${auditLogs.length} audit logs\n`);

  // ============================================
  // Summary
  // ============================================
  console.log('📊 SEED SUMMARY:');
  console.log('================');
  console.log(`👷 Workers: ${workers.length}`);
  console.log(`🏢 Platforms: ${platforms.length}`);
  console.log(`📋 Tasks: ${tasks.length}`);
  console.log(`🌊 Streams: ${streams.length}`);
  console.log(`💰 Transactions: ${transactions.length}`);
  console.log(`⭐ Reputation Events: ${reputationEvents.length}`);
  console.log(`💳 Loans: ${loans.length}`);
  console.log(`📝 Audit Logs: ${auditLogs.length}`);
  console.log('\n✨ Database seeding completed successfully!\n');

  // Print sample login credentials
  console.log('🔑 DEMO LOGIN CREDENTIALS:');
  console.log('==========================');
  console.log('Email: alice@example.com');
  console.log('Password: demo123');
  console.log('\nAll demo accounts use password: demo123\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
