/**
 * VRF Configuration
 * Environment variables for Chainlink VRF integration
 */

export const VRF_CONFIG = {
  // VRF Contract Address (deployed on Sepolia)
  CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_VRF_CONTRACT_ADDRESS || '0x1c80757C451adce96d6cADB514036F07fc2347cb',
  
  // Treasury Address (can request VRF)
  TREASURY_ADDRESS: process.env.TREASURY_ADDRESS || '0xD599B4a78f602f597973F693439e89A97eDd4369',
  
  // Network configuration
  NETWORK: process.env.NEXT_PUBLIC_NETWORK || 'sepolia',
  
  // Chainlink VRF Configuration
  VRF_COORDINATOR: '0x50AE5Ea9C3e67Dea8a49ae1cC3f382D220B8947d', // Sepolia VRF Coordinator
  SUBSCRIPTION_ID: process.env.VRF_SUBSCRIPTION_ID || '12467',
  KEY_HASH: '0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15', // Sepolia Key Hash
  
  // Gas configuration
  CALLBACK_GAS_LIMIT: '2500000',
  REQUEST_CONFIRMATIONS: '3',
  
  // Proof generation settings
  BATCH_SIZE: 200, // Total proofs to generate
  PROOFS_PER_GAME: 50, // Proofs per game type
  
  // Auto-refill thresholds
  MIN_PROOFS_PER_GAME: 25, // Minimum proofs before auto-refill
  
  // Explorer URLs
  EXPLORER_URLS: {
    sepolia: 'https://sepolia.etherscan.io',
    mainnet: 'https://etherscan.io',
    goerli: 'https://goerli.etherscan.io'
  }
};

export default VRF_CONFIG;