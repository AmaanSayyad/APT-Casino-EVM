import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  LinearProgress, 
  Typography, 
  Box,
  Paper,
  Chip,
  Divider,
  Grid,
  Card,
  CardContent,
  Snackbar,
  Alert
} from '@mui/material';
import { X, Clock, CheckCircle, AlertCircle, Zap, Database, ExternalLink, Copy } from 'lucide-react';
import ChainlinkVRFService from '../../services/ChainlinkVRFService';
import vrfProofService from '../../services/VRFProofService';

/**
 * VRF Proof Generation Modal
 * Generates real VRF proofs using Chainlink VRF
 */
export default function VRFPregenerationModal({ open, onClose }) {
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [requestIds, setRequestIds] = useState([]);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [proofStats, setProofStats] = useState({});
  const [targetAmount] = useState(200); // Target number of VRF proofs to generate

  // Game proof counts state
  const [gameProofCounts, setGameProofCounts] = useState({
    MINES: { current: 0, target: 50, status: 'pending' },
    PLINKO: { current: 0, target: 50, status: 'pending' },
    ROULETTE: { current: 0, target: 50, status: 'pending' },
    WHEEL: { current: 0, target: 50, status: 'pending' }
  });

  // Initialize VRF service
  const [vrfService] = useState(() => new ChainlinkVRFService());

  // Reset state when modal opens
  useEffect(() => {
    console.log('🔄 VRFPregenerationModal useEffect - isOpen changed:', open);
    if (open) {
      console.log('✅ Modal is opening, resetting state...');
      setStatus('idle');
      setProgress(0);
      setTransactionHash('');
      setRequestIds([]);
      setErrorMessage('');
      loadProofStats();
    } else {
      console.log('❌ Modal is closing');
    }
  }, [open]);

  const loadProofStats = async () => {
    try {
      const stats = await vrfProofService.getProofStats();
      console.log('📊 Current proof stats:', stats);
      
      // Update game proof counts
      setGameProofCounts(prev => ({
        MINES: { ...prev.MINES, current: stats.availableVRFs.MINES || 0 },
        PLINKO: { ...prev.PLINKO, current: stats.availableVRFs.PLINKO || 0 },
        ROULETTE: { ...prev.ROULETTE, current: stats.availableVRFs.ROULETTE || 0 },
        WHEEL: { ...prev.WHEEL, current: stats.availableVRFs.WHEEL || 0 }
      }));

      setProofStats({
        MINES: stats.availableVRFs.MINES || 0,
        PLINKO: stats.availableVRFs.PLINKO || 0,
        ROULETTE: stats.availableVRFs.ROULETTE || 0,
        WHEEL: stats.availableVRFs.WHEEL || 0
      });
    } catch (error) {
      console.error('Error loading proof stats:', error);
    }
  };

  const startVRFPregeneration = async () => {
    try {
      setStatus('generating');
      setProgress(0);
      setErrorMessage('');
      setTransactionHash('');
      setRequestIds([]);

      // Reset game statuses
      setGameProofCounts(prev => ({
        MINES: { ...prev.MINES, status: 'generating' },
        PLINKO: { ...prev.PLINKO, status: 'generating' },
        ROULETTE: { ...prev.ROULETTE, status: 'generating' },
        WHEEL: { ...prev.WHEEL, status: 'generating' }
      }));

      console.log('🚀 Starting VRF pregeneration with Treasury...');

      // Initialize VRF service with treasury
      const initialized = await vrfService.initialize();

      if (!initialized) {
        throw new Error('Failed to initialize VRF service with Treasury');
      }

      // Generate real VRF proofs on blockchain using Treasury
      const result = await vrfService.generateVRFProofs((progress) => {
        setProgress(progress);
        console.log(`📊 Progress update: ${progress}%`);
      });

      console.log('✅ VRF generation completed:', result);

      setTransactionHash(result.transactionHash);
      setRequestIds(result.requestIds);
      setStatus('completed');
      setProgress(100);

      // Update game proof counts with new data
      await loadProofStats();

      // Update game statuses to completed
      setGameProofCounts(prev => ({
        MINES: { ...prev.MINES, status: 'completed' },
        PLINKO: { ...prev.PLINKO, status: 'completed' },
        ROULETTE: { ...prev.ROULETTE, status: 'completed' },
        WHEEL: { ...prev.WHEEL, status: 'completed' }
      }));

      // Show success message
      const proofCount = result.requestIds ? result.requestIds.length : 0;
      setSnackbarMessage(`Successfully generated ${proofCount} VRF proofs using Treasury!`);
      setShowSnackbar(true);

    } catch (error) {
      console.error('❌ VRF pregeneration failed:', error);
      setErrorMessage(error.message || 'An error occurred while creating VRF proofs');
      setStatus('error');
      setProgress(0);

      // Reset game statuses to pending
      setGameProofCounts(prev => ({
        MINES: { ...prev.MINES, status: 'pending' },
        PLINKO: { ...prev.PLINKO, status: 'pending' },
        ROULETTE: { ...prev.ROULETTE, status: 'pending' },
        WHEEL: { ...prev.WHEEL, status: 'pending' }
      }));

      // Show error message
      setSnackbarMessage(`Error: ${error.message}`);
      setShowSnackbar(true);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSnackbarMessage('Copied to clipboard!');
    setShowSnackbar(true);
  };

  const openTransaction = (txHash) => {
    const network = process.env.NEXT_PUBLIC_NETWORK || 'sepolia';
    const explorerUrl = `https://${network}.etherscan.io/tx/${txHash}`;
    window.open(explorerUrl, '_blank');
  };

  const getNetworkInfo = () => {
    const network = process.env.NEXT_PUBLIC_NETWORK || 'sepolia';
    const contractAddress = process.env.NEXT_PUBLIC_VRF_CONTRACT_ADDRESS || '0x1c80757C451adce96d6cADB514036F07fc2347cb';
    const treasuryAddress = process.env.TREASURY_ADDRESS || '0xD599B4a78f602f597973F693439e89A97eDd4369';
    
    return { network, contractAddress, treasuryAddress };
  };

  const handleClose = () => {
    if (status !== 'generating') {
      onClose();
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'generating':
        return <Clock className="animate-spin" size={24} />;
      case 'completed':
        return <CheckCircle size={24} color="#10B981" />;
      case 'error':
        return <AlertCircle size={24} color="#EF4444" />;
      default:
        return <Database size={24} />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'generating':
        return 'Creating VRF Proofs via Chainlink...';
      case 'completed':
        return 'VRF Proofs Successfully Created!';
      case 'error':
        return 'An Error Occurred';
      default:
        return 'VRF Proof System';
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      sx={{
        zIndex: 9999,
        '& .MuiDialog-paper': {
          margin: '32px',
          maxHeight: 'calc(100% - 64px)',
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) !important',
          margin: 0,
        },
        '& .MuiBackdrop-root': {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)',
        }
      }}
      PaperProps={{
        sx: {
          backgroundColor: 'rgba(10, 0, 8, 0.98)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(148, 163, 184, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)',
          background: 'linear-gradient(135deg, rgba(10, 0, 8, 0.98) 0%, rgba(26, 0, 21, 0.98) 100%)',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        color: 'white',
        borderBottom: '1px solid rgba(148, 163, 184, 0.3)',
        background: 'linear-gradient(135deg, rgba(139, 35, 152, 0.1) 0%, rgba(49, 196, 190, 0.1) 100%)',
        borderRadius: '16px 16px 0 0',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {getStatusIcon()}
          <Typography variant="h6" sx={{ 
            color: 'white',
            background: 'linear-gradient(135deg, #8B2398 0%, #31C4BE 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold'
          }}>
            VRF Proof System
          </Typography>
        </Box>
        <Button
          onClick={handleClose}
          disabled={status === 'generating'}
          sx={{ 
            color: 'white', 
            minWidth: 'auto',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }
          }}
        >
          <X size={20} />
        </Button>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ 
            color: 'white', 
            mb: 2,
            textAlign: 'center',
            fontSize: '1.1rem'
          }}>
            {getStatusText()}
          </Typography>
          
          {status === 'idle' && (
            <Paper sx={{ 
              p: 3, 
              background: 'linear-gradient(135deg, rgba(139, 35, 152, 0.1) 0%, rgba(49, 196, 190, 0.1) 100%)',
              border: '1px solid rgba(139, 35, 152, 0.3)',
              borderRadius: '12px',
              mb: 3
            }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 2, fontSize: '1rem' }}>
                <strong>🎯 Treasury Contract System:</strong> When you click this button, a contract will be automatically signed with our treasury address and 200 VRF proofs will be created via Chainlink VRF.
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '1rem' }}>
                <strong>📊 Proof Distribution:</strong> MINES (50), PLINKO (50), ROULETTE (50), WHEEL (50)
              </Typography>
              
              {/* Network Configuration Info */}
              <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(139, 35, 152, 0.2)', borderRadius: '8px' }}>
                <Typography variant="subtitle2" sx={{ color: '#8B2398', mb: 1, fontWeight: 'bold' }}>
                  Network Configuration:
                </Typography>
                {(() => {
                  const { network, contractAddress, treasuryAddress } = getNetworkInfo();
                  return (
                    <Box sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>
                      <div>🌐 Network: {network.toUpperCase()}</div>
                      <div>📋 Contract: {contractAddress.slice(0, 10)}...{contractAddress.slice(-8)}</div>
                      <div>🏦 Treasury: {treasuryAddress.slice(0, 10)}...{treasuryAddress.slice(-8)}</div>
                    </Box>
                  );
                })()}
              </Box>
            </Paper>
          )}
          
          {/* Current Proof Stats */}
          <Paper sx={{ 
            p: 3, 
            background: 'linear-gradient(135deg, rgba(139, 35, 152, 0.1) 0%, rgba(49, 196, 190, 0.1) 100%)',
            border: '1px solid rgba(139, 35, 152, 0.3)',
            borderRadius: '12px',
            mb: 3
          }}>
            <Typography variant="h6" sx={{ 
              color: '#8B2398', 
              mb: 2,
              textAlign: 'center',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #8B2398 0%, #31C4BE 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Current Proof Status
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(proofStats).map(([game, count]) => (
                <Grid item xs={6} sm={3} key={game}>
                  <Card sx={{ 
                    background: 'linear-gradient(135deg, rgba(139, 35, 152, 0.2) 0%, rgba(49, 196, 190, 0.2) 100%)',
                    border: '1px solid rgba(139, 35, 152, 0.4)',
                    borderRadius: '12px',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 25px rgba(139, 35, 152, 0.3)',
                    }
                  }}>
                    <CardContent sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ 
                        color: '#8B2398', 
                        fontWeight: 'bold',
                        background: 'linear-gradient(135deg, #8B2398 0%, #31C4BE 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}>
                        {count}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: 'rgba(255,255,255,0.9)',
                        fontWeight: '500'
                      }}>
                        {game}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
          
          {status === 'generating' && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Progress: {Math.round(progress)}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(139, 35, 152, 0.2)',
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(135deg, #8B2398 0%, #31C4BE 100%)',
                    borderRadius: 4,
                  }
                }}
              />
            </Box>
          )}

          {status === 'completed' && (
            <Paper sx={{ 
              p: 3, 
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(34, 197, 94, 0.1) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <CheckCircle size={20} color="#10B981" />
                <Typography variant="h6" sx={{ color: '#10B981' }}>
                  Success!
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 2, fontSize: '1rem' }}>
                {targetAmount} VRF proofs have been successfully created via Chainlink VRF!
              </Typography>
              
              {/* Transaction Details */}
              {transactionHash && (
                <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
                  <Typography variant="subtitle2" sx={{ color: '#10B981', mb: 1, fontWeight: 'bold' }}>
                    Transaction Details:
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', mb: 1 }}>
                      <strong>Multiple Transactions:</strong> VRF proofs were generated across 4 separate transactions:
                    </Typography>
                    {requestIds && requestIds.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        {(() => {
                          // Get unique transaction hashes from the VRF service
                          const vrfService = new ChainlinkVRFService();
                          const uniqueHashes = vrfService.transactionHashes || [];
                          
                          return uniqueHashes.map((hash, index) => (
                            <Box key={index} sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 1, 
                              mb: 1,
                              p: 1,
                              bgcolor: 'rgba(16, 185, 129, 0.05)',
                              borderRadius: '4px'
                            }}>
                              <Typography variant="body2" sx={{ 
                                color: 'rgba(255,255,255,0.8)', 
                                fontSize: '0.8rem',
                                minWidth: '60px'
                              }}>
                                TX {index + 1}:
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: 'rgba(255,255,255,0.8)', 
                                fontSize: '0.8rem',
                                fontFamily: 'monospace'
                              }}>
                                {hash.slice(0, 10)}...{hash.slice(-8)}
                              </Typography>
                              <Button
                                size="small"
                                onClick={() => copyToClipboard(hash)}
                                sx={{ minWidth: 'auto', p: 0.5, color: '#10B981' }}
                              >
                                <Copy size={14} />
                              </Button>
                              <Button
                                size="small"
                                onClick={() => openTransaction(hash)}
                                sx={{ minWidth: 'auto', p: 0.5, color: '#10B981' }}
                              >
                                <ExternalLink size={14} />
                              </Button>
                            </Box>
                          ));
                        })()}
                      </Box>
                    )}
                  </Box>
                </Box>
              )}

              {/* Request IDs Summary */}
              {requestIds && requestIds.length > 0 && (
                <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
                  <Typography variant="subtitle2" sx={{ color: '#10B981', mb: 1, fontWeight: 'bold' }}>
                    VRF Request IDs Generated: {requestIds ? requestIds.length : 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>
                    These proofs are now stored locally and will be available for games.
                  </Typography>
                </Box>
              )}
              
              <Divider sx={{ my: 2, borderColor: 'rgba(16, 185, 129, 0.3)' }} />
              
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 2, fontSize: '1rem' }}>
                <strong>How it works:</strong>
              </Typography>
              <Box sx={{ pl: 2 }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1, fontSize: '0.9rem' }}>
                  • 200 VRF proofs requested via Chainlink VRF contract
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1, fontSize: '0.9rem' }}>
                  • Proofs stored locally for immediate game use
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 1, fontSize: '0.9rem' }}>
                  • When a game is played, a proof is consumed and shown to user
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
                  • Automatic refill when any game type drops below 25 proofs
                </Typography>
              </Box>
            </Paper>
          )}

          {status === 'error' && (
            <Paper sx={{ 
              p: 3, 
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <AlertCircle size={20} color="#EF4444" />
                <Typography variant="h6" sx={{ color: '#EF4444' }}>
                  Error!
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '1rem', mb: 2 }}>
                An error occurred while creating VRF proofs:
              </Typography>
              {errorMessage && (
                <Box sx={{ p: 2, bgcolor: 'rgba(239, 68, 68, 0.2)', borderRadius: '8px', mb: 2 }}>
                  <Typography variant="body2" sx={{ color: '#EF4444', fontSize: '0.9rem', fontFamily: 'monospace' }}>
                    {errorMessage}
                  </Typography>
                </Box>
              )}
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
                Please check your wallet connection and try again. Make sure you have enough ETH for gas fees.
              </Typography>
            </Paper>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        {status === 'idle' && (
          <Button
            onClick={startVRFPregeneration}
            variant="contained"
            startIcon={<Zap size={20} />}
            sx={{
              background: 'linear-gradient(135deg, #8B2398 0%, #31C4BE 100%)',
              color: 'white',
              fontWeight: 'bold',
              '&:hover': {
                background: 'linear-gradient(135deg, #7C1F87 0%, #2BA8A3 100%)',
              },
              borderRadius: '25px',
              px: 4,
              py: 1.5
            }}
          >
            Create VRF Proofs ({targetAmount})
          </Button>
        )}
        
        {status === 'completed' && (
          <Button
            onClick={handleClose}
            variant="outlined"
            sx={{
              color: '#10B981',
              borderColor: '#10B981',
              borderRadius: '25px',
              px: 4,
              py: 1.5
            }}
          >
            Close
          </Button>
        )}

        {status === 'error' && (
          <Button
            onClick={() => setStatus('idle')}
            variant="outlined"
            sx={{
              color: '#EF4444',
              borderColor: '#EF4444',
              borderRadius: '25px',
              px: 4,
              py: 1.5
            }}
          >
            Try Again
          </Button>
        )}
      </DialogActions>

      <Snackbar
        open={showSnackbar}
        autoHideDuration={6000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={() => setShowSnackbar(false)} severity="success" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}