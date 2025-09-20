const { ethers } = require("hardhat");
require('dotenv').config({ path: '.env.local' });

const VRF_CONFIG = {
  CONSUMER_ADDRESS: process.env.NEXT_PUBLIC_VRF_CONTRACT_ADDRESS,
  KEY_HASH: process.env.VRF_KEY_HASH,
  CALLBACK_GAS_LIMIT: 100000, // Optimized for Arbitrum Sepolia
  REQUEST_CONFIRMATIONS: 1, // Minimal confirmations for testnet
  TREASURY_PRIVATE_KEY: process.env.TREASURY_PRIVATE_KEY,
  RPC_URL: process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC,
};

const VRF_CONSUMER_ABI = [
  "function updateVRFConfig(bytes32 newKeyHash, uint32 newCallbackGasLimit, uint16 newRequestConfirmations) external",
  "function keyHash() view returns (bytes32)",
  "function callbackGasLimit() view returns (uint32)",
  "function requestConfirmations() view returns (uint16)",
];

async function main() {
  console.log("⚡ Optimizing VRF Gas Settings for Arbitrum Sepolia...");

  const provider = new ethers.JsonRpcProvider(VRF_CONFIG.RPC_URL);
  const signer = new ethers.Wallet(VRF_CONFIG.TREASURY_PRIVATE_KEY, provider);

  console.log("Using account:", signer.address);
  console.log("Account balance:", ethers.formatEther(await provider.getBalance(signer.address)), "ARB ETH");

  const vrfConsumer = new ethers.Contract(VRF_CONFIG.CONSUMER_ADDRESS, VRF_CONSUMER_ABI, signer);

  // Check current settings
  const currentKeyHash = await vrfConsumer.keyHash();
  const currentCallbackGasLimit = await vrfConsumer.callbackGasLimit();
  const currentRequestConfirmations = await vrfConsumer.requestConfirmations();

  console.log("\n📋 Current VRF Configuration:");
  console.log("  - Key Hash:", currentKeyHash);
  console.log("  - Callback Gas Limit:", currentCallbackGasLimit.toString());
  console.log("  - Request Confirmations:", currentRequestConfirmations.toString());

  console.log("\n⚡ Optimizing VRF configuration...");
  console.log("  - New Callback Gas Limit: 100,000 (was 2,500,000)");
  console.log("  - Request Confirmations: 1 (minimal for testnet)");

  const updateTx = await vrfConsumer.updateVRFConfig(
    VRF_CONFIG.KEY_HASH,
    VRF_CONFIG.CALLBACK_GAS_LIMIT,
    VRF_CONFIG.REQUEST_CONFIRMATIONS
  );
  
  console.log("Transaction hash:", updateTx.hash);
  await updateTx.wait();
  console.log("✅ VRF configuration optimized!");

  // Verify new settings
  const newKeyHash = await vrfConsumer.keyHash();
  const newCallbackGasLimit = await vrfConsumer.callbackGasLimit();
  const newRequestConfirmations = await vrfConsumer.requestConfirmations();

  console.log("\n📋 Optimized VRF Configuration:");
  console.log("  - Key Hash:", newKeyHash);
  console.log("  - Callback Gas Limit:", newCallbackGasLimit.toString());
  console.log("  - Request Confirmations:", newRequestConfirmations.toString());

  console.log("\n💰 Gas Savings:");
  console.log(`  - Callback Gas: ${currentCallbackGasLimit.toString()} → ${newCallbackGasLimit.toString()}`);
  console.log(`  - Savings: ${(parseInt(currentCallbackGasLimit) - parseInt(newCallbackGasLimit)).toLocaleString()} gas units`);
  console.log(`  - Estimated cost reduction: ~${Math.round((parseInt(currentCallbackGasLimit) - parseInt(newCallbackGasLimit)) / 1000)}%`);

  console.log("\n🎉 VRF Gas Optimization Complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

