import { vrfManager } from './VRFManagerService.js';
import { vrfStorage } from './VRFStorageService.js';
import { vrfErrorHandler } from './VRFErrorHandler.js';
import VRF_CONFIG from '../config/vrf.js';

/**
 * VRF Auto-Refill Service
 * Automatically refills VRF proofs when they fall below threshold
 */
export class VRFAutoRefillService {
  constructor() {
    this.isInitialized = false;
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.refillInProgress = new Set();
    this.lastRefillTime = new Map();
    this.minRefillInterval = 60000; // 1 minute minimum between refills
  }

  /**
   * Initialize the VRF Auto-Refill Service
   */
  async initialize() {
    try {
      if (!vrfManager.isInitialized) {
        await vrfManager.initialize();
      }

      if (!vrfStorage.isInitialized) {
        await vrfStorage.initialize();
      }

      this.isInitialized = true;
      console.log('✅ VRF Auto-Refill Service initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize VRF Auto-Refill Service:', error);
      throw error;
    }
  }

  /**
   * Start monitoring VRF levels and auto-refill when needed
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      console.log('⚠️ VRF monitoring already active');
      return;
    }

    try {
      this.isMonitoring = true;
      console.log('🔍 Starting VRF level monitoring...');

      // Check immediately
      await this.checkAndRefillIfNeeded();

      // Set up monitoring interval (every 30 seconds)
      this.monitoringInterval = setInterval(async () => {
        await this.checkAndRefillIfNeeded();
      }, 30000);

      console.log('✅ VRF monitoring started successfully');
    } catch (error) {
      console.error('❌ Failed to start VRF monitoring:', error);
      this.isMonitoring = false;
    }
  }

  /**
   * Stop monitoring VRF levels
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('⏹️ VRF monitoring stopped');
  }

  /**
   * Check current VRF levels and refill if below threshold
   */
  async checkAndRefillIfNeeded() {
    try {
      const currentLevels = await this.getCurrentVRFLevels();
      const needsRefill = this.checkRefillNeeds(currentLevels);

      if (needsRefill.length > 0) {
        console.log(`🔄 VRF refill needed for: ${needsRefill.join(', ')}`);
        await this.performRefill(needsRefill);
      } else {
        console.log('✅ VRF levels are sufficient');
      }
    } catch (error) {
      console.error('❌ Error checking VRF levels:', error);
      vrfErrorHandler.handleError('VRF_LEVEL_CHECK_FAILED', error);
    }
  }

  /**
   * Get current VRF levels for all game types
   */
  async getCurrentVRFLevels() {
    try {
      const levels = await vrfStorage.getVRFCountsByGameType();
      return levels;
    } catch (error) {
      console.error('❌ Failed to get VRF levels:', error);
      throw error;
    }
  }

  /**
   * Check which game types need refill (below 25 threshold)
   */
  checkRefillNeeds(currentLevels) {
    const needsRefill = [];
    const threshold = VRF_CONFIG.BATCH_CONFIG.MIN_PROOF_THRESHOLD; // 25

    Object.entries(currentLevels).forEach(([gameType, count]) => {
      if (count < threshold) {
        needsRefill.push(gameType);
        console.log(`⚠️ ${gameType}: ${count}/${threshold} VRF remaining`);
      }
    });

    return needsRefill;
  }

  /**
   * Perform VRF refill for specified game types
   */
  async performRefill(gameTypes) {
    for (const gameType of gameTypes) {
      if (this.refillInProgress.has(gameType)) {
        console.log(`⏳ Refill already in progress for ${gameType}`);
        continue;
      }

      if (this.isRefillCooldownActive(gameType)) {
        console.log(`⏰ Refill cooldown active for ${gameType}`);
        continue;
      }

      try {
        this.refillInProgress.add(gameType);
        console.log(`🔄 Starting VRF refill for ${gameType}...`);

        await this.refillGameType(gameType);
        
        // Update last refill time
        this.lastRefillTime.set(gameType, Date.now());
        
        console.log(`✅ VRF refill completed for ${gameType}`);
      } catch (error) {
        console.error(`❌ VRF refill failed for ${gameType}:`, error);
        vrfErrorHandler.handleError('VRF_REFILL_FAILED', { gameType, error: error.message });
      } finally {
        this.refillInProgress.delete(gameType);
      }
    }
  }

  /**
   * Refill VRF for a specific game type
   */
  async refillGameType(gameType) {
    const allocation = VRF_CONFIG.VRF_ALLOCATION[gameType];
    if (!allocation) {
      throw new Error(`No allocation config for game type: ${gameType}`);
    }

    const totalNeeded = allocation.subtypes.length * allocation.countPerSubtype;
    const currentCount = await vrfStorage.getVRFCountByGameType(gameType);
    const refillAmount = Math.max(0, totalNeeded - currentCount);

    if (refillAmount === 0) {
      console.log(`ℹ️ No refill needed for ${gameType}`);
      return;
    }

    console.log(`🔄 Refilling ${refillAmount} VRF for ${gameType}`);

    // Generate VRF requests for each subtype
    const requests = [];
    allocation.subtypes.forEach(subtype => {
      const countNeeded = allocation.countPerSubtype;
      for (let i = 0; i < countNeeded; i++) {
        requests.push({
          gameType,
          gameSubType: subtype,
          priority: 'auto-refill'
        });
      }
    });

    // Process requests in batches
    const batchSize = VRF_CONFIG.BATCH_CONFIG.MAX_BATCH_SIZE;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      await this.processBatch(batch);
      
      // Small delay between batches
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  /**
   * Process a batch of VRF requests
   */
  async processBatch(requests) {
    try {
      const results = [];
      
      for (const request of requests) {
        try {
          const result = await vrfManager.requestVRF(request.gameType, request.gameSubType);
          results.push({
            ...request,
            requestId: result.requestId,
            status: 'requested',
            timestamp: new Date().toISOString()
          });
          
          // Small delay between individual requests
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`❌ Failed to request VRF for ${request.gameType}/${request.gameSubType}:`, error);
          results.push({
            ...request,
            status: 'failed',
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Store results
      await vrfStorage.storeVRFRequests(results);
      
      return results;
    } catch (error) {
      console.error('❌ Failed to process VRF batch:', error);
      throw error;
    }
  }

  /**
   * Check if refill cooldown is active for a game type
   */
  isRefillCooldownActive(gameType) {
    const lastRefill = this.lastRefillTime.get(gameType);
    if (!lastRefill) return false;

    const timeSinceLastRefill = Date.now() - lastRefill;
    return timeSinceLastRefill < this.minRefillInterval;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isMonitoring: this.isMonitoring,
      refillInProgress: Array.from(this.refillInProgress),
      lastRefillTimes: Object.fromEntries(this.lastRefillTime),
      monitoringInterval: this.monitoringInterval !== null
    };
  }

  /**
   * Emergency refill for all game types
   */
  async emergencyRefill() {
    console.log('🚨 Starting emergency VRF refill...');
    
    try {
      const gameTypes = Object.keys(VRF_CONFIG.GAME_TYPES);
      await this.performRefill(gameTypes);
      
      console.log('✅ Emergency VRF refill completed');
      return true;
    } catch (error) {
      console.error('❌ Emergency VRF refill failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const vrfAutoRefill = new VRFAutoRefillService();