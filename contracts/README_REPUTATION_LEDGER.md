# ReputationLedger Contract

## Overview

The **ReputationLedger** smart contract provides on-chain reputation tracking for gig workers in the GigStream ecosystem. It implements a transparent, immutable scoring algorithm that rewards task completion, punctuality, and high ratings while penalizing disputes.

## Contract Address

- **Arc Testnet**: TBD (to be deployed)
- **Solidity Version**: 0.8.20
- **License**: MIT

## Key Features

### Reputation Scoring

- **Base Score**: 100 points for new workers
- **Score Range**: 0-1000 points
- **Task Completion**: +2 points per task
- **On-Time Bonus**: +1 point for punctual completion
- **High Rating Bonus**: +1 point for 4-5 star ratings
- **Dispute Penalty**: -10 to -50 points based on severity (1-5)

### Data Tracking

- Total tasks assigned and completed
- On-time completion rate
- Dispute history
- Average ratings (1-5 stars)
- Comprehensive reputation data per worker

### Security Features

- **OpenZeppelin**: Ownable and Pausable for administrative control
- **Authorization**: Only authorized recorders can update reputation
- **Emergency Pause**: Owner can halt all operations if needed
- **Immutable History**: On-chain reputation events are permanent

## Architecture

### Data Structure

```solidity
struct ReputationData {
    uint256 score;              // Current reputation score (0-1000)
    uint256 totalTasks;         // Total tasks assigned
    uint256 completedOnTime;    // Tasks completed on time
    uint256 totalDisputes;      // Number of disputes filed
    uint256 totalRatings;       // Number of ratings received
    uint256 sumOfRatings;       // Sum of all ratings (for average)
}
```

### Core Functions

#### Recording Functions

**`recordCompletion(address worker, uint256 taskId, bool onTime, uint8 rating)`**

- Records a completed task and updates worker reputation
- Adds points based on completion, punctuality, and rating
- Emits `TaskRecorded` event
- Gas: ~126k (first call), ~6k (subsequent calls)

**`recordDispute(address worker, uint256 taskId, uint8 severity)`**

- Records a dispute and penalizes worker reputation
- Deducts 10-50 points based on severity (1-5)
- Emits `DisputeRecorded` event
- Gas: ~27k

**`updateScore(address worker, uint256 newScore)`**

- Manual score adjustment by owner (exceptional cases only)
- Useful for correcting errors or handling special situations
- Gas: ~24k

#### View Functions

**`getReputationScore(address worker)`**

- Returns current score and total tasks completed
- Gas: ~4k (view function)

**`getCompletionRate(address worker)`**

- Returns on-time completion rate in basis points (10000 = 100%)
- Gas: ~13k (view function)

**`getAverageRating(address worker)`**

- Returns average rating scaled by 100 (500 = 5.00 stars)
- Gas: ~13k (view function)

**`getReputationData(address worker)`**

- Returns complete reputation data struct
- Gas: ~14k (view function)

#### Admin Functions

**`addAuthorizedRecorder(address recorder)`**

- Authorizes an address to record reputation events
- Only owner can call
- Emits `AuthorizedRecorderAdded` event

**`removeAuthorizedRecorder(address recorder)`**

- Removes authorization from an address
- Only owner can call
- Emits `AuthorizedRecorderRemoved` event

**`pause()` / `unpause()`**

- Emergency pause functionality
- Only owner can call
- Stops all recording operations when paused

## Events

```solidity
event TaskRecorded(
    address indexed worker,
    uint256 indexed taskId,
    bool onTime,
    uint8 rating,
    uint256 newScore
);

event DisputeRecorded(
    address indexed worker,
    uint256 indexed taskId,
    uint8 severity,
    uint256 pointsLost,
    uint256 newScore
);

event AuthorizedRecorderAdded(address indexed recorder);
event AuthorizedRecorderRemoved(address indexed recorder);
```

## Scoring Algorithm

### Points Calculation

| Action                  | Points |
| ----------------------- | ------ |
| Task Completion         | +2     |
| On-Time Completion      | +1     |
| High Rating (4-5 stars) | +1     |
| Dispute (Severity 1)    | -10    |
| Dispute (Severity 2)    | -20    |
| Dispute (Severity 3)    | -30    |
| Dispute (Severity 4)    | -40    |
| Dispute (Severity 5)    | -50    |

### Example Scenarios

**New Worker - Perfect Performance**

- Base Score: 100
- Task 1 (on-time, 5 stars): +4 points → 104
- Task 2 (on-time, 4 stars): +4 points → 108
- Task 3 (on-time, 5 stars): +4 points → 112

**Worker with Dispute**

- Current Score: 150
- Task completed late (3 stars): +2 points → 152
- Dispute filed (severity 3): -30 points → 122

**Maximum Score**

- Score capped at 1000
- Multiple high-performance tasks will eventually reach maximum
- Maximum score indicates exceptional reliability

## Gas Costs

| Operation          | Gas (Typical) | Gas (First Call) |
| ------------------ | ------------- | ---------------- |
| recordCompletion   | ~6,000        | ~126,000         |
| recordDispute      | ~27,000       | -                |
| getReputationScore | ~4,000        | -                |
| getCompletionRate  | ~13,000       | -                |
| getAverageRating   | ~13,000       | -                |
| updateScore        | ~24,000       | -                |

**Note**: First calls have higher gas costs due to storage initialization.

## Integration Guide

### Backend Integration

```typescript
import { ethers } from "ethers";
import ReputationLedgerABI from "./abis/ReputationLedger.json";

const provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const reputationLedger = new ethers.Contract(
  process.env.REPUTATION_LEDGER_ADDRESS,
  ReputationLedgerABI,
  wallet
);

// Record task completion
async function recordTaskCompletion(
  workerAddress: string,
  taskId: number,
  onTime: boolean,
  rating: number
) {
  const tx = await reputationLedger.recordCompletion(
    workerAddress,
    taskId,
    onTime,
    rating
  );
  await tx.wait();
  console.log("Reputation updated:", tx.hash);
}

// Get worker reputation
async function getWorkerReputation(workerAddress: string) {
  const [score, totalTasks] = await reputationLedger.getReputationScore(
    workerAddress
  );
  const completionRate = await reputationLedger.getCompletionRate(
    workerAddress
  );
  const avgRating = await reputationLedger.getAverageRating(workerAddress);

  return {
    score: score.toString(),
    totalTasks: totalTasks.toString(),
    completionRate: (Number(completionRate) / 100).toFixed(2) + "%",
    avgRating: (Number(avgRating) / 100).toFixed(2),
  };
}

// Record dispute
async function recordDispute(
  workerAddress: string,
  taskId: number,
  severity: number
) {
  const tx = await reputationLedger.recordDispute(
    workerAddress,
    taskId,
    severity
  );
  await tx.wait();
  console.log("Dispute recorded:", tx.hash);
}
```

### Event Listening

```typescript
// Listen for reputation updates
reputationLedger.on(
  "TaskRecorded",
  (worker, taskId, onTime, rating, newScore, event) => {
    console.log("Task recorded:", {
      worker,
      taskId: taskId.toString(),
      onTime,
      rating,
      newScore: newScore.toString(),
      txHash: event.log.transactionHash,
    });

    // Update database
    updateWorkerReputationInDB(worker, newScore);
  }
);

reputationLedger.on(
  "DisputeRecorded",
  (worker, taskId, severity, pointsLost, newScore, event) => {
    console.log("Dispute recorded:", {
      worker,
      taskId: taskId.toString(),
      severity,
      pointsLost: pointsLost.toString(),
      newScore: newScore.toString(),
      txHash: event.log.transactionHash,
    });

    // Update database and notify worker
    updateWorkerReputationInDB(worker, newScore);
    notifyWorkerOfDispute(worker, taskId, severity);
  }
);
```

## Testing

The contract includes a comprehensive test suite with 51 tests covering:

- ✅ Deployment and initialization
- ✅ Authorization management
- ✅ Task recording (all scenarios)
- ✅ Dispute recording (all severities)
- ✅ View functions (all data retrieval methods)
- ✅ Manual score updates
- ✅ Pause functionality
- ✅ Gas measurements
- ✅ Integration scenarios
- ✅ Edge cases and error handling

### Running Tests

```bash
cd contracts
forge test --match-contract ReputationLedgerTest
```

### Test Coverage

- **Total Tests**: 51
- **Pass Rate**: 100%
- **Code Coverage**: >95%

## Security Considerations

1. **Authorization**: Only authorized recorders can update reputation

   - Backend service address must be added via `addAuthorizedRecorder()`
   - Deploy with owner address, then authorize backend

2. **Immutability**: Reputation events are permanent on-chain

   - Cannot be deleted or modified (except via owner `updateScore()`)
   - Provides transparent, tamper-proof history

3. **Emergency Controls**: Owner can pause all operations

   - Use in case of bugs or attacks
   - Does not affect view functions

4. **Input Validation**: All inputs are validated

   - Non-zero addresses required
   - Rating range: 0-5
   - Severity range: 1-5
   - Score cap: 1000

5. **Audit Recommendations**:
   - Formal audit recommended before mainnet deployment
   - Additional testing with larger datasets
   - Consider upgradeability pattern for production

## Deployment

### Deployment Script

```bash
# Compile contracts
forge build

# Deploy to Arc testnet
forge create src/ReputationLedger.sol:ReputationLedger \
  --rpc-url $ARC_RPC_URL \
  --private-key $PRIVATE_KEY

# Verify on Arc explorer (if available)
forge verify-contract \
  --chain-id 5042002 \
  --compiler-version 0.8.20 \
  <CONTRACT_ADDRESS> \
  src/ReputationLedger.sol:ReputationLedger
```

### Post-Deployment Setup

1. **Add Authorized Recorder**

   ```typescript
   await reputationLedger.addAuthorizedRecorder(BACKEND_ADDRESS);
   ```

2. **Transfer Ownership** (if needed)

   ```typescript
   await reputationLedger.transferOwnership(NEW_OWNER);
   ```

3. **Test Integration**
   - Record a test task completion
   - Verify reputation updates correctly
   - Test event listening

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or contributions:

- GitHub: https://github.com/obaidsafi51/GigStream
- Documentation: See `project/design.md` for full specifications

---

**Built for GigStream** - AI-Powered Real-Time Payment Streaming on Circle's Arc Blockchain
