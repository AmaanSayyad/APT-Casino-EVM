import React from 'react';
import { CheckCircle, Clock, ExternalLink, AlertCircle, RefreshCw, X } from 'lucide-react';

/**
 * VRF Status Modal
 * Shows current VRF status and allows manual generation/update
 */
const VRFStatusModal = ({ 
  isOpen, 
  onClose, 
  userAddress,
  vrfStatus,
  onGenerateVRF,
  isGenerating
}) => {
  console.log('🔍 VRF Modal render:', { isOpen, userAddress, vrfStatus });
  
  if (!isOpen) return null;

  // Calculate game allocation from VRF status
  const gameAllocation = {
    ROULETTE: { 
      allocated: vrfStatus?.availableVRFs?.ROULETTE || 0, 
      target: 51 
    },
    MINES: { 
      allocated: vrfStatus?.availableVRFs?.MINES || 0, 
      target: 48 
    },
    PLINKO: { 
      allocated: vrfStatus?.availableVRFs?.PLINKO || 0, 
      target: 50 
    },
    WHEEL: { 
      allocated: vrfStatus?.availableVRFs?.WHEEL || 0, 
      target: 51 
    }
  };

  const totalVRF = vrfStatus?.totalGenerated || 0;
  const hasVRF = totalVRF > 0;
  const isReady = vrfStatus?.isReady && !isGenerating;

  const getStatusIcon = () => {
    if (isGenerating) {
      return <RefreshCw className="animate-spin text-blue-600" size={24} />;
    }
    if (vrfStatus?.error) {
      return <AlertCircle className="text-red-600" size={24} />;
    }
    if (hasVRF) {
      return <CheckCircle className="text-green-600" size={24} />;
    }
    return <Clock className="text-yellow-600" size={24} />;
  };

  const getStatusText = () => {
    if (isGenerating) {
      return 'Generating VRF batch...';
    }
    if (vrfStatus?.error) {
      return 'VRF Error';
    }
    if (hasVRF) {
      return 'VRF Ready';
    }
    return 'No VRF Available';
  };

  const getStatusColor = () => {
    if (isGenerating) return 'text-blue-600';
    if (vrfStatus?.error) return 'text-red-600';
    if (hasVRF) return 'text-green-600';
    return 'text-yellow-600';
  };

  const handleGenerateVRF = () => {
    if (onGenerateVRF && !isGenerating) {
      onGenerateVRF();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center modal-backdrop" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  🎲 VRF Proofs Status
                </h2>
                <p className="text-sm text-gray-600">
                  Provably fair gaming proofs
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Status */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </span>
              {hasVRF && (
                <span className="text-sm text-gray-500">
                  {totalVRF}/200 VRF
                </span>
              )}
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  vrfStatus?.error ? 'bg-red-500' :
                  hasVRF ? 'bg-green-500' :
                  isGenerating ? 'bg-blue-500' :
                  'bg-gray-300'
                }`}
                style={{ width: `${Math.min((totalVRF / 200) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* VRF Count Display */}
          <div className="mb-6">
            <div className="text-center">
              <div className={`text-3xl font-bold mb-1 ${getStatusColor()}`}>
                {totalVRF}
              </div>
              <div className="text-sm text-gray-600">
                Total VRF Available
              </div>
            </div>
          </div>

          {/* Game Allocation */}
          {hasVRF && (
            <div className="space-y-3 mb-6">
              <h4 className="text-sm font-medium text-gray-700">Game Allocation:</h4>
              {Object.entries(gameAllocation).map(([gameType, allocation]) => {
                const progress = (allocation.allocated / allocation.target) * 100;
                const gameEmojis = {
                  ROULETTE: '🎰',
                  MINES: '💣',
                  PLINKO: '🏀',
                  WHEEL: '🎡'
                };
                
                return (
                  <div key={gameType} className="flex items-center gap-3">
                    <span className="text-lg">{gameEmojis[gameType]}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="capitalize">{gameType.toLowerCase()}</span>
                        <span>{allocation.allocated}/{allocation.target}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="h-1.5 bg-blue-500 rounded-full transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Error State */}
          {vrfStatus?.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-red-600 mt-0.5" size={16} />
                <div className="flex-1">
                  <p className="text-red-800 font-medium mb-2">VRF Error</p>
                  <div className="text-red-700 text-sm whitespace-pre-line">
                    {vrfStatus.error}
                  </div>
                  {vrfStatus.error.includes('Treasury needs more ARB ETH funds') && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-800 font-medium text-sm mb-1">💡 Quick Fix:</p>
                      <p className="text-yellow-700 text-xs">
                        1. Fund the treasury wallet with ARB ETH<br/>
                        2. Wait for confirmation<br/>
                        3. Try generating VRF proofs again
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* No VRF State */}
          {!hasVRF && !isGenerating && !vrfStatus?.error && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Clock className="text-yellow-600 mt-0.5" size={16} />
                <div>
                  <p className="text-yellow-800 font-medium mb-1">No VRF Available</p>
                  <p className="text-yellow-700 text-sm">
                    You need to generate VRF values to play games. Click "Generate VRF" to start.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Generating State */}
          {isGenerating && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <RefreshCw className="text-blue-600 mt-0.5 animate-spin" size={16} />
                <div>
                  <p className="text-blue-800 font-medium mb-1">Generating VRF</p>
                  <p className="text-blue-700 text-sm">
                    Please wait while we generate 200 provably fair random numbers for your games.
                    This may take a few minutes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success State */}
          {hasVRF && !isGenerating && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-green-600" size={20} />
                <div>
                  <p className="text-green-800 font-medium">Ready to Play!</p>
                  <p className="text-green-700 text-sm">
                    {totalVRF} provably fair random numbers are ready for your games.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Last Updated */}
          {vrfStatus?.lastChecked && (
            <div className="text-center text-xs text-gray-500 mb-4">
              Last updated: {new Date(vrfStatus.lastChecked).toLocaleString()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex gap-3">
            {!hasVRF || totalVRF < 50 ? (
              <button
                onClick={handleGenerateVRF}
                disabled={isGenerating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="inline-block animate-spin mr-2" size={16} />
                    Creating Proofs...
                  </>
                ) : (
                  '🎲 Create VRF Proofs'
                )}
              </button>
            ) : (
              <button
                onClick={handleGenerateVRF}
                disabled={isGenerating}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="inline-block animate-spin mr-2" size={16} />
                    Updating Proofs...
                  </>
                ) : (
                  '🔄 Update VRF Proofs'
                )}
              </button>
            )}
            
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
          
          <div className="text-center mt-3">
            <p className="text-xs text-gray-500">
              🔒 All VRF values are generated using Chainlink VRF for provably fair gaming
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VRFStatusModal;