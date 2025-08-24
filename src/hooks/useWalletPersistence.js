import { useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

/**
 * Hook to handle wallet connection persistence
 * Automatically reconnects wallet on page refresh/navigation
 */
export const useWalletPersistence = () => {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    // Check if wallet was previously connected
    const wasConnected = localStorage.getItem('wagmi.connected');
    const lastConnectedConnector = localStorage.getItem('wagmi.connector');
    
    console.log('🔍 Wallet persistence check:', { 
      wasConnected, 
      lastConnectedConnector, 
      isConnected, 
      address 
    });

    // If wallet was connected but is not currently connected, try to reconnect
    if (wasConnected === 'true' && !isConnected && connectors.length > 0) {
      console.log('🔄 Attempting to reconnect wallet...');
      
      // Find the last used connector or default to MetaMask
      const targetConnector = connectors.find(c => 
        c.name.toLowerCase().includes('metamask') || 
        c.name.toLowerCase().includes(lastConnectedConnector?.toLowerCase() || '')
      ) || connectors[0];
      
      if (targetConnector) {
        console.log('🔗 Reconnecting with connector:', targetConnector.name);
        connect({ connector: targetConnector });
      }
    }
  }, [isConnected, address, connect, connectors]);

  // Save connection state when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      console.log('✅ Wallet connected, saving state');
      localStorage.setItem('wagmi.connected', 'true');
      localStorage.setItem('wagmi.address', address);
    }
  }, [isConnected, address]);

  // Clear connection state when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      console.log('❌ Wallet disconnected, clearing state');
      localStorage.removeItem('wagmi.connected');
      localStorage.removeItem('wagmi.address');
    }
  }, [isConnected]);

  return {
    isConnected,
    address,
    disconnect: () => {
      console.log('🔌 Manual disconnect triggered');
      localStorage.removeItem('wagmi.connected');
      localStorage.removeItem('wagmi.address');
      disconnect();
    }
  };
};