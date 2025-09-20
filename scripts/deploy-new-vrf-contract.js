const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying New VRF Contract with Correct Configuration...");

  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Arbitrum Sepolia VRF Configuration
  const VRF_CONFIG = {
    COORDINATOR: "0x50d47e4142598E3411aA864e08a44284e471AC6f", // Correct Arbitrum Sepolia VRF Coordinator
    KEY_HASH: "0x027f94ff1465b3525f9fc03e9ff7d6d2c0953482246dd6ae07570c45d6631414", // Correct Arbitrum Sepolia Key Hash
    SUBSCRIPTION_ID: "0", // Will be set later
    CALLBACK_GAS_LIMIT: 2500000,
    REQUEST_CONFIRMATIONS: 1, // Arbitrum Sepolia uses 1 confirmation
  };

  const treasuryAddress = process.env.TREASURY_ADDRESS || "0xb424d2369F07b925D1218B08e56700AF5928287b";

  try {
    console.log("\n📋 VRF Configuration:");
    console.log("  - Coordinator:", VRF_CONFIG.COORDINATOR);
    console.log("  - Key Hash:", VRF_CONFIG.KEY_HASH);
    console.log("  - Treasury:", treasuryAddress);

    // Deploy VRF Consumer
    console.log("\n🚀 Deploying CasinoVRFConsumer...");
    const CasinoVRFConsumer = await ethers.getContractFactory("CasinoVRFConsumer");
    
    const vrfConsumer = await CasinoVRFConsumer.deploy(
      VRF_CONFIG.SUBSCRIPTION_ID,
      VRF_CONFIG.COORDINATOR,
      VRF_CONFIG.KEY_HASH,
      treasuryAddress
    );

    await vrfConsumer.waitForDeployment();
    const vrfConsumerAddress = await vrfConsumer.getAddress();

    console.log("✅ CasinoVRFConsumer deployed!");
    console.log("📋 Contract Address:", vrfConsumerAddress);

    // Verify deployment
    const contractInfo = await vrfConsumer.getContractInfo();
    console.log("\n📋 Contract Info:");
    console.log("  - Contract Address:", contractInfo.contractAddress);
    console.log("  - Treasury Address:", contractInfo.treasuryAddress);
    console.log("  - Subscription ID:", contractInfo.subscriptionId.toString());

    console.log("\n🎉 VRF Contract Deployment Complete!");
    console.log("=====================================");
    console.log("Contract Address:", vrfConsumerAddress);
    console.log("Treasury Address:", treasuryAddress);
    console.log("VRF Coordinator:", VRF_CONFIG.COORDINATOR);
    console.log("Key Hash:", VRF_CONFIG.KEY_HASH);
    console.log("=====================================");

    console.log("\n📝 Update your .env.local file:");
    console.log(`NEXT_PUBLIC_VRF_CONTRACT_ADDRESS=${vrfConsumerAddress}`);

  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


