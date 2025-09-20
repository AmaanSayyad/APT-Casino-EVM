import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('userAddress');
    
    console.log('📊 VRF User Status Request:', { userAddress });
    
    // Validate input
    if (!userAddress) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User address is required' 
        },
        { status: 400 }
      );
    }

    // For now, return mock data since we don't have a database yet
    // In production, this would query the actual VRF database
    const mockVRFData = {
      totalVRF: 0, // No VRF proofs initially
      vrfCounts: {
        ROULETTE: 0,
        MINES: 0,
        PLINKO: 0,
        WHEEL: 0
      },
      lastGenerated: null,
      isGenerating: false
    };

    console.log('📊 Returning VRF status:', mockVRFData);

    return NextResponse.json({
      success: true,
      data: mockVRFData
    });
    
  } catch (error) {
    console.error('❌ VRF User Status API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

