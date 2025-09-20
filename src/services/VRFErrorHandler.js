import VRF_CONFIG from '../config/vrf.js';

/**
 * VRF Error Types
 */
export const VRFErrorType = {
  INSUFFICIENT_LINK: 'insufficient_link',
  INSUFFICIENT_TREASURY_FUNDS: 'insufficient_treasury_funds',
  VRF_REQUEST_FAILED: 'vrf_request_failed',
  VRF_FULFILLMENT_TIMEOUT: 'vrf_fulfillment_timeout',
  TREASURY_SIGNATURE_FAILED: 'treasury_signature_failed',
  DATABASE_ERROR: 'database_error',
  GAME_PROCESSING_ERROR: 'game_processing_error',
  NETWORK_ERROR: 'network_error',
  CONTRACT_ERROR: 'contract_error',
  VALIDATION_ERROR: 'validation_error'
};

/**
 * Custom VRF Error Class
 */
export class VRFError extends Error {
  constructor(type, message, details = null, originalError = null) {
    super(message);
    this.name = 'VRFError';
    this.type = type;
    this.details = details;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * VRF Error Handler Service
 */
export class VRFErrorHandler {
  constructor() {
    this.errorLog = [];
    this.retryAttempts = new Map();
    this.circuitBreaker = new Map();
  }

  /**
   * Handle VRF errors with appropriate recovery strategies
   * @param {Error} error - The error to handle
   * @param {Object} context - Error context information
   * @returns {Promise<Object>} Recovery action result
   */
  async handleError(error, context = {}) {
    const vrfError = this.classifyError(error, context);
    
    // Log the error
    this.logError(vrfError, context);

    // Determine recovery strategy
    const recoveryStrategy = this.getRecoveryStrategy(vrfError.type);
    
    try {
      const result = await this.executeRecoveryStrategy(recoveryStrategy, vrfError, context);
      
      console.log(`✅ Error recovery successful for ${vrfError.type}:`, result);
      
      return {
        success: true,
        error: vrfError,
        recovery: result,
        timestamp: new Date().toISOString()
      };

    } catch (recoveryError) {
      console.error(`❌ Error recovery failed for ${vrfError.type}:`, recoveryError);
      
      // If recovery fails, escalate the error
      await this.escalateError(vrfError, recoveryError, context);
      
      return {
        success: false,
        error: vrfError,
        recoveryError,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Classify error type based on error message and context
   * @param {Error} error - Original error
   * @param {Object} context - Error context
   * @returns {VRFError} Classified VRF error
   */
  classifyError(error, context) {
    const message = error.message.toLowerCase();
    
    // Network-related errors
    if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
      return new VRFError(VRFErrorType.NETWORK_ERROR, error.message, context, error);
    }
    
    // Treasury funds related errors
    if (message.includes('insufficient funds') && message.includes('treasury')) {
      return new VRFError(VRFErrorType.INSUFFICIENT_TREASURY_FUNDS, error.message, context, error);
    }
    
    // LINK token related errors
    if (message.includes('insufficient funds') || message.includes('link') || message.includes('subscription')) {
      return new VRFError(VRFErrorType.INSUFFICIENT_LINK, error.message, context, error);
    }
    
    // Treasury/signature errors
    if (message.includes('treasury') || message.includes('signature') || message.includes('unauthorized')) {
      return new VRFError(VRFErrorType.TREASURY_SIGNATURE_FAILED, error.message, context, error);
    }
    
    // Contract-related errors
    if (message.includes('revert') || message.includes('contract') || message.includes('gas')) {
      return new VRFError(VRFErrorType.CONTRACT_ERROR, error.message, context, error);
    }
    
    // Database errors
    if (message.includes('database') || message.includes('sql') || message.includes('connection')) {
      return new VRFError(VRFErrorType.DATABASE_ERROR, error.message, context, error);
    }
    
    // Validation errors
    if (message.includes('invalid') || message.includes('validation') || message.includes('required')) {
      return new VRFError(VRFErrorType.VALIDATION_ERROR, error.message, context, error);
    }
    
    // Default to VRF request failed
    return new VRFError(VRFErrorType.VRF_REQUEST_FAILED, error.message, context, error);
  }

  /**
   * Get recovery strategy for error type
   * @param {string} errorType - VRF error type
   * @returns {Object} Recovery strategy configuration
   */
  getRecoveryStrategy(errorType) {
    const strategies = {
      [VRFErrorType.NETWORK_ERROR]: {
        type: 'retry',
        maxRetries: 3,
        delay: 5000,
        exponentialBackoff: true
      },
      [VRFErrorType.VRF_REQUEST_FAILED]: {
        type: 'retry',
        maxRetries: 3,
        delay: 10000,
        exponentialBackoff: true
      },
      [VRFErrorType.CONTRACT_ERROR]: {
        type: 'retry',
        maxRetries: 2,
        delay: 15000,
        exponentialBackoff: false
      },
      [VRFErrorType.TREASURY_SIGNATURE_FAILED]: {
        type: 'escalate',
        requiresManualIntervention: true
      },
      [VRFErrorType.INSUFFICIENT_LINK]: {
        type: 'alert',
        requiresManualIntervention: true,
        alertLevel: 'critical'
      },
      [VRFErrorType.DATABASE_ERROR]: {
        type: 'retry',
        maxRetries: 2,
        delay: 3000,
        exponentialBackoff: false
      },
      [VRFErrorType.VALIDATION_ERROR]: {
        type: 'fail',
        requiresManualIntervention: false
      },
      [VRFErrorType.VRF_FULFILLMENT_TIMEOUT]: {
        type: 'monitor',
        timeoutDuration: 300000, // 5 minutes
        fallbackAction: 'retry'
      }
    };

    return strategies[errorType] || {
      type: 'escalate',
      requiresManualIntervention: true
    };
  }

  /**
   * Execute recovery strategy
   * @param {Object} strategy - Recovery strategy
   * @param {VRFError} error - VRF error
   * @param {Object} context - Error context
   * @returns {Promise<Object>} Recovery result
   */
  async executeRecoveryStrategy(strategy, error, context) {
    switch (strategy.type) {
      case 'retry':
        return await this.executeRetryStrategy(strategy, error, context);
      
      case 'alert':
        return await this.executeAlertStrategy(strategy, error, context);
      
      case 'escalate':
        return await this.executeEscalateStrategy(strategy, error, context);
      
      case 'monitor':
        return await this.executeMonitorStrategy(strategy, error, context);
      
      case 'fail':
        return await this.executeFailStrategy(strategy, error, context);
      
      default:
        throw new Error(`Unknown recovery strategy: ${strategy.type}`);
    }
  }

  /**
   * Execute retry strategy
   */
  async executeRetryStrategy(strategy, error, context) {
    const retryKey = `${error.type}_${context.requestId || 'global'}`;
    const currentAttempts = this.retryAttempts.get(retryKey) || 0;

    if (currentAttempts >= strategy.maxRetries) {
      throw new Error(`Max retry attempts (${strategy.maxRetries}) exceeded for ${error.type}`);
    }

    // Calculate delay with exponential backoff if enabled
    let delay = strategy.delay;
    if (strategy.exponentialBackoff) {
      delay = strategy.delay * Math.pow(2, currentAttempts);
    }

    console.log(`🔄 Retrying ${error.type} (attempt ${currentAttempts + 1}/${strategy.maxRetries}) after ${delay}ms delay`);

    // Wait for delay
    await new Promise(resolve => setTimeout(resolve, delay));

    // Increment retry counter
    this.retryAttempts.set(retryKey, currentAttempts + 1);

    // Execute the retry action based on context
    if (context.retryAction && typeof context.retryAction === 'function') {
      const result = await context.retryAction();
      
      // Reset retry counter on success
      this.retryAttempts.delete(retryKey);
      
      return {
        type: 'retry',
        attempt: currentAttempts + 1,
        result,
        success: true
      };
    }

    return {
      type: 'retry',
      attempt: currentAttempts + 1,
      success: false,
      message: 'No retry action provided'
    };
  }

  /**
   * Execute alert strategy
   */
  async executeAlertStrategy(strategy, error, context) {
    const alert = {
      type: 'vrf_error_alert',
      level: strategy.alertLevel || 'warning',
      error: error.toJSON(),
      context,
      timestamp: new Date().toISOString(),
      requiresManualIntervention: strategy.requiresManualIntervention
    };

    // Send alert (implement your alerting mechanism here)
    await this.sendAlert(alert);

    return {
      type: 'alert',
      alert,
      success: true
    };
  }

  /**
   * Execute escalate strategy
   */
  async executeEscalateStrategy(strategy, error, context) {
    const escalation = {
      type: 'vrf_error_escalation',
      error: error.toJSON(),
      context,
      timestamp: new Date().toISOString(),
      requiresManualIntervention: strategy.requiresManualIntervention
    };

    // Log escalation
    console.error('🚨 VRF Error Escalated:', escalation);

    // Send escalation alert
    await this.sendAlert({
      ...escalation,
      level: 'critical'
    });

    return {
      type: 'escalate',
      escalation,
      success: true
    };
  }

  /**
   * Execute monitor strategy
   */
  async executeMonitorStrategy(strategy, error, context) {
    const monitorKey = `${error.type}_${context.requestId || 'global'}`;
    
    // Set up monitoring timeout
    setTimeout(async () => {
      console.log(`⏰ Monitoring timeout reached for ${error.type}, executing fallback`);
      
      if (strategy.fallbackAction === 'retry') {
        const retryStrategy = this.getRecoveryStrategy(VRFErrorType.VRF_REQUEST_FAILED);
        await this.executeRecoveryStrategy(retryStrategy, error, context);
      }
    }, strategy.timeoutDuration);

    return {
      type: 'monitor',
      monitorKey,
      timeoutDuration: strategy.timeoutDuration,
      success: true
    };
  }

  /**
   * Execute fail strategy
   */
  async executeFailStrategy(strategy, error, context) {
    console.log(`❌ Failing fast for ${error.type} - no recovery attempted`);

    return {
      type: 'fail',
      error: error.toJSON(),
      success: false,
      message: 'Error marked as non-recoverable'
    };
  }

  /**
   * Send alert notification
   */
  async sendAlert(alert) {
    try {
      // Log alert
      console.log(`🚨 VRF Alert [${alert.level.toUpperCase()}]:`, alert);

      // Here you would implement your actual alerting mechanism:
      // - Send email notification
      // - Send webhook to monitoring system
      // - Send Slack/Discord notification
      // - Store in database for admin dashboard

      // Example webhook call (uncomment and configure as needed):
      /*
      if (process.env.WEBHOOK_URL) {
        await fetch(process.env.WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert)
        });
      }
      */

    } catch (error) {
      console.error('❌ Failed to send alert:', error);
    }
  }

  /**
   * Escalate error to higher level
   */
  async escalateError(error, recoveryError, context) {
    const escalation = {
      originalError: error.toJSON(),
      recoveryError: recoveryError.message,
      context,
      timestamp: new Date().toISOString(),
      level: 'critical'
    };

    console.error('🚨 VRF Error Escalation:', escalation);
    
    await this.sendAlert(escalation);
  }

  /**
   * Log error for analysis
   */
  logError(error, context) {
    const logEntry = {
      error: error.toJSON(),
      context,
      timestamp: new Date().toISOString()
    };

    this.errorLog.push(logEntry);

    // Keep only last 1000 errors in memory
    if (this.errorLog.length > 1000) {
      this.errorLog = this.errorLog.slice(-1000);
    }

    console.error('❌ VRF Error Logged:', logEntry);
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {
      totalErrors: this.errorLog.length,
      errorsByType: {},
      recentErrors: this.errorLog.slice(-10),
      errorRate: 0
    };

    // Count errors by type
    this.errorLog.forEach(entry => {
      const type = entry.error.type;
      stats.errorsByType[type] = (stats.errorsByType[type] || 0) + 1;
    });

    // Calculate error rate (errors per hour in last 24 hours)
    const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
    const recentErrors = this.errorLog.filter(entry => 
      new Date(entry.timestamp).getTime() > last24Hours
    );
    stats.errorRate = recentErrors.length / 24;

    return stats;
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
    this.retryAttempts.clear();
    this.circuitBreaker.clear();
    console.log('🧹 VRF error log cleared');
  }
}

// Export singleton instance
export const vrfErrorHandler = new VRFErrorHandler();
export default vrfErrorHandler;