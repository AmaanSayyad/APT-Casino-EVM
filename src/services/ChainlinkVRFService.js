/**
 * Chainlink VRF Service
 * Handles real Chainlink VRF interactions and proof generation
 */

import { ethers } from 'ethers';
import vrfProofService from './VRFProofService';
import VRF_CONFIG from '../config/vrf';

class ChainlinkVRFService {
  constructor() {
    this.contractAddress = VRF_CONFIG.CONTRACT_ADDRESS;
    this.treasuryAddress = VRF_CONFIG.TREASURY_ADDRESS;
    this.network = VRF_CONFIG.NETWORK;
    this.subscriptionId = VRF_CONFIG.SUBSCRIPTION_ID;
    this.keyHash = VRF_CONFIG.KEY_HASH;
    this.contractABI = this.getContractABI();
    this.provider = null;
    this.contract = null;
    this.treasurySigner = null;
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
   * Initialize the service with provider and signer
   */
  async initialize(provider, treasurySigner) {
    try {
      this.provider = provider;
      this.treasurySigner = treasurySigner;
      
      if (!this.contractAddress) {
        throw new Error('VRF contract address not configured');
      }

      if (!this.treasuryAddress) {
        throw new Error('Treasury address not configured');
      }

      this.contract = new ethers.Contract(
        this.contractAddress,
        this.contractABI,
        treasurySigner
      );

      console.log('✅ Chainlink VRF Service initialized');
      console.log('📋 Contract Address:', this.contractAddress);
      console.log('🏦 Treasury Address:', this.treasuryAddress);
      console.log('🔗 Network:', this.network);
      console.log('📝 Subscription ID:', this.subscriptionId);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize VRF service:', error);
      return false;
    }
  }

  /**
   * Generate 200 VRF proofs (50 for each game type)
   */
  async generateVRFProofs() {
    try {
      if (!this.contract || !this.treasurySigner) {
        throw new Error('VRF service not initialized');
      }

      console.log('🎲 Starting VRF proof generation...');

      // Prepare batch request data
      const gameTypes = [];
      const gameSubTypes = [];
      
      // MINES: 50 proofs
      for (let i = 0; i < 50; i++) {
        gameTypes.push(0); // MINES = 0
        gameSubTypes.push(`mines_${i + 1}`);
      }
      
      // PLINKO: 50 proofs
      for (let i = 0; i < 50; i++) {
        gameTypes.push(1); // PLINKO = 1
        gameSubTypes.push(`plinko_${i + 1}`);
      }
      
      // ROULETTE: 50 proofs
      for (let i = 0; i < 50; i++) {
        gameTypes.push(2); // ROULETTE = 2
        gameSubTypes.push(`roulette_${i + 1}`);
      }
      
      // WHEEL: 50 proofs
      for (let i = 0; i < 50; i++) {
        gameTypes.push(3); // WHEEL = 3
        gameSubTypes.push(`wheel_${i + 1}`);
      }

      console.log(`📊 Requesting ${gameTypes.length} VRF proofs...`);
      console.log('Game types:', gameTypes);
      console.log('Game sub-types:', gameSubTypes);

      // Request VRF batch
      const tx = await this.contract.requestRandomWordsBatch(gameTypes, gameSubTypes);
      console.log('📝 VRF batch transaction sent:', tx.hash);

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('✅ VRF batch transaction confirmed:', receipt);

      // Extract request IDs from transaction logs
      const requestIds = this.extractRequestIdsFromLogs(receipt.logs);
      console.log('🎯 Extracted request IDs:', requestIds);

      // Store pending proofs
      await this.storePendingProofs(requestIds, gameTypes, gameSubTypes, tx.hash, receipt);

      return {
        success: true,
        transactionHash: tx.hash,
        requestIds,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
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
        if (log.topics[0] === ethers.utils.id('VRFRequested(uint256,uint8,string,address)')) {
          const requestId = ethers.BigNumber.from(log.topics[1]).toString();
          requestIds.push(requestId);
        }
      }
    } catch (error) {
      console.error('Error extracting request IDs:', error);
    }

    return requestIds;
  }

  /**
   * Store pending proofs while waiting for fulfillment
   */
  async storePendingProofs(requestIds, gameTypes, gameSubTypes, txHash, receipt) {
    const gameTypeNames = ['MINES', 'PLINKO', 'ROULETTE', 'WHEEL'];
    
    for (let i = 0; i < requestIds.length; i++) {
      const gameType = gameTypeNames[gameTypes[i]];
      const gameSubType = gameSubTypes[i];
      
      const pendingProof = {
        requestId: requestIds[i],
        transactionHash: txHash,
        randomWords: [], // Will be filled when fulfilled
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        gameSubType,
        status: 'pending'
      };

      // Store as pending proof
      vrfProofService.addProof(gameType, pendingProof);
    }

    console.log(`📦 Stored ${requestIds.length} pending proofs`);
  }

  /**
   * Check and update fulfilled proofs
   */
  async checkFulfilledProofs() {
    try {
      if (!this.contract) return;

      const stats = await this.contract.getGameTypeStats();
      const [gameTypes, requestCounts, fulfilledCounts] = stats;

      console.log('📊 VRF Contract Stats:', {
        gameTypes: gameTypes.map(t => ['MINES', 'PLINKO', 'ROULETTE', 'WHEEL'][t]),
        requestCounts: requestCounts.map(c => c.toString()),
        fulfilledCounts: fulfilledCounts.map(c => c.toString())
      });

      // Check for newly fulfilled proofs
      await this.updateFulfilledProofs();

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
      if (!this.contract) return null;

      const info = await this.contract.getContractInfo();
      return {
        contractAddress: info[0],
        treasuryAddress: info[1],
        subscriptionId: info[2].toString(),
        totalRequests: info[3].toString(),
        totalFulfilled: info[4].toString()
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
