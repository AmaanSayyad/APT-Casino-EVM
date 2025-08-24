import { vrfManager } from '../../../services/VRFManagerService.js';
import { vrfStorage } from '../../../services/VRFStorageService.js';

/**
 * VRF Fulfillment Webhook Endpoint
 * Handles Chainlink VRF fulfillment callbacks
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
    const { requestId, randomWords, transactionHash, blockNumber } = req.body;

    // Validate required fields
    if (!requestId || !randomWords || !transactionHash) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'requestId, randomWords, and transactionHash are required'
      });
    }

    console.log(`🎉 Processing VRF fulfillment for request ${requestId}`);

    // Initialize services if needed
    if (!vrfManager.isInitialized) {
      await vrfManager.initialize();
    }
    
    if (!vrfStorage.isInitialized) {
      await vrfStorage.initialize();
    }

    // Get the original VRF request details
    const vrfRequest = await vrfManager.getVRFRequest(requestId);
    
    if (!vrfRequest) {
      return res.status(404).json({
        error: 'VRF request not found',
        message: `No VRF request found with ID: ${requestId}`
      });
    }

    // Process the fulfillment
    const fulfillmentData = {
      requestId,
      gameType: vrfRequest.gameType,
      gameSubType: vrfRequest.gameSubType,
      vrfValue: randomWords[0], // First random word
      transactionHash,
      blockNumber,
      status: 'fulfilled',
      fulfilledAt: new Date().toISOString()
    };

    // Store the fulfilled VRF in database
    await vrfStorage.storeVRF({
      id: `vrf_${requestId}`,
      requestId,
      gameType: vrfRequest.gameType,
      gameSubType: vrfRequest.gameSubType,
      vrfValue: randomWords[0],
      transactionHash,
      status: 'available',
      createdAt: vrfRequest.createdAt,
      fulfilledAt: fulfillmentData.fulfilledAt
    });

    // Update VRF system statistics
    await updateVRFSystemStats(vrfRequest.gameType);

    // Check if VRF levels are low and trigger refill if needed
    await checkAndTriggerRefill();

    console.log(`✅ VRF fulfillment processed successfully for request ${requestId}`);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'VRF fulfillment processed successfully',
      data: {
        requestId,
        gameType: vrfRequest.gameType,
        gameSubType: vrfRequest.gameSubType,
        vrfValue: randomWords[0],
        transactionHash,
        processedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ VRF fulfillment processing failed:', error);

    // Return error response
    res.status(500).json({
      error: 'VRF fulfillment processing failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Update VRF system statistics
 */
async function updateVRFSystemStats(gameType) {
  try {
    // Get current VRF counts
    const totalAvailable = await vrfStorage.getVRFCount();
    const gameTypeCount = await vrfStorage.getVRFCount(gameType);

    // Update system status (this would typically update a database record)
    console.log(`📊 VRF Stats Updated - Total: ${totalAvailable}, ${gameType}: ${gameTypeCount}`);

    // You could store these stats in a database table for monitoring
    // await updateSystemStatusTable({ totalAvailable, gameTypeCount, gameType });

  } catch (error) {
    console.error('❌ Failed to update VRF system stats:', error);
  }
}

/**
 * Check VRF levels and trigger refill if needed
 */
async function checkAndTriggerRefill() {
  try {
    const totalAvailable = await vrfStorage.getVRFCount();
    const refillThreshold = 200 * 0.2; // 20% of 200 = 40 VRF

    console.log(`🔍 Checking VRF levels: ${totalAvailable} available, threshold: ${refillThreshold}`);

    if (totalAvailable < refillThreshold) {
      console.log('⚠️ VRF levels low, triggering refill...');
      
      // Trigger background refill (don't await to avoid blocking the response)
      triggerVRFRefill().catch(error => {
        console.error('❌ Background VRF refill failed:', error);
      });
    }

  } catch (error) {
    console.error('❌ Failed to check VRF levels:', error);
  }
}

/**
 * Trigger VRF refill in background
 */
async function triggerVRFRefill() {
  try {
    // Calculate how many VRF we need to get back to full capacity
    const totalAvailable = await vrfStorage.getVRFCount();
    const targetTotal = 200;
    const needed = targetTotal - totalAvailable;

    if (needed <= 0) {
      console.log('✅ VRF levels are sufficient, no refill needed');
      return;
    }

    console.log(`🔄 Starting VRF refill: need ${needed} more VRF values`);

    // Generate refill requests based on allocation ratios
    const allocation = {
      MINES: Math.floor(needed * 0.24), // 24% for mines (48/200)
      PLINKO: Math.floor(needed * 0.25), // 25% for plinko (50/200)
      ROULETTE: Math.floor(needed * 0.255), // 25.5% for roulette (51/200)
      WHEEL: Math.floor(needed * 0.255) // 25.5% for wheel (51/200)
    };

    // Adjust for rounding errors
    const totalAllocated = Object.values(allocation).reduce((sum, count) => sum + count, 0);
    if (totalAllocated < needed) {
      allocation.ROULETTE += needed - totalAllocated;
    }

    const requests = [];

    // Generate MINES requests
    const minesSubtypes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24'];
    const minesPerSubtype = Math.ceil(allocation.MINES / minesSubtypes.length);
    minesSubtypes.forEach(subtype => {
      for (let i = 0; i < minesPerSubtype && requests.length < allocation.MINES; i++) {
        requests.push({ gameType: 'MINES', gameSubType: subtype });
      }
    });

    // Generate PLINKO requests
    const plinkoSubtypes = ['8', '10', '12', '14', '16'];
    const plinkoPerSubtype = Math.ceil(allocation.PLINKO / plinkoSubtypes.length);
    plinkoSubtypes.forEach(subtype => {
      for (let i = 0; i < plinkoPerSubtype && requests.length < allocation.MINES + allocation.PLINKO; i++) {
        requests.push({ gameType: 'PLINKO', gameSubType: subtype });
      }
    });

    // Generate ROULETTE requests
    for (let i = 0; i < allocation.ROULETTE; i++) {
      requests.push({ gameType: 'ROULETTE', gameSubType: 'standard' });
    }

    // Generate WHEEL requests
    for (let i = 0; i < allocation.WHEEL; i++) {
      requests.push({ gameType: 'WHEEL', gameSubType: 'standard' });
    }

    console.log(`📦 Generated ${requests.length} refill requests:`, {
      MINES: allocation.MINES,
      PLINKO: allocation.PLINKO,
      ROULETTE: allocation.ROULETTE,
      WHEEL: allocation.WHEEL
    });

    // Request VRF in batches
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < requests.length; i += batchSize) {
      batches.push(requests.slice(i, i + batchSize));
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`🔄 Processing refill batch ${i + 1}/${batches.length} (${batch.length} requests)...`);
      
      await vrfManager.requestVRFBatch(batch);

      // Small delay between batches
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    console.log(`✅ VRF refill completed: ${requests.length} new requests submitted`);

  } catch (error) {
    console.error('❌ VRF refill failed:', error);
    throw error;
  }
}