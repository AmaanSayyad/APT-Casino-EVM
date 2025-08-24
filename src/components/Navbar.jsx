import React, { useState } from 'react';
import { AppBar, Toolbar, Container, Box, Button, Typography } from '@mui/material';
import { Play, Zap } from 'lucide-react';
import NetworkSwitcher from './NetworkSwitcher';
import VRFPregenerationModal from './VRF/VRFPregenerationModal';
import { useVRFPregeneration } from '../hooks/useVRFPregeneration';
import { useAccount } from 'wagmi';

const Navbar = () => {
  const { address, isConnected } = useAccount();
  const [showVRFModal, setShowVRFModal] = useState(false);
  const { vrfStatus, generateVRFBatch, isGenerating } = useVRFPregeneration();

  const handleVRFButtonClick = () => {
    if (isConnected && address) {
      setShowVRFModal(true);
    }
  };

  const handleVRFModalClose = () => {
    setShowVRFModal(false);
  };

  const handleGenerateVRF = async () => {
    if (address) {
      await generateVRFBatch(address);
    }
  };

  return (
    <>
      <AppBar position="fixed" sx={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(10px)' }}>
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6" component="div" sx={{ color: 'white', fontWeight: 'bold' }}>
                APT Casino
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {isConnected && (
                <Button
                  variant="contained"
                  startIcon={<Zap size={20} />}
                  onClick={handleVRFButtonClick}
                  sx={{
                    backgroundColor: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
                    color: 'white',
                    fontWeight: 'bold',
                    '&:hover': {
                      backgroundColor: 'linear-gradient(45deg, #FF5252, #26A69A)',
                    },
                    borderRadius: '25px',
                    px: 3,
                    py: 1
                  }}
                >
                  VRF Proof
                </Button>
              )}
              <NetworkSwitcher />
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* VRF Modal */}
      <VRFPregenerationModal
        isOpen={showVRFModal}
        onClose={handleVRFModalClose}
        userAddress={address}
        vrfStatus={vrfStatus}
        onGenerateVRF={handleGenerateVRF}
        isGenerating={isGenerating}
      />
    </>
  );
};

export default Navbar; 