// Ethereum Network Configuration
export const ETHEREUM_NETWORKS = {
  TESTNET: 'testnet',
  MAINNET: 'mainnet',
  DEVNET: 'devnet'
};

// Ethereum Network URLs
export const ETHEREUM_NETWORK_URLS = {
  [ETHEREUM_NETWORKS.TESTNET]: "https://fullnode.testnet.ethereum.org",
  [ETHEREUM_NETWORKS.MAINNET]: "https://fullnode.mainnet.ethereum.org",
  [ETHEREUM_NETWORKS.DEVNET]: "https://fullnode.devnet.ethereum.org"
};

// Ethereum Faucet URLs
export const ETHEREUM_FAUCET_URLS = {
  [ETHEREUM_NETWORKS.TESTNET]: "https://faucet.testnet.ethereum.org",
  [ETHEREUM_NETWORKS.DEVNET]: "https://faucet.devnet.ethereum.org"
};

// Ethereum Explorer URLs
export const ETHEREUM_EXPLORER_URLS = {
  [ETHEREUM_NETWORKS.TESTNET]: "https://explorer.testnet.ethereum.org/account",
  [ETHEREUM_NETWORKS.MAINNET]: "https://explorer.ethereum.org/account",
  [ETHEREUM_NETWORKS.DEVNET]: "https://explorer.devnet.ethereum.org/account"
};

// Default network (can be changed via environment variable)
export const DEFAULT_NETWORK = ETHEREUM_NETWORKS.TESTNET;

// Casino Module Configuration
export const CASINO_MODULE_CONFIG = {
  [ETHEREUM_NETWORKS.TESTNET]: {
    moduleAddress: process.env.NEXT_PUBLIC_CASINO_MODULE_ADDRESS || "0x1234567890123456789012345678901234567890123456789012345678901234",
    moduleName: "casino",
    rouletteModule: "roulette",
    minesModule: "mines",
    wheelModule: "wheel"
  },
  [ETHEREUM_NETWORKS.MAINNET]: {
    moduleAddress: process.env.NEXT_PUBLIC_CASINO_MODULE_ADDRESS || "0x1234567890123456789012345678901234567890123456789012345678901234",
    moduleName: "casino",
    rouletteModule: "roulette",
    minesModule: "mines",
    wheelModule: "wheel"
  },
  [ETHEREUM_NETWORKS.DEVNET]: {
    moduleAddress: process.env.NEXT_PUBLIC_CASINO_MODULE_ADDRESS || "0x1234567890123456789012345678901234567890123456789012345678901234",
    moduleName: "casino",
    rouletteModule: "roulette",
    minesModule: "mines",
    wheelModule: "wheel"
  }
};

// Token Configuration
export const TOKEN_CONFIG = {
  ETH: {
    name: "Ethereum Coin",
    symbol: "ETH",
    decimals: 18,
    type: "0x1::ethereum_coin::EthereumCoin"
  },
  ETH: {
    name: "ETH Casino Token",
    symbol: "ETH",
    decimals: 8,
    type: "0x1::coin::CoinStore<0x1::ethereum_coin::EthereumCoin>"
  }
};

// Network Information
export const NETWORK_INFO = {
  [ETHEREUM_NETWORKS.TESTNET]: {
    name: "Ethereum Testnet",
    chainId: 5,
    nativeCurrency: TOKEN_CONFIG.ETH,
    explorer: ETHEREUM_EXPLORER_URLS[ETHEREUM_NETWORKS.TESTNET],
    faucet: ETHEREUM_FAUCET_URLS[ETHEREUM_NETWORKS.TESTNET]
  },
  [ETHEREUM_NETWORKS.MAINNET]: {
    name: "Ethereum Mainnet",
    chainId: 1,
    nativeCurrency: TOKEN_CONFIG.ETH,
    explorer: ETHEREUM_EXPLORER_URLS[ETHEREUM_NETWORKS.MAINNET]
  },
  [ETHEREUM_NETWORKS.DEVNET]: {
    name: "Ethereum Devnet",
    chainId: 1337,
    nativeCurrency: TOKEN_CONFIG.ETH,
    explorer: ETHEREUM_EXPLORER_URLS[ETHEREUM_NETWORKS.DEVNET],
    faucet: ETHEREUM_FAUCET_URLS[ETHEREUM_NETWORKS.DEVNET]
  }
};

// Export default configuration
export default {
  ETHEREUM_NETWORKS,
  ETHEREUM_NETWORK_URLS,
  ETHEREUM_FAUCET_URLS,
  ETHEREUM_EXPLORER_URLS,
  DEFAULT_NETWORK,
  CASINO_MODULE_CONFIG,
  TOKEN_CONFIG,
  NETWORK_INFO
}; 