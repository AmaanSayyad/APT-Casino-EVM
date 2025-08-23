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
        await connect({ connector });
        // Store connection state
        localStorage.setItem('wagmi.connected', 'true');
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