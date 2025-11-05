/**
 * GigStream Database Schema - Drizzle ORM
 * Migrated from Prisma for optimal Cloudflare Workers performance
 * 
 * Tables: workers, platforms, tasks, streams, transactions, reputation_events, loans, audit_logs
 */

import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  numeric,
  timestamp,
  jsonb,
  index,
  text,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ===================================
// ENUMS
// ===================================

export const taskTypeEnum = pgEnum('task_type', ['fixed', 'time_based', 'milestone']);
export const taskStatusEnum = pgEnum('task_status', [
  'created',
  'assigned',
  'in_progress',
  'completed',
  'disputed',
  'cancelled',
]);
export const streamStatusEnum = pgEnum('stream_status', ['active', 'paused', 'completed', 'cancelled']);
export const transactionTypeEnum = pgEnum('transaction_type', ['payout', 'advance', 'refund', 'repayment', 'fee']);
export const transactionStatusEnum = pgEnum('transaction_status', [
  'pending',
  'submitted',
  'confirmed',
  'failed',
  'cancelled',
]);
export const reputationEventTypeEnum = pgEnum('reputation_event_type', [
  'task_completed',
  'task_late',
  'dispute_filed',
  'dispute_resolved',
  'rating_received',
  'manual_adjustment',
]);
export const loanStatusEnum = pgEnum('loan_status', [
  'pending',
  'approved',
  'disbursed',
  'active',
  'repaying',
  'repaid',
  'defaulted',
  'cancelled',
]);

// ===================================
// TABLE: workers
// ===================================

export const workers = pgTable(
  'workers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).unique(),
    emailVerified: boolean('email_verified').default(false),
    passwordHash: varchar('password_hash', { length: 255 }),
    displayName: varchar('display_name', { length: 100 }).notNull(),
    walletAddress: varchar('wallet_address', { length: 42 }).unique().notNull(),
    walletId: varchar('wallet_id', { length: 255 }),
    phoneNumber: varchar('phone_number', { length: 20 }),
    phoneVerified: boolean('phone_verified').default(false),

    // Risk & reputation
    reputationScore: integer('reputation_score').default(100),
    totalTasksCompleted: integer('total_tasks_completed').default(0),
    totalEarningsUsdc: numeric('total_earnings_usdc', { precision: 20, scale: 6 }).default('0'),

    // Account status
    status: varchar('status', { length: 20 }).default('active'),
    kycStatus: varchar('kyc_status', { length: 20 }).default('not_required'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),

    // Metadata
    metadata: jsonb('metadata').default({}),
  },
  (table) => ({
    emailIdx: index('idx_workers_email').on(table.email),
    walletIdx: index('idx_workers_wallet').on(table.walletAddress),
    reputationIdx: index('idx_workers_reputation').on(table.reputationScore),
    statusIdx: index('idx_workers_status').on(table.status),
    createdIdx: index('idx_workers_created').on(table.createdAt),
  })
);

// ===================================
// TABLE: platforms
// ===================================

export const platforms = pgTable(
  'platforms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    apiKeyHash: varchar('api_key_hash', { length: 64 }).unique().notNull(),
    webhookUrl: varchar('webhook_url', { length: 500 }),
    webhookSecret: varchar('webhook_secret', { length: 255 }),

    // Stats
    totalWorkers: integer('total_workers').default(0),
    totalPaymentsUsdc: numeric('total_payments_usdc', { precision: 20, scale: 6 }).default('0'),

    // Status
    status: varchar('status', { length: 20 }).default('active'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),

    // Metadata
    metadata: jsonb('metadata').default({}),
  },
  (table) => ({
    apiKeyIdx: index('idx_platforms_api_key').on(table.apiKeyHash),
    statusIdx: index('idx_platforms_status').on(table.status),
  })
);

// ===================================
// TABLE: tasks
// ===================================

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workerId: uuid('worker_id').references(() => workers.id, { onDelete: 'set null' }),
    platformId: uuid('platform_id')
      .notNull()
      .references(() => platforms.id, { onDelete: 'cascade' }),

    // Task details
    externalTaskId: varchar('external_task_id', { length: 255 }),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    type: taskTypeEnum('type').notNull(),

    // Payment
    paymentAmountUsdc: numeric('payment_amount_usdc', { precision: 20, scale: 6 }).notNull(),
    paidAmountUsdc: numeric('paid_amount_usdc', { precision: 20, scale: 6 }).default('0'),

    // Status & completion
    status: taskStatusEnum('status').default('created').notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    dueDate: timestamp('due_date', { withTimezone: true }),

    // Verification
    verificationData: jsonb('verification_data'),
    verificationStatus: varchar('verification_status', { length: 20 }),

    // Rating (1-5 stars)
    workerRating: integer('worker_rating'),
    platformRating: integer('platform_rating'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),

    // Metadata
    metadata: jsonb('metadata').default({}),
  },
  (table) => ({
    workerIdx: index('idx_tasks_worker').on(table.workerId),
    platformIdx: index('idx_tasks_platform').on(table.platformId),
    statusIdx: index('idx_tasks_status').on(table.status),
    createdIdx: index('idx_tasks_created').on(table.createdAt),
    completedIdx: index('idx_tasks_completed').on(table.completedAt),
    externalIdx: index('idx_tasks_external').on(table.platformId, table.externalTaskId),
  })
);

// ===================================
// TABLE: streams
// ===================================

export const streams = pgTable(
  'streams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workerId: uuid('worker_id')
      .notNull()
      .references(() => workers.id, { onDelete: 'cascade' }),
    platformId: uuid('platform_id')
      .notNull()
      .references(() => platforms.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),

    // Smart contract references
    contractAddress: varchar('contract_address', { length: 42 }).notNull(),
    contractStreamId: integer('contract_stream_id').notNull(),

    // Stream details
    totalAmountUsdc: numeric('total_amount_usdc', { precision: 20, scale: 6 }).notNull(),
    releasedAmountUsdc: numeric('released_amount_usdc', { precision: 20, scale: 6 }).default('0'),
    claimedAmountUsdc: numeric('claimed_amount_usdc', { precision: 20, scale: 6 }).default('0'),

    // Timing
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    releaseInterval: integer('release_interval').notNull(), // seconds
    nextReleaseAt: timestamp('next_release_at', { withTimezone: true }),

    // Status
    status: streamStatusEnum('status').default('active').notNull(),
    pausedAt: timestamp('paused_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),

    // Metadata
    metadata: jsonb('metadata').default({}),
  },
  (table) => ({
    workerIdx: index('idx_streams_worker').on(table.workerId),
    platformIdx: index('idx_streams_platform').on(table.platformId),
    statusIdx: index('idx_streams_status').on(table.status),
    nextReleaseIdx: index('idx_streams_next_release').on(table.nextReleaseAt),
    contractIdx: index('idx_streams_contract').on(table.contractAddress, table.contractStreamId),
  })
);

// ===================================
// TABLE: transactions
// ===================================

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workerId: uuid('worker_id').references(() => workers.id, { onDelete: 'set null' }),
    platformId: uuid('platform_id').references(() => platforms.id, { onDelete: 'set null' }),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    streamId: uuid('stream_id').references(() => streams.id, { onDelete: 'set null' }),
    loanId: uuid('loan_id'), // Forward reference, will be defined below

    // Transaction details
    type: transactionTypeEnum('type').notNull(),
    status: transactionStatusEnum('status').default('pending').notNull(),

    // Amounts
    amountUsdc: numeric('amount_usdc', { precision: 20, scale: 6 }).notNull(),
    feeUsdc: numeric('fee_usdc', { precision: 20, scale: 6 }).default('0'),

    // Wallet addresses
    fromWallet: varchar('from_wallet', { length: 42 }),
    toWallet: varchar('to_wallet', { length: 42 }),

    // Blockchain
    txHash: varchar('tx_hash', { length: 66 }),
    blockNumber: integer('block_number'),
    confirmations: integer('confirmations').default(0),

    // Error handling
    errorMessage: text('error_message'),
    retryCount: integer('retry_count').default(0),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),

    // Metadata
    metadata: jsonb('metadata').default({}),
  },
  (table) => ({
    txHashIdx: index('idx_transactions_tx_hash').on(table.txHash),
    fromWalletIdx: index('idx_transactions_from').on(table.fromWallet),
    toWalletIdx: index('idx_transactions_to').on(table.toWallet),
    workerIdx: index('idx_transactions_worker').on(table.workerId),
    statusIdx: index('idx_transactions_status').on(table.status),
    typeIdx: index('idx_transactions_type').on(table.type),
    createdIdx: index('idx_transactions_created').on(table.createdAt),
    pendingIdx: index('idx_transactions_pending').on(table.createdAt).where(sql`status = 'pending'`),
  })
);

// ===================================
// TABLE: reputation_events
// ===================================

export const reputationEvents = pgTable(
  'reputation_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workerId: uuid('worker_id')
      .notNull()
      .references(() => workers.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),

    // Event details
    eventType: reputationEventTypeEnum('event_type').notNull(),
    pointsDelta: integer('points_delta').notNull(),
    previousScore: integer('previous_score').notNull(),
    newScore: integer('new_score').notNull(),

    // Context
    description: text('description'),
    triggeredBy: varchar('triggered_by', { length: 50 }), // 'system', 'platform', 'admin'

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),

    // Metadata
    metadata: jsonb('metadata').default({}),
  },
  (table) => ({
    workerIdx: index('idx_reputation_worker').on(table.workerId, table.createdAt),
    taskIdx: index('idx_reputation_task').on(table.taskId),
    typeIdx: index('idx_reputation_type').on(table.eventType),
    createdIdx: index('idx_reputation_created').on(table.createdAt),
  })
);

// ===================================
// TABLE: loans
// ===================================

export const loans = pgTable(
  'loans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workerId: uuid('worker_id')
      .notNull()
      .references(() => workers.id, { onDelete: 'cascade' }),

    // Loan details
    requestedAmountUsdc: numeric('requested_amount_usdc', { precision: 20, scale: 6 }).notNull(),
    approvedAmountUsdc: numeric('approved_amount_usdc', { precision: 20, scale: 6 }),
    feeUsdc: numeric('fee_usdc', { precision: 20, scale: 6 }).default('0'),
    totalOwedUsdc: numeric('total_owed_usdc', { precision: 20, scale: 6 }),
    remainingBalanceUsdc: numeric('remaining_balance_usdc', { precision: 20, scale: 6 }),

    // Risk assessment
    riskScore: integer('risk_score'),
    predictedEarnings7d: numeric('predicted_earnings_7d', { precision: 20, scale: 6 }),
    feePercentage: numeric('fee_percentage', { precision: 5, scale: 2 }),

    // Status & timing
    status: loanStatusEnum('status').default('pending').notNull(),
    requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow(),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    disbursedAt: timestamp('disbursed_at', { withTimezone: true }),
    dueDate: timestamp('due_date', { withTimezone: true }),
    repaidAt: timestamp('repaid_at', { withTimezone: true }),
    defaultedAt: timestamp('defaulted_at', { withTimezone: true }),

    // Repayment tracking
    repaymentTaskCount: integer('repayment_task_count').default(5),
    tasksRepaid: integer('tasks_repaid').default(0),

    // Rejection reason
    rejectionReason: text('rejection_reason'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),

    // Metadata
    metadata: jsonb('metadata').default({}),
  },
  (table) => ({
    workerIdx: index('idx_loans_worker').on(table.workerId),
    statusIdx: index('idx_loans_status').on(table.status),
    activeIdx: index('idx_loans_active')
      .on(table.workerId)
      .where(sql`status IN ('active', 'repaying')`),
    dueIdx: index('idx_loans_due').on(table.dueDate).where(sql`status IN ('active', 'repaying')`),
    createdIdx: index('idx_loans_created').on(table.createdAt),
  })
);

// ===================================
// TABLE: audit_logs
// ===================================

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Actor
    actorType: varchar('actor_type', { length: 20 }).notNull(), // 'worker', 'platform', 'system', 'admin'
    actorId: uuid('actor_id'),

    // Action
    action: varchar('action', { length: 50 }).notNull(),
    resourceType: varchar('resource_type', { length: 50 }),
    resourceId: uuid('resource_id'),

    // Context
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),
    requestId: varchar('request_id', { length: 100 }),

    // Changes
    changesBefore: jsonb('changes_before'),
    changesAfter: jsonb('changes_after'),

    // Status
    success: boolean('success').notNull(),
    errorMessage: text('error_message'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),

    // Metadata
    metadata: jsonb('metadata').default({}),
  },
  (table) => ({
    actorIdx: index('idx_audit_actor').on(table.actorType, table.actorId),
    actionIdx: index('idx_audit_action').on(table.action),
    resourceIdx: index('idx_audit_resource').on(table.resourceType, table.resourceId),
    createdIdx: index('idx_audit_created').on(table.createdAt),
    requestIdx: index('idx_audit_request').on(table.requestId),
  })
);

// ===================================
// TYPE EXPORTS
// ===================================

export type Worker = typeof workers.$inferSelect;
export type NewWorker = typeof workers.$inferInsert;

export type Platform = typeof platforms.$inferSelect;
export type NewPlatform = typeof platforms.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type Stream = typeof streams.$inferSelect;
export type NewStream = typeof streams.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type ReputationEvent = typeof reputationEvents.$inferSelect;
export type NewReputationEvent = typeof reputationEvents.$inferInsert;

export type Loan = typeof loans.$inferSelect;
export type NewLoan = typeof loans.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
