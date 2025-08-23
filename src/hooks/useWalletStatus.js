'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

const WalletStatusContext = createContext(null);

export function WalletStatusProvider({ children }) {
  const isDev = process.env.NODE_ENV === 'development';

  const { 
    address: account,
    isConnected: connected,
    chain: network
  } = useAccount();
  
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const [devWallet, setDevWallet] = useState({
    isConnected: false,
    address: null,
    chain: null,
  });

  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isDev) return;

    const savedState = localStorage.getItem('dev-wallet-state');
    if (savedState === 'connected') {
      setDevWallet({
        isConnected: true,
        address: '0x1234...dev',
        chain: { id: 'ethereum_testnet', name: 'Ethereum Testnet' },
      });
    }

    const handleToggle = () => {
      setDevWallet((prev) => {
        const newState = !prev.isConnected;
        localStorage.setItem(
          'dev-wallet-state',
          newState ? 'connected' : 'disconnected'
        );

        return newState
          ? {
              isConnected: true,
              address: '0x1234...dev',
              chain: { id: 'ethereum_testnet', name: 'Ethereum Testnet' },
            }
          : {
              isConnected: false,
              address: null,
              chain: null,
            };
      });
    };

    window.addEventListener('dev-wallet-toggle', handleToggle);
    return () => {
      window.removeEventListener('dev-wallet-toggle', handleToggle);
    };
  }, [isDev]);

  const connectWallet = useCallback(async () => {
    if (isDev) {
      localStorage.setItem('dev-wallet-state', 'connected');
      setDevWallet({
        isConnected: true,
        address: '0x1234...dev',
        chain: { id: 'ethereum_testnet', name: 'Ethereum Testnet' },
      });
      return;
    }

    try {
      // MetaMask ile bağlan
      const metaMaskConnector = connectors.find(connector => connector.id === 'metaMask');
      if (metaMaskConnector) {
        await connect({ connector: metaMaskConnector });
      } else {
        setError('MetaMask connector not found');
      }
    } catch (err) {
      setError('Failed to connect to MetaMask: ' + err.message);
    }
  }, [connect, connectors, isDev]);

  const disconnectWallet = useCallback(async () => {
    if (isDev) {
      localStorage.setItem('dev-wallet-state', 'disconnected');
      setDevWallet({
        isConnected: false,
        address: null,
        chain: null,
      });
      return;
    }

    try {
      await disconnect();
    } catch (err) {
      setError('Failed to disconnect wallet: ' + err.message);
    }
  }, [disconnect, isDev]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const currentStatus = isDev
    ? devWallet
    : {
        isConnected: connected,
        address: account?.address,
        chain: { 
          id: 'ethereum_testnet', 
          name: 'Ethereum Testnet' 
        },
      };

  useEffect(() => {
    console.log('🔌 Ethereum Wallet connection changed:');
    console.log('Connected:', currentStatus.isConnected);
    console.log('Address:', currentStatus.address);
    console.log('Chain:', currentStatus.chain);
  }, [currentStatus]);

  return (
    <WalletStatusContext.Provider
      value={{
        ...currentStatus,
        isDev,
        connectWallet,
        disconnectWallet,
        resetError,
        error,
      }}
    >
      {children}
    </WalletStatusContext.Provider>
  );
}

export default function useWalletStatus() {
  const context = useContext(WalletStatusContext);
  if (!context) {
    throw new Error('useWalletStatus must be used within a WalletStatusProvider');
  }
  return context;
}
