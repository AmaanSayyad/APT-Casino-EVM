import { dbPool, redisCache } from '../config/database.js';
import { vrfErrorHandler, VRFErrorType } from './VRFErrorHandler.js';

/**
 * VRF Storage Service
 * Handles database operations for VRF data storage and retrieval
 */
export class VRFStorageService {
  constructor() {
    this.isInitialized = false;
    this.cacheEnabled = false;
    this.cacheTTL = 300; // 5 minutes default cache TTL
  }

  /**
   * Initialize the VRF Storage Service
   */
  async initialize() {
    try {
      // Initialize database connection
      if (!dbPool.isConnected) {
        await dbPool.initialize();
      }

      // Initialize Redis cache if available
      if (redisCache.client) {
        this.cacheEnabled = true;
        console.log('✅ VRF Storage Service initialized with cache');
      } else {
        console.log('✅ VRF Storage Service initialized without cache');
      }

      this.isInitialized = true;
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize VRF Storage Service:', error);
      throw error;
    }
  }

  /**
   * Get next available VRF for a game type
   * @param {string} gameType - Game type (MINES, PLINKO, ROULETTE, WHEEL)
   * @param {string} gameSubType - Game sub type
   * @returns {Promise<Object|null>} VRF data or null if none available
   */
  async getNextVRF(gameType, gameSubType = 'standard') {
    this.ensureInitialized();

    try {
      const query = `
        SELECT 
          id,
          request_id,
          vrf_value,
          transaction_hash,
          block_number,
          game_type,
          game_sub_type,
          fulfilled_at,
          created_at
        FROM vrf_requests 
        WHERE game_type = $1 
        AND game_sub_type = $2 
        AND status = 'fulfilled'
        AND id NOT IN (
          SELECT vrf_request_id 
          FROM game_results 
          WHERE vrf_request_id IS NOT NULL
        )
        AND expires_at > NOW()
        ORDER BY created_at ASC
        LIMIT 1
      `;

      const result = await dbPool.query(query, [gameType, gameSubType]);

      if (result.rows.length === 0) {
        return null;
      }

      const vrf = result.rows[0];

      return {
        id: vrf.id,
        requestId: vrf.request_id,
        vrfValue: vrf.vrf_value,
        transactionHash: vrf.transaction_hash,
        blockNumber: vrf.block_number,
        gameType: vrf.game_type,
        gameSubType: vrf.game_sub_type,
        fulfilledAt: vrf.fulfilled_at,
        createdAt: vrf.created_at
      };

    } catch (error) {
      console.error('❌ Failed to get next VRF:', error);
      await vrfErrorHandler.logError(VRFErrorType.STORAGE_ERROR, error.message, {
        gameType,
        gameSubType,
        operation: 'getNextVRF'
      });
      throw error;
    }
  }

  /**
   * Mark VRF as used by linking it to a game result
   * @param {string} vrfId - VRF ID
   * @param {string} userAddress - User address
   * @returns {Promise<boolean>} Success status
   */
  async markVRFAsUsed(vrfId, userAddress) {
    this.ensureInitialized();

    try {
      // This will be handled when the game result is saved
      // For now, we just log the usage
      console.log(`📝 VRF ${vrfId} marked for use by ${userAddress}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to mark VRF as used:', error);
      throw error;
    }
  }

  /**
   * Get VRF counts by game type
   * @returns {Promise<Object>} VRF counts by game type
   */
  async getVRFCountsByType() {
    this.ensureInitialized();

    try {
      const query = `
        SELECT 
          game_type,
          COUNT(*) as available_count
        FROM vrf_requests 
        WHERE status = 'fulfilled'
        AND id NOT IN (
          SELECT vrf_request_id 
          FROM game_results 
          WHERE vrf_request_id IS NOT NULL
        )
        AND expires_at > NOW()
        GROUP BY game_type
      `;

      const result = await dbPool.query(query);

      const counts = {
        MINES: 0,
        PLINKO: 0,
        ROULETTE: 0,
        WHEEL: 0
      };

      result.rows.forEach(row => {
        counts[row.game_type] = parseInt(row.available_count);
      });

      return counts;

    } catch (error) {
      console.error('❌ Failed to get VRF counts by type:', error);
      throw error;
    }
  }

  /**
   * Get total available VRF count
   * @returns {Promise<number>} Total available VRF count
   */
  async getVRFCount() {
    this.ensureInitialized();

    try {
      const query = `
        SELECT COUNT(*) as total_count
        FROM vrf_requests 
        WHERE status = 'fulfilled'
        AND id NOT IN (
          SELECT vrf_request_id 
          FROM game_results 
          WHERE vrf_request_id IS NOT NULL
        )
        AND expires_at > NOW()
      `;

      const result = await dbPool.query(query);
      return parseInt(result.rows[0].total_count);

    } catch (error) {
      console.error('❌ Failed to get VRF count:', error);
      throw error;
    }
  }

  /**
   * Store VRF data in database
   * @param {Object} vrfData - VRF data to store
   * @returns {Promise<Object>} Stored VRF data with ID
   */
  async storeVRF(vrfData) {
    this.ensureInitialized();

    try {
      const {
        id,
        requestId,
        gameType,
        gameSubType = 'standard',
        vrfValue,
        transactionHash,
        status = 'available',
        createdAt,
        fulfilledAt
      } = vrfData;

      // Validate required fields
      if (!requestId || !gameType || !vrfValue || !transactionHash) {
        throw new Error('Missing required VRF data fields');
      }

      const query = `
        INSERT INTO vrf_requests (
          request_id, game_type, game_sub_type, status, 
          transaction_hash, vrf_value, created_at, fulfilled_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (request_id) 
        DO UPDATE SET 
          status = EXCLUDED.status,
          vrf_value = EXCLUDED.vrf_value,
          fulfilled_at = EXCLUDED.fulfilled_at
        RETURNING *
      `;

      const values = [
        requestId,
        gameType.toUpperCase(),
        gameSubType,
        status,
        transactionHash,
        vrfValue,
        createdAt || new Date().toISOString(),
        fulfilledAt || new Date().toISOString()
      ];

      const result = await dbPool.query(query, values);
      const storedVRF = result.rows[0];

      // Clear relevant caches
      if (this.cacheEnabled) {
        await this.clearVRFCaches(gameType);
      }

      console.log(`✅ VRF stored: ${requestId} (${gameType}/${gameSubType})`);
      
      return {
        id: storedVRF.id,
        requestId: storedVRF.request_id,
        gameType: storedVRF.game_type,
        gameSubType: storedVRF.game_sub_type,
        vrfValue: storedVRF.vrf_value,
        transactionHash: storedVRF.transaction_hash,
        status: storedVRF.status,
        createdAt: storedVRF.created_at,
        fulfilledAt: storedVRF.fulfilled_at
      };

    } catch (error) {
      console.error('❌ Failed to store VRF:', error);
      
      await vrfErrorHandler.handleError(error, {
        operation: 'storeVRF',
        vrfData,
        retryAction: () => this.storeVRF(vrfData)
      });

      throw error;
    }
  }

  /**
   * Get available VRF for a specific game type and sub-type
   * @param {string} gameType - Game type (MINES, PLINKO, ROULETTE, WHEEL)
   * @param {string} gameSubType - Game sub-type (optional)
   * @returns {Promise<Object|null>} Available VRF data or null
   */
  async getAvailableVRF(gameType, gameSubType = null) {
    this.ensureInitialized();

    try {
      const cacheKey = `available_vrf:${gameType}:${gameSubType || 'any'}`;
      
      // Check cache first
      if (this.cacheEnabled) {
        const cached = await redisCache.get(cacheKey);
        if (cached) {
          console.log(`📦 Cache hit for VRF: ${gameType}/${gameSubType}`);
          return cached;
        }
      }

      // Build query based on whether sub-type is specified
      let query, values;
      
      if (gameSubType) {
        query = `
          SELECT * FROM vrf_requests 
          WHERE game_type = $1 AND game_sub_type = $2 
          AND status = 'fulfilled' 
          AND expires_at > NOW()
          AND id NOT IN (
            SELECT vrf_request_id FROM game_results 
            WHERE vrf_request_id IS NOT NULL
          )
          ORDER BY created_at ASC
          LIMIT 1
        `;
        values = [gameType.toUpperCase(), gameSubType];
      } else {
        query = `
          SELECT * FROM vrf_requests 
          WHERE game_type = $1 
          AND status = 'fulfilled' 
          AND expires_at > NOW()
          AND id NOT IN (
            SELECT vrf_request_id FROM game_results 
            WHERE vrf_request_id IS NOT NULL
          )
          ORDER BY created_at ASC
          LIMIT 1
        `;
        values = [gameType.toUpperCase()];
      }

      const result = await dbPool.query(query, values);
      
      if (result.rows.length === 0) {
        console.log(`⚠️ No available VRF found for ${gameType}/${gameSubType}`);
        return null;
      }

      const vrfData = this.formatVRFData(result.rows[0]);

      // Cache the result
      if (this.cacheEnabled) {
        await redisCache.set(cacheKey, vrfData, 60); // Short cache for availability
      }

      return vrfData;

    } catch (error) {
      console.error('❌ Failed to get available VRF:', error);
      
      await vrfErrorHandler.handleError(error, {
        operation: 'getAvailableVRF',
        gameType,
        gameSubType
      });

      throw error;
    }
  }

  /**
   * Mark VRF as used
   * @param {string} vrfId - VRF ID to mark as used
   * @param {Object} gameResult - Game result data
   * @returns {Promise<boolean>} Success status
   */
  async markVRFAsUsed(vrfId, gameResult) {
    this.ensureInitialized();

    try {
      const {
        userAddress,
        gameType,
        gameConfig,
        resultData,
        betAmount,
        payoutAmount
      } = gameResult;

      // Use transaction to ensure atomicity
      const result = await dbPool.transaction(async (client) => {
        // Insert game result
        const insertGameResult = `
          INSERT INTO game_results (
            vrf_request_id, user_address, game_type, 
            game_config, result_data, bet_amount, payout_amount
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;

        const gameResultValues = [
          vrfId,
          userAddress,
          gameType.toUpperCase(),
          JSON.stringify(gameConfig),
          JSON.stringify(resultData),
          betAmount || 0,
          payoutAmount || 0
        ];

        const gameResultRow = await client.query(insertGameResult, gameResultValues);

        return gameResultRow.rows[0];
      });

      // Clear relevant caches
      if (this.cacheEnabled) {
        await this.clearVRFCaches(gameType);
      }

      console.log(`✅ VRF marked as used: ${vrfId} for ${gameType}`);
      
      return true;

    } catch (error) {
      console.error('❌ Failed to mark VRF as used:', error);
      
      await vrfErrorHandler.handleError(error, {
        operation: 'markVRFAsUsed',
        vrfId,
        gameResult
      });

      throw error;
    }
  }

  /**
   * Get VRF count by game type
   * @param {string} gameType - Game type (optional, if not provided returns total)
   * @returns {Promise<number>} Count of available VRF
   */
  async getVRFCount(gameType = null) {
    this.ensureInitialized();

    try {
      const cacheKey = `vrf_count:${gameType || 'total'}`;
      
      // Check cache first
      if (this.cacheEnabled) {
        const cached = await redisCache.get(cacheKey);
        if (cached !== null) {
          return cached;
        }
      }

      let query, values;
      
      if (gameType) {
        query = `
          SELECT COUNT(*) as count FROM vrf_requests 
          WHERE game_type = $1 
          AND status = 'fulfilled' 
          AND expires_at > NOW()
          AND id NOT IN (
            SELECT vrf_request_id FROM game_results 
            WHERE vrf_request_id IS NOT NULL
          )
        `;
        values = [gameType.toUpperCase()];
      } else {
        query = `
          SELECT COUNT(*) as count FROM vrf_requests 
          WHERE status = 'fulfilled' 
          AND expires_at > NOW()
          AND id NOT IN (
            SELECT vrf_request_id FROM game_results 
            WHERE vrf_request_id IS NOT NULL
          )
        `;
        values = [];
      }

      const result = await dbPool.query(query, values);
      const count = parseInt(result.rows[0].count);

      // Cache the result
      if (this.cacheEnabled) {
        await redisCache.set(cacheKey, count, this.cacheTTL);
      }

      return count;

    } catch (error) {
      console.error('❌ Failed to get VRF count:', error);
      
      await vrfErrorHandler.handleError(error, {
        operation: 'getVRFCount',
        gameType
      });

      throw error;
    }
  }

  /**
   * Get VRF counts by game type and sub-type
   * @returns {Promise<Object>} VRF counts grouped by game type and sub-type
   */
  async getVRFCountsByType() {
    this.ensureInitialized();

    try {
      const cacheKey = 'vrf_counts_by_type';
      
      // Check cache first
      if (this.cacheEnabled) {
        const cached = await redisCache.get(cacheKey);
        if (cached) {
          return cached;
        }
      }

      const query = `
        SELECT 
          game_type, 
          game_sub_type, 
          COUNT(*) as count 
        FROM vrf_requests 
        WHERE status = 'fulfilled' 
        AND expires_at > NOW()
        AND id NOT IN (
          SELECT vrf_request_id FROM game_results 
          WHERE vrf_request_id IS NOT NULL
        )
        GROUP BY game_type, game_sub_type
        ORDER BY game_type, game_sub_type
      `;

      const result = await dbPool.query(query);
      
      // Format results
      const counts = {};
      result.rows.forEach(row => {
        if (!counts[row.game_type]) {
          counts[row.game_type] = {};
        }
        counts[row.game_type][row.game_sub_type] = parseInt(row.count);
      });

      // Cache the result
      if (this.cacheEnabled) {
        await redisCache.set(cacheKey, counts, this.cacheTTL);
      }

      return counts;

    } catch (error) {
      console.error('❌ Failed to get VRF counts by type:', error);
      throw error;
    }
  }

  /**
   * Cleanup expired and old VRF data
   * @returns {Promise<Object>} Cleanup statistics
   */
  async cleanupUsedVRF() {
    this.ensureInitialized();

    try {
      console.log('🧹 Starting VRF cleanup...');

      const cleanupStats = await dbPool.transaction(async (client) => {
        // Mark expired VRF requests
        const expireQuery = `
          UPDATE vrf_requests 
          SET status = 'expired' 
          WHERE status = 'fulfilled' 
          AND expires_at < NOW()
          AND id NOT IN (
            SELECT vrf_request_id FROM game_results 
            WHERE vrf_request_id IS NOT NULL
          )
        `;
        
        const expiredResult = await client.query(expireQuery);
        const expiredCount = expiredResult.rowCount;

        // Delete old VRF requests (older than 30 days)
        const deleteOldQuery = `
          DELETE FROM vrf_requests 
          WHERE created_at < NOW() - INTERVAL '30 days'
          AND status IN ('expired', 'failed')
        `;
        
        const deletedResult = await client.query(deleteOldQuery);
        const deletedCount = deletedResult.rowCount;

        // Delete old game results (older than 90 days)
        const deleteOldResultsQuery = `
          DELETE FROM game_results 
          WHERE created_at < NOW() - INTERVAL '90 days'
        `;
        
        const deletedResultsResult = await client.query(deleteOldResultsQuery);
        const deletedResultsCount = deletedResultsResult.rowCount;

        return {
          expiredVRF: expiredCount,
          deletedVRF: deletedCount,
          deletedResults: deletedResultsCount
        };
      });

      // Clear all caches after cleanup
      if (this.cacheEnabled) {
        await this.clearAllVRFCaches();
      }

      console.log('✅ VRF cleanup completed:', cleanupStats);
      
      return cleanupStats;

    } catch (error) {
      console.error('❌ VRF cleanup failed:', error);
      
      await vrfErrorHandler.handleError(error, {
        operation: 'cleanupUsedVRF'
      });

      throw error;
    }
  }

  /**
   * Get VRF system statistics
   * @returns {Promise<Object>} System statistics
   */
  async getSystemStats() {
    this.ensureInitialized();

    try {
      const cacheKey = 'vrf_system_stats';
      
      // Check cache first
      if (this.cacheEnabled) {
        const cached = await redisCache.get(cacheKey);
        if (cached) {
          return cached;
        }
      }

      const query = `
        SELECT 
          COUNT(*) FILTER (WHERE status = 'fulfilled' AND expires_at > NOW() AND id NOT IN (SELECT vrf_request_id FROM game_results WHERE vrf_request_id IS NOT NULL)) as available,
          COUNT(*) FILTER (WHERE id IN (SELECT vrf_request_id FROM game_results WHERE vrf_request_id IS NOT NULL)) as used,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'expired') as expired,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          COUNT(*) as total,
          AVG(EXTRACT(EPOCH FROM (fulfilled_at - created_at))) FILTER (WHERE fulfilled_at IS NOT NULL) as avg_fulfillment_time
        FROM vrf_requests
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `;

      const result = await dbPool.query(query);
      const stats = result.rows[0];

      const systemStats = {
        available: parseInt(stats.available) || 0,
        used: parseInt(stats.used) || 0,
        pending: parseInt(stats.pending) || 0,
        expired: parseInt(stats.expired) || 0,
        failed: parseInt(stats.failed) || 0,
        total: parseInt(stats.total) || 0,
        avgFulfillmentTime: parseFloat(stats.avg_fulfillment_time) || 0,
        utilizationRate: stats.total > 0 ? ((stats.used / stats.total) * 100).toFixed(2) : 0,
        successRate: stats.total > 0 ? (((stats.available + stats.used) / stats.total) * 100).toFixed(2) : 0,
        timestamp: new Date().toISOString()
      };

      // Cache the result
      if (this.cacheEnabled) {
        await redisCache.set(cacheKey, systemStats, 60); // Short cache for stats
      }

      return systemStats;

    } catch (error) {
      console.error('❌ Failed to get system stats:', error);
      throw error;
    }
  }

  /**
   * Format VRF data from database row
   * @param {Object} row - Database row
   * @returns {Object} Formatted VRF data
   */
  formatVRFData(row) {
    return {
      id: row.id,
      requestId: row.request_id,
      gameType: row.game_type,
      gameSubType: row.game_sub_type,
      vrfValue: row.vrf_value,
      transactionHash: row.transaction_hash,
      status: row.status,
      createdAt: row.created_at,
      fulfilledAt: row.fulfilled_at,
      expiresAt: row.expires_at
    };
  }

  /**
   * Clear VRF caches for a specific game type
   * @param {string} gameType - Game type
   */
  async clearVRFCaches(gameType) {
    if (!this.cacheEnabled) return;

    try {
      const cacheKeys = [
        `vrf_count:${gameType}`,
        `vrf_count:total`,
        `available_vrf:${gameType}:*`,
        'vrf_counts_by_type',
        'vrf_system_stats'
      ];

      for (const key of cacheKeys) {
        if (key.includes('*')) {
          // Handle wildcard keys (would need Redis SCAN in real implementation)
          continue;
        }
        await redisCache.del(key);
      }

    } catch (error) {
      console.warn('⚠️ Failed to clear VRF caches:', error.message);
    }
  }

  /**
   * Clear all VRF caches
   */
  async clearAllVRFCaches() {
    if (!this.cacheEnabled) return;

    try {
      // In a real implementation, you'd use Redis SCAN to find and delete all VRF-related keys
      console.log('🧹 Clearing all VRF caches...');
      
    } catch (error) {
      console.warn('⚠️ Failed to clear all VRF caches:', error.message);
    }
  }

  /**
   * Ensure service is initialized
   */
  ensureInitialized() {
    if (!this.isInitialized) {
      throw new Error('VRF Storage Service not initialized. Call initialize() first.');
    }
  }

  /**
   * Health check for storage service
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      // Test database connection
      const dbHealth = await dbPool.healthCheck();
      
      // Test basic query
      const testQuery = await dbPool.query('SELECT COUNT(*) FROM vrf_requests LIMIT 1');
      
      return {
        healthy: dbHealth.healthy,
        database: dbHealth,
        cache: {
          enabled: this.cacheEnabled,
          connected: redisCache.isConnected
        },
        testQuery: testQuery.rows[0].count,
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

  /**
   * Get VRF counts for a specific user
   * @param {string} userAddress - User's wallet address
   * @returns {Promise<Object>} VRF counts by game type
   */
  async getUserVRFCounts(userAddress) {
    this.ensureInitialized();

    try {
      const query = `
        SELECT 
          game_type,
          COUNT(*) as count
        FROM vrf_values 
        WHERE user_address = $1 
          AND is_consumed = false 
          AND is_expired = false
        GROUP BY game_type
      `;

      const result = await dbPool.query(query, [userAddress]);
      
      // Initialize counts for all game types
      const counts = {
        ROULETTE: 0,
        MINES: 0,
        PLINKO: 0,
        WHEEL: 0
      };

      // Fill in actual counts
      result.rows.forEach(row => {
        counts[row.game_type] = parseInt(row.count);
      });

      console.log(`📊 VRF counts for ${userAddress}:`, counts);
      
      return counts;

    } catch (error) {
      console.error('❌ Failed to get user VRF counts:', error);
      
      // Return zero counts on error
      return {
        ROULETTE: 0,
        MINES: 0,
        PLINKO: 0,
        WHEEL: 0
      };
    }
  }
}

// Export singleton instance
export const vrfStorage = new VRFStorageService();
export default vrfStorage;