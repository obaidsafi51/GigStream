# GigStream Database Schema Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         GigStream Database Schema                         │
│                        PostgreSQL 16.10 + Prisma ORM                      │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│      WORKERS        │ (10 records)
├─────────────────────┤
│ id (PK)            │
│ name               │
│ email (unique)     │
│ password_hash      │
│ wallet_id          │
│ wallet_address     │
│ reputation_score   │◄──────────┐
│ total_earned       │           │ auto-updated by triggers
│ completion_rate    │           │
│ created_at         │           │
└─────────────────────┘           │
         │                        │
         │ 1:N                    │
         ├────────────────────────┼─────────────────────┐
         │                        │                     │
         ▼                        │                     ▼
┌─────────────────────┐           │            ┌─────────────────────┐
│       TASKS         │ (20)      │            │  REPUTATION_EVENTS  │ (21)
├─────────────────────┤           │            ├─────────────────────┤
│ id (PK)            │           │            │ id (PK)            │
│ worker_id (FK)     │───────────┘            │ worker_id (FK)     │
│ platform_id (FK)   │───┐                    │ event_type         │
│ task_type          │   │                    │ delta              │
│ amount             │   │                    │ reason             │
│ status             │   │                    └─────────────────────┘
│ created_at         │   │                             │
│ completed_at       │   │                             │ on insert
└─────────────────────┘   │                             ▼
         │                │                     [trigger: update_reputation]
         │ 1:N            │
         │                │
         ▼                │                    ┌─────────────────────┐
┌─────────────────────┐   │                    │   TRANSACTIONS      │ (11)
│      STREAMS        │ (8)                    ├─────────────────────┤
├─────────────────────┤   │                    │ id (PK)            │
│ id (PK)            │   │                    │ worker_id (FK)     │───┐
│ task_id (FK)       │   │                    │ task_id (FK)       │   │
│ total_amount       │   │                    │ tx_hash            │   │
│ released_amount    │   │                    │ tx_type            │   │
│ remaining_amount   │   │                    │ amount             │   │
│ next_release_at    │   │                    │ status             │   │
│ status             │   │                    │ circle_tx_id       │   │
└─────────────────────┘   │                    └─────────────────────┘   │
         │                │                             │                │
         │ on update      │                             │                │
         ▼                │                             ▼                │
[trigger: update_stream]  │                    [tracks payments]         │
                          │                                              │
                          │                                              │
                          │                    ┌─────────────────────┐  │
                          │                    │       LOANS         │ (5)
                          │                    ├─────────────────────┤  │
                          │                    │ id (PK)            │  │
                          │                    │ worker_id (FK)     │──┘
                          │                    │ amount             │
                          │                    │ fee                │
                          │                    │ status             │
                          │                    │ repayment_due      │
                          │                    │ risk_score         │
                          │                    └─────────────────────┘
                          │
                          ▼
                 ┌─────────────────────┐
                 │     PLATFORMS       │ (5)
                 ├─────────────────────┤
                 │ id (PK)            │
                 │ name               │
                 │ api_key (unique)   │
                 │ webhook_url        │
                 │ total_payouts      │◄─── auto-updated
                 │ active_workers     │
                 └─────────────────────┘

┌─────────────────────┐
│    AUDIT_LOGS       │ (30 records)
├─────────────────────┤
│ id (PK)            │
│ actor_id           │
│ actor_type         │
│ action             │
│ resource_type      │
│ metadata (JSON)    │
│ created_at         │
└─────────────────────┘

════════════════════════════════════════════════════════════════════════

                          DATABASE VIEWS

┌────────────────────────────────────────────────────────────────────┐
│  worker_earnings_view                                              │
│  • Aggregates tasks, transactions, loans per worker               │
│  • Pre-calculates total_earned, pending_earnings, completion_rate │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  platform_performance_view                                         │
│  • Platform analytics: tasks, payments, active workers            │
│  • Time-based metrics (7d, 30d)                                   │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  worker_risk_assessment                                            │
│  • Real-time risk scoring for loan eligibility                    │
│  • Checks: reputation, age, completion rate, loan history         │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  active_streams_view                                               │
│  • Monitors payment streams due for release                       │
│  • Shows progress, time remaining                                 │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  daily_transaction_summary                                         │
│  • Transaction volume by day, type, status                        │
│  • Aggregates amounts, fees, counts                               │
└────────────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════

                      AUTOMATIC TRIGGERS

[trigger: update_worker_statistics]
  • Fires: AFTER UPDATE on tasks.status
  • Action: Recalculates worker.total_tasks, total_earned, completion_rate

[trigger: update_reputation_score]
  • Fires: AFTER INSERT on reputation_events
  • Action: Updates worker.reputation_score (0-1000 range enforced)

[trigger: update_platform_statistics]
  • Fires: AFTER UPDATE on tasks.status
  • Action: Updates platform.total_payouts, active_workers

[trigger: update_stream_amounts]
  • Fires: BEFORE UPDATE on streams
  • Action: Calculates remaining_amount, auto-completes if released

[trigger: update_worker_last_active]
  • Fires: AFTER INSERT on tasks, transactions
  • Action: Updates worker.last_active_at timestamp

════════════════════════════════════════════════════════════════════

                         KEY INDEXES

workers:
  • email, wallet_address (unique)
  • reputation_score, created_at

platforms:
  • api_key (unique)

tasks:
  • worker_id, platform_id, status, created_at, completed_at

streams:
  • task_id, status, next_release_at

transactions:
  • worker_id, task_id, tx_hash (unique), status, created_at

reputation_events:
  • worker_id, event_type, created_at

loans:
  • worker_id, status, repayment_due

audit_logs:
  • actor_id, action, resource_type, created_at

════════════════════════════════════════════════════════════════════

                      FOREIGN KEY CASCADE RULES

✓ tasks.worker_id → workers.id (ON DELETE CASCADE)
✓ tasks.platform_id → platforms.id (ON DELETE CASCADE)
✓ streams.task_id → tasks.id (ON DELETE CASCADE)
✓ transactions.worker_id → workers.id (ON DELETE CASCADE)
✓ transactions.task_id → tasks.id (ON DELETE SET NULL)
✓ reputation_events.worker_id → workers.id (ON DELETE CASCADE)
✓ loans.worker_id → workers.id (ON DELETE CASCADE)

════════════════════════════════════════════════════════════════════
```

## Data Flow Example: Task Completion

```
1. Task status changes to 'completed'
   └─► [trigger: update_worker_statistics] fires
       └─► worker.total_tasks++, total_earned += amount

2. Reputation event created (delta: +10)
   └─► [trigger: update_reputation_score] fires
       └─► worker.reputation_score += 10 (clamped to 0-1000)

3. Transaction record created
   └─► [trigger: update_worker_last_active] fires
       └─► worker.last_active_at = NOW()

4. Platform statistics updated
   └─► [trigger: update_platform_statistics] fires
       └─► platform.total_payouts += amount
```

## Migration History

```
20251030054106_initial_schema
├─ Created 8 tables
├─ Added foreign keys
├─ Created indexes
└─ Status: ✅ Applied
```

## Connection Info

```bash
Local:      postgresql://postgres:postgres@localhost:5432/gigstream_dev
Production: postgresql://[user]:[pass]@[neon].tech/gigstream?sslmode=require
Pooled:     Use DATABASE_URL_POOLED for Cloudflare Workers
```

---

**Schema Version:** 1.0  
**Last Updated:** October 30, 2025  
**Total Tables:** 8  
**Total Views:** 5  
**Total Triggers:** 6
