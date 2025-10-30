# PaymentStreaming Contract

## Overview

The **PaymentStreaming** contract is a core component of the GigStream platform that manages escrow and time-based payment releases for gig workers. It enables automated streaming of USDC payments over a specified duration with scheduled release intervals.

## Features

- ✅ **Escrow Management**: Safely holds USDC funds from platforms in escrow
- ✅ **Automated Releases**: Releases payments proportionally based on elapsed time
- ✅ **Worker Claims**: Workers can claim their released earnings at any time
- ✅ **Stream Control**: Platforms can pause, resume, or cancel streams
- ✅ **Emergency Pause**: Contract owner can pause all operations if needed
- ✅ **Gas Optimized**: Efficient storage and computation patterns
- ✅ **Security**: Built with OpenZeppelin's battle-tested security patterns

## Architecture

### State Variables

```solidity
IERC20 public immutable usdcToken;        // USDC token contract
uint256 public streamCount;                // Counter for stream IDs

enum StreamStatus { Active, Paused, Completed, Cancelled }

struct Stream {
    uint256 id;                 // Unique stream identifier
    address worker;             // Worker receiving payments
    address platform;           // Platform funding the stream
    uint256 totalAmount;        // Total USDC to stream
    uint256 releasedAmount;     // Amount released for claiming
    uint256 claimedAmount;      // Amount actually claimed by worker
    uint256 startTime;          // Stream start timestamp
    uint256 duration;           // Total duration in seconds
    uint256 releaseInterval;    // Seconds between releases
    uint256 lastReleaseTime;    // Last payment release timestamp
    StreamStatus status;        // Current stream status
}
```

### Constants

- `MIN_RELEASE_INTERVAL`: 60 seconds (prevents spam)
- `MAX_DURATION`: 30 days (maximum stream length)

## Core Functions

### createStream

Creates a new payment stream.

```solidity
function createStream(
    address worker,
    uint256 totalAmount,
    uint256 duration,
    uint256 releaseInterval
) external returns (uint256 streamId)
```

**Parameters:**

- `worker`: Address of the gig worker receiving payments
- `totalAmount`: Total USDC to be streamed (in token decimals, e.g., 1000 \* 10^6 for 1000 USDC)
- `duration`: Total stream duration in seconds
- `releaseInterval`: Interval between payment releases in seconds

**Requirements:**

- Worker address must not be zero
- Amount must be positive
- Duration must be between 1 second and 30 days
- Release interval must be >= 60 seconds and <= duration
- Platform must have approved contract to spend USDC

**Gas Usage:** ~367,000 gas

**Example:**

```javascript
// Create a 1-hour stream for $1000 USDC with 5-minute intervals
const streamId = await paymentStreaming.createStream(
  workerAddress,
  1000 * 10 ** 6, // 1000 USDC
  3600, // 1 hour
  300 // 5 minutes
);
```

### releasePayment

Releases the next payment installment based on elapsed time.

```solidity
function releasePayment(uint256 streamId) external
```

**Parameters:**

- `streamId`: The ID of the stream to release payment for

**Requirements:**

- Stream must exist and be active
- At least `releaseInterval` seconds must have passed since last release
- There must be unreleased funds available

**Calculation:**

- Payments are released proportionally to time elapsed
- Formula: `releasableAmount = (totalAmount * elapsedTime) / totalDuration`

**Gas Usage:** ~72,000 gas

**Example:**

```javascript
// After 5 minutes have passed, release proportional payment
await paymentStreaming.releasePayment(streamId);
```

### claimEarnings

Worker claims their released but unclaimed earnings.

```solidity
function claimEarnings(uint256 streamId) external
```

**Parameters:**

- `streamId`: The ID of the stream to claim from

**Requirements:**

- Only the worker can claim their earnings
- There must be released but unclaimed funds

**Gas Usage:** ~90,000 gas

**Example:**

```javascript
// Worker claims all available earnings
await paymentStreaming.connect(worker).claimEarnings(streamId);
```

### pauseStream

Temporarily stops a payment stream.

```solidity
function pauseStream(uint256 streamId) external
```

**Parameters:**

- `streamId`: The ID of the stream to pause

**Requirements:**

- Only platform or contract owner can pause
- Stream must be active

### resumeStream

Resumes a paused payment stream.

```solidity
function resumeStream(uint256 streamId) external
```

**Parameters:**

- `streamId`: The ID of the stream to resume

**Requirements:**

- Only platform or contract owner can resume
- Stream must be paused
- Resets the release timer to current timestamp

### cancelStream

Cancels a stream and distributes remaining funds.

```solidity
function cancelStream(uint256 streamId) external
```

**Parameters:**

- `streamId`: The ID of the stream to cancel

**Requirements:**

- Only platform or contract owner can cancel
- Stream must be active or paused

**Behavior:**

- Transfers all released but unclaimed funds to worker
- Refunds all unreleased funds to platform
- Sets stream status to Cancelled

## View Functions

### getStreamDetails

Returns complete information about a stream.

```solidity
function getStreamDetails(uint256 streamId) external view returns (Stream memory)
```

### getWorkerStreams

Returns all stream IDs for a specific worker.

```solidity
function getWorkerStreams(address worker) external view returns (uint256[] memory)
```

### getPlatformStreams

Returns all stream IDs for a specific platform.

```solidity
function getPlatformStreams(address platform) external view returns (uint256[] memory)
```

## Events

### StreamCreated

```solidity
event StreamCreated(
    uint256 indexed streamId,
    address indexed worker,
    address indexed platform,
    uint256 totalAmount,
    uint256 duration,
    uint256 releaseInterval
);
```

### PaymentReleased

```solidity
event PaymentReleased(
    uint256 indexed streamId,
    address indexed worker,
    uint256 amount,
    uint256 totalReleased
);
```

### EarningsClaimed

```solidity
event EarningsClaimed(
    uint256 indexed streamId,
    address indexed worker,
    uint256 amount
);
```

### StreamPaused

```solidity
event StreamPaused(uint256 indexed streamId, address indexed by);
```

### StreamResumed

```solidity
event StreamResumed(uint256 indexed streamId, address indexed by);
```

### StreamCancelled

```solidity
event StreamCancelled(
    uint256 indexed streamId,
    address indexed by,
    uint256 refundAmount
);
```

### StreamCompleted

```solidity
event StreamCompleted(uint256 indexed streamId, uint256 totalPaid);
```

## Security Features

### OpenZeppelin Security Patterns

1. **ReentrancyGuard**: Prevents reentrancy attacks on state-changing functions
2. **Pausable**: Emergency pause mechanism for contract owner
3. **Ownable**: Access control for administrative functions

### Additional Security

- Transfer-before-state-change pattern to prevent race conditions
- Comprehensive input validation on all public functions
- Immutable USDC token address to prevent malicious token swaps
- Explicit status checks before state transitions

## Testing

The contract includes a comprehensive test suite covering:

- ✅ Basic functionality (create, release, claim)
- ✅ Edge cases (zero amounts, invalid durations, unauthorized access)
- ✅ Stream lifecycle (pause, resume, cancel, complete)
- ✅ Gas usage optimization
- ✅ Security (reentrancy, access control, pausability)
- ✅ View functions

**Run tests:**

```bash
cd contracts
forge test -vv
```

**Run with gas reporting:**

```bash
forge test -vv --gas-report
```

## Gas Optimization

| Function       | Gas Usage | Notes                                     |
| -------------- | --------- | ----------------------------------------- |
| createStream   | ~367,000  | Includes USDC transfer and storage writes |
| releasePayment | ~72,000   | Efficient pro-rata calculation            |
| claimEarnings  | ~90,000   | Includes USDC transfer                    |
| pauseStream    | ~50,000   | Simple state update                       |
| resumeStream   | ~30,000   | State update + timer reset                |
| cancelStream   | ~118,000  | Includes dual USDC transfers              |

## Deployment

### Prerequisites

1. Arc Testnet RPC URL
2. Deployer wallet with testnet USDC for gas
3. USDC token contract address on Arc

### Deploy Script (Example)

```javascript
// Deploy PaymentStreaming
const PaymentStreaming = await ethers.getContractFactory("PaymentStreaming");
const usdcAddress = "0x..."; // Arc testnet USDC address
const paymentStreaming = await PaymentStreaming.deploy(usdcAddress);
await paymentStreaming.deployed();

console.log("PaymentStreaming deployed to:", paymentStreaming.address);
```

### Verification

After deployment, verify the contract on Arc block explorer:

```bash
forge verify-contract \
    --chain-id 5042002 \
    --compiler-version 0.8.30 \
    --constructor-args $(cast abi-encode "constructor(address)" $USDC_ADDRESS) \
    $CONTRACT_ADDRESS \
    src/PaymentStreaming.sol:PaymentStreaming
```

## Integration Guide

### Backend Integration

```typescript
import { ethers } from "ethers";

// Initialize contract
const paymentStreaming = new ethers.Contract(
  contractAddress,
  PaymentStreamingABI,
  signer
);

// Create a stream for a completed task
async function startPaymentStream(
  workerAddress: string,
  taskAmount: number,
  taskDurationHours: number
) {
  const amount = ethers.utils.parseUnits(taskAmount.toString(), 6); // USDC has 6 decimals
  const duration = taskDurationHours * 3600; // Convert to seconds
  const interval = 300; // 5 minutes

  // Approve USDC spending first
  await usdcContract.approve(paymentStreaming.address, amount);

  // Create stream
  const tx = await paymentStreaming.createStream(
    workerAddress,
    amount,
    duration,
    interval
  );

  const receipt = await tx.wait();
  const event = receipt.events.find((e) => e.event === "StreamCreated");
  const streamId = event.args.streamId;

  return streamId;
}

// Automated payment release (scheduled job)
async function releaseStreamPayments() {
  // Get all active streams from database
  const activeStreams = await getActiveStreamsFromDB();

  for (const stream of activeStreams) {
    try {
      // Check if it's time to release
      const streamData = await paymentStreaming.getStreamDetails(stream.id);
      const timeSinceLastRelease =
        Date.now() / 1000 - streamData.lastReleaseTime;

      if (timeSinceLastRelease >= streamData.releaseInterval) {
        await paymentStreaming.releasePayment(stream.id);
        console.log(`Released payment for stream ${stream.id}`);
      }
    } catch (error) {
      console.error(
        `Failed to release payment for stream ${stream.id}:`,
        error
      );
    }
  }
}
```

## License

MIT License - See LICENSE file for details

## Support

For questions or issues, please contact the GigStream development team or open an issue on GitHub.
