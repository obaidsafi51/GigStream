// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/access/Ownable.sol";
import "@openzeppelin/utils/Pausable.sol";

/**
 * @title ReputationLedger
 * @notice Tracks worker reputation on-chain for transparency and portability
 * @dev Implements scoring algorithm based on task completion, punctuality, and ratings
 */
contract ReputationLedger is Ownable, Pausable {
    // ============ Structs ============

    /**
     * @notice Reputation data for a worker
     */
    struct ReputationData {
        uint256 score; // Current reputation score (0-1000)
        uint256 totalTasks; // Total tasks assigned
        uint256 completedOnTime; // Tasks completed on time
        uint256 totalDisputes; // Number of disputes filed
        uint256 totalRatings; // Number of ratings received
        uint256 sumOfRatings; // Sum of all ratings (for average calculation)
    }

    // ============ Storage ============

    /// @notice Mapping from worker address to reputation data
    mapping(address => ReputationData) public reputations;

    /// @notice Authorized recorders (backend services that can update reputation)
    mapping(address => bool) public authorizedRecorders;

    // ============ Constants ============

    /// @notice Base score for new workers
    uint256 public constant BASE_SCORE = 100;

    /// @notice Maximum possible score
    uint256 public constant MAX_SCORE = 1000;

    /// @notice Points awarded for completing a task
    uint256 public constant TASK_COMPLETION_POINTS = 2;

    /// @notice Bonus points for on-time completion
    uint256 public constant ON_TIME_BONUS = 1;

    // ============ Events ============

    /**
     * @notice Emitted when a task completion is recorded
     * @param worker Worker address
     * @param taskId Task identifier (off-chain ID)
     * @param onTime Whether task was completed on time
     * @param rating Rating from 1-5 (0 if no rating)
     * @param newScore Updated reputation score
     */
    event TaskRecorded(
        address indexed worker,
        uint256 indexed taskId,
        bool onTime,
        uint8 rating,
        uint256 newScore
    );

    /**
     * @notice Emitted when a dispute is recorded
     * @param worker Worker address
     * @param taskId Task identifier
     * @param severity Severity level (1-5, higher = worse)
     * @param pointsLost Points deducted from score
     * @param newScore Updated reputation score
     */
    event DisputeRecorded(
        address indexed worker,
        uint256 indexed taskId,
        uint8 severity,
        uint256 pointsLost,
        uint256 newScore
    );

    /**
     * @notice Emitted when an authorized recorder is added
     * @param recorder Address of the authorized recorder
     */
    event AuthorizedRecorderAdded(address indexed recorder);

    /**
     * @notice Emitted when an authorized recorder is removed
     * @param recorder Address of the removed recorder
     */
    event AuthorizedRecorderRemoved(address indexed recorder);

    // ============ Constructor ============

    /**
     * @notice Initialize the ReputationLedger contract
     * @dev Deploys the contract and authorizes the deployer as initial recorder
     */
    constructor() Ownable(msg.sender) {
        authorizedRecorders[msg.sender] = true;
        emit AuthorizedRecorderAdded(msg.sender);
    }

    // ============ Modifiers ============

    /**
     * @notice Restricts function access to authorized recorders
     */
    modifier onlyAuthorized() {
        require(authorizedRecorders[msg.sender], "Not authorized");
        _;
    }

    // ============ Core Functions ============

    /**
     * @notice Record a completed task and update worker reputation
     * @dev Rating-based points: 5★ = +3, 4★ = +2, 3★ = +1, 2★ = 0, 1★ = -1
     * @param worker Worker address
     * @param taskId Task identifier (can be off-chain ID)
     * @param onTime Whether task was completed on time
     * @param rating Rating from 1-5 (0 if no rating provided)
     */
    function recordCompletion(
        address worker,
        uint256 taskId,
        bool onTime,
        uint8 rating
    ) external onlyAuthorized whenNotPaused {
        require(worker != address(0), "Invalid worker address");
        require(rating <= 5, "Invalid rating");

        ReputationData storage rep = reputations[worker];

        // Initialize with base score if this is the first task
        if (rep.totalTasks == 0) {
            rep.score = BASE_SCORE;
        }

        // Update task counts
        rep.totalTasks++;
        if (onTime) {
            rep.completedOnTime++;
        }

        // Calculate points to add
        uint256 points = TASK_COMPLETION_POINTS;

        // Add on-time bonus
        if (onTime) {
            points += ON_TIME_BONUS;
        }

        // Add rating-based points (can be positive or negative)
        if (rating > 0) {
            if (rating == 5) {
                points += 3; // Excellent rating
            } else if (rating == 4) {
                points += 2; // Good rating
            } else if (rating == 3) {
                points += 1; // Average rating
            } else if (rating == 2) {
                // No bonus, no penalty (neutral)
            } else if (rating == 1) {
                // Poor rating - subtract 1 point (but ensure points doesn't underflow)
                if (points > 0) {
                    points -= 1;
                }
            }
        }

        // Update score (cap at MAX_SCORE, floor at 0)
        uint256 newScore;
        if (rating == 1 && points == 0 && rep.score > 0) {
            // Handle case where 1-star rating caused points to be 0 or negative
            newScore = rep.score > 1 ? rep.score - 1 : 0;
        } else {
            newScore = rep.score + points;
            if (newScore > MAX_SCORE) {
                newScore = MAX_SCORE;
            }
        }
        rep.score = newScore;

        // Update rating average
        if (rating > 0) {
            rep.totalRatings++;
            rep.sumOfRatings += rating;
        }

        emit TaskRecorded(worker, taskId, onTime, rating, newScore);
    }

    /**
     * @notice Record a dispute and penalize worker reputation
     * @param worker Worker address
     * @param taskId Task identifier
     * @param severity Severity level (1-5, where 5 is most severe)
     */
    function recordDispute(
        address worker,
        uint256 taskId,
        uint8 severity
    ) external onlyAuthorized whenNotPaused {
        require(worker != address(0), "Invalid worker address");
        require(severity >= 1 && severity <= 5, "Invalid severity");

        ReputationData storage rep = reputations[worker];
        rep.totalDisputes++;

        // Calculate points to deduct: 10 * severity (10-50 points)
        uint256 pointsLost = 10 * uint256(severity);

        // Deduct points (minimum score is 0)
        uint256 newScore = rep.score > pointsLost ? rep.score - pointsLost : 0;
        rep.score = newScore;

        emit DisputeRecorded(worker, taskId, severity, pointsLost, newScore);
    }

    /**
     * @notice Manual score adjustment by owner (for exceptional cases)
     * @param worker Worker address
     * @param newScore New reputation score
     */
    function updateScore(address worker, uint256 newScore) external onlyOwner {
        require(worker != address(0), "Invalid worker address");
        require(newScore <= MAX_SCORE, "Score exceeds maximum");

        reputations[worker].score = newScore;
    }

    // ============ View Functions ============

    /**
     * @notice Get reputation score and total tasks completed
     * @param worker Worker address
     * @return score Current reputation score
     * @return tasksCompleted Total tasks completed
     */
    function getReputationScore(
        address worker
    ) external view returns (uint256 score, uint256 tasksCompleted) {
        ReputationData memory rep = reputations[worker];
        return (rep.score, rep.totalTasks);
    }

    /**
     * @notice Get completion rate as a percentage (basis points: 10000 = 100%)
     * @param worker Worker address
     * @return Completion rate in basis points (e.g., 8500 = 85%)
     */
    function getCompletionRate(address worker) external view returns (uint256) {
        ReputationData memory rep = reputations[worker];
        if (rep.totalTasks == 0) {
            return 10000; // 100% if no tasks yet
        }
        return (rep.completedOnTime * 10000) / rep.totalTasks;
    }

    /**
     * @notice Get average rating (scaled by 100: 500 = 5.00 stars)
     * @param worker Worker address
     * @return Average rating scaled by 100
     */
    function getAverageRating(address worker) external view returns (uint256) {
        ReputationData memory rep = reputations[worker];
        if (rep.totalRatings == 0) {
            return 0;
        }
        return (rep.sumOfRatings * 100) / rep.totalRatings;
    }

    /**
     * @notice Get complete reputation data for a worker
     * @param worker Worker address
     * @return Reputation data struct
     */
    function getReputationData(
        address worker
    ) external view returns (ReputationData memory) {
        return reputations[worker];
    }

    // ============ Admin Functions ============

    /**
     * @notice Add an authorized recorder
     * @param recorder Address to authorize
     */
    function addAuthorizedRecorder(address recorder) external onlyOwner {
        require(recorder != address(0), "Invalid recorder address");
        require(!authorizedRecorders[recorder], "Already authorized");

        authorizedRecorders[recorder] = true;
        emit AuthorizedRecorderAdded(recorder);
    }

    /**
     * @notice Remove an authorized recorder
     * @param recorder Address to remove authorization from
     */
    function removeAuthorizedRecorder(address recorder) external onlyOwner {
        require(authorizedRecorders[recorder], "Not authorized");

        authorizedRecorders[recorder] = false;
        emit AuthorizedRecorderRemoved(recorder);
    }

    /**
     * @notice Emergency pause (owner only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause (owner only)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
