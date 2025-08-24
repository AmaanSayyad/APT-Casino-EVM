import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography } from '@mui/material';
import { Shield, AlertTriangle, ExternalLink } from 'lucide-react';

const VRFProofRequiredModal = ({ open, onClose, gameType, onGenerateProofs }) => {
  const gameNames = {
    'PLINKO': 'Plinko',
    'ROULETTE': 'Roulette',
    'MINES': 'Mines',
    'WHEEL': 'Wheel'
  };

  const gameName = gameNames[gameType] || gameType;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #1A0015 0%, #120010 100%)',
          border: '2px solid rgba(139, 35, 152, 0.5)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
          position: 'relative',
          overflow: 'hidden'
        }
      }}
    >
      {/* Gradient Border Effect */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #8B2398 0%, #31C4BE 50%, #8B2398 100%)',
          backgroundSize: '200% 100%',
          animation: 'gradientShift 3s ease-in-out infinite',
          '@keyframes gradientShift': {
            '0%': { backgroundPosition: '200% 0' },
            '100%': { backgroundPosition: '-200% 0' }
          }
        }}
      />

      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, rgba(139, 35, 152, 0.2) 0%, rgba(49, 196, 190, 0.2) 100%)',
          borderBottom: '1px solid rgba(139, 35, 152, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          color: 'white',
          fontWeight: 'bold'
        }}
      >
        <Shield size={24} style={{ color: '#8B2398' }} />
        VRF Proofs Required
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <AlertTriangle size={64} style={{ color: '#EF4444', margin: '0 auto 16px' }} />
          
          <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 'bold' }}>
            Cannot Play {gameName} Without VRF Proofs
          </Typography>
          
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)', mb: 3, lineHeight: 1.6 }}>
            To ensure fair and provably random gameplay, {gameName} requires VRF (Verifiable Random Function) proofs. 
            These proofs are generated on-chain using Chainlink VRF and provide cryptographic guarantees of randomness.
          </Typography>

          <Box sx={{ 
            p: 2, 
            bgcolor: 'rgba(139, 35, 152, 0.1)', 
            borderRadius: '8px',
            border: '1px solid rgba(139, 35, 152, 0.3)',
            mb: 3
          }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: '500' }}>
              <strong>What are VRF Proofs?</strong>
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 1, fontSize: '0.9rem' }}>
              • Cryptographically secure random numbers generated on Ethereum blockchain<br/>
              • Verifiable by anyone to ensure fairness<br/>
              • Each game consumes one proof for provably fair results<br/>
              • Generated in batches of 200 proofs per game type
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ color: '#10B981', fontWeight: '500' }}>
            Generate VRF proofs to start playing {gameName}!
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 2, justifyContent: 'center' }}>
        <Button
          onClick={onClose}
          sx={{
            color: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.3)',
            '&:hover': {
              border: '1px solid rgba(255,255,255, 0.5)',
              bgcolor: 'rgba(255,255,255,0.1)'
            }
          }}
        >
          Cancel
        </Button>
        
        <Button
          onClick={onGenerateProofs}
          sx={{
            background: 'linear-gradient(135deg, #8B2398 0%, #31C4BE 100%)',
            color: 'white',
            px: 3,
            py: 1.5,
            fontWeight: 'bold',
            '&:hover': {
              background: 'linear-gradient(135deg, #7C1F87 0%, #2BA8A3 100%)',
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 25px rgba(139, 35, 152, 0.4)'
            },
            transition: 'all 0.3s ease'
          }}
        >
          Generate VRF Proofs
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VRFProofRequiredModal;
