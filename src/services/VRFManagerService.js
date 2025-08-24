import { ethers } from 'ethers';
import { TREASURY_CONFIG } from '../config/treasury.js';
import VRF_CONFIG from '../config/vrf.js';

// VRF Consumer Contract ABI (minimal)
const VRF_CONSUMER_ABI = [
  "function requestRandomWords(uint8 gameType, string memory gameSubType) external returns (uint256 requestId)",
  "function requestRandomWordsBatch(uint8[] memory gameTypes, string[] memory gameSubTypes) external returns (uint256[] memory)",
  "function getRequest(uint256 requestId) external view returns (tuple(address requester, uint8 gameType, string gameSubType, bool fulfilled, uint256[] randomWords, uint256 timestamp))",
  "function getAllRequestIds() external view returns (uint256[] memory)",
  "function getRequestIdsByGameType(uint8 gameType) external view returns (uint256[] memory)",
  "function getGameTypeStats() external view returns (uint8[] memory gameTypes, uint256[] memory requestCounts, uint256[] memory fulfilledCounts)",
  "function getContractInfo() external view returns (address contractAddress, address treasuryAddress, uint64 subscriptionId, uint256 totalRequests, uint256 totalFulfilled)",
  "event VRFRequested(uint256 indexed requestId, uint8 gameType, string gameSubType, address requester)",
  "event VRFFulfilled(uint256 indexed requestId, uint256[] randomWords)"
];

/**
 * VRF Manager Service
 * Manages Chainlink VRF v2 requests for casino games
 */
export class VRFManagerService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.isInitialized = false;
    this.requestCache = new Map();
    this.eventListeners = new Map();
  }

  /**
   * Initialize the VRF Manager Service
   */
  async initialize() {
    try {
      // Validate configuration
      const validation = VRF_CONFIG.validateVRFConfig();
      if (!validation.isValid) {
        throw new Error(`VRF Configuration invalid: ${validation.errors.join(', ')}`);
      }

      // Setup provider and signer
      this.provider = new ethers.JsonRpcProvider(TREASURY_CONFIG.NETWORK.RPC_URL);
      this.signer = new ethers.Wallet(TREASURY_CONFIG.PRIVATE_KEY, this.provider);

      // Verify treasury address matches
      const signerAddress = await this.signer.getAddress();
      if (signerAddress.toLowerCase() !== TREASURY_CONFIG.ADDRESS.toLowerCase()) {
        throw new Error('Treasury private key does not match treasury address');
      }

      // Initialize contract
      this.contract = new ethers.Contract(
        VRF_CONFIG.CONTRACT_ADDRESS,
        VRF_CONSUMER_ABI,
        this.signer
      );

      // Verify contract is accessible
      await this.getContractInfo();

      this.isInitialized = true;
      console.log('✅ VRF Manager Service initialized successfully');
      
      // Start event listeners
      this.startEventListeners();

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize VRF Manager Service:', error);
      throw error;
    }
  }

  /**
   * Request a single VRF value
   * @param {string} gameType - Game type (MINES, PLINKO, ROULETTE, WHEEL)
   * @param {string} gameSubType - Game sub-type (mine count, row count, etc.)
   * @returns {Promise<Object>} VRF request details
   */
  async requestVRF(gameType, gameSubType = 'standard') {
    this.ensureInitialized();

    try {
      // Validate game type
      if (!VRF_CONFIG.isValidGameType(gameType)) {
        throw new Error(`Invalid game type: ${gameType}`);
      }

      // Validate game sub-type
      if (!VRF_CONFIG.isValidGameSubType(gameType, gameSubType)) {
        throw new Error(`Invalid game sub-type: ${gameSubType} for game: ${gameType}`);
      }

      const gameTypeNumber = VRF_CONFIG.getGameTypeNumber(gameType);
      
      console.log(`🎲 Requesting VRF for ${gameType} (${gameSubType})...`);

      // Estimate gas
      const gasEstimate = await this.contract.requestRandomWords.estimateGas(
        gameTypeNumber,
        gameSubType
      );

      // Add 20% buffer to gas estimate
      const gasLimit = gasEstimate * BigInt(120) / BigInt(100);

      // Send transaction
      const tx = await this.contract.requestRandomWords(
        gameTypeNumber,
        gameSubType,
        { gasLimit }
      );

      const receipt = await tx.wait();
      
      // Extract request ID from logs
      const vrfRequestedEvent = receipt.logs.find(
        log => log.topics[0] === ethers.id("VRFRequested(uint256,uint8,string,address)")
      );

      if (!vrfRequestedEvent) {
        throw new Error('VRF request event not found in transaction logs');
      }

      const requestId = vrfRequestedEvent.topics[1];
      const requestIdNumber = BigInt(requestId).toString();

      const vrfRequest = {
        requestId: requestIdNumber,
        gameType,
        gameSubType,
        status: 'pending',
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        createdAt: new Date().toISOString(),
        fulfilled: false
      };

      // Cache the request
      this.requestCache.set(requestIdNumber, vrfRequest);

      console.log(`✅ VRF requested successfully. Request ID: ${requestIdNumber}`);
      
      return vrfRequest;

    } catch (error) {
      console.error('❌ VRF request failed:', error);
      throw new Error(`VRF request failed: ${error.message}`);
    }
  }

  /**
   * Request multiple VRF values in batch
   * @param {Array} requests - Array of {gameType, gameSubType} objects
   * @returns {Promise<Array>} Array of VRF request details
   */
  async requestVRFBatch(requests) {
    this.ensureInitialized();

    try {
      if (!Array.isArray(requests) || requests.length === 0) {
        throw new Error('Requests must be a non-empty array');
      }

      if (requests.length > VRF_CONFIG.BATCH_CONFIG.MAX_BATCH_SIZE) {
        throw new Error(`Batch size ${requests.length} exceeds maximum ${VRF_CONFIG.BATCH_CONFIG.MAX_BATCH_SIZE}`);
      }

      // Validate all requests
      const gameTypes = [];
      const gameSubTypes = [];

      for (const request of requests) {
        const { gameType, gameSubType = 'standard' } = request;

        if (!VRF_CONFIG.isValidGameType(gameType)) {
          throw new Error(`Invalid game type: ${gameType}`);
        }

        if (!VRF_CONFIG.isValidGameSubType(gameType, gameSubType)) {
          throw new Error(`Invalid game sub-type: ${gameSubType} for game: ${gameType}`);
        }

        gameTypes.push(VRF_CONFIG.getGameTypeNumber(gameType));
        gameSubTypes.push(gameSubType);
      }

      console.log(`🎲 Requesting batch of ${requests.length} VRF values...`);

      // Estimate gas
      const gasEstimate = await this.contract.requestRandomWordsBatch.estimateGas(
        gameTypes,
        gameSubTypes
      );

      // Add 20% buffer to gas estimate
      const gasLimit = gasEstimate * BigInt(120) / BigInt(100);

      // Send transaction
      const tx = await this.contract.requestRandomWordsBatch(
        gameTypes,
        gameSubTypes,
        { gasLimit }
      );

      const receipt = await tx.wait();

      // Extract request IDs from logs
      const vrfRequestedEvents = receipt.logs.filter(
        log => log.topics[0] === ethers.id("VRFRequested(uint256,uint8,string,address)")
      );

      if (vrfRequestedEvents.length !== requests.length) {
        throw new Error(`Expected ${requests.length} VRF events, got ${vrfRequestedEvents.length}`);
      }

      const vrfRequests = vrfRequestedEvents.map((event, index) => {
        const requestId = BigInt(event.topics[1]).toString();
        const originalRequest = requests[index];

        const vrfRequest = {
          requestId,
          gameType: originalRequest.gameType,
          gameSubType: originalRequest.gameSubType || 'standard',
          status: 'pending',
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: (receipt.gasUsed / BigInt(requests.length)).toString(), // Approximate gas per request
          createdAt: new Date().toISOString(),
          fulfilled: false
        };

        // Cache the request
        this.requestCache.set(requestId, vrfRequest);

        return vrfRequest;
      });

      console.log(`✅ Batch VRF requested successfully. ${vrfRequests.length} requests created.`);
      
      return vrfRequests;

    } catch (error) {
      console.error('❌ Batch VRF request failed:', error);
      throw new Error(`Batch VRF request failed: ${error.message}`);
    }
  }

  /**
   * Generate initial VRF batch for user session (200 VRF values)
   * @returns {Promise<Array>} Array of VRF request details
   */
  async generateInitialVRFBatch() {
    this.ensureInitialized();

    try {
      console.log('🎲 Generating initial VRF batch (200 values)...');

      const requests = [];
      const allocation = VRF_CONFIG.VRF_ALLOCATION;

      // Generate requests based on allocation
      Object.keys(allocation).forEach(gameType => {
        const config = allocation[gameType];
        
        config.subtypes.forEach(subType => {
          for (let i = 0; i < config.countPerSubtype; i++) {
            requests.push({
              gameType,
              gameSubType: subType
            });
          }
        });
      });

      console.log(`📊 Generated ${requests.length} VRF requests:`, {
        MINES: allocation.MINES.subtypes.length * allocation.MINES.countPerSubtype,
        PLINKO: allocation.PLINKO.subtypes.length * allocation.PLINKO.countPerSubtype,
        ROULETTE: allocation.ROULETTE.subtypes.length * allocation.ROULETTE.countPerSubtype,
        WHEEL: allocation.WHEEL.subtypes.length * allocation.WHEEL.countPerSubtype,
      });

      // Split into batches if needed
      const batchSize = VRF_CONFIG.BATCH_CONFIG.MAX_BATCH_SIZE;
      const batches = [];
      
      for (let i = 0; i < requests.length; i += batchSize) {
        batches.push(requests.slice(i, i + batchSize));
      }

      console.log(`📦 Splitting into ${batches.length} batches of max ${batchSize} requests each`);

      // Process batches sequentially to avoid nonce issues
      const allVRFRequests = [];
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`🔄 Processing batch ${i + 1}/${batches.length} (${batch.length} requests)...`);
        
        const batchResults = await this.requestVRFBatch(batch);
        allVRFRequests.push(...batchResults);

        // Small delay between batches to avoid overwhelming the network
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      console.log(`✅ Initial VRF batch generated successfully. Total: ${allVRFRequests.length} requests`);
      
      return allVRFRequests;

    } catch (error) {
      console.error('❌ Failed to generate initial VRF batch:', error);
      throw error;
    }
  }

  /**
   * Get VRF request details
   * @param {string} requestId - VRF request ID
   * @returns {Promise<Object>} VRF request details
   */
  async getVRFRequest(requestId) {
    this.ensureInitialized();

    try {
      // Check cache first
      if (this.requestCache.has(requestId)) {
        const cachedRequest = this.requestCache.get(requestId);
        
        // If not fulfilled, check contract for updates
        if (!cachedRequest.fulfilled) {
          const contractRequest = await this.contract.getRequest(requestId);
          
          if (contractRequest.fulfilled) {
            cachedRequest.fulfilled = true;
            cachedRequest.status = 'fulfilled';
            cachedRequest.randomWords = contractRequest.randomWords.map(word => word.toString());
            cachedRequest.fulfilledAt = new Date().toISOString();
            
            this.requestCache.set(requestId, cachedRequest);
          }
        }
        
        return cachedRequest;
      }

      // Fetch from contract
      const contractRequest = await this.contract.getRequest(requestId);
      
      if (contractRequest.requester === ethers.ZeroAddress) {
        throw new Error(`VRF request ${requestId} not found`);
      }

      const vrfRequest = {
        requestId,
        gameType: VRF_CONFIG.getGameTypeString(contractRequest.gameType),
        gameSubType: contractRequest.gameSubType,
        status: contractRequest.fulfilled ? 'fulfilled' : 'pending',
        fulfilled: contractRequest.fulfilled,
        randomWords: contractRequest.randomWords.map(word => word.toString()),
        timestamp: new Date(Number(contractRequest.timestamp) * 1000).toISOString(),
        requester: contractRequest.requester
      };

      // Cache the request
      this.requestCache.set(requestId, vrfRequest);

      return vrfRequest;

    } catch (error) {
      console.error(`❌ Failed to get VRF request ${requestId}:`, error);
      throw error;
    }
  }

  /**
   * Get VRF system status
   * @returns {Promise<Object>} VRF system status
   */
  async getVRFStatus() {
    this.ensureInitialized();

    try {
      const contractInfo = await this.contract.getContractInfo();
      const gameTypeStats = await this.contract.getGameTypeStats();

      const status = {
        contractAddress: contractInfo.contractAddress,
        treasuryAddress: contractInfo.treasuryAddress,
        subscriptionId: contractInfo.subscriptionId.toString(),
        totalRequests: contractInfo.totalRequests.toString(),
        totalFulfilled: contractInfo.totalFulfilled.toString(),
        pendingRequests: (contractInfo.totalRequests - contractInfo.totalFulfilled).toString(),
        fulfillmentRate: contractInfo.totalRequests > 0 
          ? (Number(contractInfo.totalFulfilled) / Number(contractInfo.totalRequests) * 100).toFixed(2) + '%'
          : '0%',
        gameTypeStats: {},
        lastUpdated: new Date().toISOString()
      };

      // Process game type statistics
      for (let i = 0; i < gameTypeStats.gameTypes.length; i++) {
        const gameType = VRF_CONFIG.getGameTypeString(gameTypeStats.gameTypes[i]);
        status.gameTypeStats[gameType] = {
          totalRequests: gameTypeStats.requestCounts[i].toString(),
          totalFulfilled: gameTypeStats.fulfilledCounts[i].toString(),
          pendingRequests: (gameTypeStats.requestCounts[i] - gameTypeStats.fulfilledCounts[i]).toString()
        };
      }

      return status;

    } catch (error) {
      console.error('❌ Failed to get VRF status:', error);
      throw error;
    }
  }

  /**
   * Get contract information
   * @returns {Promise<Object>} Contract information
   */
  async getContractInfo() {
    this.ensureInitialized();

    try {
      const info = await this.contract.getContractInfo();
      
      return {
        contractAddress: info.contractAddress,
        treasuryAddress: info.treasuryAddress,
        subscriptionId: info.subscriptionId.toString(),
        totalRequests: info.totalRequests.toString(),
        totalFulfilled: info.totalFulfilled.toString()
      };
    } catch (error) {
      console.error('❌ Failed to get contract info:', error);
      throw error;
    }
  }

  /**
   * Start event listeners for VRF events
   */
  startEventListeners() {
    if (!this.contract) return;

    try {
      // Listen for VRF fulfillment events
      this.contract.on('VRFFulfilled', (requestId, randomWords, event) => {
        const requestIdString = requestId.toString();
        
        console.log(`🎉 VRF fulfilled: ${requestIdString}`);
        
        // Update cache
        if (this.requestCache.has(requestIdString)) {
          const cachedRequest = this.requestCache.get(requestIdString);
          cachedRequest.fulfilled = true;
          cachedRequest.status = 'fulfilled';
          cachedRequest.randomWords = randomWords.map(word => word.toString());
          cachedRequest.fulfilledAt = new Date().toISOString();
          
          this.requestCache.set(requestIdString, cachedRequest);
        }

        // Emit custom event for other services
        this.emit('vrfFulfilled', {
          requestId: requestIdString,
          randomWords: randomWords.map(word => word.toString()),
          event
        });
      });

      console.log('👂 VRF event listeners started');

    } catch (error) {
      console.error('❌ Failed to start event listeners:', error);
    }
  }

  /**
   * Stop event listeners
   */
  stopEventListeners() {
    if (this.contract) {
      this.contract.removeAllListeners();
      console.log('🔇 VRF event listeners stopped');
    }
  }

  /**
   * Simple event emitter functionality
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Ensure service is initialized
   */
  ensureInitialized() {
    if (!this.isInitialized) {
      throw new Error('VRF Manager Service not initialized. Call initialize() first.');
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopEventListeners();
    this.requestCache.clear();
    this.eventListeners.clear();
    this.isInitialized = false;
    console.log('🧹 VRF Manager Service cleaned up');
  }
}

// Export singleton instance
export const vrfManager = new VRFManagerService();
export default vrfManager;