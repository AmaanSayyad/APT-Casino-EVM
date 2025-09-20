/**
 * VRF Configuration for Arbitrum Sepolia
 * Environment variables for Chainlink VRF integration
 */
export const VRF_CONFIG = {
  CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_VRF_CONTRACT_ADDRESS || '0xe2B5066f1521A4b882053F6D758d4288c5928586', // Deployed contract
  TREASURY_ADDRESS: process.env.TREASURY_ADDRESS || '0xb424d2369F07b925D1218B08e56700AF5928287b',
  TREASURY_PRIVATE_KEY: process.env.TREASURY_PRIVATE_KEY || '0x080c0b0dc7aa27545fab73d29b06f33e686d1491aef785bf5ced325a32c14506',
  NETWORK: process.env.NEXT_PUBLIC_NETWORK || 'arbitrum-sepolia',
  RPC_URL: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc',
  VRF_COORDINATOR: process.env.VRF_COORDINATOR || '0x50d47e4142598E3411aA864e08a44284e471AC6f', // Arbitrum Sepolia VRF Coordinator
  SUBSCRIPTION_ID: process.env.VRF_SUBSCRIPTION_ID || '453', // Created subscription
  KEY_HASH: process.env.VRF_KEY_HASH || '0x027f94ff1465b3525f9fc03e9ff7d6d2c0953482246dd6ae07570c45d6631414', // Arbitrum Sepolia Key Hash
  CALLBACK_GAS_LIMIT: process.env.VRF_CALLBACK_GAS_LIMIT || '100000',
  REQUEST_CONFIRMATIONS: process.env.VRF_REQUEST_CONFIRMATIONS || '1',
  BATCH_SIZE: parseInt(process.env.VRF_BATCH_SIZE) || 200,
  PROOFS_PER_GAME: parseInt(process.env.VRF_PROOFS_PER_GAME) || 50,
  MIN_PROOFS_PER_GAME: parseInt(process.env.VRF_MIN_PROOFS_PER_GAME) || 25,
  EXPLORER_URLS: {
    'arbitrum-sepolia': 'https://sepolia.arbiscan.io',
    'arbitrum-one': 'https://arbiscan.io',
    'arbitrum-devnet': 'http://localhost:8545'
  },

  /**
   * Validate VRF configuration
   */
  validateVRFConfig() {
    const errors = [];
    
    if (!this.CONTRACT_ADDRESS || this.CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      errors.push('VRF contract address not configured');
    }
    
    if (!this.TREASURY_ADDRESS) {
      errors.push('Treasury address not configured');
    }
    
    if (!this.TREASURY_PRIVATE_KEY) {
      errors.push('Treasury private key not configured');
    }
    
    if (!this.RPC_URL) {
      errors.push('RPC URL not configured');
    }
    
    if (!this.VRF_COORDINATOR) {
      errors.push('VRF Coordinator not configured');
    }
    
    if (!this.SUBSCRIPTION_ID || this.SUBSCRIPTION_ID === '0') {
      errors.push('VRF Subscription ID not configured');
    }
    
    if (!this.KEY_HASH) {
      errors.push('VRF Key Hash not configured');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};
export default VRF_CONFIG;