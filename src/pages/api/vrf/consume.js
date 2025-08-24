import { vrfStorage } from '../../../services/VRFStorageService.js';

/**
 * VRF Consume API
 * POST /api/vrf/consume - Get next available VRF for a game
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { userAddress, gameType, gameSubType = 'standard' } = req.body;

    // Validate required fields
    if (!userAddress || !gameType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userAddress, gameType'
      });
    }

    // Validate Ethereum address
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format'
      });
    }

    // Validate game type
    if (!['MINES', 'PLINKO', 'ROULETTE', 'WHEEL'].includes(gameType.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid game type. Must be one of: MINES, PLINKO, ROULETTE, WHEEL'
      });
    }

    // Initialize VRF storage if needed
    if (!vrfStorage.isInitialized) {
      await vrfStorage.initialize();
    }

    // Get next available VRF
    const vrfData = await vrfStorage.getNextVRF(gameType.toUpperCase(), gameSubType);

    if (!vrfData) {
      return res.status(404).json({
        success: false,
        error: `No ${gameType} VRFs available. Please wait for generation to complete.`,
        needsRefill: true
      });
    }

    // Mark VRF as used
    await vrfStorage.markVRFAsUsed(vrfData.id, userAddress);

    // Return VRF data
    res.status(200).json({
      success: true,
      data: {
        id: vrfData.id,
        requestId: vrfData.requestId,
        vrfValue: vrfData.vrfValue,
        transactionHash: vrfData.transactionHash,
        blockNumber: vrfData.blockNumber,
        gameType: vrfData.gameType,
        gameSubType: vrfData.gameSubType,
        fulfilledAt: vrfData.fulfilledAt,
        etherscanUrl: `${process.env.NEXT_PUBLIC_SEPOLIA_EXPLORER}/tx/${vrfData.transactionHash}`,
        metadata: {
          consumedAt: new Date().toISOString(),
          consumedBy: userAddress,
          verifiable: true,
          provablyFair: true
        }
      }
    });

  } catch (error) {
    console.error('❌ VRF consume API error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to consume VRF',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Example request:
 * POST /api/vrf/consume
 * {
 *   "userAddress": "0x1234567890123456789012345678901234567890",
 *   "gameType": "ROULETTE",
 *   "gameSubType": "european"
 * }
 * 
 * Example response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "uuid-here",
 *     "requestId": "12345",
 *     "vrfValue": "123456789012345678901234567890",
 *     "transactionHash": "0xabc123...",
 *     "blockNumber": 18234567,
 *     "gameType": "ROULETTE",
 *     "gameSubType": "european",
 *     "fulfilledAt": "2024-08-24T10:30:00Z",
 *     "etherscanUrl": "https://sepolia.etherscan.io/tx/0xabc123...",
 *     "metadata": {
 *       "consumedAt": "2024-08-24T10:35:00Z",
 *       "consumedBy": "0x1234...",
 *       "verifiable": true,
 *       "provablyFair": true
 *     }
 *   }
 * }
 */