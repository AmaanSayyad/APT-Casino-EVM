/**
 * VRF Proof Service
 * Manages local storage of VRF proofs and integration with Chainlink VRF
 */

class VRFProofService {
  constructor() {
    this.storageKey = 'vrf_proofs';
    this.proofs = this.loadProofs();
  }

  /**
   * Load VRF proofs from localStorage
   */
  loadProofs() {
    try {
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
   * Save VRF proofs to localStorage
   */
  saveProofs() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.proofs));
    } catch (error) {
      console.error('Error saving VRF proofs:', error);
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
      gasUsed: proofData.gasUsed
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
   * Consume a VRF proof (mark as used)
   */
  consumeProof(proofId) {
    for (const gameType in this.proofs) {
      const proof = this.proofs[gameType].find(p => p.id === proofId);
      if (proof && proof.status === 'active') {
        proof.status = 'consumed';
        proof.consumedAt = new Date().toISOString();
        this.saveProofs();
        console.log(`🔒 Consumed VRF proof: ${proofId}`);
        return proof;
      }
    }
    return null;
  }

  /**
   * Get proof statistics
   */
  getProofStats() {
    const stats = {};
    for (const gameType in this.proofs) {
      stats[gameType] = {
        total: this.proofs[gameType].length,
        active: this.proofs[gameType].filter(p => p.status === 'active').length,
        consumed: this.proofs[gameType].filter(p => p.status === 'consumed').length
      };
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
   * Clear all proofs (for testing)
   */
  clearAllProofs() {
    this.proofs = {
      MINES: [],
      PLINKO: [],
      ROULETTE: [],
      WHEEL: []
    };
    this.saveProofs();
    console.log('🗑️ Cleared all VRF proofs');
  }

  /**
   * Export proofs for backup
   */
  exportProofs() {
    return JSON.stringify(this.proofs, null, 2);
  }

  /**
   * Import proofs from backup
   */
  importProofs(proofsData) {
    try {
      const parsed = JSON.parse(proofsData);
      this.proofs = parsed;
      this.saveProofs();
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
