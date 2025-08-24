import { vrfManager } from './VRFManagerService.js';
import { vrfStorage } from './VRFStorageService.js';
import VRF_CONFIG from '../config/vrf.js';

/**
 * VRF Pregeneration Service
 * Handles initial VRF batch generation and user session management
 */
export class VRFPregenerationService {
  constructor() {
    this.isInitialized = false;
    this.userSessions = new Map(); // Track user sessions
    this.batchGenerationInProgress = new Set(); // Track ongoing batch generations
  }

  /**
   * Initialize the VRF Pregeneration Service
   */
  async initialize() {
    try {
      // Initialize dependencies
      if (!vrfManager.isInitialized) {
        await vrfManager.initialize();
      }

      if (!vrfStorage.isInitialized) {
        await vrfStorage.initialize();
      }

      this.isInitialized = true;
      console.log('✅ VRF Pregeneration Service initialized successfully');
      
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize VRF Pregeneration Service:', error);
      throw error;
    }
  }

  /**
   * Generate initial VRF batch for user session (200 VRF values)
   * @param {string} userAddress - User's wallet address
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Batch generation result
   */
  async generateInitialVRFBatch(userAddress, options = {}) {
    this.ensureInitialized();

    try {
      const sessionId = `${userAddress}_${Date.now()}`;
      
      // Check if batch generation is already in progress for this user
      if (this.batchGenerationInProgress.has(userAddress)) {
        console.log(`⏳ VRF batch generation already in progress for user: ${userAddress}`);
        return {
          success: false,
          message: 'Batch generation already in progress',
          sessionId: null
        };
      }

      console.log(`🎲 Starting initial VRF batch generation for user: ${userAddress}`);
      
      // Mark batch generation as in progress
      this.batchGenerationInProgress.add(userAddress);

      // Check current VRF availability
      const currentAvailable = await vrfStorage.getVRFCount();
      console.log(`📊 Current available VRF: ${currentAvailable}`);

      // Generate VRF allocation based on configuration
      const vrfRequests = this.generateVRFAllocation(options);
      
      console.log(`📦 Generated ${vrfRequests.length} VRF requests:`, {
        MINES: vrfRequests.filter(r => r.gameType === 'MINES').length,
        PLINKO: vrfRequests.filter(r => r.gameType === 'PLINKO').length,
        ROULETTE: vrfRequests.filter(r => r.gameType === 'ROULETTE').length,
        WHEEL: vrfRequests.filter(r => r.gameType === 'WHEEL').length,
      });

      // Process VRF requests in batches
      const batchResults = await this.processBatchRequests(vrfRequests, sessionId);

      // Create user session record
      const userSession = {
        sessionId,
        userAddress,
        startedAt: new Date().toISOString(),
        totalRequested: vrfRequests.length,
        batchResults,
        status: 'active'
      };

      // Store user session
      this.userSessions.set(sessionId, userSession);

      // Remove from in-progress set
      this.batchGenerationInProgress.delete(userAddress);

      console.log(`✅ Initial VRF batch generation completed for user: ${userAddress}`);
      console.log(`📊 Session: ${sessionId}, Total requests: ${vrfRequests.length}`);

      return {
        success: true,
        sessionId,
        totalRequested: vrfRequests.length,
        batchResults,
        estimatedFulfillmentTime: '2-5 minutes',
        message: 'VRF batch generation started successfully'
      };

    } catch (error) {
      // Remove from in-progress set on error
      this.batchGenerationInProgress.delete(userAddress);
      
      console.error('❌ Failed to generate initial VRF batch:', error);
      throw new Error(`VRF batch generation failed: ${error.message}`);
    }
  }

  /**
   * Generate VRF allocation based on configuration
   * @param {Object} options - Generation options
   * @returns {Array} Array of VRF request objects
   */
  generateVRFAllocation(options = {}) {
    const { customAllocation } = options;
    const allocation = customAllocation || VRF_CONFIG.VRF_ALLOCATION;
    const requests = [];

    // Generate requests for each game type
    Object.keys(allocation).forEach(gameType => {
      const config = allocation[gameType];
      
      config.subtypes.forEach(subType => {
        for (let i = 0; i < config.countPerSubtype; i++) {
          requests.push({
            gameType,
            gameSubType: subType,
            priority: this.getGameTypePriority(gameType),
            metadata: {
              allocationIndex: i,
              totalForSubtype: config.countPerSubtype
            }
          });
        }
      });
    });

    // Sort by priority (higher priority first)
    requests.sort((a, b) => b.priority - a.priority);

    return requests;
  }

  /**
   * Get priority for game type (for batch processing order)
   * @param {string} gameType - Game type
   * @returns {number} Priority score
   */
  getGameTypePriority(gameType) {
    const priorities = {
      'ROULETTE': 4, // Highest priority - simple and fast
      'WHEEL': 3,
      'PLINKO': 2,
      'MINES': 1     // Lowest priority - most complex
    };

    return priorities[gameType] || 0;
  }

  /**
   * Process VRF requests in batches
   * @param {Array} vrfRequests - Array of VRF requests
   * @param {string} sessionId - Session ID
   * @returns {Promise<Array>} Batch processing results
   */
  async processBatchRequests(vrfRequests, sessionId) {
    const batchSize = VRF_CONFIG.BATCH_CONFIG.MAX_BATCH_SIZE;
    const batches = [];
    const results = [];

    // Split requests into batches
    for (let i = 0; i < vrfRequests.length; i += batchSize) {
      batches.push(vrfRequests.slice(i, i + batchSize));
    }

    console.log(`🔄 Processing ${batches.length} batches of max ${batchSize} requests each`);

    // Process batches sequentially to avoid overwhelming the network
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      try {
        console.log(`🔄 Processing batch ${i + 1}/${batches.length} (${batch.length} requests)...`);
        
        const batchResult = await vrfManager.requestVRFBatch(batch);
        
        results.push({
          batchIndex: i,
          batchSize: batch.length,
          success: true,
          requests: batchResult,
          processedAt: new Date().toISOString()
        });

        console.log(`✅ Batch ${i + 1} processed successfully`);

        // Small delay between batches to avoid overwhelming the network
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.error(`❌ Batch ${i + 1} failed:`, error);
        
        results.push({
          batchIndex: i,
          batchSize: batch.length,
          success: false,
          error: error.message,
          processedAt: new Date().toISOString()
        });

        // Continue with next batch even if one fails
      }
    }

    return results;
  }

  /**
   * Get user session information
   * @param {string} sessionId - Session ID
   * @returns {Object|null} User session data
   */
  getUserSession(sessionId) {
    return this.userSessions.get(sessionId) || null;
  }

  /**
   * Get user sessions by address
   * @param {string} userAddress - User address
   * @returns {Array} Array of user sessions
   */
  getUserSessionsByAddress(userAddress) {
    const sessions = [];
    
    for (const [sessionId, session] of this.userSessions.entries()) {
      if (session.userAddress === userAddress) {
        sessions.push(session);
      }
    }

    return sessions.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  }

  /**
   * Check if user needs VRF refill
   * @param {string} userAddress - User address
   * @returns {Promise<Object>} Refill status
   */
  async checkUserVRFStatus(userAddress) {
    this.ensureInitialized();

    try {
      // Get current VRF counts by game type
      const vrfCounts = await vrfStorage.getVRFCountsByType();
      const totalAvailable = await vrfStorage.getVRFCount();
      
      // Calculate refill threshold (20% of 200 = 40)
      const refillThreshold = VRF_CONFIG.BATCH_CONFIG.INITIAL_BATCH_SIZE * VRF_CONFIG.BATCH_CONFIG.REFILL_THRESHOLD;
      const emergencyThreshold = VRF_CONFIG.BATCH_CONFIG.INITIAL_BATCH_SIZE * VRF_CONFIG.BATCH_CONFIG.EMERGENCY_THRESHOLD;

      // Check if refill is needed
      const needsRefill = totalAvailable < refillThreshold;
      const needsEmergencyRefill = totalAvailable < emergencyThreshold;

      // Get user sessions
      const userSessions = this.getUserSessionsByAddress(userAddress);
      const activeSession = userSessions.find(s => s.status === 'active');

      return {
        userAddress,
        totalAvailable,
        refillThreshold,
        emergencyThreshold,
        needsRefill,
        needsEmergencyRefill,
        vrfCountsByType: vrfCounts,
        activeSession: activeSession ? {
          sessionId: activeSession.sessionId,
          startedAt: activeSession.startedAt,
          totalRequested: activeSession.totalRequested
        } : null,
        recommendation: this.getRefillRecommendation(totalAvailable, refillThreshold, emergencyThreshold)
      };

    } catch (error) {
      console.error('❌ Failed to check user VRF status:', error);
      throw error;
    }
  }

  /**
   * Get refill recommendation based on current VRF levels
   * @param {number} totalAvailable - Total available VRF
   * @param {number} refillThreshold - Refill threshold
   * @param {number} emergencyThreshold - Emergency threshold
   * @returns {Object} Refill recommendation
   */
  getRefillRecommendation(totalAvailable, refillThreshold, emergencyThreshold) {
    if (totalAvailable < emergencyThreshold) {
      return {
        level: 'emergency',
        message: 'Critical VRF levels - immediate refill required',
        action: 'trigger_emergency_refill',
        priority: 'high'
      };
    } else if (totalAvailable < refillThreshold) {
      return {
        level: 'warning',
        message: 'Low VRF levels - refill recommended',
        action: 'trigger_refill',
        priority: 'medium'
      };
    } else {
      return {
        level: 'normal',
        message: 'VRF levels are sufficient',
        action: 'monitor',
        priority: 'low'
      };
    }
  }

  /**
   * Trigger VRF refill for user
   * @param {string} userAddress - User address
   * @param {Object} options - Refill options
   * @returns {Promise<Object>} Refill result
   */
  async triggerVRFRefill(userAddress, options = {}) {
    this.ensureInitialized();

    try {
      const { emergency = false, customAmount } = options;
      
      console.log(`🔄 Triggering VRF refill for user: ${userAddress} (emergency: ${emergency})`);

      // Check current status
      const status = await this.checkUserVRFStatus(userAddress);
      
      if (!status.needsRefill && !emergency) {
        return {
          success: false,
          message: 'VRF refill not needed',
          currentStatus: status
        };
      }

      // Calculate refill amount
      const targetTotal = VRF_CONFIG.BATCH_CONFIG.INITIAL_BATCH_SIZE;
      const currentAvailable = status.totalAvailable;
      const refillAmount = customAmount || Math.max(0, targetTotal - currentAvailable);

      if (refillAmount <= 0) {
        return {
          success: false,
          message: 'No refill needed - VRF levels are sufficient',
          currentStatus: status
        };
      }

      // Generate refill requests
      const refillRequests = this.generateRefillAllocation(refillAmount);
      
      console.log(`📦 Generated ${refillRequests.length} refill requests`);

      // Process refill requests
      const refillSessionId = `refill_${userAddress}_${Date.now()}`;
      const batchResults = await this.processBatchRequests(refillRequests, refillSessionId);

      // Create refill session record
      const refillSession = {
        sessionId: refillSessionId,
        userAddress,
        type: emergency ? 'emergency_refill' : 'refill',
        startedAt: new Date().toISOString(),
        totalRequested: refillRequests.length,
        targetAmount: refillAmount,
        batchResults,
        status: 'active'
      };

      // Store refill session
      this.userSessions.set(refillSessionId, refillSession);

      console.log(`✅ VRF refill triggered for user: ${userAddress}`);

      return {
        success: true,
        sessionId: refillSessionId,
        type: refillSession.type,
        totalRequested: refillRequests.length,
        targetAmount: refillAmount,
        estimatedFulfillmentTime: '2-5 minutes',
        message: 'VRF refill started successfully'
      };

    } catch (error) {
      console.error('❌ Failed to trigger VRF refill:', error);
      throw error;
    }
  }

  /**
   * Generate VRF allocation for refill
   * @param {number} refillAmount - Amount of VRF to refill
   * @returns {Array} Array of refill VRF requests
   */
  generateRefillAllocation(refillAmount) {
    const allocation = VRF_CONFIG.VRF_ALLOCATION;
    const requests = [];
    
    // Calculate proportional allocation
    const totalOriginal = Object.keys(allocation).reduce((sum, gameType) => {
      const config = allocation[gameType];
      return sum + (config.subtypes.length * config.countPerSubtype);
    }, 0);

    // Generate proportional refill requests
    Object.keys(allocation).forEach(gameType => {
      const config = allocation[gameType];
      const originalCount = config.subtypes.length * config.countPerSubtype;
      const refillCount = Math.ceil((originalCount / totalOriginal) * refillAmount);
      
      // Distribute across subtypes
      const perSubtype = Math.ceil(refillCount / config.subtypes.length);
      
      config.subtypes.forEach(subType => {
        for (let i = 0; i < perSubtype && requests.length < refillAmount; i++) {
          requests.push({
            gameType,
            gameSubType: subType,
            priority: this.getGameTypePriority(gameType),
            metadata: {
              refillIndex: i,
              refillType: 'proportional'
            }
          });
        }
      });
    });

    // Sort by priority
    requests.sort((a, b) => b.priority - a.priority);

    return requests.slice(0, refillAmount);
  }

  /**
   * Get VRF pregeneration statistics
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics() {
    this.ensureInitialized();

    try {
      const totalSessions = this.userSessions.size;
      const activeSessions = Array.from(this.userSessions.values())
        .filter(session => session.status === 'active').length;
      
      const batchGenerationsInProgress = this.batchGenerationInProgress.size;
      
      // Get VRF storage stats
      const storageStats = await vrfStorage.getSystemStats();
      
      return {
        sessions: {
          total: totalSessions,
          active: activeSessions,
          inProgress: batchGenerationsInProgress
        },
        vrf: storageStats,
        allocation: VRF_CONFIG.VRF_ALLOCATION,
        thresholds: {
          refill: VRF_CONFIG.BATCH_CONFIG.REFILL_THRESHOLD,
          emergency: VRF_CONFIG.BATCH_CONFIG.EMERGENCY_THRESHOLD,
          batchSize: VRF_CONFIG.BATCH_CONFIG.MAX_BATCH_SIZE
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Failed to get pregeneration statistics:', error);
      throw error;
    }
  }

  /**
   * Cleanup expired sessions
   * @param {number} maxAge - Maximum age in milliseconds (default: 24 hours)
   * @returns {number} Number of cleaned up sessions
   */
  cleanupExpiredSessions(maxAge = 24 * 60 * 60 * 1000) {
    const now = Date.now();
    let cleanedUp = 0;

    for (const [sessionId, session] of this.userSessions.entries()) {
      const sessionAge = now - new Date(session.startedAt).getTime();
      
      if (sessionAge > maxAge) {
        this.userSessions.delete(sessionId);
        cleanedUp++;
      }
    }

    if (cleanedUp > 0) {
      console.log(`🧹 Cleaned up ${cleanedUp} expired VRF sessions`);
    }

    return cleanedUp;
  }

  /**
   * Ensure service is initialized
   */
  ensureInitialized() {
    if (!this.isInitialized) {
      throw new Error('VRF Pregeneration Service not initialized. Call initialize() first.');
    }
  }

  /**
   * Health check for pregeneration service
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const stats = await this.getStatistics();
      
      return {
        healthy: true,
        initialized: this.isInitialized,
        activeSessions: stats.sessions.active,
        inProgressGenerations: stats.sessions.inProgress,
        vrfAvailable: stats.vrf.available,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
export const vrfPregeneration = new VRFPregenerationService();
export default vrfPregeneration;