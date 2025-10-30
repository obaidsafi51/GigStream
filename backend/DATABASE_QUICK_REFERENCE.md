# GigStream Database - Quick Reference Guide

## 🚀 Quick Commands

```bash
# Navigate to backend
cd backend

# Generate Prisma Client
npm run db:generate

# Create new migration
npm run db:migrate

# Deploy migrations (production)
npm run db:migrate:deploy

# Push schema changes (dev only)
npm run db:push

# Seed database
npm run db:seed

# Reset database (WARNING: deletes all data)
npm run db:reset

# Open Prisma Studio (GUI)
npm run db:studio
```

## 📊 Database Schema Quick View

### Core Tables

```
workers (10 demo records)
├── id (cuid)
├── email (unique)
├── wallet_address (unique)
├── reputation_score (0-1000)
├── total_earned (Decimal)
└── Relations: tasks[], transactions[], loans[]

platforms (5 demo records)
├── id (cuid)
├── api_key (unique)
├── webhook_url
└── Relations: tasks[]

tasks (20 demo records)
├── id (cuid)
├── worker_id → workers
├── platform_id → platforms
├── amount (Decimal)
├── status (pending|active|completed|cancelled)
└── Relations: streams[], transactions[]

streams (8 demo records)
├── id (cuid)
├── task_id → tasks
├── total_amount
├── released_amount
├── remaining_amount
└── next_release_at

transactions (11 demo records)
├── id (cuid)
├── worker_id → workers
├── tx_hash (unique)
├── tx_type (payout|advance|repayment)
└── circle_tx_id

reputation_events (21 demo records)
├── id (cuid)
├── worker_id → workers
├── event_type
└── delta (±score)

loans (5 demo records)
├── id (cuid)
├── worker_id → workers
├── amount
├── status (pending|disbursed|repaying|repaid)
└── repayment_due

audit_logs (30 demo records)
├── id (cuid)
├── actor_id
├── action
└── metadata (JSON)
```

## 📈 Database Views

### worker_earnings_view

```sql
-- Get complete earnings summary
SELECT * FROM worker_earnings_view
WHERE worker_id = 'worker_xxx';
```

### platform_performance_view

```sql
-- Platform analytics
SELECT * FROM platform_performance_view
WHERE platform_id = 'platform_xxx';
```

### worker_risk_assessment

```sql
-- Check loan eligibility
SELECT * FROM worker_risk_assessment
WHERE worker_id = 'worker_xxx';
```

### active_streams_view

```sql
-- Monitor payment streams
SELECT * FROM active_streams_view
ORDER BY next_release_at ASC;
```

### daily_transaction_summary

```sql
-- Daily transaction metrics
SELECT * FROM daily_transaction_summary
WHERE transaction_date >= CURRENT_DATE - INTERVAL '7 days';
```

## 🔑 Demo Credentials

```
Email: alice@example.com
Password: demo123

All 10 workers use: demo123
```

## 💡 Common Queries

### Get Worker Profile

```typescript
import { getPrisma, queries } from "./src/services/database";

const prisma = getPrisma();
const worker = await queries.getWorkerProfile(prisma, "worker_id");
```

### Get Active Streams

```typescript
const streams = await queries.getActiveStreams(prisma);
```

### Complete Task with Reputation

```typescript
const task = await queries.completeTaskWithReputation(
  prisma,
  "task_id",
  10 // reputation delta
);
```

## 🧪 Testing Queries

```sql
-- Count all records
SELECT
  (SELECT COUNT(*) FROM workers) as workers,
  (SELECT COUNT(*) FROM platforms) as platforms,
  (SELECT COUNT(*) FROM tasks) as tasks,
  (SELECT COUNT(*) FROM transactions) as transactions;

-- Check worker stats
SELECT name, email, reputation_score, total_earned
FROM workers
ORDER BY reputation_score DESC;

-- View recent tasks
SELECT t.title, w.name as worker, p.name as platform, t.amount, t.status
FROM tasks t
JOIN workers w ON t.worker_id = w.id
JOIN platforms p ON t.platform_id = p.id
ORDER BY t.created_at DESC
LIMIT 10;
```

## 🔧 Troubleshooting

### Connection Issues

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify database exists
sudo -u postgres psql -l | grep gigstream

# Test connection
sudo -u postgres psql -d gigstream_dev -c "SELECT version();"
```

### Migration Issues

```bash
# Check migration status
npx prisma migrate status

# Reset if needed
npm run db:reset

# Regenerate client
npm run db:generate
```

### Trigger Issues

```bash
# List triggers
sudo -u postgres psql -d gigstream_dev -c "\dft"

# Reapply triggers
sudo -u postgres psql -d gigstream_dev -f prisma/triggers.sql
```

## 📦 Environment Setup

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Update DATABASE_URL
# Edit .env and set your PostgreSQL connection string

# 3. Run setup
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

## 🌐 Production Deployment (Neon)

```bash
# 1. Create Neon project
# Visit: https://console.neon.tech

# 2. Update .env with Neon connection string
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/gigstream?sslmode=require"

# 3. Deploy migrations
npm run db:migrate:deploy

# 4. Seed (optional)
npm run db:seed
```

## 📚 Resources

- [Prisma Docs](https://www.prisma.io/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Neon Docs](https://neon.tech/docs)
- [Backend README](./backend/README.md)

---

**Last Updated:** October 30, 2025  
**Database Version:** PostgreSQL 16.10  
**Prisma Version:** 5.22.0
