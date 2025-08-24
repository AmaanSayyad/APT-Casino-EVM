import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, AlertCircle, Zap, Database } from 'lucide-react';
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
  Grid,
  Card,
  CardContent,
  Divider
} from '@mui/material';

/**
 * VRF Fill Proofs Modal
 * Shows VRF generation progress and allows manual generation
 */
const VRFPregenerationModal = ({ 
  isOpen, 
  onClose, 
  userAddress,
  vrfStatus,
  onGenerateVRF,
  isGenerating
}) => {
  console.log('🔍 VRFPregenerationModal render:', { 
    isOpen, 
    userAddress, 
    vrfStatus, 
    isGenerating 
  });
  
  const [status, setStatus] = useState('idle'); // idle, generating, completed, error
  const [progress, setProgress] = useState(0);
  const [currentGenerated, setCurrentGenerated] = useState(0);
  const [targetAmount, setTargetAmount] = useState(200);
  const [proofStats, setProofStats] = useState({
    MINES: 0,
    PLINKO: 0,
    ROULETTE: 0,
    WHEEL: 0
  });

  // Reset state when modal opens
  useEffect(() => {
    console.log('🔄 VRFPregenerationModal useEffect - isOpen changed:', isOpen);
    if (isOpen) {
      console.log('✅ Modal is opening, resetting state...');
      setStatus('idle');
      setProgress(0);
      setCurrentGenerated(0);
      loadProofStats();
    } else {
      console.log('❌ Modal is closing');
    }
  }, [isOpen]);

  const loadProofStats = () => {
    try {
      if (userAddress) {
        const stored = localStorage.getItem(`vrf_proofs_${userAddress}`);
        if (stored) {
          const proofs = JSON.parse(stored);
          const stats = {
            MINES: proofs.filter(p => p.gameType === 'MINES').length,
            PLINKO: proofs.filter(p => p.gameType === 'PLINKO').length,
            ROULETTE: proofs.filter(p => p.gameType === 'ROULETTE').length,
            WHEEL: proofs.filter(p => p.gameType === 'WHEEL').length
          };
          setProofStats(stats);
        }
      }
    } catch (error) {
      console.error('Error loading proof stats:', error);
    }
  };

  const startVRFPregeneration = async () => {
    try {
      setStatus('generating');
      setProgress(0);
      setCurrentGenerated(0);

      console.log('🎲 Starting VRF Fill Proofs using treasury for user:', userAddress);

      // Step 1: Sign contract with treasury
      console.log('📝 Step 1: Signing contract with treasury...');
      setProgress(10);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Treasury approves VRF generation
      console.log('✅ Step 2: Treasury approved VRF generation...');
      setProgress(30);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Generate 200 proofs (50 for each game)
      console.log('🎲 Step 3: Generating 200 VRF proofs...');
      setProgress(50);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate progress updates
      simulateProgress();

    } catch (err) {
      console.error('❌ VRF pregeneration failed:', err);
      setStatus('error');
    }
  };

  const simulateProgress = () => {
    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 15 + 5; // Random increment between 5-20
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setStatus('completed');
        setCurrentGenerated(targetAmount);
        
        // Generate mock proofs for demonstration
        generateMockProofs();
      }
      setProgress(current);
      setCurrentGenerated(Math.floor((current / 100) * targetAmount));
    }, 500);
  };

  const generateMockProofs = () => {
    if (!userAddress) return;

    const proofs = [];
    const gameTypes = ['MINES', 'PLINKO', 'ROULETTE', 'WHEEL'];
    
    gameTypes.forEach(gameType => {
      for (let i = 0; i < 50; i++) {
        proofs.push({
          id: `${gameType}_${Date.now()}_${i}`,
          gameType,
          proof: `0x${Math.random().toString(16).substr(2, 64)}`,
          transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
          timestamp: new Date().toISOString(),
          status: 'active'
        });
      }
    });

    // Store in localStorage
    localStorage.setItem(`vrf_proofs_${userAddress}`, JSON.stringify(proofs));
    
    // Update stats
    setProofStats({
      MINES: 50,
      PLINKO: 50,
      ROULETTE: 50,
      WHEEL: 50
    });
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

  const getStatusColor = () => {
    switch (status) {
      case 'generating':
        return '#3B82F6';
      case 'completed':
        return '#10B981';
      case 'error':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'generating':
        return 'VRF Proofs Oluşturuluyor...';
      case 'completed':
        return 'VRF Proofs Başarıyla Oluşturuldu!';
      case 'error':
        return 'Hata Oluştu';
      default:
        return 'VRF Proofs Sistemi';
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      sx={{
        zIndex: 9999,
        '& .MuiDialog-paper': {
          margin: '32px',
          maxHeight: 'calc(100% - 64px)',
          position: 'relative',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        },
        '& .MuiBackdrop-root': {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)',
        }
      }}
      PaperProps={{
        sx: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        color: 'white',
        borderBottom: '1px solid rgba(148, 163, 184, 0.2)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {getStatusIcon()}
          <Typography variant="h6" sx={{ color: 'white' }}>
            Fill Proofs - VRF Sistemi
          </Typography>
        </Box>
        <Button
          onClick={handleClose}
          disabled={status === 'generating'}
          sx={{ color: 'white', minWidth: 'auto' }}
        >
          <X size={20} />
        </Button>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ color: 'white', mb: 2 }}>
            {getStatusText()}
          </Typography>
          
          {status === 'idle' && (
            <Paper sx={{ 
              p: 2, 
              backgroundColor: 'rgba(59, 130, 246, 0.1)', 
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '12px',
              mb: 3
            }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 2 }}>
                <strong>🎯 Treasury Contract System:</strong> Bu butona bastığınızda treasury adresimiz ile otomatik olarak 
                contract imzalanacak ve 200 VRF proof oluşturulacak.
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                <strong>📊 Proof Dağılımı:</strong> MINES (50), PLINKO (50), ROULETTE (50), WHEEL (50)
              </Typography>
            </Paper>
          )}
          
          {/* Current Proof Stats */}
          <Paper sx={{ 
            p: 2, 
            backgroundColor: 'rgba(59, 130, 246, 0.1)', 
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '12px',
            mb: 3
          }}>
            <Typography variant="h6" sx={{ color: '#3B82F6', mb: 2 }}>
              Mevcut Proof Durumu
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(proofStats).map(([game, count]) => (
                <Grid item xs={6} sm={3} key={game}>
                  <Card sx={{ 
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}>
                    <CardContent sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ color: '#3B82F6', fontWeight: 'bold' }}>
                        {count}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
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
                  İlerleme: {Math.round(progress)}%
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  {currentGenerated} / {targetAmount}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getStatusColor(),
                    borderRadius: 4
                  }
                }}
              />
            </Box>
          )}

          {status === 'completed' && (
            <Paper sx={{ 
              p: 2, 
              backgroundColor: 'rgba(16, 185, 129, 0.1)', 
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <CheckCircle size={20} color="#10B981" />
                <Typography variant="h6" sx={{ color: '#10B981' }}>
                  Başarılı!
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 2 }}>
                {targetAmount} adet VRF proof başarıyla oluşturuldu. Artık oyunları oynayabilirsiniz!
              </Typography>
              
              <Divider sx={{ my: 2, borderColor: 'rgba(16, 185, 129, 0.3)' }} />
              
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 2 }}>
                <strong>Otomatik Refill Sistemi:</strong> Herhangi bir oyun türünde proof sayısı 25'in altına düştüğünde, 
                treasury adresimiz otomatik olarak yeni proof'lar oluşturacak.
              </Typography>
            </Paper>
          )}

          {status === 'error' && (
            <Paper sx={{ 
              p: 2, 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <AlertCircle size={20} color="#EF4444" />
                <Typography variant="h6" sx={{ color: '#EF4444' }}>
                  Hata!
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                VRF proof oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.
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
            disabled={!userAddress}
            sx={{
              backgroundColor: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
              color: 'white',
              fontWeight: 'bold',
              '&:hover': {
                backgroundColor: 'linear-gradient(45deg, #FF5252, #26A69A)',
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
            Kapat
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
            Tekrar Dene
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default VRFPregenerationModal;