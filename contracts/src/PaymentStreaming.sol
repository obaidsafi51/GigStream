// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/token/ERC20/IERC20.sol";
import "@openzeppelin/utils/ReentrancyGuard.sol";
import "@openzeppelin/utils/Pausable.sol";
import "@openzeppelin/access/Ownable.sol";

/**
 * @title PaymentStreaming
 * @notice Manages escrow and time-based payment releases for gig workers
 * @dev Implements payment streaming with automated releases at scheduled intervals
 */
contract PaymentStreaming is ReentrancyGuard, Pausable, Ownable {
    
    // ============ State Variables ============

    /// @notice USDC token contract
    IERC20 public immutable usdcToken;

    /// @notice Counter for stream IDs
    uint256 public streamCount;

    /// @notice Status of a payment stream
    enum StreamStatus { 
        Active,    // Stream is running
        Paused,    // Stream is temporarily stopped
        Completed, // All payments released
        Cancelled  // Stream terminated early
    }

    /// @notice Payment stream data structure
    struct Stream {
        uint256 id;                 // Unique stream identifier
        address worker;             // Worker receiving payments
        address platform;           // Platform funding the stream
        uint256 totalAmount;        // Total USDC to stream (in token decimals)
        uint256 releasedAmount;     // Amount released for claiming
        uint256 claimedAmount;      // Amount actually claimed by worker
        uint256 startTime;          // Stream start timestamp
        uint256 duration;           // Total duration in seconds
        uint256 releaseInterval;    // Seconds between releases
        uint256 lastReleaseTime;    // Last payment release timestamp
        StreamStatus status;        // Current stream status
    }

    // ============ Storage Mappings ============

    /// @notice Mapping from stream ID to stream data
    mapping(uint256 => Stream) public streams;

    /// @notice Mapping from worker address to their stream IDs
    mapping(address => uint256[]) public workerStreams;

    /// @notice Mapping from platform address to their stream IDs
    mapping(address => uint256[]) public platformStreams;

    // ============ Constants ============

    /// @notice Minimum release interval to prevent spam (1 minute)
    uint256 public constant MIN_RELEASE_INTERVAL = 60;

    /// @notice Maximum stream duration (30 days)
    uint256 public constant MAX_DURATION = 30 days;

    // ============ Events ============

    /**
     * @notice Emitted when a new payment stream is created
     * @param streamId Unique identifier for the stream
     * @param worker Address receiving the payments
     * @param platform Address funding the stream
     * @param totalAmount Total USDC amount to be streamed
     * @param duration Total stream duration in seconds
     * @param releaseInterval Seconds between payment releases
     */
    event StreamCreated(
        uint256 indexed streamId,
        address indexed worker,
        address indexed platform,
        uint256 totalAmount,
        uint256 duration,
        uint256 releaseInterval
    );

    /**
     * @notice Emitted when a payment is released
     * @param streamId Stream identifier
     * @param worker Worker address
     * @param amount Amount released in this payment
     * @param totalReleased Total amount released so far
     */
    event PaymentReleased(
        uint256 indexed streamId,
        address indexed worker,
        uint256 amount,
        uint256 totalReleased
    );

    /**
     * @notice Emitted when worker claims their earnings
     * @param streamId Stream identifier
     * @param worker Worker address
     * @param amount Amount claimed
     */
    event EarningsClaimed(
        uint256 indexed streamId,
        address indexed worker,
        uint256 amount
    );

    /**
     * @notice Emitted when a stream is paused
     * @param streamId Stream identifier
     * @param by Address that paused the stream
     */
    event StreamPaused(
        uint256 indexed streamId,
        address indexed by
    );

    /**
     * @notice Emitted when a paused stream is resumed
     * @param streamId Stream identifier
     * @param by Address that resumed the stream
     */
    event StreamResumed(
        uint256 indexed streamId,
        address indexed by
    );

    /**
     * @notice Emitted when a stream is cancelled
     * @param streamId Stream identifier
     * @param by Address that cancelled the stream
     * @param refundAmount Amount refunded to platform
     */
    event StreamCancelled(
        uint256 indexed streamId,
        address indexed by,
        uint256 refundAmount
    );

    /**
     * @notice Emitted when a stream completes
     * @param streamId Stream identifier
     * @param totalPaid Total amount paid out
     */
    event StreamCompleted(
        uint256 indexed streamId,
        uint256 totalPaid
    );

    // ============ Constructor ============

    /**
     * @notice Initialize the PaymentStreaming contract
     * @param _usdcToken Address of the USDC token contract
     */
    constructor(address _usdcToken) Ownable(msg.sender) {
        require(_usdcToken != address(0), "Invalid USDC address");
        usdcToken = IERC20(_usdcToken);
    }

    // ============ External Functions ============

    /**
     * @notice Create a new payment stream
     * @param worker Address of the gig worker
     * @param totalAmount Total USDC to be streamed (in token decimals)
     * @param duration Total duration in seconds
     * @param releaseInterval Interval between releases in seconds
     * @return streamId The ID of the created stream
     */
    function createStream(
        address worker,
        uint256 totalAmount,
        uint256 duration,
        uint256 releaseInterval
    ) external nonReentrant whenNotPaused returns (uint256 streamId) {
        require(worker != address(0), "Invalid worker address");
        require(totalAmount > 0, "Amount must be positive");
        require(duration > 0 && duration <= MAX_DURATION, "Invalid duration");
        require(releaseInterval >= MIN_RELEASE_INTERVAL, "Interval too short");
        require(releaseInterval <= duration, "Interval exceeds duration");

        // Transfer USDC from platform to contract (escrow)
        require(
            usdcToken.transferFrom(msg.sender, address(this), totalAmount),
            "Transfer failed"
        );

        streamId = ++streamCount;

        Stream storage stream = streams[streamId];
        stream.id = streamId;
        stream.worker = worker;
        stream.platform = msg.sender;
        stream.totalAmount = totalAmount;
        stream.releasedAmount = 0;
        stream.claimedAmount = 0;
        stream.startTime = block.timestamp;
        stream.duration = duration;
        stream.releaseInterval = releaseInterval;
        stream.lastReleaseTime = block.timestamp;
        stream.status = StreamStatus.Active;

        workerStreams[worker].push(streamId);
        platformStreams[msg.sender].push(streamId);

        emit StreamCreated(
            streamId,
            worker,
            msg.sender,
            totalAmount,
            duration,
            releaseInterval
        );
    }

    /**
     * @notice Release the next payment installment for a stream
     * @param streamId The ID of the stream
     */
    function releasePayment(uint256 streamId) external nonReentrant whenNotPaused {
        Stream storage stream = streams[streamId];
        require(stream.id != 0, "Stream does not exist");
        require(stream.status == StreamStatus.Active, "Stream not active");

        uint256 elapsed = block.timestamp - stream.lastReleaseTime;
        require(elapsed >= stream.releaseInterval, "Too soon to release");

        uint256 amountToRelease = _calculateReleasableAmount(stream);
        require(amountToRelease > 0, "Nothing to release");

        stream.releasedAmount += amountToRelease;
        stream.lastReleaseTime = block.timestamp;

        // Check if stream is completed
        if (stream.releasedAmount >= stream.totalAmount ||
            block.timestamp >= stream.startTime + stream.duration) {
            stream.status = StreamStatus.Completed;
            emit StreamCompleted(streamId, stream.releasedAmount);
        }

        emit PaymentReleased(
            streamId,
            stream.worker,
            amountToRelease,
            stream.releasedAmount
        );
    }

    /**
     * @notice Worker claims released but unclaimed earnings
     * @param streamId The ID of the stream
     */
    function claimEarnings(uint256 streamId) external nonReentrant whenNotPaused {
        Stream storage stream = streams[streamId];
        require(stream.id != 0, "Stream does not exist");
        require(msg.sender == stream.worker, "Only worker can claim");

        uint256 claimableAmount = stream.releasedAmount - stream.claimedAmount;
        require(claimableAmount > 0, "Nothing to claim");

        stream.claimedAmount += claimableAmount;

        require(
            usdcToken.transfer(stream.worker, claimableAmount),
            "Transfer failed"
        );

        emit EarningsClaimed(streamId, stream.worker, claimableAmount);
    }

    /**
     * @notice Pause a stream (platform or owner only)
     * @param streamId The ID of the stream
     */
    function pauseStream(uint256 streamId) external {
        Stream storage stream = streams[streamId];
        require(stream.id != 0, "Stream does not exist");
        require(
            msg.sender == stream.platform || msg.sender == owner(),
            "Not authorized"
        );
        require(stream.status == StreamStatus.Active, "Stream not active");

        stream.status = StreamStatus.Paused;
        emit StreamPaused(streamId, msg.sender);
    }

    /**
     * @notice Resume a paused stream
     * @param streamId The ID of the stream
     */
    function resumeStream(uint256 streamId) external {
        Stream storage stream = streams[streamId];
        require(stream.id != 0, "Stream does not exist");
        require(
            msg.sender == stream.platform || msg.sender == owner(),
            "Not authorized"
        );
        require(stream.status == StreamStatus.Paused, "Stream not paused");

        stream.status = StreamStatus.Active;
        stream.lastReleaseTime = block.timestamp; // Reset timer
        emit StreamResumed(streamId, msg.sender);
    }

    /**
     * @notice Cancel a stream and refund remaining balance
     * @param streamId The ID of the stream
     */
    function cancelStream(uint256 streamId) external nonReentrant {
        Stream storage stream = streams[streamId];
        require(stream.id != 0, "Stream does not exist");
        require(
            msg.sender == stream.platform || msg.sender == owner(),
            "Not authorized"
        );
        require(
            stream.status == StreamStatus.Active || stream.status == StreamStatus.Paused,
            "Cannot cancel"
        );

        // Calculate final amounts
        uint256 remainingForWorker = stream.releasedAmount - stream.claimedAmount;
        uint256 refundToPlatform = stream.totalAmount - stream.releasedAmount;

        stream.status = StreamStatus.Cancelled;

        // Transfer remaining released amount to worker
        if (remainingForWorker > 0) {
            require(
                usdcToken.transfer(stream.worker, remainingForWorker),
                "Worker transfer failed"
            );
            stream.claimedAmount += remainingForWorker;
        }

        // Refund unreleased amount to platform
        if (refundToPlatform > 0) {
            require(
                usdcToken.transfer(stream.platform, refundToPlatform),
                "Platform refund failed"
            );
        }

        emit StreamCancelled(streamId, msg.sender, refundToPlatform);
    }

    /**
     * @notice Get detailed information about a stream
     * @param streamId The ID of the stream
     * @return Stream data structure
     */
    function getStreamDetails(uint256 streamId) external view returns (Stream memory) {
        require(streams[streamId].id != 0, "Stream does not exist");
        return streams[streamId];
    }

    /**
     * @notice Get all stream IDs for a worker
     * @param worker Worker address
     * @return Array of stream IDs
     */
    function getWorkerStreams(address worker) external view returns (uint256[] memory) {
        return workerStreams[worker];
    }

    /**
     * @notice Get all stream IDs for a platform
     * @param platform Platform address
     * @return Array of stream IDs
     */
    function getPlatformStreams(address platform) external view returns (uint256[] memory) {
        return platformStreams[platform];
    }

    /**
     * @notice Emergency pause all operations (owner only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause operations (owner only)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ Internal Functions ============

    /**
     * @notice Calculate how much can be released based on time elapsed
     * @param stream The stream to calculate for
     * @return Amount that can be released
     */
    function _calculateReleasableAmount(Stream storage stream) private view returns (uint256) {
        uint256 totalElapsed = block.timestamp - stream.startTime;
        uint256 totalReleasable;

        if (totalElapsed >= stream.duration) {
            // Stream completed, release remaining
            totalReleasable = stream.totalAmount;
        } else {
            // Pro-rata calculation based on time elapsed
            totalReleasable = (stream.totalAmount * totalElapsed) / stream.duration;
        }

        // Amount not yet released
        uint256 newRelease = totalReleasable > stream.releasedAmount 
            ? totalReleasable - stream.releasedAmount 
            : 0;

        return newRelease;
    }
}
