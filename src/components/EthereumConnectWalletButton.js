"use client";
import React, { useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export default function EthereumConnectWalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // Auto-reconnect on page load if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      try {
        // Check if wallet was previously connected
        const wasConnected = localStorage.getItem('wagmi.connected');
        if (wasConnected === 'true' && !isConnected) {
          console.log('Attempting auto-reconnect...');
          
          // Try to find MetaMask connector first
          let connector = connectors.find(c => c.id === 'metaMask');
          
          // If not found, try injected connector
          if (!connector) {
            connector = connectors.find(c => c.id === 'injected');
          }
          
          if (connector) {
            await connect({ connector });
          }
        }
      } catch (error) {
        console.log('Auto-reconnect failed:', error);
        // Clear the connection flag if auto-reconnect fails
        localStorage.removeItem('wagmi.connected');
      }
    };

    // Small delay to ensure connectors are ready
    const timer = setTimeout(autoConnect, 1000);
    return () => clearTimeout(timer);
  }, [connectors, connect, isConnected]);

  // Additional connection monitoring
  useEffect(() => {
    if (!isConnected) return;

    // Monitor connection stability
    const checkConnection = () => {
      if (window.ethereum && window.ethereum.isConnected()) {
        console.log('MetaMask connection is stable');
      } else {
        console.log('MetaMask connection lost, attempting reconnect...');
        // Try to reconnect if connection is lost
        const wasConnected = localStorage.getItem('wagmi.connected');
        if (wasConnected === 'true') {
          handleConnect();
        }
      }
    };

    // Check connection every 5 seconds
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, [isConnected]);

  // MetaMask event listeners for better connection stability
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      console.log('Accounts changed:', accounts);
      if (accounts.length === 0) {
        // User disconnected all accounts
        localStorage.removeItem('wagmi.connected');
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
      localStorage.removeItem('wagmi.connected');
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
        // Store connection state
        localStorage.setItem('wagmi.connected', 'true');
        console.log('Wallet connected successfully');
      } else {
        console.error('No wallet connector found');
        alert('No wallet connector found. Please make sure MetaMask is installed.');
      }
    } catch (error) {
      console.error('Connection error:', error);
      alert(`Connection failed: ${error.message}`);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    // Clear connection state
    localStorage.removeItem('wagmi.connected');
  };

  return (
    <div className="relative">
      {isConnected ? (
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
    </div>
  );
} 