// Casino Treasury Configuration
// This file contains the treasury wallet address and related configuration

// Test Treasury Address (Replace with your actual treasury address in production)
export const TREASURY_CONFIG = {
  // Casino Treasury Wallet (Arbitrum Sepolia)
  ADDRESS: process.env.TREASURY_ADDRESS || '0xb424d2369F07b925D1218B08e56700AF5928287b',
  
  // ⚠️  DEVELOPMENT ONLY - Never use in production!
  PRIVATE_KEY: process.env.TREASURY_PRIVATE_KEY || '0x080c0b0dc7aa27545fab73d29b06f33e686d1491aef785bf5ced325a32c14506',
  
  // Network configuration for Arbitrum Sepolia
  NETWORK: {
    CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || '0x66eee', // Arbitrum Sepolia testnet
    CHAIN_NAME: process.env.NEXT_PUBLIC_NETWORK || 'Arbitrum Sepolia',
    RPC_URL: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc',
    EXPLORER_URL: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_EXPLORER || 'https://sepolia.arbiscan.io'
  },
  
  // Gas settings for transactions
  GAS: {
    DEPOSIT_LIMIT: process.env.GAS_LIMIT_DEPOSIT ? '0x' + parseInt(process.env.GAS_LIMIT_DEPOSIT).toString(16) : '0x5208', // 21000 gas for simple ETH transfer
    WITHDRAW_LIMIT: process.env.GAS_LIMIT_WITHDRAW ? '0x' + parseInt(process.env.GAS_LIMIT_WITHDRAW).toString(16) : '0x186A0', // 100000 gas for more complex operations
  },
  
  // Minimum and maximum deposit amounts (in ARB ETH)
  LIMITS: {
    MIN_DEPOSIT: parseFloat(process.env.MIN_DEPOSIT) || 0.001, // 0.001 ARB ETH minimum
    MAX_DEPOSIT: parseFloat(process.env.MAX_DEPOSIT) || 100, // 100 ARB ETH maximum
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
