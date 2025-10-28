# GigStream

**AI-Powered Real-Time Payment Streaming for Gig Workers on Circle's Arc Blockchain**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built on Arc](https://img.shields.io/badge/Built%20on-Arc-blue)](https://www.circle.com/arc)

---

## 🚀 Overview

GigStream is an AI-powered financial agent system that provides real-time USDC payment streaming for gig economy workers. Built on Circle's Arc blockchain, it eliminates payment delays by automating instant micro-payments as tasks are completed, while leveraging AI for predictive advances, risk scoring, and intelligent financial optimization.

**Key Features:**

- ⚡ **Instant Payments**: Sub-second USDC payouts upon task completion
- 🔄 **Payment Streaming**: Continuous earnings for time-based work
- 🤖 **AI Risk Scoring**: ML-powered creditworthiness assessment
- 💰 **Predictive Advances**: Smart micro-loans based on earnings forecasts
- 🏆 **On-Chain Reputation**: Transparent, portable worker performance tracking
- 🔐 **Developer-Controlled Wallets**: Seamless Circle wallet integration

---

## 📁 Project Structure

```
GigStream/
├── contracts/          # Solidity smart contracts (PaymentStreaming, ReputationLedger, MicroLoan)
├── backend/            # Cloudflare Workers API (Hono framework)
├── frontend/           # Next.js 15 app with TypeScript
├── docs/               # Additional documentation
├── scripts/            # Deployment and utility scripts
├── project/            # Design docs (PRD, requirements, design, tasks)
└── .github/workflows/  # CI/CD pipelines
```

---

## 🛠️ Tech Stack

### Blockchain

- **Arc Testnet** - Circle's Layer-1 blockchain with native USDC
- **Solidity 0.8.20+** - Smart contract development
- **Circle Developer-Controlled Wallets** - Wallet management
- **OpenZeppelin** - Security patterns

### Backend

- **Cloudflare Workers** - Edge computing runtime
- **Hono Framework** - Lightweight web framework
- **PostgreSQL 15+** - Primary database
- **TypeScript 5+** - Type-safe development

### Frontend

- **Next.js 15** - React framework with App Router
- **React 19 RC** - Latest React features
- **TypeScript 5.3+** - Static typing
- **Tailwind CSS 4** - Styling
- **Zustand** - State management
- **Recharts** - Data visualization

### AI/ML

- **Cloudflare Workers AI** - Task verification and risk scoring
- **Predictive Analytics** - Earnings forecasting

---

## 📋 Prerequisites

Before you begin, ensure you have installed:

- **Node.js 18+** and npm/yarn
- **PostgreSQL 15+** (or Docker)
- **Git**
- **Circle Developer Account** (for API keys)
- **Arc Testnet Access** (via Circle)

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/obaidsafi51/GigStream.git
cd GigStream
```

### 2. Environment Setup

Copy the example environment files and fill in your credentials:

```bash
# Root .env
cp .env.example .env

# Edit .env and fill in your credentials
```

**Required Environment Variables:**

See `.env.example` for complete list. Key variables:

- `ARC_RPC_URL` - Arc testnet RPC endpoint
- `CIRCLE_API_KEY` - Circle API key
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens

### 3. Install Dependencies

```bash
# Install smart contract dependencies
cd contracts
npm install

# Install backend dependencies
cd ../backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 4. Database Setup

```bash
# Run database migrations
cd backend
npm run db:migrate

# Seed demo data
npm run db:seed
```

### 5. Deploy Smart Contracts

```bash
cd contracts
npm run compile
npm run deploy:testnet
```

Save the deployed contract addresses to your `.env` file.

### 6. Run Development Servers

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

### 7. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health

---

## 🧪 Testing

### Smart Contracts

```bash
cd contracts
npm run test
npm run coverage
```

### Backend API

```bash
cd backend
npm run test
npm run test:integration
```

### Frontend

```bash
cd frontend
npm run test
npm run test:e2e
```

---

## 📚 Documentation

- **[PRD.md](./PRD.md)** - Product Requirements Document
- **[project/requirements.md](./project/requirements.md)** - Technical Requirements
- **[project/design.md](./project/design.md)** - Low-Level Design Document (4,549 lines)
- **[project/tasks.md](./project/tasks.md)** - Implementation Tasks (13-day timeline)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                            │
│  Worker Dashboard | Platform Admin | Demo Simulator          │
│              (Next.js 15 Monorepo)                          │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│              API GATEWAY (Cloudflare Workers)                │
│  Authentication | Rate Limiting | Validation                │
└──────────────┬──────────────────────────────────────────────┘
               │
    ┌──────────┼──────────┬───────────┬──────────┐
    │          │          │           │          │
┌───▼──┐  ┌───▼───┐  ┌───▼────┐  ┌──▼─────┐  ┌▼────────┐
│ Auth │  │Payment│  │  Risk  │  │Webhook │  │Database │
│Service│ │Orchestr│ │ Engine │  │Handler │  │(Postgres)│
└───┬──┘  └───┬───┘  └───┬────┘  └──┬─────┘  └┬────────┘
    │         │          │           │         │
    └─────────┴──────────┴───────────┴─────────┘
                         │
        ┌────────────────┴────────────────┐
        │      Circle Developer Wallets   │
        │           Arc Testnet            │
        │  Smart Contracts (USDC Payments) │
        └─────────────────────────────────┘
```

---

## 🎯 Key Features Walkthrough

### 1. Worker Registration & Wallet Creation

- Worker signs up via frontend
- Backend creates Circle Developer-Controlled Wallet
- Wallet address stored in database
- JWT token issued for authentication

### 2. Instant Payment Flow

- Platform webhook notifies task completion
- AI verification agent validates task
- Risk engine calculates eligibility
- USDC transferred via Circle API
- Transaction confirmed on Arc blockchain
- Worker balance updated in real-time

### 3. Payment Streaming

- Platform creates payment stream via smart contract
- Funds locked in escrow
- Automated releases every interval (e.g., per minute)
- Worker can claim earnings anytime
- Platform can pause/cancel with proper safeguards

### 4. Advance Payments (Micro-Loans)

- AI predicts worker's next 7-day earnings
- Risk score calculated based on history
- Max advance: 80% of predicted earnings
- Loan approved and disbursed instantly
- Auto-repayment from next 5 tasks

### 5. On-Chain Reputation

- Every completed task updates reputation score
- Factors: completion rate, punctuality, ratings, disputes
- Score stored on-chain (ReputationLedger contract)
- Portable across platforms

---

## 🚢 Deployment

### Smart Contracts (Arc Testnet)

```bash
cd contracts
npm run deploy:testnet
```

### Backend (Cloudflare Workers)

```bash
cd backend
npm run deploy
```

### Frontend (Cloudflare Pages)

```bash
cd frontend
npm run build
npm run deploy
```

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🏆 Hackathon Submission

This project is submitted to the **Circle Arc Hackathon** (October 2025).

**Demo Video:** [Coming soon]

**Live Demo:** [Coming soon]

---

## 📞 Contact & Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/obaidsafi51/GigStream/issues)
- **Documentation**: See `/project` folder for detailed design docs

---

## 🙏 Acknowledgments

- **Circle** - For Arc blockchain and Developer-Controlled Wallets SDK
- **Cloudflare** - For Workers and Pages hosting
- **OpenZeppelin** - For secure smart contract libraries

---

**Built with ❤️ for the gig economy on Circle's Arc blockchain**
