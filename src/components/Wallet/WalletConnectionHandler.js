'use client';

import React, { useEffect, useState } from 'react';
import { useAccount, useNetwork, useSwitchNetwork } from 'wagmi';
import { sepolia } from 'wagmi/chains';

/**
 * WalletConnectionHandler
 * Manages wallet connection stability and network switching
 */
const WalletConnectionHandler = ({ children }) => {
  const { isConnected, address } = useAccount();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  const [isNetworkSwitching, setIsNetworkSwitching] = useState(false);

  // Auto-switch to Sepolia if on wrong network
  useEffect(() => {
    if (isConnected && chain && chain.id !== sepolia.id && !isNetworkSwitching) {
      console.log('🔄 Wrong network detected, switching to Sepolia...');
      setIsNetworkSwitching(true);
      
      switchNetwork?.(sepolia.id)
        .then(() => {
          console.log('✅ Successfully switched to Sepolia');
        })
        .catch((error) => {
          console.error('❌ Failed to switch network:', error);
        })
        .finally(() => {
          setIsNetworkSwitching(false);
        });
    }
  }, [isConnected, chain, switchNetwork, isNetworkSwitching]);

  // Monitor wallet connection stability
  useEffect(() => {
    if (!isConnected) return;

    const checkConnection = () => {
      if (window.ethereum && !window.ethereum.isConnected()) {
        console.log('⚠️ MetaMask connection lost, attempting to reconnect...');
        // The wallet will auto-reconnect through our existing logic
      }
    };

    // Check connection every 10 seconds
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, [isConnected]);

  // Show network switching indicator
  if (isNetworkSwitching) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-800">Switching to Sepolia network...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default WalletConnectionHandler;
