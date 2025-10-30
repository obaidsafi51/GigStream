# GigStream Backend - Database Setup Guide

## 📋 Prerequisites

- Node.js 18+ installed
- PostgreSQL client (optional, for local testing)
- Neon.tech account (https://neon.tech)
- Circle Developer account (https://console.circle.com)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

This will install:

- Prisma ORM and client
- Neon serverless adapter
- Hono framework
- All necessary dependencies

### 2. Set Up Neon Database

1. Create a Neon account at https://console.neon.tech
2. Create a new project named `gigstream`
3. Copy the connection string
4. Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

5. Update the `DATABASE_URL` in `.env`:

```env
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/gigstream_db?sslmode=require"
```

### 3. Generate Prisma Client

```bash
npm run db:generate
```

This creates the Prisma client from your schema.

### 4. Run Database Migration

```bash
npm run db:migrate
```

This will:

- Create all 8 tables (workers, platforms, tasks, streams, transactions, reputation_events, loans, audit_logs)
- Set up indexes and foreign keys
- Apply constraints

### 5. Apply Triggers and Views (Optional but Recommended)

After the initial migration, apply database triggers and views:

```bash
# Connect to your Neon database
psql $DATABASE_URL

# Run triggers
\i prisma/triggers.sql

# Run views
\i prisma/views.sql

# Exit
\q
```

Alternatively, you can add these to a custom migration:

```bash
npx prisma migrate dev --name add_triggers_and_views --create-only
```

Then paste the contents of `triggers.sql` and `views.sql` into the generated migration file.

### 6. Seed the Database

Populate with demo data (10 workers, 5 platforms, 20 tasks):

```bash
npm run db:seed
```

**Demo Login Credentials:**

- Email: `alice@example.com`
- Password: `demo123`
- (All demo accounts use `demo123`)

### 7. Verify Setup

Open Prisma Studio to browse your data:

```bash
npm run db:studio
```

This opens a web interface at http://localhost:5555

## 📊 Database Schema

### Tables Overview

| Table                 | Purpose                   | Key Fields                                     |
| --------------------- | ------------------------- | ---------------------------------------------- |
| **workers**           | Gig worker profiles       | wallet_address, reputation_score, total_earned |
| **platforms**         | Gig platforms (clients)   | api_key, webhook_url                           |
| **tasks**             | Individual gig tasks      | amount, status, worker_id, platform_id         |
| **streams**           | Payment streaming records | total_amount, released_amount, next_release_at |
| **transactions**      | Blockchain transactions   | tx_hash, amount, status                        |
| **reputation_events** | Reputation changes        | worker_id, delta, event_type                   |
| **loans**             | Advance loans             | amount, status, repayment_due                  |
| **audit_logs**        | System audit trail        | actor_id, action, resource_type                |

### Database Views

- `worker_earnings_view` - Aggregated earnings per worker
- `platform_performance_view` - Platform analytics
- `daily_transaction_summary` - Transaction metrics by day
- `worker_risk_assessment` - Real-time risk scoring
- `active_streams_view` - Monitoring active payment streams

## 🔄 Common Operations

### Reset Database

**Warning:** This deletes all data!

```bash
npm run db:reset
```

This will:

1. Drop all tables
2. Re-run migrations
3. Re-seed data

### Create a New Migration

After changing `schema.prisma`:

```bash
npm run db:migrate
```

Prisma will detect changes and create a migration.

### Push Schema Changes (Development Only)

For rapid prototyping without creating migrations:

```bash
npm run db:push
```

**Note:** Don't use in production!

### View Current Schema

```bash
npx prisma db pull
```

This syncs your `schema.prisma` with the actual database.

## 🧪 Testing Queries

Test database queries in Prisma Studio or using the database service:

```typescript
import { getPrisma, queries } from "./src/services/database";

const prisma = getPrisma();

// Get worker profile
const worker = await queries.getWorkerProfile(prisma, "worker_id");

// Get worker earnings
const earnings = await queries.getWorkerEarnings(prisma, "worker_id");

// Get active streams
const streams = await queries.getActiveStreams(prisma);
```

## 📝 Environment Variables

Required variables in `.env`:

```env
# Database
DATABASE_URL="postgresql://..."

# Circle API
CIRCLE_API_KEY="TEST_API_KEY:..."
CIRCLE_ENTITY_SECRET="..."

# JWT
JWT_SECRET="your-secret-key"

# Application
API_PORT="3001"
NODE_ENV="development"
```

## 🔒 Security Best Practices

1. **Never commit `.env`** - It's already in `.gitignore`
2. **Rotate API keys regularly** - Circle allows key rotation
3. **Use connection pooling** - Already configured for Neon
4. **Enable SSL** - Always use `?sslmode=require` in DATABASE_URL
5. **Limit database user permissions** - Create separate users for different environments

## 🌿 Branching (Neon Feature)

Neon supports database branches for development:

```bash
# Create a branch
neonctl branches create --name dev-branch

# Get connection string
neonctl connection-string dev-branch

# Update .env with branch connection string
```

This is perfect for testing migrations without affecting production!

## 🐛 Troubleshooting

### "Can't reach database server"

- Check your `DATABASE_URL` is correct
- Verify Neon project is running (check console.neon.tech)
- Ensure your IP is not blocked (Neon has IP allowlisting)

### "Table doesn't exist"

- Run migrations: `npm run db:migrate`
- Check migration status: `npx prisma migrate status`

### "Prisma Client not generated"

- Run: `npm run db:generate`
- Restart TypeScript server in VS Code

### Triggers/Views not working

- Apply manually: `psql $DATABASE_URL -f prisma/triggers.sql`
- Check logs: `\dt` to list tables, `\df` to list functions

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Neon Documentation](https://neon.tech/docs)
- [Circle Developer Docs](https://developers.circle.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## 🎯 Next Steps

After completing database setup:

1. ✅ Move to **Task 3.3**: Backend API Foundation
2. Implement authentication endpoints
3. Create worker and platform routes
4. Connect to Circle API for wallet management

---

**Need Help?** Check the main project README or open an issue on GitHub.
