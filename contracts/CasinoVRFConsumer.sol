// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

/**
 * @title CasinoVRFConsumer
 * @dev Chainlink VRF v2 consumer contract for casino games
 * Generates random numbers for Mines, Plinko, Roulette, and Wheel games
 */
contract CasinoVRFConsumer is VRFConsumerBaseV2, ConfirmedOwner {
    event VRFRequested(uint256 indexed requestId, GameType gameType, string gameSubType, address requester);
    event VRFFulfilled(uint256 indexed requestId, uint256[] randomWords);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event SubscriptionUpdated(uint64 indexed oldSubscriptionId, uint64 indexed newSubscriptionId);

    enum GameType {
        MINES,
        PLINKO, 
        ROULETTE,
        WHEEL
    }

    struct VRFRequest {
        address requester;
        GameType gameType;
        string gameSubType;
        bool fulfilled;
        uint256[] randomWords;
        uint256 timestamp;
    }

    VRFCoordinatorV2Interface COORDINATOR;

    // VRF Configuration
    uint64 public s_subscriptionId;
    bytes32 public keyHash;
    uint32 public callbackGasLimit = 2500000;
    uint16 public requestConfirmations = 3;
    uint32 public numWords = 1;

    // Treasury wallet that can request VRF
    address public treasury;

    // Request tracking
    mapping(uint256 => VRFRequest) public requests;
    uint256[] public requestIds;

    // Game type counters for analytics
    mapping(GameType => uint256) public gameTypeRequests;
    mapping(GameType => uint256) public gameTypeFulfilled;

    modifier onlyTreasury() {
        require(msg.sender == treasury, "Only treasury can call this function");
        _;
    }

    constructor(
        uint64 subscriptionId,
        address vrfCoordinator,
        bytes32 _keyHash,
        address _treasury
    ) VRFConsumerBaseV2(vrfCoordinator) ConfirmedOwner(msg.sender) {
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        s_subscriptionId = subscriptionId;
        keyHash = _keyHash;
        treasury = _treasury;
    }

    /**
     * @dev Request random words for a specific game type
     * @param gameType The type of game (MINES, PLINKO, ROULETTE, WHEEL)
     * @param gameSubType Sub-type identifier (e.g., mine count, row count)
     * @return requestId The ID of the VRF request
     */
    function requestRandomWords(
        GameType gameType,
        string memory gameSubType
    ) external onlyTreasury returns (uint256 requestId) {
        requestId = COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );

        requests[requestId] = VRFRequest({
            requester: msg.sender,
            gameType: gameType,
            gameSubType: gameSubType,
            fulfilled: false,
            randomWords: new uint256[](0),
            timestamp: block.timestamp
        });

        requestIds.push(requestId);
        gameTypeRequests[gameType]++;

        emit VRFRequested(requestId, gameType, gameSubType, msg.sender);
    }

    /**
     * @dev Request multiple random words in batch
     * @param gameTypes Array of game types
     * @param gameSubTypes Array of game sub-types
     * @return requestIds Array of VRF request IDs
     */
    function requestRandomWordsBatch(
        GameType[] memory gameTypes,
        string[] memory gameSubTypes
    ) external onlyTreasury returns (uint256[] memory) {
        require(gameTypes.length == gameSubTypes.length, "Arrays length mismatch");
        require(gameTypes.length > 0, "Empty arrays");
        require(gameTypes.length <= 50, "Batch too large"); // Limit batch size

        uint256[] memory batchRequestIds = new uint256[](gameTypes.length);

        for (uint256 i = 0; i < gameTypes.length; i++) {
            uint256 requestId = COORDINATOR.requestRandomWords(
                keyHash,
                s_subscriptionId,
                requestConfirmations,
                callbackGasLimit,
                numWords
            );

            requests[requestId] = VRFRequest({
                requester: msg.sender,
                gameType: gameTypes[i],
                gameSubType: gameSubTypes[i],
                fulfilled: false,
                randomWords: new uint256[](0),
                timestamp: block.timestamp
            });

            requestIds.push(requestId);
            gameTypeRequests[gameTypes[i]]++;
            batchRequestIds[i] = requestId;

            emit VRFRequested(requestId, gameTypes[i], gameSubTypes[i], msg.sender);
        }

        return batchRequestIds;
    }

    /**
     * @dev Callback function used by VRF Coordinator
     * @param requestId The ID of the VRF request
     * @param randomWords Array of random words
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        require(requests[requestId].requester != address(0), "Request not found");
        require(!requests[requestId].fulfilled, "Request already fulfilled");

        requests[requestId].fulfilled = true;
        requests[requestId].randomWords = randomWords;
        gameTypeFulfilled[requests[requestId].gameType]++;

        emit VRFFulfilled(requestId, randomWords);
    }

    /**
     * @dev Get VRF request details
     * @param requestId The ID of the VRF request
     * @return VRF request details
     */
    function getRequest(uint256 requestId) external view returns (VRFRequest memory) {
        return requests[requestId];
    }

    /**
     * @dev Get all request IDs
     * @return Array of all request IDs
     */
    function getAllRequestIds() external view returns (uint256[] memory) {
        return requestIds;
    }

    /**
     * @dev Get request IDs for a specific game type
     * @param gameType The game type to filter by
     * @return Array of request IDs for the specified game type
     */
    function getRequestIdsByGameType(GameType gameType) external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // Count matching requests
        for (uint256 i = 0; i < requestIds.length; i++) {
            if (requests[requestIds[i]].gameType == gameType) {
                count++;
            }
        }

        // Create result array
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < requestIds.length; i++) {
            if (requests[requestIds[i]].gameType == gameType) {
                result[index] = requestIds[i];
                index++;
            }
        }

        return result;
    }

    /**
     * @dev Get statistics for all game types
     * @return gameTypes Arrays of game types
     * @return requestCounts Request counts for each game type
     * @return fulfilledCounts Fulfilled counts for each game type
     */
    function getGameTypeStats() external view returns (
        GameType[] memory gameTypes,
        uint256[] memory requestCounts,
        uint256[] memory fulfilledCounts
    ) {
        gameTypes = new GameType[](4);
        requestCounts = new uint256[](4);
        fulfilledCounts = new uint256[](4);

        gameTypes[0] = GameType.MINES;
        gameTypes[1] = GameType.PLINKO;
        gameTypes[2] = GameType.ROULETTE;
        gameTypes[3] = GameType.WHEEL;

        for (uint256 i = 0; i < 4; i++) {
            requestCounts[i] = gameTypeRequests[gameTypes[i]];
            fulfilledCounts[i] = gameTypeFulfilled[gameTypes[i]];
        }
    }

    /**
     * @dev Update treasury address (only owner)
     * @param newTreasury New treasury address
     */
    function updateTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /**
     * @dev Update VRF subscription ID (only owner)
     * @param newSubscriptionId New subscription ID
     */
    function updateSubscriptionId(uint64 newSubscriptionId) external onlyOwner {
        uint64 oldSubscriptionId = s_subscriptionId;
        s_subscriptionId = newSubscriptionId;
        emit SubscriptionUpdated(oldSubscriptionId, newSubscriptionId);
    }

    /**
     * @dev Update VRF configuration (only owner)
     * @param newKeyHash New key hash
     * @param newCallbackGasLimit New callback gas limit
     * @param newRequestConfirmations New request confirmations
     */
    function updateVRFConfig(
        bytes32 newKeyHash,
        uint32 newCallbackGasLimit,
        uint16 newRequestConfirmations
    ) external onlyOwner {
        keyHash = newKeyHash;
        callbackGasLimit = newCallbackGasLimit;
        requestConfirmations = newRequestConfirmations;
    }

    /**
     * @dev Emergency function to withdraw LINK tokens (only owner)
     * @param to Address to send LINK tokens to
     * @param amount Amount of LINK tokens to withdraw
     */
    function withdrawLink(address to, uint256 amount) external onlyOwner {
        // This would require LINK token interface implementation
        // For now, just emit an event for manual handling
        require(to != address(0), "Invalid recipient address");
        require(amount > 0, "Invalid amount");
        
        // In a real implementation, you would transfer LINK tokens here
        // LINK.transfer(to, amount);
    }

    /**
     * @dev Get contract balance and other info
     * @return contractAddress Contract address
     * @return treasuryAddress Treasury address
     * @return subscriptionId Subscription ID
     * @return totalRequests Total request count
     * @return totalFulfilled Total fulfilled count
     */
    function getContractInfo() external view returns (
        address contractAddress,
        address treasuryAddress,
        uint64 subscriptionId,
        uint256 totalRequests,
        uint256 totalFulfilled
    ) {
        contractAddress = address(this);
        treasuryAddress = treasury;
        subscriptionId = s_subscriptionId;
        totalRequests = requestIds.length;
        
        // Count fulfilled requests
        uint256 fulfilled = 0;
        for (uint256 i = 0; i < requestIds.length; i++) {
            if (requests[requestIds[i]].fulfilled) {
                fulfilled++;
            }
        }
        totalFulfilled = fulfilled;
    }
}