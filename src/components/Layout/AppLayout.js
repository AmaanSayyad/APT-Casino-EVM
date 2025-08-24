import React from 'react';
import { useAccount } from 'wagmi';
import WalletConnectionHandler from '../Wallet/WalletConnectionHandler';
import { useVRFPregeneration } from '../../hooks/useVRFPregeneration';
import VRFStatusModal from '../VRF/VRFStatusModal';

/**
 * Main App Layout
 * Wraps the entire app with wallet connection handling
 */
const AppLayout = ({ children }) => {
  const { address, isConnected } = useAccount();
  const {
    vrfStatus,
    totalVRF,
    isGenerating,
    showModal,
    openModal,
    closeModal,
    generateVRFBatch,
    canPlayGame
  } = useVRFPregeneration();
  
  return (
    <WalletConnectionHandler>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">APT Casino</h1>
              </div>
              <div className="flex items-center space-x-4">
                {/* VRF Status Button */}
                <button
                  onClick={openModal}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  VRF Status
                </button>
                {/* Wallet Connection */}
                <div className="text-sm text-gray-600">
                  {isConnected ? (
                    <span className="text-green-600">
                      ✅ {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                  ) : (
                    <span className="text-red-600">❌ Not Connected</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>

        {/* VRF Status Modal */}
        <VRFStatusModal
          open={showModal}
          onClose={closeModal}
          vrfStatus={vrfStatus}
          onGenerate={generateVRFBatch}
          isGenerating={isGenerating}
        />
      </div>
    </WalletConnectionHandler>
  );
};

export default AppLayout;