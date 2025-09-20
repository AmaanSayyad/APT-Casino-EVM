import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';

/**
 * VRF Pregeneration Hook
 * Manages VRF generation and status for casino games
 */
export const useVRFPregeneration = () => {
  const { address, isConnected } = useAccount();
  const [vrfStatus, setVrfStatus] = useState({
    isGenerating: false,
    isReady: false,
    totalGenerated: 0,
    availableVRFs: {
      ROULETTE: 0,
      MINES: 0,
      PLINKO: 0,
      WHEEL: 0
    },
    sessionId: null,
    error: null,
    lastGenerated: null,
    lastChecked: null
  });

  // Modal state
  const [showModal, setShowModal] = useState(false);

  /**
   * Check VRF status for user
   */
  const checkVRFStatus = useCallback(async (userAddress) => {
    if (!userAddress) return null;

    try {
      const response = await fetch(`/api/vrf/user-status?userAddress=${userAddress}`);
      const data = await response.json();

      if (data.success) {
        const counts = data.data.vrfCounts || {};
        const totalVrf = data.data.totalVRF || 0;
        
        setVrfStatus(prev => ({
          ...prev,
          isReady: totalVrf > 0,
          totalGenerated: totalVrf,
          availableVRFs: counts,
          lastChecked: new Date().toISOString(),
          error: null
        }));

        return {
          isReady: totalVrf > 0,
          totalVrf,
          counts
        };
      } else {
        throw new Error(data.error || 'Failed to check VRF status');
      }
    } catch (error) {
      console.error('VRF status check failed:', error);
      setVrfStatus(prev => ({
        ...prev,
        error: error.message,
        lastChecked: new Date().toISOString()
      }));
      return null;
    }
  }, []);

  /**
   * Generate VRF batch (200 VRFs - 50 per game)
   */
  const generateVRFBatch = useCallback(async (userAddress) => {
    if (!userAddress) return;

    try {
      setVrfStatus(prev => ({ 
        ...prev, 
        isGenerating: true, 
        error: null 
      }));

      console.log('🎲 Creating VRF Proofs with Treasury for user:', userAddress);

      const response = await fetch('/api/vrf/generate-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress,
          batchSize: 200, // 50 per game type
          gameDistribution: {
            ROULETTE: 50,
            MINES: 50,
            PLINKO: 50,
            WHEEL: 50
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ VRF Proof creation started:', data.data.sessionId);
        
        // Start polling for completion
        pollForCompletion(userAddress);
        
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to create VRF proofs');
      }
    } catch (error) {
      console.error('❌ VRF proof creation failed:', error);
      
      // Check if it's a treasury funds error
      let userFriendlyError = error.message;
      if (error.message.includes('Treasury has insufficient ARB ETH funds')) {
        userFriendlyError = `💰 Treasury needs more ARB ETH funds!\n\nCurrent balance is too low to generate VRF proofs.\n\nPlease fund the treasury wallet or contact support.\n\nTreasury Address: ${error.message.split('Please fund the treasury wallet: ')[1] || 'Check console for details'}`;
      } else if (error.message.includes('insufficient funds')) {
        userFriendlyError = `💰 Insufficient funds detected!\n\nThis could be due to:\n• Treasury wallet needs ARB ETH\n• VRF subscription needs LINK tokens\n• Gas fees too high\n\nPlease check the treasury balance and try again.`;
      }
      
      setVrfStatus(prev => ({
        ...prev,
        isGenerating: false,
        error: userFriendlyError
      }));
      throw error;
    }
  }, []);

  /**
   * Poll for VRF generation completion
   */
  const pollForCompletion = useCallback(async (userAddress) => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes

    const poll = async () => {
      try {
        attempts++;
        const status = await checkVRFStatus(userAddress);
        
        if (status && status.totalVrf >= 200) {
          setVrfStatus(prev => ({
            ...prev,
            isGenerating: false,
            isReady: true
          }));
          console.log('✅ VRF proof creation completed!');
          return;
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          throw new Error('VRF proof creation timeout');
        }
      } catch (error) {
        setVrfStatus(prev => ({
          ...prev,
          isGenerating: false,
          error: error.message
        }));
      }
    };

    setTimeout(poll, 2000); // Initial delay
  }, [checkVRFStatus]);

  /**
   * Consume VRF for game with auto-refill check
   */
  const consumeVRF = useCallback(async (gameType, gameConfig = {}) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    if (!vrfStatus.isReady || vrfStatus.totalGenerated === 0) {
      throw new Error('No VRF proofs available. Please create VRF proofs first.');
    }

    try {
      const response = await fetch('/api/vrf/consume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: address,
          gameType: gameType.toUpperCase(),
          gameConfig
        })
      });

      const data = await response.json();

      if (data.success) {
        // Update VRF counts after consumption
        const newStatus = await checkVRFStatus(address);
        
        // Check for auto-refill (if any game type has < 25 proofs)
        if (newStatus && newStatus.counts) {
          const needsRefill = Object.values(newStatus.counts).some(count => count < 25);
          
          if (needsRefill) {
            console.log('🔄 Auto-refill triggered: Some game types have < 25 proofs');
            // Trigger background refill (don't wait for it)
            generateVRFBatch(address).catch(error => {
              console.error('Background auto-refill failed:', error);
            });
          }
        }
        
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to consume VRF proof');
      }
    } catch (error) {
      console.error('VRF proof consumption failed:', error);
      throw error;
    }
  }, [address, vrfStatus.isReady, vrfStatus.totalGenerated, checkVRFStatus, generateVRFBatch]);

  // Only check VRF status when explicitly requested
  useEffect(() => {
    if (isConnected && address) {
      console.log('🔗 Wallet connected');
      // Don't auto-check, let user manually check via VRF button
    }
  }, [isConnected, address]);

  // Reset when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setVrfStatus({
        isGenerating: false,
        isReady: false,
        totalGenerated: 0,
        availableVRFs: {
          ROULETTE: 0,
          MINES: 0,
          PLINKO: 0,
          WHEEL: 0
        },
        sessionId: null,
        error: null,
        lastGenerated: null,
        lastChecked: null
      });
      setShowModal(false);
    }
  }, [isConnected]);

  return {
    // Status
    vrfStatus,
    isReady: vrfStatus.isReady && !vrfStatus.isGenerating,
    isGenerating: vrfStatus.isGenerating,
    totalVRF: vrfStatus.totalGenerated,
    vrfCounts: vrfStatus.availableVRFs,
    error: vrfStatus.error,
    
    // Modal
    showModal,
    openModal: () => {
      console.log('📂 Opening VRF modal...');
      setShowModal(true);
    },
    closeModal: () => setShowModal(false),
    
    // Functions
    checkVRFStatus: () => checkVRFStatus(address),
    generateVRFBatch: () => generateVRFBatch(address),
    consumeVRF,
    
    // Utilities
    getVRFForGame: (gameType) => {
      return vrfStatus.availableVRFs[gameType.toUpperCase()] || 0;
    },
    
    canPlayGame: () => {
      return vrfStatus.isReady && vrfStatus.totalGenerated > 0;
    },
    
    needsVRF: () => {
      return vrfStatus.totalGenerated === 0;
    },
    
    needsRefill: () => {
      // Check if any game type has < 25 proofs
      return Object.values(vrfStatus.availableVRFs).some(count => count < 25);
    }
  };
};

export default useVRFPregeneration;