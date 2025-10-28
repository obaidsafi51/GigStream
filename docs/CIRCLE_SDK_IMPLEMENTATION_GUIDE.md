# Circle SDK Implementation Guide for GigStream

**Project**: GigStream  
**SDK**: Circle Developer-Controlled Wallets (Node.js/TypeScript)  
**Target**: Arc Testnet  
**Date**: October 28, 2025

---

## Quick Start References

### 📚 Essential Links

- **SDK Explorer**: https://developers.circle.com/sdk-explorer#server-side-sdks
- **API Reference**: https://developers.circle.com/api-reference
- **Quickstart Guide**: https://developers.circle.com/wallets/dev-controlled/create-your-first-wallet
- **Developer Console**: https://console.circle.com/

---

## 1. Setup & Installation

### Prerequisites

```bash
# Node.js 18+ required
node --version

# TypeScript
npm install -g typescript
```

### SDK Installation

```bash
# Initialize Node.js project
npm init -y

# Install Circle SDK
npm install @circle-fin/developer-controlled-wallets
npm install @circle-fin/circle-sdk

# Additional dependencies
npm install dotenv express axios
npm install --save-dev @types/node @types/express
```

### Environment Configuration

```bash
# .env file
CIRCLE_API_KEY=your_testnet_api_key_here
CIRCLE_ENTITY_SECRET=your_entity_secret_here
ENVIRONMENT=testnet
ARC_TESTNET_RPC=https://arc-testnet-rpc.circle.com
```

---

## 2. SDK Initialization

### Basic Setup

```typescript
import { CircleDeveloperSdk } from "@circle-fin/developer-controlled-wallets";
import * as dotenv from "dotenv";

dotenv.config();

// Initialize SDK
const circleSdk = new CircleDeveloperSdk({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
  environment: "testnet",
});

export default circleSdk;
```

---

## 3. Core API Implementations for GigStream

### 3.1 Create Wallet Set (Organization)

```typescript
/**
 * Step 1: Create a wallet set for GigStream platform
 * A wallet set allows multiple wallets to share the same address across chains
 */
async function createGigStreamWalletSet() {
  try {
    const response = await circleSdk.createWalletSet({
      name: "GigStream Platform Wallet Set",
    });

    console.log("Wallet Set Created:", response.data.walletSet);
    return response.data.walletSet;
  } catch (error) {
    console.error("Error creating wallet set:", error);
    throw error;
  }
}

// Response Structure:
// {
//   data: {
//     walletSet: {
//       id: "0189bc61-7fe4-70f3-8a1b-0d14426397cb",
//       custodyType: "DEVELOPER",
//       updateDate: "2025-10-28T12:00:00Z",
//       createDate: "2025-10-28T12:00:00Z"
//     }
//   }
// }
```

### 3.2 Create Worker Wallet

```typescript
/**
 * Step 2: Create individual wallet for gig worker on Arc testnet
 * This wallet will receive USDC payments for completed tasks
 */
async function createWorkerWallet(walletSetId: string, workerEmail: string) {
  try {
    const response = await circleSdk.createWallets({
      accountType: "SCA", // Smart Contract Account for gasless transactions
      blockchains: ["ARC-TESTNET"], // Circle's Arc blockchain
      count: 1,
      walletSetId: walletSetId,
      metadata: {
        workerEmail: workerEmail,
        purpose: "gig-worker-payment-wallet",
      },
    });

    const wallet = response.data.wallets[0];
    console.log("Worker Wallet Created:", wallet.address);
    return wallet;
  } catch (error) {
    console.error("Error creating worker wallet:", error);
    throw error;
  }
}

// Response Structure:
// {
//   data: {
//     wallets: [{
//       id: "ce714f5b-0d8e-4062-9454-61aa1154869b",
//       state: "LIVE",
//       walletSetId: "0189bc61-7fe4-70f3-8a1b-0d14426397cb",
//       custodyType: "DEVELOPER",
//       address: "0xf5c83e5fede8456929d0f90e8c541dcac3d63835",
//       blockchain: "ARC-TESTNET",
//       accountType: "SCA",
//       updateDate: "2025-10-28T12:00:00Z",
//       createDate: "2025-10-28T12:00:00Z"
//     }]
//   }
// }
```

### 3.3 Create Platform Treasury Wallet

```typescript
/**
 * Step 3: Create platform wallet to hold funds for payouts
 */
async function createPlatformWallet(walletSetId: string) {
  try {
    const response = await circleSdk.createWallets({
      accountType: "SCA",
      blockchains: ["ARC-TESTNET"],
      count: 1,
      walletSetId: walletSetId,
      metadata: {
        purpose: "platform-treasury",
        multiSig: "enabled",
      },
    });

    return response.data.wallets[0];
  } catch (error) {
    console.error("Error creating platform wallet:", error);
    throw error;
  }
}
```

### 3.4 Execute Task Payment

```typescript
/**
 * Step 4: Pay worker for completed task (real-time streaming payment)
 * This is the core function for GigStream's instant payout feature
 */
interface TaskPayment {
  workerId: string;
  workerWalletAddress: string;
  taskId: string;
  amount: string; // USDC amount (e.g., "25.50")
  platformWalletId: string;
}

async function executeTaskPayment(payment: TaskPayment) {
  try {
    // Transfer USDC from platform wallet to worker wallet
    const response = await circleSdk.createTransaction({
      walletId: payment.platformWalletId,
      destinationAddress: payment.workerWalletAddress,
      amounts: [payment.amount],
      tokenId: "USDC", // Native USDC on Arc
      blockchain: "ARC-TESTNET",
      fee: {
        type: "level",
        config: {
          feeLevel: "MEDIUM", // Arc's fast finality makes this instant anyway
        },
      },
      metadata: {
        taskId: payment.taskId,
        workerId: payment.workerId,
        paymentType: "task-completion",
        timestamp: new Date().toISOString(),
      },
    });

    console.log("Payment Transaction Created:", response.data.transaction);
    return response.data.transaction;
  } catch (error) {
    console.error("Error executing payment:", error);
    throw error;
  }
}

// Response Structure:
// {
//   data: {
//     transaction: {
//       id: "a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
//       state: "PENDING",
//       amounts: ["25.50"],
//       destinationAddress: "0xf5c83e5fede8456929d0f90e8c541dcac3d63835",
//       tokenId: "USDC",
//       txHash: "0x...", // Arc blockchain transaction hash
//       createDate: "2025-10-28T12:00:00Z"
//     }
//   }
// }
```

### 3.5 Check Wallet Balance

```typescript
/**
 * Step 5: Check worker's current balance for UI display
 */
async function getWorkerBalance(walletId: string) {
  try {
    const response = await circleSdk.getWalletBalance({
      walletId: walletId,
    });

    const usdcBalance = response.data.tokenBalances.find(
      (token) => token.token.symbol === "USDC"
    );

    console.log("Worker USDC Balance:", usdcBalance?.amount);
    return usdcBalance;
  } catch (error) {
    console.error("Error fetching balance:", error);
    throw error;
  }
}
```

### 3.6 Get Transaction Status

```typescript
/**
 * Step 6: Monitor transaction status (for real-time UI updates)
 */
async function getTransactionStatus(transactionId: string) {
  try {
    const response = await circleSdk.getTransaction({
      id: transactionId,
    });

    const transaction = response.data.transaction;

    // Transaction states: PENDING, CONFIRMED, COMPLETE, FAILED
    console.log("Transaction State:", transaction.state);

    if (transaction.state === "COMPLETE") {
      console.log("Payment successful! TxHash:", transaction.txHash);
    }

    return transaction;
  } catch (error) {
    console.error("Error fetching transaction:", error);
    throw error;
  }
}
```

---

## 4. GigStream-Specific Implementations

### 4.1 Onboard New Worker Flow

```typescript
/**
 * Complete worker onboarding with wallet creation
 */
async function onboardWorker(workerData: {
  email: string;
  name: string;
  platformId: string;
}) {
  try {
    // Step 1: Create wallet set for this worker
    const walletSet = await createGigStreamWalletSet();

    // Step 2: Create Arc testnet wallet
    const wallet = await createWorkerWallet(walletSet.id, workerData.email);

    // Step 3: Store in database
    await saveWorkerToDatabase({
      email: workerData.email,
      name: workerData.name,
      walletAddress: wallet.address,
      walletId: wallet.id,
      walletSetId: walletSet.id,
      blockchain: "ARC-TESTNET",
      createdAt: new Date(),
    });

    return {
      success: true,
      walletAddress: wallet.address,
      message: "Worker onboarded successfully",
    };
  } catch (error) {
    console.error("Worker onboarding failed:", error);
    throw error;
  }
}
```

### 4.2 Real-Time Payment Streaming

```typescript
/**
 * Process task completion and instant payment
 * This is triggered by webhook from gig platform
 */
async function processTaskCompletion(taskData: {
  workerId: string;
  taskId: string;
  platformId: string;
  amount: string;
}) {
  try {
    // Step 1: Get worker wallet info from DB
    const worker = await getWorkerFromDatabase(taskData.workerId);

    // Step 2: Get platform wallet
    const platform = await getPlatformFromDatabase(taskData.platformId);

    // Step 3: Execute instant payment via Circle SDK
    const transaction = await executeTaskPayment({
      workerId: taskData.workerId,
      workerWalletAddress: worker.walletAddress,
      taskId: taskData.taskId,
      amount: taskData.amount,
      platformWalletId: platform.walletId,
    });

    // Step 4: Update reputation score on-chain
    await updateReputationScore(worker.walletAddress, taskData.taskId);

    // Step 5: Send real-time notification to worker
    await notifyWorker(worker.email, {
      type: "payment_received",
      amount: taskData.amount,
      txHash: transaction.txHash,
      timestamp: new Date(),
    });

    return {
      success: true,
      transactionId: transaction.id,
      txHash: transaction.txHash,
    };
  } catch (error) {
    console.error("Task payment failed:", error);
    throw error;
  }
}
```

### 4.3 Micro-Loan Advance Payment

```typescript
/**
 * AI-powered advance payment (micro-loan)
 * Uses ML model to calculate safe advance amount
 */
async function processMicroLoanRequest(loanRequest: {
  workerId: string;
  requestedAmount: string;
}) {
  try {
    // Step 1: Get worker data and calculate eligibility
    const worker = await getWorkerFromDatabase(loanRequest.workerId);
    const creditScore = await calculateCreditScore(worker);
    const predictedEarnings = await predictNextWeekEarnings(worker);

    // Step 2: Calculate max advance (80% of predicted earnings)
    const maxAdvance = parseFloat(predictedEarnings) * 0.8;
    const requestedAmount = parseFloat(loanRequest.requestedAmount);

    if (requestedAmount > maxAdvance) {
      return {
        success: false,
        message: "Requested amount exceeds eligibility",
        maxAdvance: maxAdvance.toString(),
      };
    }

    // Step 3: Calculate fee based on risk score (2-5%)
    const riskFactor = (1000 - creditScore) / 1000;
    const feePercentage = 0.02 + riskFactor * 0.03;
    const feeAmount = requestedAmount * feePercentage;
    const netAmount = requestedAmount - feeAmount;

    // Step 4: Execute advance payment via Circle SDK
    const platform = await getPlatformFromDatabase(worker.platformId);
    const transaction = await executeTaskPayment({
      workerId: loanRequest.workerId,
      workerWalletAddress: worker.walletAddress,
      taskId: `ADVANCE_${Date.now()}`,
      amount: netAmount.toString(),
      platformWalletId: platform.walletId,
    });

    // Step 5: Record loan in database and smart contract
    await recordMicroLoan({
      workerId: loanRequest.workerId,
      amount: requestedAmount.toString(),
      fee: feeAmount.toString(),
      netAmount: netAmount.toString(),
      transactionId: transaction.id,
      txHash: transaction.txHash,
      status: "ACTIVE",
      createdAt: new Date(),
    });

    return {
      success: true,
      netAmount: netAmount.toString(),
      fee: feeAmount.toString(),
      transactionId: transaction.id,
    };
  } catch (error) {
    console.error("Micro-loan processing failed:", error);
    throw error;
  }
}
```

---

## 5. API Endpoints for Frontend Integration

### 5.1 Worker Endpoints

```typescript
import express from "express";
const router = express.Router();

// POST /api/workers/onboard
router.post("/onboard", async (req, res) => {
  try {
    const result = await onboardWorker(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/workers/:id/balance
router.get("/:id/balance", async (req, res) => {
  try {
    const worker = await getWorkerFromDatabase(req.params.id);
    const balance = await getWorkerBalance(worker.walletId);
    res.json({ balance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/workers/:id/advance
router.post("/:id/advance", async (req, res) => {
  try {
    const result = await processMicroLoanRequest({
      workerId: req.params.id,
      requestedAmount: req.body.amount,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 5.2 Webhook Endpoint (Platform Integration)

```typescript
// POST /webhooks/task-completed
router.post("/task-completed", async (req, res) => {
  try {
    const result = await processTaskCompletion(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 6. Testing on Arc Testnet

### 6.1 Get Testnet USDC

```typescript
/**
 * Request testnet USDC from faucet (for testing)
 */
async function requestTestnetUSDC(walletAddress: string) {
  // This will be available via Circle Console testnet faucet
  console.log("Request testnet USDC for:", walletAddress);
  console.log("Visit: https://console.circle.com/");
}
```

### 6.2 Test Payment Flow

```bash
# Test sequence for demo
npm run test:onboard-worker
npm run test:fund-platform-wallet
npm run test:execute-payment
npm run test:check-balance
npm run test:micro-loan
```

---

## 7. Error Handling & Best Practices

### 7.1 Retry Logic for Transactions

```typescript
async function executePaymentWithRetry(
  payment: TaskPayment,
  maxRetries: number = 3
) {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const transaction = await executeTaskPayment(payment);

      // Wait for confirmation (Arc is fast, ~350ms)
      await waitForConfirmation(transaction.id);

      return transaction;
    } catch (error) {
      attempt++;
      console.log(`Payment attempt ${attempt} failed, retrying...`);

      if (attempt >= maxRetries) {
        throw new Error(`Payment failed after ${maxRetries} attempts`);
      }

      await sleep(1000 * attempt); // Exponential backoff
    }
  }
}

async function waitForConfirmation(transactionId: string) {
  const maxWait = 5000; // 5 seconds max wait
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const status = await getTransactionStatus(transactionId);

    if (status.state === "COMPLETE") {
      return status;
    }

    if (status.state === "FAILED") {
      throw new Error("Transaction failed on blockchain");
    }

    await sleep(500);
  }

  throw new Error("Transaction confirmation timeout");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### 7.2 Input Validation

```typescript
import Joi from "joi";

const taskPaymentSchema = Joi.object({
  workerId: Joi.string().uuid().required(),
  workerWalletAddress: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .required(),
  taskId: Joi.string().required(),
  amount: Joi.string()
    .pattern(/^\d+\.\d{2}$/)
    .required(),
  platformWalletId: Joi.string().uuid().required(),
});

function validatePayment(payment: TaskPayment) {
  const { error } = taskPaymentSchema.validate(payment);
  if (error) {
    throw new Error(`Invalid payment data: ${error.message}`);
  }
}
```

---

## 8. Monitoring & Logging

### 8.1 Transaction Logging

```typescript
import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: "payments.log" })],
});

function logPayment(payment: TaskPayment, transaction: any) {
  logger.info("Payment executed", {
    workerId: payment.workerId,
    taskId: payment.taskId,
    amount: payment.amount,
    transactionId: transaction.id,
    txHash: transaction.txHash,
    timestamp: new Date().toISOString(),
  });
}
```

### 8.2 Real-Time Dashboard Metrics

```typescript
async function getPaymentMetrics() {
  return {
    totalPaymentsToday: await countTodaysPayments(),
    averagePaymentTime: await calculateAverageSettlementTime(),
    activeWorkers: await countActiveWorkers(),
    systemHealth: await checkSystemHealth(),
  };
}
```

---

## 9. Next Steps

### Day 1-2 (Foundation)

- [ ] Set up Circle Developer account
- [ ] Generate API keys
- [ ] Install Circle SDK
- [ ] Create first wallet set
- [ ] Create test wallets on Arc testnet
- [ ] Execute first USDC transaction

### Day 3-5 (Integration)

- [ ] Implement worker onboarding flow
- [ ] Build task payment automation
- [ ] Deploy PaymentStreaming.sol smart contract
- [ ] Test end-to-end payment flow

### Day 6-9 (Full System)

- [ ] Add micro-loan functionality
- [ ] Implement reputation tracking
- [ ] Build React dashboard
- [ ] Real-time balance updates

### Day 10-13 (Demo)

- [ ] Create demo scenarios
- [ ] Test with multiple workers
- [ ] Record video walkthrough
- [ ] Document API integration

---

## 10. Resources

**Official Documentation**:

- Circle SDK: https://developers.circle.com/sdk-explorer#server-side-sdks
- API Reference: https://developers.circle.com/api-reference
- Quickstart: https://developers.circle.com/wallets/dev-controlled/create-your-first-wallet

**Support**:

- Circle Developer Discord: [Join community]
- GitHub Issues: [Circle SDK repo]
- Email: developer@circle.com

---

**Last Updated**: October 28, 2025  
**Version**: 1.0  
**Status**: Ready for implementation
