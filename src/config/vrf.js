/**
 * VRF Configuration
 * Environment variables for Chainlink VRF integration
 */
export const VRF_CONFIG = {
  CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_VRF_CONTRACT_ADDRESS || '0x1c80757C451adce96d6cADB514036F07fc2347cb',
  TREASURY_ADDRESS: process.env.TREASURY_ADDRESS || '0xD599B4a78f602f597973F693439e89A97eDd4369',
  TREASURY_PRIVATE_KEY: process.env.TREASURY_PRIVATE_KEY || '0xa0c83522c748fcd4086854f3635b2b9a762d8107b9f0b478a7d8515f5897abec',
  NETWORK: process.env.NEXT_PUBLIC_NETWORK || 'sepolia',
  RPC_URL: process.env.NEXT_PUBLIC_SEPOLIA_RPC || 'https://ethereum-sepolia.publicnode.com',
  VRF_COORDINATOR: '0x50AE5Ea9C3e67Dea8a49ae1cC3f382D220B8947d', // Sepolia
  SUBSCRIPTION_ID: process.env.VRF_SUBSCRIPTION_ID || '12467',
  KEY_HASH: '0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15', // Sepolia Key Hash
  CALLBACK_GAS_LIMIT: '2500000',
  REQUEST_CONFIRMATIONS: '3',
  BATCH_SIZE: 200,
  PROOFS_PER_GAME: 50,
  MIN_PROOFS_PER_GAME: 25,
  EXPLORER_URLS: {
    'sepolia': 'https://sepolia.etherscan.io',
    'mainnet': 'https://etherscan.io',
    'goerli': 'https://goerli.etherscan.io'
  }
};
export default VRF_CONFIG;