# MicroLoan Contract

## Overview

The **MicroLoan** smart contract manages advance payments (micro-loans) for gig workers with automated repayment from future earnings. It integrates with the **ReputationLedger** contract to assess worker creditworthiness and determine loan eligibility.

## Key Features

- **Reputation-Based Eligibility**: Workers must have a minimum reputation score of 600
- **Flexible Loan Amounts**: 1-500 USDC based on worker's reputation and history
- **Risk-Based Fees**: 2-5% fee based on worker's risk profile
- **Automated Repayment**: Deducted from task earnings (default: 5 tasks)
- **Single Active Loan**: Only one active loan per worker at a time
- **30-Day Repayment Period**: Loans must be repaid within 30 days
- **Default Tracking**: Automatic default marking after due date

## Contract Details

- **Solidity Version**: 0.8.20
- **Dependencies**: OpenZeppelin contracts (ReentrancyGuard, Pausable, Ownable), ReputationLedger
- **USDC Token**: Arc Testnet USDC (6 decimals)

## Loan States

```solidity
enum LoanStatus {
    Pending,    // Loan requested, awaiting approval
    Approved,   // Loan approved, ready for disbursement
    Disbursed,  // USDC transferred to worker (same as Repaying)
    Repaying,   // Active repayment in progress
    Repaid,     // Fully repaid
    Defaulted,  // Past due date without full repayment
    Cancelled   // Cancelled before disbursement
}
```

## Core Functions

### Worker Functions

#### `requestAdvance(uint256 amount)`

Request a micro-loan advance.

**Requirements:**

- Amount between 1-500 USDC
- No active loan
- Reputation score >= 600
- Minimum 5 completed tasks

**Returns:** Loan ID

#### `cancelLoan(uint256 loanId)`

Cancel a pending loan request.

**Requirements:**

- Caller is the worker or authorized approver
- Loan status is Pending

### Backend/Risk Engine Functions

#### `approveLoan(uint256 loanId, uint256 approvedAmount, uint256 feeRateBps)`

Approve and auto-disburse a loan.

**Requirements:**

- Caller is authorized approver
- Loan status is Pending
- Approved amount <= requested amount
- Fee rate between 2-5% (200-500 bps)
- Contract has sufficient USDC balance

**Effects:**

- Updates loan details (approved amount, fee, total due)
- Transfers USDC to worker
- Sets loan status to Repaying
- Records disbursement timestamp

#### `repayFromEarnings(uint256 loanId, uint256 amount)`

Record repayment from worker's task earnings.

**Requirements:**

- Caller is authorized approver
- Loan status is Repaying or Disbursed
- Amount > 0
- Worker has approved USDC transfer

**Effects:**

- Transfers USDC from worker to contract
- Updates repaid amount and task count
- Changes status to Repaid if fully paid
- Clears active loan mapping

#### `markDefaulted(uint256 loanId)`

Mark a loan as defaulted.

**Requirements:**

- Caller is authorized approver
- Loan status is Repaying
- Current time > due date

**Effects:**

- Sets loan status to Defaulted
- Clears active loan mapping
- Emits LoanDefaulted event

### View Functions

#### `calculateEligibility(address worker)`

Calculate worker's loan eligibility.

**Returns:**

- `eligible`: Whether worker can get a loan
- `maxAmount`: Maximum loan amount (based on reputation)
- `reason`: Reason if not eligible

**Eligibility Criteria:**

- No active loan
- Reputation score >= 600
- At least 5 completed tasks
- Max amount = (score / 1000) \* 500 USDC
- Reduced by 20% if completion rate < 80%

#### `getLoanDetails(uint256 loanId)`

Get full loan details.

#### `getActiveLoan(address worker)`

Get worker's active loan ID (0 if none).

#### `getLoanStatus(uint256 loanId)`

Get loan status.

### Admin Functions

#### `addAuthorizedApprover(address approver)`

Add an address authorized to approve loans.

#### `removeAuthorizedApprover(address approver)`

Remove an authorized approver.

#### `fundContract(uint256 amount)`

Fund the contract with USDC for lending.

#### `withdrawFunds(uint256 amount)`

Withdraw USDC from the contract.

#### `updateReputationLedger(address _reputationLedger)`

Update the ReputationLedger contract address.

#### `pause() / unpause()`

Emergency pause/unpause functionality.

## Events

```solidity
event LoanRequested(uint256 indexed loanId, address indexed worker, uint256 requestedAmount);
event LoanApproved(uint256 indexed loanId, uint256 approvedAmount, uint256 feeRateBps);
event LoanDisbursed(uint256 indexed loanId, address indexed worker, uint256 amount);
event RepaymentMade(uint256 indexed loanId, uint256 amount, uint256 remainingBalance);
event LoanRepaid(uint256 indexed loanId, uint256 totalRepaid);
event LoanDefaulted(uint256 indexed loanId, uint256 remainingBalance);
event LoanCancelled(uint256 indexed loanId);
event ApproverAdded(address indexed approver);
event ApproverRemoved(address indexed approver);
```

## Constants

```solidity
uint256 public constant DEFAULT_PERIOD = 30 days;
uint256 public constant MIN_FEE_BPS = 200;  // 2%
uint256 public constant MAX_FEE_BPS = 500;  // 5%
uint256 public constant DEFAULT_REPAYMENT_TASKS = 5;
uint256 public constant MIN_REPUTATION_SCORE = 600;
uint256 public constant MIN_LOAN_AMOUNT = 1e6;  // 1 USDC
uint256 public constant MAX_LOAN_AMOUNT = 500e6;  // 500 USDC
```

## Gas Usage

Based on test results:

- **requestAdvance**: ~170,000 gas
- **approveLoan** (with transfer): ~234,000 gas
- **repayFromEarnings**: ~52,000 gas
- **markDefaulted**: ~30,000 gas
- **calculateEligibility**: ~21,000 gas (view)

## Security Features

1. **ReentrancyGuard**: All state-changing functions protected
2. **Pausable**: Emergency pause mechanism
3. **Ownable**: Admin-only functions
4. **Access Control**: Authorized approvers for critical operations
5. **State Updates Before Transfers**: Prevents reentrancy attacks
6. **Comprehensive Validation**: Input validation on all functions
7. **Single Active Loan**: Database constraint enforced
8. **Event Emission**: All state changes emit events

## Testing

Comprehensive test suite with 42 tests covering:

- Constructor validation
- Loan request scenarios (valid, invalid reputation, active loan exists)
- Loan approval (standard, reduced amount, invalid fee rates)
- Repayment flows (partial, full, multiple)
- Default handling
- Cancellation scenarios
- Eligibility calculations
- Admin functions
- Gas measurements
- Edge cases (insufficient balance, multiple loans sequentially)

**Test Coverage**: >90%  
**Pass Rate**: 100% (42/42)

## Usage Example

```solidity
// 1. Worker requests advance
uint256 loanId = microLoan.requestAdvance(100e6); // 100 USDC

// 2. Backend approves loan
microLoan.approveLoan(loanId, 100e6, 300); // 3% fee

// 3. Worker completes tasks, backend triggers repayment
worker.approve(address(microLoan), 20e6);
microLoan.repayFromEarnings(loanId, 20e6); // 20% repayment

// 4. Repeat until fully repaid
// After 5 repayments, loan status changes to Repaid
```

## Integration with Backend

The backend service should:

1. **Request Phase**:

   - Receive advance requests from workers
   - Call `calculateEligibility()` to check if worker qualifies
   - Display max amount and fee estimate

2. **Approval Phase**:

   - Calculate risk score (via ML model or heuristic)
   - Determine fee rate (2-5% based on risk)
   - Call `approveLoan()` to approve and disburse

3. **Repayment Phase**:

   - Listen to task completion events
   - Calculate repayment amount (typically 20% of loan per task)
   - Ensure worker has USDC balance
   - Call `repayFromEarnings()` to record repayment

4. **Default Monitoring**:
   - Track loan due dates
   - Call `markDefaulted()` for overdue loans (30+ days)
   - Update worker's reputation score

## Deployment

```bash
# Deploy MicroLoan contract
forge create --rpc-url $ARC_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --constructor-args $USDC_ADDRESS $REPUTATION_LEDGER_ADDRESS \
  src/MicroLoan.sol:MicroLoan

# Add backend as authorized approver
cast send $MICROLOAN_ADDRESS "addAuthorizedApprover(address)" $BACKEND_ADDRESS \
  --rpc-url $ARC_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY

# Fund contract with USDC
cast send $USDC_ADDRESS "approve(address,uint256)" $MICROLOAN_ADDRESS 1000000000 \
  --rpc-url $ARC_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY

cast send $MICROLOAN_ADDRESS "fundContract(uint256)" 1000000000 \
  --rpc-url $ARC_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY
```

## Future Enhancements

1. **Dynamic Repayment Plans**: Allow custom repayment schedules
2. **Interest Rates**: Add time-based interest for longer loans
3. **Collateral Support**: Optional USDC collateral for higher amounts
4. **Loan Refinancing**: Allow workers to refinance existing loans
5. **Credit Scoring Integration**: More sophisticated risk models
6. **Multi-Currency**: Support for other stablecoins
7. **Flash Loan Protection**: Additional safeguards for flash loan attacks

## License

MIT
