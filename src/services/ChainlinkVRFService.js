/**
 * Chainlink VRF Service
 * Handles real Chainlink VRF interactions and proof generation
 */

import vrfProofService from './VRFProofService';
import VRF_CONFIG from '../config/vrf';
import { ethers } from 'ethers';

class ChainlinkVRFService {
  constructor() {
    this.contractAddress = VRF_CONFIG.CONTRACT_ADDRESS;
    this.treasuryAddress = VRF_CONFIG.TREASURY_ADDRESS;
    this.treasuryPrivateKey = VRF_CONFIG.TREASURY_PRIVATE_KEY;
    this.network = VRF_CONFIG.NETWORK;
    this.subscriptionId = VRF_CONFIG.SUBSCRIPTION_ID;
    this.keyHash = VRF_CONFIG.KEY_HASH;
    this.contractABI = this.getContractABI();
    this.provider = null;
    this.treasurySigner = null;
    this.transactionHashes = []; // Track transaction hashes for proof association
  }

  /**
   * Get VRF contract ABI
   */
  getContractABI() {
    return [
      "function requestRandomWordsBatch(uint8[] gameTypes, string[] gameSubTypes) external returns (uint256[])",
      "function getRequest(uint256 requestId) external view returns (tuple(address requester, uint8 gameType, string gameSubType, bool fulfilled, uint256[] randomWords, uint256 timestamp))",
      "function getGameTypeStats() external view returns (uint8[], uint256[], uint256[])",
      "function getContractInfo() external view returns (address, address, uint64, uint256, uint256)",
      "event VRFRequested(uint256 indexed requestId, uint8 gameType, string gameSubType, address requester)",
      "event VRFFulfilled(uint256 indexed requestId, uint256[] randomWords)"
    ];
  }

  /**
   * Initialize the service with treasury private key
   */
  async initialize() {
    try {
      if (!this.contractAddress) {
        throw new Error('VRF contract address not configured');
      }

      if (!this.treasuryAddress) {
        throw new Error('Treasury address not configured');
      }

      if (!this.treasuryPrivateKey) {
        throw new Error('Treasury private key not configured');
      }

      // Create provider and signer using treasury private key
      this.provider = new ethers.JsonRpcProvider(VRF_CONFIG.RPC_URL);
      this.treasurySigner = new ethers.Wallet(this.treasuryPrivateKey, this.provider);

      console.log('✅ Chainlink VRF Service initialized with Treasury');
      console.log('📋 Contract Address:', this.contractAddress);
      console.log('🏦 Treasury Address:', this.treasuryAddress);
      console.log('🔗 Network:', this.network);
      console.log('📝 Subscription ID:', this.subscriptionId);
      console.log('🔑 RPC URL:', VRF_CONFIG.RPC_URL);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize VRF service:', error);
      return false;
    }
  }

  /**
   * Generate 200 VRF proofs (50 for each game type) - REAL BLOCKCHAIN INTERACTION
   */
  async generateVRFProofs(progressCallback = null) {
    try {
      if (!this.provider || !this.treasurySigner) {
        throw new Error('VRF service not initialized');
      }

      console.log('🎲 Starting REAL VRF proof generation with Treasury...');

      // Create contract instance with treasury signer
      const contract = new ethers.Contract(this.contractAddress, this.contractABI, this.treasurySigner);

      const allRequestIds = [];
      let totalGasUsed = 0n;
      let totalProgress = 0;

      // Send in smaller batches to avoid "Batch too large" error
      const batchSize = 25; // 25 proofs per batch instead of 200
      const gameTypes = ['MINES', 'PLINKO', 'ROULETTE', 'WHEEL'];
      const totalBatches = gameTypes.length * 2; // 4 games × 2 batches each
      
      for (let gameIndex = 0; gameIndex < gameTypes.length; gameIndex++) {
        const gameType = gameIndex;
        const gameTypeName = gameTypes[gameIndex];
        
        console.log(`📊 Processing ${gameTypeName} (${gameType})...`);
        
        // Send 50 proofs for this game type in 2 batches of 25
        for (let batchIndex = 0; batchIndex < 2; batchIndex++) {
          const batchGameTypes = [];
          const batchGameSubTypes = [];
          
          for (let i = 0; i < batchSize; i++) {
            const proofNumber = batchIndex * batchSize + i + 1;
            batchGameTypes.push(gameType);
            batchGameSubTypes.push(`${gameTypeName.toLowerCase()}_${proofNumber}`);
          }
          
          console.log(`📦 Sending batch ${batchIndex + 1} for ${gameTypeName}: ${batchSize} proofs`);
          
          // Estimate gas first
          const gasEstimate = await contract.requestRandomWordsBatch.estimateGas(batchGameTypes, batchGameSubTypes);
          console.log(`⛽ Estimated gas for ${gameTypeName} batch ${batchIndex + 1}:`, gasEstimate.toString());

          // Request VRF batch with proper gas settings
          const tx = await contract.requestRandomWordsBatch(
            batchGameTypes, 
            batchGameSubTypes,
            {
              gasLimit: gasEstimate * 120n / 100n, // Add 20% buffer
              maxFeePerGas: ethers.parseUnits('20', 'gwei'), // Max fee per gas
              maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei') // Max priority fee
            }
          );
          
          console.log(`📝 ${gameTypeName} batch ${batchIndex + 1} transaction sent:`, tx.hash);
          console.log(`🔗 Transaction URL:`, `${VRF_CONFIG.EXPLORER_URLS[this.network]}/tx/${tx.hash}`);

          // Wait for transaction confirmation
          const receipt = await tx.wait();
          console.log(`✅ ${gameTypeName} batch ${batchIndex + 1} confirmed:`, receipt.blockNumber);
          console.log(`⛽ Gas used:`, receipt.gasUsed.toString());
          
          totalGasUsed += receipt.gasUsed;

          // Extract request IDs from transaction logs
          const requestIds = this.extractRequestIdsFromLogs(receipt.logs);
          console.log(`🎯 Extracted ${requestIds.length} request IDs from ${gameTypeName} batch ${batchIndex + 1}`);
          
          allRequestIds.push(...requestIds);

          // Store pending proofs
          await this.storePendingProofs(requestIds, batchGameTypes, batchGameSubTypes, tx.hash, receipt);

          // Update progress
          totalProgress += (100 / totalBatches);
          if (progressCallback) {
            progressCallback(Math.round(totalProgress));
          }

          // Wait a bit between batches to avoid overwhelming the network
          if (batchIndex < 1 || gameIndex < gameTypes.length - 1) {
            console.log('⏳ Waiting 2 seconds before next batch...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      console.log(`🎉 All VRF proofs generated successfully!`);
      console.log(`📊 Total request IDs: ${allRequestIds.length}`);
      console.log(`⛽ Total gas used: ${totalGasUsed.toString()}`);

      return {
        success: true,
        transactionHash: `Multiple transactions - ${allRequestIds.length} proofs generated`,
        requestIds: allRequestIds,
        blockNumber: 'Multiple blocks',
        gasUsed: totalGasUsed.toString(),
        explorerUrl: `${VRF_CONFIG.EXPLORER_URLS[this.network]}`
      };

    } catch (error) {
      console.error('❌ VRF proof generation failed:', error);
      throw error;
    }
  }

  /**
   * Extract request IDs from transaction logs
   */
  extractRequestIdsFromLogs(logs) {
    const requestIds = [];
    
    try {
      for (const log of logs) {
        // Check if this is a VRFRequested event
        if (log.topics && log.topics[0]) {
          const eventSignature = ethers.id('VRFRequested(uint256,uint8,string,address)');
          if (log.topics[0] === eventSignature) {
            // Extract request ID from the first indexed parameter
            const requestId = ethers.getBigInt(log.topics[1]).toString();
            requestIds.push(requestId);
          }
        }
      }
    } catch (error) {
      console.error('Error extracting request IDs:', error);
    }

    console.log('🔍 Extracted request IDs from logs:', requestIds);
    return requestIds;
  }

  /**
   * Store pending proofs in local storage
   */
  async storePendingProofs(requestIds, gameTypes, gameSubTypes, transactionHash, receipt) {
    try {
      console.log('💾 Storing pending VRF proofs...');
      
      // Determine which transaction this is (0-3, since we have 4 transactions total)
      const transactionIndex = this.getTransactionIndex(transactionHash);
      console.log(`📝 Storing proofs for transaction ${transactionIndex} (${transactionHash})`);
      
      for (let i = 0; i < requestIds.length; i++) {
        const requestId = requestIds[i];
        const gameType = gameTypes[i];
        const gameSubType = gameSubTypes[i];
        
        // Find the corresponding log for this request ID
        const logIndex = this.findLogIndexForRequestId(receipt.logs, requestId);
        
        const proofData = {
          requestId,
          transactionHash,
          randomWords: [], // Will be filled when fulfilled
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          logIndex: logIndex, // Add log index
          batchIndex: Math.floor(i / 25), // Which batch this came from
          transactionIndex: transactionIndex // Which of the 4 transactions this came from
        };

        // Store in VRF proof service
        await vrfProofService.addProof(this.getGameTypeName(gameType), proofData);
      }

      console.log(`✅ Stored ${requestIds.length} pending VRF proofs for transaction ${transactionIndex}`);
    } catch (error) {
      console.error('❌ Error storing pending proofs:', error);
    }
  }

  /**
   * Get transaction index (0-3) based on transaction hash
   * This helps track which of the 4 VRF generation transactions each proof came from
   */
  getTransactionIndex(transactionHash) {
    // Store transaction hashes in order they were created
    if (!this.transactionHashes) {
      this.transactionHashes = [];
    }
    
    // If this is a new transaction hash, add it to the list
    if (!this.transactionHashes.includes(transactionHash)) {
      this.transactionHashes.push(transactionHash);
      console.log(`📝 New transaction hash added: ${transactionHash} at index ${this.transactionHashes.length - 1}`);
    }
    
    // Return the index of this transaction
    const index = this.transactionHashes.indexOf(transactionHash);
    console.log(`🔍 Transaction ${transactionHash} is at index ${index} of ${this.transactionHashes.length} total transactions`);
    
    return index;
  }

  /**
   * Find log index for a specific request ID
   */
  findLogIndexForRequestId(logs, requestId) {
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      if (log.topics && log.topics[0]) {
        const eventSignature = ethers.id('VRFRequested(uint256,uint8,string,address)');
        if (log.topics[0] === eventSignature) {
          const logRequestId = ethers.getBigInt(log.topics[1]).toString();
          if (logRequestId === requestId) {
            return i; // Return the log index
          }
        }
      }
    }
    return 0; // Default to 0 if not found
  }

  /**
   * Get game type name from number
   */
  getGameTypeName(gameType) {
    const gameTypes = ['MINES', 'PLINKO', 'ROULETTE', 'WHEEL'];
    return gameTypes[gameType] || 'UNKNOWN';
  }

  /**
   * Check and update fulfilled proofs
   */
  async checkFulfilledProofs() {
    try {
      if (!this.provider) return;

      console.log('📊 Checking VRF contract stats...');
      
      // In a real implementation, you would:
      // 1. Call contract methods to get stats
      // 2. Listen to VRF fulfillment events
      // 3. Update proofs with random words
      // 4. Mark proofs as fulfilled
      
    } catch (error) {
      console.error('Error checking fulfilled proofs:', error);
    }
  }

  /**
   * Update fulfilled proofs with random words
   */
  async updateFulfilledProofs() {
    try {
      // This would typically involve listening to VRF fulfillment events
      // For now, we'll simulate the process
      console.log('🔄 Checking for fulfilled proofs...');
      
      // In a real implementation, you would:
      // 1. Listen to VRF fulfillment events
      // 2. Update proofs with random words
      // 3. Mark proofs as fulfilled
      
    } catch (error) {
      console.error('Error updating fulfilled proofs:', error);
    }
  }

  /**
   * Get contract information
   */
  async getContractInfo() {
    try {
      if (!this.provider) return null;

      // In a real implementation, you would call contract methods
      console.log('📋 Getting contract info...');
      
      return {
        contractAddress: this.contractAddress,
        treasuryAddress: this.treasuryAddress,
        subscriptionId: this.subscriptionId,
        totalRequests: '0',
        totalFulfilled: '0'
      };
    } catch (error) {
      console.error('Error getting contract info:', error);
      return null;
    }
  }

  /**
   * Simulate VRF fulfillment for testing (remove in production)
   */
  async simulateVRFFulfillment() {
    console.log('🧪 Simulating VRF fulfillment for testing...');
    
    const gameTypes = ['MINES', 'PLINKO', 'ROULETTE', 'WHEEL'];
    
    for (const gameType of gameTypes) {
      for (let i = 0; i < 50; i++) {
        const proofData = {
          requestId: `${gameType}_${Date.now()}_${i}`,
          transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
          randomWords: [Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString()],
          blockNumber: Math.floor(Math.random() * 1000000),
          gasUsed: Math.floor(Math.random() * 100000).toString()
        };
        
        vrfProofService.addProof(gameType, proofData);
      }
    }
    
    console.log('✅ Simulated VRF proofs created');
  }
}

export default ChainlinkVRFService;
