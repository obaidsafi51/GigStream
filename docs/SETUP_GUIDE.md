# GigStream Development Environment Setup Guide

## Prerequisites

- **Node.js**: v18+ (Current: v22.19.0 ✅)
- **npm**: v8+ (Current: v11.6.0 ✅)
- **PostgreSQL**: v15+
- **Git**: Latest version

## Step 1: Clone and Navigate

```bash
git clone <repository-url>
cd GigStream
```

## Step 2: PostgreSQL Setup (Local Installation)

### Option A: Install PostgreSQL Locally

#### Ubuntu/Debian:

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### macOS (using Homebrew):

```bash
brew install postgresql@15
brew services start postgresql@15
```

### Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE gigstream_dev;
CREATE USER gigstream WITH PASSWORD 'gigstream_password';
GRANT ALL PRIVILEGES ON DATABASE gigstream_dev TO gigstream;
\q
```

### Verify Connection

```bash
psql -U gigstream -d gigstream_dev -h localhost
# Enter password when prompted: gigstream_password
```

## Step 3: Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and fill in your values
nano .env  # or use your preferred editor
```

### Required Variables to Update:

1. **Arc Blockchain**:

   - Keep `ARC_RPC_URL` and `ARC_CHAIN_ID` as default
   - `DEPLOYER_PRIVATE_KEY`: Your wallet private key (get from MetaMask/other wallet)

2. **Circle APIs**:

   - `CIRCLE_API_KEY`: Get from https://console.circle.com/
   - `CIRCLE_ENTITY_SECRET`: From Circle Developer Console

3. **Database**:

   - Update `DATABASE_URL` if you used different credentials

4. **JWT Secret**:
   - Generate a strong secret: `openssl rand -base64 32`

## Step 4: Install Dependencies

### Contracts (Smart Contracts)

```bash
cd contracts
npm install
```

This will install:

- Hardhat
- OpenZeppelin Contracts
- Hardhat Toolbox
- Ethers.js

### Backend (API Server)

```bash
cd ../backend
npm install
```

### Frontend (Next.js App)

```bash
cd ../frontend
npm install
```

## Step 5: Initialize Hardhat

```bash
cd contracts
npx hardhat init
# Select: "Create a TypeScript project"
# Accept default project root
# Add .gitignore? Yes
# Install dependencies? Yes (if prompted)
```

## Step 6: Database Setup

```bash
cd ../backend
# Run migrations (once available)
npm run db:migrate

# Seed demo data
npm run db:seed
```

## Step 7: Verify Installation

### Test PostgreSQL Connection

```bash
psql -U gigstream -d gigstream_dev -h localhost -c "SELECT version();"
```

### Test Arc RPC Connection

```bash
curl -X POST https://arc-testnet.rpc.circle.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Test Hardhat

```bash
cd contracts
npx hardhat compile
```

## Step 8: Get Testnet Tokens

1. Visit Circle's Arc testnet faucet
2. Request test USDC tokens
3. Save your wallet address

## Quick Start Commands

```bash
# Compile smart contracts
cd contracts && npm run compile

# Deploy contracts to Arc testnet
cd contracts && npm run deploy:testnet

# Start backend API
cd backend && npm run dev

# Start frontend development server
cd frontend && npm run dev
```

## Troubleshooting

### PostgreSQL Connection Failed

- Check if PostgreSQL is running: `sudo systemctl status postgresql`
- Verify credentials in `.env`
- Check PostgreSQL logs: `sudo tail -f /var/log/postgresql/postgresql-15-main.log`

### Hardhat Compilation Errors

- Clear cache: `npx hardhat clean`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Arc RPC Connection Issues

- Check internet connection
- Verify `ARC_RPC_URL` in `.env`
- Check Circle's status page

## Environment Status Checklist

- [ ] Node.js v18+ installed
- [ ] PostgreSQL running
- [ ] Database created and accessible
- [ ] `.env` file configured
- [ ] All npm dependencies installed
- [ ] Hardhat initialized
- [ ] Arc RPC accessible
- [ ] Circle API credentials obtained
- [ ] Testnet tokens acquired

## Next Steps

Once setup is complete, proceed to:

1. Smart contract development (Task 2.1)
2. Database schema implementation (Task 1.4)
3. Backend API foundation (Task 3.3)

## Support

For issues, check:

- [Circle Developer Docs](https://developers.circle.com/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
