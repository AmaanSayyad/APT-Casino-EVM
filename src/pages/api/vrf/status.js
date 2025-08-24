import { vrfManager } from '../../../services/VRFManagerService.js';
import { vrfStorage } from '../../../services/VRFStorageService.js';
import { vrfErrorHandler } from '../../../services/VRFErrorHandler.js';

/**
 * VRF System Status API Endpoint
 * Provides comprehensive status information about the VRF system
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only GET requests are accepted'
    });
  }

  try {
    // Initialize services if needed
    if (!vrfManager.isInitialized) {
      await vrfManager.initialize();
    }

    // Get VRF system status
    const [
      contractStatus,
      storageStatus,
      errorStats
    ] = await Promise.all([
      getContractStatus(),
      getStorageStatus(),
      getErrorStatus()
    ]);

    // Calculate overall system health
    const systemHealth = calculateSystemHealth(contractStatus, storageStatus, errorStats);

    const status = {
      timestamp: new Date().toISOString(),
      systemHealth,
      contract: contractStatus,
      storage: storageStatus,
      errors: errorStats,
      recommendations: generateRecommendations(contractStatus, storageStatus, errorStats)
    };

    res.status(200).json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('❌ Failed to get VRF status:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to get VRF status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Get contract status information
 */
async function getContractStatus() {
  try {
    const contractInfo = await vrfManager.getContractInfo();
    const vrfStatus = await vrfManager.getVRFStatus();

    return {
      ...contractInfo,
      ...vrfStatus,
      isHealthy: true,
      lastChecked: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Failed to get contract status:', error);
    
    return {
      isHealthy: false,
      error: error.message,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Get storage status information
 */
async function getStorageStatus() {
  try {
    // Check if storage service is available
    if (!vrfStorage.isInitialized) {
      await vrfStorage.initialize();
    }

    const totalAvailable = await vrfStorage.getVRFCount();
    const gameTypeCounts = {};

    // Get counts for each game type
    const gameTypes = ['MINES', 'PLINKO', 'ROULETTE', 'WHEEL'];
    for (const gameType of gameTypes) {
      gameTypeCounts[gameType] = await vrfStorage.getVRFCount(gameType);
    }

    // Calculate utilization
    const totalCapacity = 200;
    const utilization = ((totalCapacity - totalAvailable) / totalCapacity * 100).toFixed(2);

    return {
      totalAvailable,
      totalCapacity,
      utilization: `${utilization}%`,
      gameTypeCounts,
      isHealthy: totalAvailable > 20, // Healthy if more than 20 VRF available
      lastChecked: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Failed to get storage status:', error);
    
    return {
      isHealthy: false,
      error: error.message,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Get error status information
 */
async function getErrorStatus() {
  try {
    const errorStats = vrfErrorHandler.getErrorStats();

    return {
      ...errorStats,
      isHealthy: errorStats.errorRate < 5, // Healthy if less than 5 errors per hour
      lastChecked: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Failed to get error status:', error);
    
    return {
      isHealthy: false,
      error: error.message,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Calculate overall system health
 */
function calculateSystemHealth(contractStatus, storageStatus, errorStats) {
  const healthChecks = [
    contractStatus.isHealthy,
    storageStatus.isHealthy,
    errorStats.isHealthy
  ];

  const healthyCount = healthChecks.filter(Boolean).length;
  const totalChecks = healthChecks.length;
  const healthPercentage = (healthyCount / totalChecks * 100).toFixed(0);

  let status = 'healthy';
  let color = 'green';

  if (healthPercentage < 100) {
    status = 'degraded';
    color = 'yellow';
  }

  if (healthPercentage < 67) {
    status = 'unhealthy';
    color = 'red';
  }

  return {
    status,
    color,
    percentage: `${healthPercentage}%`,
    healthyComponents: healthyCount,
    totalComponents: totalChecks,
    details: {
      contract: contractStatus.isHealthy ? 'healthy' : 'unhealthy',
      storage: storageStatus.isHealthy ? 'healthy' : 'unhealthy',
      errors: errorStats.isHealthy ? 'healthy' : 'unhealthy'
    }
  };
}

/**
 * Generate system recommendations
 */
function generateRecommendations(contractStatus, storageStatus, errorStats) {
  const recommendations = [];

  // Contract recommendations
  if (!contractStatus.isHealthy) {
    recommendations.push({
      type: 'critical',
      component: 'contract',
      message: 'VRF contract is not accessible',
      action: 'Check network connection and contract address'
    });
  }

  // Storage recommendations
  if (storageStatus.totalAvailable < 40) {
    recommendations.push({
      type: 'warning',
      component: 'storage',
      message: `Low VRF count: ${storageStatus.totalAvailable} available`,
      action: 'Trigger VRF refill or check fulfillment process'
    });
  }

  if (storageStatus.totalAvailable < 20) {
    recommendations.push({
      type: 'critical',
      component: 'storage',
      message: `Critical VRF count: ${storageStatus.totalAvailable} available`,
      action: 'Immediate VRF refill required'
    });
  }

  // Error recommendations
  if (errorStats.errorRate > 10) {
    recommendations.push({
      type: 'critical',
      component: 'errors',
      message: `High error rate: ${errorStats.errorRate.toFixed(1)} errors/hour`,
      action: 'Investigate error patterns and fix underlying issues'
    });
  } else if (errorStats.errorRate > 5) {
    recommendations.push({
      type: 'warning',
      component: 'errors',
      message: `Elevated error rate: ${errorStats.errorRate.toFixed(1)} errors/hour`,
      action: 'Monitor error trends and consider preventive measures'
    });
  }

  // Fulfillment rate recommendations
  if (contractStatus.fulfillmentRate) {
    const fulfillmentPercentage = parseFloat(contractStatus.fulfillmentRate);
    
    if (fulfillmentPercentage < 90) {
      recommendations.push({
        type: 'warning',
        component: 'contract',
        message: `Low fulfillment rate: ${contractStatus.fulfillmentRate}`,
        action: 'Check Chainlink VRF subscription and LINK balance'
      });
    }
  }

  // Game type balance recommendations
  if (storageStatus.gameTypeCounts) {
    const gameTypes = Object.keys(storageStatus.gameTypeCounts);
    const minCount = Math.min(...Object.values(storageStatus.gameTypeCounts));
    
    if (minCount < 5) {
      const lowGameTypes = gameTypes.filter(
        gameType => storageStatus.gameTypeCounts[gameType] < 5
      );
      
      recommendations.push({
        type: 'warning',
        component: 'storage',
        message: `Low VRF count for game types: ${lowGameTypes.join(', ')}`,
        action: 'Balance VRF allocation across game types'
      });
    }
  }

  // If no issues found
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'info',
      component: 'system',
      message: 'All systems operating normally',
      action: 'Continue monitoring'
    });
  }

  return recommendations;
}