// Chainlink VRF v2 Configuration for Sepolia Testnet
const VRF_CONFIG = {
  // Sepolia Testnet Configuration
  SEPOLIA: {
    COORDINATOR: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
    KEY_HASH: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", // 30 gwei
    LINK_TOKEN: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    CALLBACK_GAS_LIMIT: 2500000,
    REQUEST_CONFIRMATIONS: 3,
    NUM_WORDS: 1,
  },
  
  // Contract addresses (will be populated after deployment)
  CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_VRF_CONTRACT_ADDRESS || "",
  SUBSCRIPTION_ID: process.env.VRF_SUBSCRIPTION_ID || "0",
  
  // Game type configurations
  GAME_TYPES: {
    MINES: 0,
    PLINKO: 1,
    ROULETTE: 2,
    WHEEL: 3,
  },
  
  // VRF allocation per game type (total 200 VRF)
  VRF_ALLOCATION: {
    MINES: {
      subtypes: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24'],
      countPerSubtype: 2, // 24 * 2 = 48 VRF
    },
    PLINKO: {
      subtypes: ['8', '10', '12', '14', '16'],
      countPerSubtype: 10, // 5 * 10 = 50 VRF
    },
    ROULETTE: {
      subtypes: ['standard'],
      countPerSubtype: 51, // 51 VRF
    },
    WHEEL: {
      subtypes: ['standard'],
      countPerSubtype: 51, // 51 VRF
    },
  },
  
  // VRF request batch configuration
  BATCH_CONFIG: {
    MAX_BATCH_SIZE: 50, // Maximum VRF requests per batch
    REFILL_THRESHOLD: 0.2, // Refill when VRF count drops below 20%
    EMERGENCY_THRESHOLD: 0.1, // Emergency refill at 10%
    INITIAL_BATCH_SIZE: 200, // Initial VRF batch on user login
    MIN_PROOF_THRESHOLD: 25, // Minimum proof threshold before auto-refill
  },
  
  // Retry configuration
  RETRY_CONFIG: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 5000, // 5 seconds
    EXPONENTIAL_BACKOFF: true,
  },
  
  // Monitoring thresholds
  MONITORING: {
    LOW_VRF_THRESHOLD: 40, // Alert when total VRF < 40
    HIGH_ERROR_RATE: 0.05, // Alert when error rate > 5%
    SLOW_FULFILLMENT: 30000, // Alert when fulfillment > 30 seconds
  },

  // Validation helpers
  validateVRFConfig() {
    const errors = [];
    
    if (!this.CONTRACT_ADDRESS) {
      errors.push("VRF contract address not configured");
    }
    
    if (!this.SUBSCRIPTION_ID || this.SUBSCRIPTION_ID === "0") {
      errors.push("VRF subscription ID not configured");
    }
    
    const totalVRF = this.calculateTotalVRFNeeded();
    if (totalVRF !== 200) {
      errors.push(`VRF allocation total is ${totalVRF}, expected 200`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      totalVRFAllocated: totalVRF,
    };
  },

  // Helper methods
  getGameTypeString(gameType) {
    const gameTypes = ['MINES', 'PLINKO', 'ROULETTE', 'WHEEL'];
    return gameTypes[gameType] || 'UNKNOWN';
  },

  getGameTypeNumber(gameTypeString) {
    return this.GAME_TYPES[gameTypeString.toUpperCase()] ?? -1;
  },

  calculateTotalVRFNeeded() {
    const allocation = this.VRF_ALLOCATION;
    let total = 0;
    
    Object.keys(allocation).forEach(gameType => {
      const config = allocation[gameType];
      total += config.subtypes.length * config.countPerSubtype;
    });
    
    return total;
  },

  getVRFAllocationForGame(gameType) {
    return this.VRF_ALLOCATION[gameType.toUpperCase()] || null;
  },

  isValidGameType(gameType) {
    return Object.keys(this.GAME_TYPES).includes(gameType.toUpperCase());
  },

  isValidGameSubType(gameType, subType) {
    const allocation = this.getVRFAllocationForGame(gameType);
    return allocation ? allocation.subtypes.includes(subType) : false;
  },

  getNetworkConfig(network = 'sepolia') {
    switch (network.toLowerCase()) {
      case 'sepolia':
        return this.SEPOLIA;
      default:
        throw new Error(`Unsupported network: ${network}`);
    }
  }
};

// Legacy export functions for backward compatibility
export const getGameTypeString = (gameType) => VRF_CONFIG.getGameTypeString(gameType);
export const getGameTypeNumber = (gameTypeString) => VRF_CONFIG.getGameTypeNumber(gameTypeString);
export const calculateTotalVRFNeeded = () => VRF_CONFIG.calculateTotalVRFNeeded();
export const getVRFAllocationForGame = (gameType) => VRF_CONFIG.getVRFAllocationForGame(gameType);
export const isValidGameType = (gameType) => VRF_CONFIG.isValidGameType(gameType);
export const isValidGameSubType = (gameType, subType) => VRF_CONFIG.isValidGameSubType(gameType, subType);
export const getNetworkConfig = (network) => VRF_CONFIG.getNetworkConfig(network);
export const validateVRFConfig = () => VRF_CONFIG.validateVRFConfig();

export default VRF_CONFIG;