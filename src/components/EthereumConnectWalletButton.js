"use client";
import React, { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useNetwork, useSwitchNetwork } from 'wagmi';
import { sepolia } from 'wagmi/chains';

export default function EthereumConnectWalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  // Auto-reconnect on page load if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      try {
        // Check if wallet was previously connected
        const wasConnected = localStorage.getItem('wagmi.connected');
        const savedAddress = localStorage.getItem('wagmi.address');
        
        if (wasConnected === 'true' && savedAddress && !isConnected) {
          console.log('🔄 Attempting auto-reconnect...');
          
          // Try to find MetaMask connector first
          let connector = connectors.find(c => c.id === 'metaMask');
          
          // If not found, try injected connector
          if (!connector) {
            connector = connectors.find(c => c.id === 'injected');
          }
          
          if (connector) {
            await connect({ connector });
            console.log('✅ Auto-reconnect successful');
          }
        }
      } catch (error) {
        console.log('❌ Auto-reconnect failed:', error);
        // Clear the connection flag if auto-reconnect fails
        localStorage.removeItem('wagmi.connected');
        localStorage.removeItem('wagmi.address');
      }
    };

    // Small delay to ensure connectors are ready
    const timer = setTimeout(autoConnect, 1500);
    return () => clearTimeout(timer);
  }, [connectors, connect, isConnected]);

  // Auto-switch to Sepolia if on wrong network
  useEffect(() => {
    if (isConnected && chain && chain.id !== sepolia.id) {
      console.log('🔄 Wrong network detected, switching to Sepolia...');
      switchNetwork?.(sepolia.id);
    }
  }, [isConnected, chain, switchNetwork]);

  // MetaMask event listeners for better connection stability
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      console.log('Accounts changed:', accounts);
      if (accounts.length === 0) {
        // User disconnected all accounts
        console.log('All accounts disconnected');
      } else {
        // Account changed, but still connected
        console.log('Account changed, maintaining connection');
      }
    };

    const handleChainChanged = (chainId) => {
      console.log('Chain changed:', chainId);
      // Don't disconnect on chain change, just log it
    };

    const handleDisconnect = (error) => {
      console.log('MetaMask disconnected:', error);
      // Don't automatically reconnect - let user decide
    };

    // Add event listeners
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('disconnect', handleDisconnect);

    // Cleanup
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
      window.ethereum.removeListener('disconnect', handleDisconnect);
    };
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setConnectionError(null);
      
      // Try to find MetaMask connector first
      let connector = connectors.find(c => c.id === 'metaMask');
      
      // If not found, try injected connector
      if (!connector) {
        connector = connectors.find(c => c.id === 'injected');
      }
      
      if (connector) {
        console.log('Connecting to wallet...', connector.id);
        
        // Check if MetaMask is available and connected
        if (window.ethereum && !window.ethereum.isConnected()) {
          // Request account access
          await window.ethereum.request({ method: 'eth_requestAccounts' });
        }
        
        await connect({ connector });
        
        // Check if we need to switch networks
        if (chain && chain.id !== sepolia.id) {
          console.log('🔄 Switching to Sepolia network...');
          await switchNetwork?.(sepolia.id);
        }
        
        // Store connection state
        localStorage.setItem('wagmi.connected', 'true');
        console.log('Wallet connected successfully');
      } else {
        console.error('No wallet connector found');
        setConnectionError('No wallet connector found. Please make sure MetaMask is installed.');
      }
    } catch (error) {
      console.error('Connection error:', error);
      setConnectionError(`Connection failed: ${error.message}`);
      
      // Clear any stale connection state
      localStorage.removeItem('wagmi.connected');
      localStorage.removeItem('wagmi.address');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    // Clear connection state
    localStorage.removeItem('wagmi.connected');
    localStorage.removeItem('wagmi.address');
  };

  return (
    <div className="relative">
      {isConnecting ? (
        <button
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all transform hover:scale-105"
        >
          Connecting...
        </button>
      ) : isConnected ? (
        <div className="flex items-center gap-3">
          <span className="text-white text-sm">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all transform hover:scale-105"
        >
          Connect MetaMask
        </button>
      )}
      {connectionError && (
        <p className="text-red-500 text-sm mt-2">{connectionError}</p>
      )}
    </div>
  );
} 