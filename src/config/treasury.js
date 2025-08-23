// Casino Treasury Configuration
// This file contains the treasury wallet address and related configuration

// Test Treasury Address (Replace with your actual treasury address in production)
export const TREASURY_CONFIG = {
  // Casino Treasury Wallet (Generated for development)
  ADDRESS: process.env.TREASURY_ADDRESS || '0xD599B4a78f602f597973F693439e89A97eDd4369',
  
  // ⚠️  DEVELOPMENT ONLY - Never use in production!
  PRIVATE_KEY: process.env.TREASURY_PRIVATE_KEY || '0xa0c83522c748fcd4086854f3635b2b9a762d8107b9f0b478a7d8515f5897abec',
  
  // Network configuration
  NETWORK: {
    CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || '0xaa36a7', // Sepolia testnet
    CHAIN_NAME: process.env.NEXT_PUBLIC_NETWORK || 'Sepolia',
    RPC_URL: process.env.NEXT_PUBLIC_SEPOLIA_RPC || 'https://rpc.sepolia.org',
    EXPLORER_URL: process.env.NEXT_PUBLIC_SEPOLIA_EXPLORER || 'https://sepolia.etherscan.io'
  },
  
  // Gas settings for transactions
  GAS: {
    DEPOSIT_LIMIT: process.env.GAS_LIMIT_DEPOSIT ? '0x' + parseInt(process.env.GAS_LIMIT_DEPOSIT).toString(16) : '0x5208', // 21000 gas for simple ETH transfer
    WITHDRAW_LIMIT: process.env.GAS_LIMIT_WITHDRAW ? '0x' + parseInt(process.env.GAS_LIMIT_WITHDRAW).toString(16) : '0x186A0', // 100000 gas for more complex operations
  },
  
  // Minimum and maximum deposit amounts
  LIMITS: {
    MIN_DEPOSIT: parseFloat(process.env.MIN_DEPOSIT) || 0.001, // 0.001 ETH minimum
    MAX_DEPOSIT: parseFloat(process.env.MAX_DEPOSIT) || 100, // 100 ETH maximum
  }
};

// Helper function to validate treasury address
export const isValidTreasuryAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Helper function to get treasury info
export const getTreasuryInfo = () => {
  return {
    address: TREASURY_CONFIG.ADDRESS,
    network: TREASURY_CONFIG.NETWORK.CHAIN_NAME,
    chainId: TREASURY_CONFIG.NETWORK.CHAIN_ID
  };
};
