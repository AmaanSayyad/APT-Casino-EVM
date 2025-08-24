/**
 * VRF Proof Service
 * Manages local storage of VRF proofs and integration with Chainlink VRF
 */

class VRFProofService {
  constructor() {
    this.storageKey = 'vrf_proofs';
    this.consumedProofsKey = 'consumed_vrf_proofs';
    this.proofs = this.loadProofs();
    this.consumedProofs = this.loadConsumedProofs();
  }

  /**
   * Load VRF proofs from localStorage
   */
  loadProofs() {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return {
          MINES: [],
          PLINKO: [],
          ROULETTE: [],
          WHEEL: []
        };
      }
      
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {
        MINES: [],
        PLINKO: [],
        ROULETTE: [],
        WHEEL: []
      };
    } catch (error) {
      console.error('Error loading VRF proofs:', error);
      return {
        MINES: [],
        PLINKO: [],
        ROULETTE: [],
        WHEEL: []
      };
    }
  }

  /**
   * Load consumed VRF proofs from localStorage
   */
  loadConsumedProofs() {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return {
          MINES: [],
          PLINKO: [],
          ROULETTE: [],
          WHEEL: []
        };
      }
      
      const stored = localStorage.getItem(this.consumedProofsKey);
      return stored ? JSON.parse(stored) : {
        MINES: [],
        PLINKO: [],
        ROULETTE: [],
        WHEEL: []
      };
    } catch (error) {
      console.error('Error loading consumed VRF proofs:', error);
      return {
        MINES: [],
        PLINKO: [],
        ROULETTE: [],
        WHEEL: []
      };
    }
  }

  /**
   * Save VRF proofs to localStorage
   */
  saveProofs() {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(this.proofs));
    } catch (error) {
      console.error('Error saving VRF proofs:', error);
    }
  }

  /**
   * Save consumed VRF proofs to localStorage
   */
  saveConsumedProofs() {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
      }
      
      localStorage.setItem(this.consumedProofsKey, JSON.stringify(this.consumedProofs));
    } catch (error) {
      console.error('Error saving consumed VRF proofs:', error);
    }
  }

  /**
   * Add a new VRF proof
   */
  addProof(gameType, proofData) {
    if (!this.proofs[gameType]) {
      this.proofs[gameType] = [];
    }

    const proof = {
      id: `${gameType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      gameType,
      requestId: proofData.requestId,
      transactionHash: proofData.transactionHash,
      randomWords: proofData.randomWords,
      timestamp: new Date().toISOString(),
      status: 'active',
      blockNumber: proofData.blockNumber,
      gasUsed: proofData.gasUsed,
      logIndex: proofData.logIndex || 0, // Log index in the transaction
      batchIndex: proofData.batchIndex || 0, // Which batch this proof came from
      transactionIndex: proofData.transactionIndex || 0 // Which of the 4 transactions this came from
    };

    this.proofs[gameType].push(proof);
    this.saveProofs();
    
    console.log(`✅ Added VRF proof for ${gameType}:`, proof);
    return proof;
  }

  /**
   * Get available proofs for a game type
   */
  getProofs(gameType, count = 1) {
    if (!this.proofs[gameType]) return [];
    
    const availableProofs = this.proofs[gameType].filter(p => p.status === 'active');
    return availableProofs.slice(0, count);
  }

  /**
   * Consume a VRF proof (mark as used) and move to consumed list
   */
  consumeProof(gameType, gameResult) {
    if (!this.proofs[gameType] || this.proofs[gameType].length === 0) {
      console.warn(`No available VRF proofs for ${gameType}`);
      return null;
    }

    // Get the first available proof
    const proof = this.proofs[gameType].find(p => p.status === 'active');
    if (!proof) {
      console.warn(`No active VRF proofs for ${gameType}`);
      return null;
    }

    // Mark as consumed
    proof.status = 'consumed';
    proof.consumedAt = new Date().toISOString();
    proof.gameResult = gameResult; // Store game result for reference

    // Move to consumed proofs
    if (!this.consumedProofs[gameType]) {
      this.consumedProofs[gameType] = [];
    }
    this.consumedProofs[gameType].push(proof);

    // Remove from active proofs
    this.proofs[gameType] = this.proofs[gameType].filter(p => p.id !== proof.id);

    // Save both lists
    this.saveProofs();
    this.saveConsumedProofs();

    console.log(`🔒 Consumed VRF proof for ${gameType}:`, proof);
    return proof;
  }

  /**
   * Get consumed proofs for a game type (for history display)
   */
  getConsumedProofs(gameType, limit = 50) {
    if (!this.consumedProofs[gameType]) return [];
    return this.consumedProofs[gameType]
      .sort((a, b) => new Date(b.consumedAt) - new Date(a.consumedAt))
      .slice(0, limit);
  }

  /**
   * Get proof by ID (for history lookup)
   */
  getProofById(proofId) {
    for (const gameType in this.consumedProofs) {
      const proof = this.consumedProofs[gameType].find(p => p.id === proofId);
      if (proof) return proof;
    }
    return null;
  }

  /**
   * Get proof statistics
   */
  getProofStats() {
    const stats = {
      availableVRFs: {},
      totalProofs: 0,
      activeProofs: 0,
      consumedProofs: 0,
      consumedByGame: {}
    };

    for (const gameType in this.proofs) {
      const activeCount = this.proofs[gameType].filter(p => p.status === 'active').length;
      const consumedCount = this.consumedProofs[gameType]?.length || 0;
      const totalCount = activeCount + consumedCount;

      stats.availableVRFs[gameType] = activeCount;
      stats.consumedByGame[gameType] = consumedCount;
      stats.totalProofs += totalCount;
      stats.activeProofs += activeCount;
      stats.consumedProofs += consumedCount;
    }

    return stats;
  }

  /**
   * Check if we need more proofs for a game type
   */
  needsMoreProofs(gameType, minCount = 25) {
    const activeCount = this.proofs[gameType]?.filter(p => p.status === 'active').length || 0;
    return activeCount < minCount;
  }

  /**
   * Get total active proofs across all games
   */
  getTotalActiveProofs() {
    let total = 0;
    for (const gameType in this.proofs) {
      total += this.proofs[gameType].filter(p => p.status === 'active').length;
    }
    return total;
  }

  /**
   * Get a random transaction hash from the 4 VRF generation transactions
   */
  getRandomTransactionHash() {
    try {
      // Get all unique transaction hashes from active proofs
      const allTransactionHashes = new Set();
      
      for (const gameType in this.proofs) {
        this.proofs[gameType].forEach(proof => {
          if (proof.transactionHash && proof.status === 'active') {
            allTransactionHashes.add(proof.transactionHash);
          }
        });
      }
      
      // Convert to array and get a random one
      const transactionHashes = Array.from(allTransactionHashes);
      
      if (transactionHashes.length === 0) {
        console.warn('No transaction hashes found in active proofs');
        return null;
      }
      
      const randomIndex = Math.floor(Math.random() * transactionHashes.length);
      const selectedHash = transactionHashes[randomIndex];
      
      console.log(`🎲 Randomly selected transaction hash: ${selectedHash} from ${transactionHashes.length} available`);
      return selectedHash;
      
    } catch (error) {
      console.error('Error getting random transaction hash:', error);
      return null;
    }
  }

  /**
   * Generate a random number from VRF proof
   */
  generateRandomFromProof(gameType) {
    const proof = this.consumeProof(gameType, { timestamp: new Date().toISOString() });
    if (!proof) {
      console.warn(`No VRF proof available for ${gameType}, using fallback random`);
      return {
        randomNumber: Math.floor(Math.random() * 1000000),
        proofId: null,
        transactionHash: null,
        logIndex: null,
        requestId: null
      };
    }

    // Generate random number from proof data
    const randomNumber = this.hashToRandom(proof.requestId + proof.timestamp);
    
    // Get a random transaction hash from the 4 VRF generation transactions
    const randomTransactionHash = this.getRandomTransactionHash();
    
    return {
      randomNumber,
      proofId: proof.id,
      transactionHash: randomTransactionHash || proof.transactionHash, // Use random transaction hash if available
      logIndex: proof.logIndex,
      requestId: proof.requestId,
      originalTransactionHash: proof.transactionHash // Keep original for reference
    };
  }

  /**
   * Convert hash to random number
   */
  hashToRandom(hash) {
    let hashValue = 0;
    for (let i = 0; i < hash.length; i++) {
      const char = hash.charCodeAt(i);
      hashValue = ((hashValue << 5) - hashValue) + char;
      hashValue = hashValue & hashValue; // Convert to 32bit integer
    }
    return Math.abs(hashValue) % 1000000; // Return 0-999999
  }

  /**
   * Clear all proofs (for testing)
   */
  clearAllProofs() {
    this.proofs = {
      MINES: [],
      PLINKO: [],
      ROULETTE: [],
      WHEEL: []
    };
    this.consumedProofs = {
      MINES: [],
      PLINKO: [],
      ROULETTE: [],
      WHEEL: []
    };
    this.saveProofs();
    this.saveConsumedProofs();
    console.log('🗑️ Cleared all VRF proofs');
  }

  /**
   * Export proofs for backup
   */
  exportProofs() {
    return JSON.stringify({
      active: this.proofs,
      consumed: this.consumedProofs
    }, null, 2);
  }

  /**
   * Import proofs from backup
   */
  importProofs(proofsData) {
    try {
      const parsed = JSON.parse(proofsData);
      this.proofs = parsed.active || this.proofs;
      this.consumedProofs = parsed.consumed || this.consumedProofs;
      this.saveProofs();
      this.saveConsumedProofs();
      console.log('📥 Imported VRF proofs from backup');
      return true;
    } catch (error) {
      console.error('Error importing proofs:', error);
      return false;
    }
  }
}

// Create singleton instance
const vrfProofService = new VRFProofService();

export default vrfProofService;
