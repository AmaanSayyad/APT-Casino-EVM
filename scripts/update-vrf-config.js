const fs = require('fs');
const path = require('path');

// Update .env.local with correct VRF configuration
const envPath = path.join(__dirname, '..', '.env.local');

try {
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Update VRF Coordinator
  envContent = envContent.replace(
    /VRF_COORDINATOR=.*/,
    'VRF_COORDINATOR=0x50d47e4142598E3411aA864e08a44284e471AC6f'
  );
  
  // Update Key Hash
  envContent = envContent.replace(
    /VRF_KEY_HASH=.*/,
    'VRF_KEY_HASH=0x027f94ff1465b3525f9fc03e9ff7d6d2c0953482246dd6ae07570c45d6631414'
  );
  
  // Reset subscription ID
  envContent = envContent.replace(
    /VRF_SUBSCRIPTION_ID=.*/,
    'VRF_SUBSCRIPTION_ID=0'
  );
  
  // Add LINK token address
  if (!envContent.includes('LINK_TOKEN_ADDRESS')) {
    envContent += '\n# ===========================================\n';
    envContent += '# LINK TOKEN CONFIGURATION\n';
    envContent += '# ===========================================\n';
    envContent += 'LINK_TOKEN_ADDRESS=0xb1D4538B4571d411F07960EF2838Ce337FE1E80E\n';
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env.local updated with correct VRF configuration');
  console.log('📋 New VRF Coordinator: 0x50d47e4142598E3411aA864e08a44284e471AC6f');
  console.log('🔑 New Key Hash: 0x027f94ff1465b3525f9fc03e9ff7d6d2c0953482246dd6ae07570c45d6631414');
  console.log('🪙 LINK Token: 0xb1D4538B4571d411F07960EF2838Ce337FE1E80E');
  
} catch (error) {
  console.error('❌ Error updating .env.local:', error.message);
}


