const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Arbitrum Sepolia VRF Configuration
const ARBITRUM_SEPOLIA_VRF_CONFIG = {
  COORDINATOR: "0x6D80646bEAdd07cE68cab36c27c626790bBcf17f", // Arbitrum Sepolia VRF Coordinator
  KEY_HASH: "0x83d1b6e3388bed3d76426974512bb0d270e9542a765cd667242ea26c0cc0b730", // 500 gwei key hash
  CALLBACK_GAS_LIMIT: 2500000,
  REQUEST_CONFIRMATIONS: 3
};

async function main() {
  console.log("🚀 Deploying CasinoVRFConsumer to Arbitrum Sepolia...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Get treasury address from environment or use deployer
  const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
  console.log("Treasury address:", treasuryAddress);

  // You need to create a VRF subscription first
  // Go to https://vrf.chain.link/ and create a subscription for Arbitrum Sepolia
  const subscriptionId = process.env.VRF_SUBSCRIPTION_ID;
  
  if (!subscriptionId) {
    console.log("❌ VRF_SUBSCRIPTION_ID not found in environment variables!");
    console.log("📝 Please follow these steps:");
    console.log("1. Go to https://vrf.chain.link/");
    console.log("2. Connect your wallet");
    console.log("3. Switch to Arbitrum Sepolia network");
    console.log("4. Create a new subscription");
    console.log("5. Fund it with LINK tokens");
    console.log("6. Add your deployer address as a consumer");
    console.log("7. Set VRF_SUBSCRIPTION_ID in your .env.local file");
    return;
  }

  console.log("Using VRF Subscription ID:", subscriptionId);

  // Deploy the contract
  const CasinoVRFConsumer = await ethers.getContractFactory("CasinoVRFConsumer");
  
  console.log("📋 Deployment parameters:");
  console.log("- Subscription ID:", subscriptionId);
  console.log("- VRF Coordinator:", ARBITRUM_SEPOLIA_VRF_CONFIG.COORDINATOR);
  console.log("- Key Hash:", ARBITRUM_SEPOLIA_VRF_CONFIG.KEY_HASH);
  console.log("- Treasury:", treasuryAddress);

  const contract = await CasinoVRFConsumer.deploy(
    subscriptionId,
    ARBITRUM_SEPOLIA_VRF_CONFIG.COORDINATOR,
    ARBITRUM_SEPOLIA_VRF_CONFIG.KEY_HASH,
    treasuryAddress
  );

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("✅ CasinoVRFConsumer deployed to:", contractAddress);
  console.log("📄 Transaction hash:", contract.deploymentTransaction().hash);

  // Save deployment info
  const deploymentInfo = {
    contractAddress: contractAddress,
    transactionHash: contract.deploymentTransaction().hash,
    deployer: deployer.address,
    treasury: treasuryAddress,
    network: "arbitrum-sepolia",
    vrfConfig: {
      COORDINATOR: ARBITRUM_SEPOLIA_VRF_CONFIG.COORDINATOR,
      KEY_HASH: ARBITRUM_SEPOLIA_VRF_CONFIG.KEY_HASH,
      SUBSCRIPTION_ID: subscriptionId,
      CALLBACK_GAS_LIMIT: ARBITRUM_SEPOLIA_VRF_CONFIG.CALLBACK_GAS_LIMIT,
      REQUEST_CONFIRMATIONS: ARBITRUM_SEPOLIA_VRF_CONFIG.REQUEST_CONFIRMATIONS
    },
    deployedAt: new Date().toISOString()
  };

  // Ensure deployments directory exists
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info
  const deploymentPath = path.join(deploymentsDir, "vrf-consumer-arbitrum-sepolia.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("💾 Deployment info saved to:", deploymentPath);
  
  // Wait for a few confirmations before verification
  console.log("⏳ Waiting for confirmations...");
  await contract.deploymentTransaction().wait(3);

  console.log("🔍 Verifying contract on Arbiscan...");
  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [
        subscriptionId,
        ARBITRUM_SEPOLIA_VRF_CONFIG.COORDINATOR,
        ARBITRUM_SEPOLIA_VRF_CONFIG.KEY_HASH,
        treasuryAddress
      ],
    });
    console.log("✅ Contract verified successfully!");
  } catch (error) {
    console.log("❌ Verification failed:", error.message);
  }

  console.log("\n🎯 Next steps:");
  console.log("1. Go to https://vrf.chain.link/");
  console.log("2. Add this contract address as a consumer:", contractAddress);
  console.log("3. Make sure your subscription has enough LINK tokens");
  console.log("4. Test the VRF functionality");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });