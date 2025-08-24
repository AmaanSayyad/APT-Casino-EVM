import { vrfAutoRefill } from '../../../services/VRFAutoRefillService.js';

/**
 * VRF Auto Refill Management API Endpoint
 * Handles auto refill service control and status
 */
export default async function handler(req, res) {
  try {
    const { method } = req;

    // Initialize service if needed
    if (!vrfAutoRefill.isInitialized) {
      await vrfAutoRefill.initialize();
    }

    switch (method) {
      case 'GET':
        return await handleGetStatus(req, res);
      
      case 'POST':
        return await handlePostAction(req, res);
      
      case 'PUT':
        return await handlePutConfig(req, res);
      
      default:
        return res.status(405).json({
          error: 'Method not allowed',
          message: `Method ${method} is not supported`
        });
    }

  } catch (error) {
    console.error('❌ VRF Auto Refill API error:', error);

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle GET requests - Get auto refill status and statistics
 */
async function handleGetStatus(req, res) {
  try {
    const { detailed = 'false' } = req.query;
    const includeDetailed = detailed.toLowerCase() === 'true';

    const status = vrfAutoRefill.getStatus();
    const statistics = vrfAutoRefill.getRefillStatistics();

    const response = {
      success: true,
      data: {
        status: {
          isRunning: status.isRunning,
          isInitialized: status.isInitialized,
          refillInProgress: status.refillInProgress,
          lastRefillTime: status.lastRefillTime,
          cooldownRemaining: status.cooldownRemaining
        },
        statistics,
        timestamp: new Date().toISOString()
      }
    };

    // Include detailed information if requested
    if (includeDetailed) {
      response.data.detailed = {
        config: status.config,
        recentRefills: status.refillHistory,
        healthCheck: await vrfAutoRefill.healthCheck()
      };
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Failed to get auto refill status:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle POST requests - Control auto refill service
 */
async function handlePostAction(req, res) {
  try {
    const { action, options = {} } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Missing action',
        message: 'Action parameter is required'
      });
    }

    let result;

    switch (action.toLowerCase()) {
      case 'start':
        await vrfAutoRefill.startMonitoring();
        result = {
          action: 'start',
          message: 'Auto refill monitoring started',
          status: vrfAutoRefill.getStatus()
        };
        break;

      case 'stop':
        vrfAutoRefill.stopMonitoring();
        result = {
          action: 'stop',
          message: 'Auto refill monitoring stopped',
          status: vrfAutoRefill.getStatus()
        };
        break;

      case 'force_check':
        const forceResult = await vrfAutoRefill.forceRefillCheck(options);
        result = {
          action: 'force_check',
          message: 'Force refill check completed',
          result: forceResult
        };
        break;

      case 'health_check':
        const healthResult = await vrfAutoRefill.healthCheck();
        result = {
          action: 'health_check',
          message: 'Health check completed',
          result: healthResult
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action',
          message: `Action '${action}' is not supported. Valid actions: start, stop, force_check, health_check`
        });
    }

    console.log(`✅ Auto refill action completed: ${action}`);

    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Failed to execute auto refill action:', error);
    
    res.status(500).json({
      success: false,
      error: 'Action execution failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle PUT requests - Update auto refill configuration
 */
async function handlePutConfig(req, res) {
  try {
    const { config } = req.body;

    if (!config || typeof config !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid configuration',
        message: 'Config object is required'
      });
    }

    // Validate configuration parameters
    const validationResult = validateConfig(config);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Configuration validation failed',
        message: validationResult.errors.join(', ')
      });
    }

    // Update configuration
    const oldConfig = vrfAutoRefill.getStatus().config;
    vrfAutoRefill.updateConfig(config);
    const newConfig = vrfAutoRefill.getStatus().config;

    console.log('⚙️ Auto refill configuration updated');

    res.status(200).json({
      success: true,
      message: 'Configuration updated successfully',
      data: {
        oldConfig,
        newConfig,
        changes: getConfigChanges(oldConfig, newConfig)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Failed to update auto refill configuration:', error);
    
    res.status(500).json({
      success: false,
      error: 'Configuration update failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Validate configuration parameters
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result
 */
function validateConfig(config) {
  const errors = [];

  if (config.monitoringIntervalMs !== undefined) {
    if (typeof config.monitoringIntervalMs !== 'number' || config.monitoringIntervalMs < 10000) {
      errors.push('monitoringIntervalMs must be a number >= 10000 (10 seconds)');
    }
  }

  if (config.refillCooldownMs !== undefined) {
    if (typeof config.refillCooldownMs !== 'number' || config.refillCooldownMs < 60000) {
      errors.push('refillCooldownMs must be a number >= 60000 (1 minute)');
    }
  }

  if (config.maxRefillAttempts !== undefined) {
    if (typeof config.maxRefillAttempts !== 'number' || config.maxRefillAttempts < 1 || config.maxRefillAttempts > 10) {
      errors.push('maxRefillAttempts must be a number between 1 and 10');
    }
  }

  if (config.emergencyThresholdMultiplier !== undefined) {
    if (typeof config.emergencyThresholdMultiplier !== 'number' || 
        config.emergencyThresholdMultiplier < 0.1 || 
        config.emergencyThresholdMultiplier > 1.0) {
      errors.push('emergencyThresholdMultiplier must be a number between 0.1 and 1.0');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get configuration changes
 * @param {Object} oldConfig - Old configuration
 * @param {Object} newConfig - New configuration
 * @returns {Array} Array of changes
 */
function getConfigChanges(oldConfig, newConfig) {
  const changes = [];

  Object.keys(newConfig).forEach(key => {
    if (oldConfig[key] !== newConfig[key]) {
      changes.push({
        parameter: key,
        oldValue: oldConfig[key],
        newValue: newConfig[key]
      });
    }
  });

  return changes;
}

/**
 * API Documentation
 * 
 * GET /api/vrf/auto-refill
 * Query Parameters:
 * - detailed: 'true' | 'false' (default: 'false')
 * 
 * POST /api/vrf/auto-refill
 * Request Body:
 * {
 *   "action": "start" | "stop" | "force_check" | "health_check",
 *   "options": {
 *     "ignoreCooldown": boolean,
 *     "minimumThreshold": number
 *   }
 * }
 * 
 * PUT /api/vrf/auto-refill
 * Request Body:
 * {
 *   "config": {
 *     "monitoringIntervalMs": number,
 *     "refillCooldownMs": number,
 *     "maxRefillAttempts": number,
 *     "emergencyThresholdMultiplier": number
 *   }
 * }
 */