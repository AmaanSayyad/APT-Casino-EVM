const { ethers } = require('ethers');

// Generate a new random wallet for the casino treasury
const treasuryWallet = ethers.Wallet.createRandom();

console.log('🎰 Casino Treasury Wallet Created!');
console.log('=====================================');
console.log('Address:', treasuryWallet.address);
console.log('Private Key:', treasuryWallet.privateKey);
console.log('Mnemonic:', treasuryWallet.mnemonic.phrase);
console.log('=====================================');
console.log('');
console.log('⚠️  IMPORTANT SECURITY NOTES:');
console.log('1. Save this private key securely');
console.log('2. Never share or commit it to git');
console.log('3. Use only for development/testing');
console.log('4. Fund this wallet with Sepolia ETH for testing');
console.log('');
console.log('🔗 Sepolia Faucet: https://sepoliafaucet.com/');
console.log('🔗 Sepolia Explorer: https://sepolia.etherscan.io/');
console.log('');
console.log('📝 Next steps:');
console.log('1. Copy the address above');
console.log('2. Get Sepolia ETH from faucet');
console.log('3. Update treasury config with this address');
console.log('4. Test deposit functionality');
