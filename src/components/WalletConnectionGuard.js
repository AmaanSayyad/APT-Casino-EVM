"use client";
import React, { useEffect, useState } from 'react';
import { useAccount, useConnect } from 'wagmi';

/**
 * Wallet Connection Guard
 * Ensures wallet stays connected across page navigations
 */
export default function WalletConnectionGuard({ children }) {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    const attemptReconnection = async () => {
      // Check if we should be connected but aren't
      const wasConnected = localStorage.getItem('wagmi.connected');
      const lastConnector = localStorage.getItem('wagmi.connector');
      
      if (wasConnected === 'true' && !isConnected && !isReconnecting) {
        console.log('🔄 WalletConnectionGuard: Attempting reconnection...');
        setIsReconnecting(true);
        
        try {
          // Find the appropriate connector
          let connector = connectors.find(c => 
            c.id === lastConnector || 
            c.id === 'metaMask' || 
            c.name.toLowerCase().includes('metamask')
          );
          
          if (!connector) {
            connector = connectors.find(c => c.id === 'injected');
          }
          
          if (connector) {
            await connect({ connector });
            console.log('✅ WalletConnectionGuard: Reconnection successful');
          }
        } catch (error) {
          console.log('❌ WalletConnectionGuard: Reconnection failed:', error);
        } finally {
          setIsReconnecting(false);
        }
      }
    };

    // Small delay to ensure connectors are ready
    const timer = setTimeout(attemptReconnection, 1000);
    return () => clearTimeout(timer);
  }, [isConnected, connectors, connect, isReconnecting]);

  // Update localStorage when connection state changes
  useEffect(() => {
    if (isConnected && address) {
      localStorage.setItem('wagmi.connected', 'true');
    } else if (!isConnected) {
      // Only clear if we're not in the middle of reconnecting
      if (!isReconnecting) {
        localStorage.removeItem('wagmi.connected');
        localStorage.removeItem('wagmi.connector');
      }
    }
  }, [isConnected, address, isReconnecting]);

  return (
    <>
      {children}
      {isReconnecting && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">Reconnecting wallet...</span>
          </div>
        </div>
      )}
    </>
  );
}