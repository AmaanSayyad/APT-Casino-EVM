import { vrfPregeneration } from '../../../services/VRFPregenerationService.js';

/**
 * VRF Batch Generation API Endpoint
 * Handles initial VRF batch generation for user sessions
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only POST requests are accepted'
    });
  }

  try {
    const { 
      userAddress, 
      batchSize = 200,
      gameDistribution = {
        ROULETTE: 50,
        MINES: 50,
        PLINKO: 50,
        WHEEL: 50
      },
      options = {} 
    } = req.body;

    // Validate required fields
    if (!userAddress) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'userAddress is required'
      });
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return res.status(400).json({
        error: 'Invalid address format',
        message: 'userAddress must be a valid Ethereum address'
      });
    }

    console.log(`🎲 VRF Proof creation requested for user: ${userAddress}`, {
      batchSize,
      gameDistribution
    });

    // Initialize service if needed
    if (!vrfPregeneration.isInitialized) {
      await vrfPregeneration.initialize();
    }

    // Check current VRF status for user
    const currentStatus = await vrfPregeneration.checkUserVRFStatus(userAddress);
    
    // If user already has sufficient VRF and no emergency, return current status
    if (!currentStatus.needsRefill && !options.force) {
      return res.status(200).json({
        success: true,
        message: 'VRF levels are sufficient, no batch generation needed',
        data: {
          userAddress,
          currentStatus,
          action: 'no_action_needed'
        }
      });
    }

    // Generate initial VRF batch
    const result = await vrfPregeneration.generateInitialVRFBatch(userAddress, options);

    if (!result.success) {
      return res.status(409).json({
        success: false,
        error: 'Batch generation conflict',
        message: result.message,
        data: {
          userAddress,
          currentStatus
        }
      });
    }

    console.log(`✅ VRF batch generation started for user: ${userAddress}, session: ${result.sessionId}`);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'VRF batch generation started successfully',
      data: {
        userAddress,
        sessionId: result.sessionId,
        totalRequested: result.totalRequested,
        estimatedFulfillmentTime: result.estimatedFulfillmentTime,
        batchResults: result.batchResults,
        currentStatus,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ VRF batch generation failed:', error);

    // Return error response
    res.status(500).json({
      success: false,
      error: 'VRF batch generation failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * API Documentation
 * 
 * POST /api/vrf/generate-batch
 * 
 * Request Body:
 * {
 *   "userAddress": "0x1234567890123456789012345678901234567890",
 *   "options": {
 *     "force": false,
 *     "customAllocation": {
 *       "MINES": { "subtypes": ["5", "10"], "countPerSubtype": 5 }
 *     }
 *   }
 * }
 * 
 * Response (Success):
 * {
 *   "success": true,
 *   "message": "VRF batch generation started successfully",
 *   "data": {
 *     "userAddress": "0x1234567890123456789012345678901234567890",
 *     "sessionId": "0x1234_1640995200000",
 *     "totalRequested": 200,
 *     "estimatedFulfillmentTime": "2-5 minutes",
 *     "batchResults": [...],
 *     "currentStatus": {...},
 *     "timestamp": "2023-12-31T23:59:59.999Z"
 *   }
 * }
 * 
 * Response (Error):
 * {
 *   "success": false,
 *   "error": "VRF batch generation failed",
 *   "message": "Detailed error message",
 *   "timestamp": "2023-12-31T23:59:59.999Z"
 * }
 */