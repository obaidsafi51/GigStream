// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/token/ERC20/IERC20.sol";
import "@openzeppelin/utils/ReentrancyGuard.sol";
import "@openzeppelin/utils/Pausable.sol";
import "@openzeppelin/access/Ownable.sol";
import "./ReputationLedger.sol";

/**
 * @title MicroLoan
 * @notice Manages advance payments with automated repayment from future earnings
 * @dev Integrates with ReputationLedger for eligibility checks
 */
contract MicroLoan is ReentrancyGuard, Pausable, Ownable {
    // ============ State Variables ============

    /// @notice USDC token contract
    IERC20 public immutable usdcToken;

    /// @notice ReputationLedger contract for credit scoring
    ReputationLedger public reputationLedger;

    /// @notice Counter for loan IDs
    uint256 public loanCount;

    /// @notice Loan status enum
    enum LoanStatus {
        Pending, // Loan requested, awaiting approval
        Approved, // Loan approved, ready for disbursement
        Disbursed, // USDC transferred to worker (same as Repaying)
        Repaying, // Active repayment in progress
        Repaid, // Fully repaid
        Defaulted, // Past due date without full repayment
        Cancelled // Cancelled before disbursement
    }

    /// @notice Loan data structure
    struct Loan {
        uint256 id; // Unique loan identifier
        address worker; // Worker receiving the loan
        uint256 requestedAmount; // Amount requested by worker
        uint256 approvedAmount; // Amount approved (may be less)
        uint256 feeRateBps; // Fee rate in basis points (200 = 2%)
        uint256 feeAmount; // Calculated fee amount
        uint256 totalDue; // Total amount to repay (approved + fee)
        uint256 repaidAmount; // Amount repaid so far
        uint256 repaymentTasksTarget; // Number of tasks for full repayment
        uint256 repaymentTasksCompleted; // Tasks completed with repayment
        uint256 createdAt; // Request timestamp
        uint256 disbursedAt; // Disbursement timestamp
        uint256 dueDate; // Repayment deadline (30 days from disbursement)
        LoanStatus status; // Current loan status
    }

    // ============ Storage Mappings ============

    /// @notice Mapping from loan ID to loan data
    mapping(uint256 => Loan) public loans;

    /// @notice Mapping from worker address to active loan ID (only one active loan per worker)
    mapping(address => uint256) public activeLoan;

    /// @notice Authorized approvers (risk engine/backend)
    mapping(address => bool) public authorizedApprovers;

    // ============ Constants ============

    /// @notice Default loan repayment period
    uint256 public constant DEFAULT_PERIOD = 30 days;

    /// @notice Minimum fee rate (2%)
    uint256 public constant MIN_FEE_BPS = 200;

    /// @notice Maximum fee rate (5%)
    uint256 public constant MAX_FEE_BPS = 500;

    /// @notice Default number of tasks for repayment
    uint256 public constant DEFAULT_REPAYMENT_TASKS = 5;

    /// @notice Minimum reputation score for loan eligibility
    uint256 public constant MIN_REPUTATION_SCORE = 600;

    /// @notice Minimum amount for a loan (1 USDC)
    uint256 public constant MIN_LOAN_AMOUNT = 1e6; // 1 USDC (6 decimals)

    /// @notice Maximum amount for a loan (500 USDC)
    uint256 public constant MAX_LOAN_AMOUNT = 500e6; // 500 USDC (6 decimals)

    // ============ Events ============

    /**
     * @notice Emitted when a worker requests a loan
     * @param loanId Unique identifier for the loan
     * @param worker Worker requesting the loan
     * @param requestedAmount Amount of USDC requested
     */
    event LoanRequested(
        uint256 indexed loanId,
        address indexed worker,
        uint256 requestedAmount
    );

    /**
     * @notice Emitted when a loan is approved
     * @param loanId Loan identifier
     * @param approvedAmount Amount approved (may differ from requested)
     * @param feeRateBps Fee rate in basis points
     */
    event LoanApproved(
        uint256 indexed loanId,
        uint256 approvedAmount,
        uint256 feeRateBps
    );

    /**
     * @notice Emitted when loan funds are disbursed
     * @param loanId Loan identifier
     * @param worker Worker receiving the funds
     * @param amount Amount disbursed
     */
    event LoanDisbursed(
        uint256 indexed loanId,
        address indexed worker,
        uint256 amount
    );

    /**
     * @notice Emitted when a repayment is made
     * @param loanId Loan identifier
     * @param amount Amount repaid
     * @param remainingBalance Remaining balance after repayment
     */
    event RepaymentMade(
        uint256 indexed loanId,
        uint256 amount,
        uint256 remainingBalance
    );

    /**
     * @notice Emitted when a loan is fully repaid
     * @param loanId Loan identifier
     * @param totalRepaid Total amount repaid
     */
    event LoanRepaid(uint256 indexed loanId, uint256 totalRepaid);

    /**
     * @notice Emitted when a loan is marked as defaulted
     * @param loanId Loan identifier
     * @param remainingBalance Outstanding balance at default
     */
    event LoanDefaulted(uint256 indexed loanId, uint256 remainingBalance);

    /**
     * @notice Emitted when a loan is cancelled
     * @param loanId Loan identifier
     */
    event LoanCancelled(uint256 indexed loanId);

    /**
     * @notice Emitted when an authorized approver is added
     * @param approver Address of the new approver
     */
    event ApproverAdded(address indexed approver);

    /**
     * @notice Emitted when an authorized approver is removed
     * @param approver Address of the removed approver
     */
    event ApproverRemoved(address indexed approver);

    // ============ Modifiers ============

    /**
     * @notice Restricts access to authorized approvers
     */
    modifier onlyAuthorized() {
        require(authorizedApprovers[msg.sender], "Not authorized");
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Initialize the MicroLoan contract
     * @param _usdcToken Address of the USDC token contract
     * @param _reputationLedger Address of the ReputationLedger contract
     */
    constructor(
        address _usdcToken,
        address _reputationLedger
    ) Ownable(msg.sender) {
        require(_usdcToken != address(0), "Invalid USDC address");
        require(
            _reputationLedger != address(0),
            "Invalid ReputationLedger address"
        );

        usdcToken = IERC20(_usdcToken);
        reputationLedger = ReputationLedger(_reputationLedger);
        authorizedApprovers[msg.sender] = true;

        emit ApproverAdded(msg.sender);
    }

    // ============ Public Functions ============

    /**
     * @notice Worker requests an advance payment
     * @param amount Amount of USDC requested (in token decimals)
     * @return loanId The unique identifier for the created loan
     */
    function requestAdvance(
        uint256 amount
    ) external nonReentrant whenNotPaused returns (uint256 loanId) {
        require(amount >= MIN_LOAN_AMOUNT, "Amount too low");
        require(amount <= MAX_LOAN_AMOUNT, "Amount too high");
        require(activeLoan[msg.sender] == 0, "Already have active loan");

        // Check eligibility based on reputation
        (uint256 score, , , , , ) = reputationLedger.reputations(msg.sender);
        require(score >= MIN_REPUTATION_SCORE, "Reputation score too low");

        loanId = ++loanCount;

        Loan storage loan = loans[loanId];
        loan.id = loanId;
        loan.worker = msg.sender;
        loan.requestedAmount = amount;
        loan.createdAt = block.timestamp;
        loan.status = LoanStatus.Pending;
        loan.repaymentTasksTarget = DEFAULT_REPAYMENT_TASKS;

        emit LoanRequested(loanId, msg.sender, amount);
    }

    /**
     * @notice Approve a loan (called by risk engine or backend)
     * @param loanId Loan to approve
     * @param approvedAmount Amount approved (may be less than requested)
     * @param feeRateBps Fee rate in basis points (200-500)
     */
    function approveLoan(
        uint256 loanId,
        uint256 approvedAmount,
        uint256 feeRateBps
    ) external onlyAuthorized nonReentrant whenNotPaused {
        Loan storage loan = loans[loanId];
        require(loan.id != 0, "Loan does not exist");
        require(loan.status == LoanStatus.Pending, "Loan not pending");
        require(
            approvedAmount > 0 && approvedAmount <= loan.requestedAmount,
            "Invalid amount"
        );
        require(
            feeRateBps >= MIN_FEE_BPS && feeRateBps <= MAX_FEE_BPS,
            "Invalid fee rate"
        );

        loan.approvedAmount = approvedAmount;
        loan.feeRateBps = feeRateBps;
        loan.feeAmount = (approvedAmount * feeRateBps) / 10000;
        loan.totalDue = approvedAmount + loan.feeAmount;
        loan.status = LoanStatus.Approved;

        emit LoanApproved(loanId, approvedAmount, feeRateBps);

        // Auto-disburse the loan
        _disburseLoan(loanId);
    }

    /**
     * @notice Record repayment from worker's task earnings
     * @param loanId Loan to repay
     * @param amount Amount to repay (in token decimals)
     */
    function repayFromEarnings(
        uint256 loanId,
        uint256 amount
    ) external onlyAuthorized nonReentrant whenNotPaused {
        Loan storage loan = loans[loanId];
        require(loan.id != 0, "Loan does not exist");
        require(
            loan.status == LoanStatus.Repaying ||
                loan.status == LoanStatus.Disbursed,
            "Loan not in repayment"
        );
        require(amount > 0, "Amount must be positive");

        // Transfer USDC from worker (must be pre-approved)
        require(
            usdcToken.transferFrom(loan.worker, address(this), amount),
            "Transfer failed"
        );

        loan.repaidAmount += amount;
        loan.repaymentTasksCompleted++;

        // Update status to Repaying if it was Disbursed
        if (loan.status == LoanStatus.Disbursed) {
            loan.status = LoanStatus.Repaying;
        }

        uint256 remaining = loan.totalDue > loan.repaidAmount
            ? loan.totalDue - loan.repaidAmount
            : 0;

        emit RepaymentMade(loanId, amount, remaining);

        // Check if fully repaid
        if (loan.repaidAmount >= loan.totalDue) {
            loan.status = LoanStatus.Repaid;
            delete activeLoan[loan.worker];
            emit LoanRepaid(loanId, loan.repaidAmount);
        }
    }

    /**
     * @notice Mark loan as defaulted (called by backend or owner)
     * @param loanId Loan to mark as defaulted
     */
    function markDefaulted(uint256 loanId) external onlyAuthorized {
        Loan storage loan = loans[loanId];
        require(loan.id != 0, "Loan does not exist");
        require(
            loan.status == LoanStatus.Repaying ||
                loan.status == LoanStatus.Disbursed,
            "Loan not in repayment"
        );
        require(block.timestamp > loan.dueDate, "Not past due date");

        loan.status = LoanStatus.Defaulted;
        delete activeLoan[loan.worker];

        uint256 remaining = loan.totalDue - loan.repaidAmount;
        emit LoanDefaulted(loanId, remaining);
    }

    /**
     * @notice Cancel a pending loan
     * @param loanId Loan to cancel
     */
    function cancelLoan(uint256 loanId) external {
        Loan storage loan = loans[loanId];
        require(loan.id != 0, "Loan does not exist");
        require(
            msg.sender == loan.worker || authorizedApprovers[msg.sender],
            "Not authorized"
        );
        require(
            loan.status == LoanStatus.Pending,
            "Can only cancel pending loans"
        );

        loan.status = LoanStatus.Cancelled;
        emit LoanCancelled(loanId);
    }

    /**
     * @notice Calculate eligibility for a worker
     * @param worker Worker address
     * @return eligible Whether worker is eligible
     * @return maxAmount Maximum loan amount eligible for
     * @return reason Reason if not eligible
     */
    function calculateEligibility(
        address worker
    )
        external
        view
        returns (bool eligible, uint256 maxAmount, string memory reason)
    {
        // Check if worker has active loan
        if (activeLoan[worker] != 0) {
            return (false, 0, "Already has active loan");
        }

        // Check reputation score
        (
            uint256 score,
            uint256 totalTasks,
            uint256 completedOnTime,
            ,
            ,

        ) = reputationLedger.reputations(worker);

        if (score < MIN_REPUTATION_SCORE) {
            return (false, 0, "Reputation score too low");
        }

        // Check minimum task history
        if (totalTasks < 5) {
            return (false, 0, "Insufficient task history");
        }

        // Calculate max loan based on reputation and history
        // Higher score = higher max loan
        // Formula: (score / 1000) * MAX_LOAN_AMOUNT
        maxAmount = (score * MAX_LOAN_AMOUNT) / 1000;

        // Adjust based on completion rate
        if (totalTasks > 0) {
            uint256 completionRate = (completedOnTime * 100) / totalTasks;
            if (completionRate < 80) {
                // Reduce by 20% if completion rate is below 80%
                maxAmount = (maxAmount * 80) / 100;
            }
        }

        return (true, maxAmount, "");
    }

    /**
     * @notice Get loan details
     * @param loanId Loan identifier
     * @return Loan data structure
     */
    function getLoanDetails(
        uint256 loanId
    ) external view returns (Loan memory) {
        require(loans[loanId].id != 0, "Loan does not exist");
        return loans[loanId];
    }

    /**
     * @notice Get active loan for a worker
     * @param worker Worker address
     * @return loanId Active loan ID (0 if none)
     */
    function getActiveLoan(address worker) external view returns (uint256) {
        return activeLoan[worker];
    }

    /**
     * @notice Get loan status
     * @param loanId Loan identifier
     * @return status Current loan status
     */
    function getLoanStatus(uint256 loanId) external view returns (LoanStatus) {
        require(loans[loanId].id != 0, "Loan does not exist");
        return loans[loanId].status;
    }

    // ============ Admin Functions ============

    /**
     * @notice Add authorized approver
     * @param approver Address to authorize
     */
    function addAuthorizedApprover(address approver) external onlyOwner {
        require(approver != address(0), "Invalid address");
        require(!authorizedApprovers[approver], "Already authorized");

        authorizedApprovers[approver] = true;
        emit ApproverAdded(approver);
    }

    /**
     * @notice Remove authorized approver
     * @param approver Address to remove
     */
    function removeAuthorizedApprover(address approver) external onlyOwner {
        require(authorizedApprovers[approver], "Not authorized");

        authorizedApprovers[approver] = false;
        emit ApproverRemoved(approver);
    }

    /**
     * @notice Fund the contract with USDC for lending
     * @param amount Amount of USDC to deposit
     */
    function fundContract(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be positive");
        require(
            usdcToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
    }

    /**
     * @notice Withdraw USDC from contract
     * @param amount Amount to withdraw
     */
    function withdrawFunds(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Amount must be positive");
        require(usdcToken.transfer(owner(), amount), "Transfer failed");
    }

    /**
     * @notice Get contract USDC balance
     * @return balance Current USDC balance
     */
    function getContractBalance() external view returns (uint256 balance) {
        return usdcToken.balanceOf(address(this));
    }

    /**
     * @notice Pause contract operations
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause contract operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Update ReputationLedger address
     * @param _reputationLedger New ReputationLedger address
     */
    function updateReputationLedger(
        address _reputationLedger
    ) external onlyOwner {
        require(_reputationLedger != address(0), "Invalid address");
        reputationLedger = ReputationLedger(_reputationLedger);
    }

    // ============ Internal Functions ============

    /**
     * @notice Internal function to disburse loan
     * @param loanId Loan to disburse
     */
    function _disburseLoan(uint256 loanId) private {
        Loan storage loan = loans[loanId];
        require(loan.status == LoanStatus.Approved, "Loan not approved");

        // Ensure contract has sufficient balance
        require(
            usdcToken.balanceOf(address(this)) >= loan.approvedAmount,
            "Insufficient contract balance"
        );

        // Transfer USDC to worker
        require(
            usdcToken.transfer(loan.worker, loan.approvedAmount),
            "Transfer failed"
        );

        loan.status = LoanStatus.Repaying;
        loan.disbursedAt = block.timestamp;
        loan.dueDate = block.timestamp + DEFAULT_PERIOD;
        activeLoan[loan.worker] = loanId;

        emit LoanDisbursed(loanId, loan.worker, loan.approvedAmount);
    }
}
