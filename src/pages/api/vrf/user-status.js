import { VRFStorageService } from '../../../services/VRFStorageService';

/**
 * User VRF Status API
 * Returns VRF counts for a specific user
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { userAddress } = req.query;

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing userAddress parameter'
      });
    }

    console.log(`📊 Checking VRF status for user: ${userAddress}`);

    // Initialize storage service
    const vrfStorage = new VRFStorageService();

    // Get VRF counts for user
    const vrfCounts = await vrfStorage.getUserVRFCounts(userAddress);
    const totalVRF = Object.values(vrfCounts).reduce((sum, count) => sum + count, 0);

    const responseData = {
      userAddress,
      vrfCounts,
      totalVRF,
      isReady: totalVRF > 0,
      needsRefill: totalVRF < 40,
      lastChecked: new Date().toISOString()
    };

    console.log(`✅ User VRF status:`, responseData);

    return res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('❌ User VRF status check failed:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to check user VRF status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * API Route Configuration
 */
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};