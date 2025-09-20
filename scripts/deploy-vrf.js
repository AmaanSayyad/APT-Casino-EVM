const { ethers } = require("hardhat");

// Chainlink VRF v2 configuration for Arbitrum Sepolia testnet
const VRF_CONFIG = {
  COORDINATOR: "0x6D80646bEAdd07cE68cab36c27c626790bBcf17f", // Arbitrum Sepolia VRF Coordinator
  KEY_HASH: "0x83d1b6e3388bed3d76426974512bb0d270e9542a765cd667242ea26c0cc0b730", // Arbitrum Sepolia Key Hash
  SUBSCRIPTION_ID: "0", // Start with 0, will be updated after deployment
  CALLBACK_GAS_LIMIT: 2500000,
  REQUEST_CONFIRMATIONS: 3,
};

async function main() {
  console.log("🎰 Deploying Casino VRF Consumer Contract...");
  
  // Get the deployer account
  console.log("Getting signers...");
  const signers = await ethers.getSigners();
  console.log("Signers count:", signers.length);
  
  if (signers.length === 0) {
    throw new Error("No signers found. Check your private key configuration.");
  }
  
  const [deployer] = signers;
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Validate treasury address
  const treasuryAddress = process.env.TREASURY_ADDRESS || "0xb424d2369F07b925D1218B08e56700AF5928287b";
  if (!ethers.isAddress(treasuryAddress)) {
    throw new Error(`Invalid treasury address: ${treasuryAddress}`);
  }
  console.log("Treasury address:", treasuryAddress);

  // Deploy the contract
  const CasinoVRFConsumer = await ethers.getContractFactory("CasinoVRFConsumer");
  
  console.log("Deploying contract with parameters:");
  console.log("- Subscription ID:", VRF_CONFIG.SUBSCRIPTION_ID);
  console.log("- VRF Coordinator:", VRF_CONFIG.COORDINATOR);
  console.log("- Key Hash:", VRF_CONFIG.KEY_HASH);
  console.log("- Treasury:", treasuryAddress);

  const contract = await CasinoVRFConsumer.deploy(
    VRF_CONFIG.SUBSCRIPTION_ID,
    VRF_CONFIG.COORDINATOR,
    VRF_CONFIG.KEY_HASH,
    treasuryAddress
  );

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("✅ CasinoVRFConsumer deployed to:", contractAddress);
  console.log("🔗 Transaction hash:", contract.deploymentTransaction().hash);

  // Verify contract info
  const contractInfo = await contract.getContractInfo();
  console.log("\n📊 Contract Info:");
  console.log("- Contract Address:", contractInfo.contractAddress);
  console.log("- Treasury Address:", contractInfo.treasuryAddress);
  console.log("- Subscription ID:", contractInfo.subscriptionId.toString());
  console.log("- Total Requests:", contractInfo.totalRequests.toString());
  console.log("- Total Fulfilled:", contractInfo.totalFulfilled.toString());

  // Save deployment info
  const deploymentInfo = {
    contractAddress,
    transactionHash: contract.deploymentTransaction().hash,
    deployer: deployer.address,
    treasury: treasuryAddress,
    network: "sepolia",
    vrfConfig: VRF_CONFIG,
    deployedAt: new Date().toISOString(),
  };

  const fs = require("fs");
  const path = require("path");
  
  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info
  fs.writeFileSync(
    path.join(deploymentsDir, "vrf-consumer-sepolia.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n💾 Deployment info saved to deployments/vrf-consumer-sepolia.json");

  // Instructions for next steps
  console.log("\n📋 Next Steps:");
  console.log("1. Create a Chainlink VRF v2 subscription at https://vrf.chain.link/");
  console.log("2. Fund the subscription with LINK tokens");
  console.log("3. Add this contract as a consumer to your subscription");
  console.log("4. Update VRF_SUBSCRIPTION_ID in your .env file");
  console.log("5. Update the contract's subscription ID using updateSubscriptionId()");
  
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\n🔍 Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [
          VRF_CONFIG.SUBSCRIPTION_ID,
          VRF_CONFIG.COORDINATOR,
          VRF_CONFIG.KEY_HASH,
          treasuryAddress,
        ],
      });
      console.log("✅ Contract verified on Etherscan");
    } catch (error) {
      console.log("❌ Verification failed:", error.message);
      console.log("You can verify manually later using:");
      console.log(`npx hardhat verify --network sepolia ${contractAddress} ${VRF_CONFIG.SUBSCRIPTION_ID} ${VRF_CONFIG.COORDINATOR} ${VRF_CONFIG.KEY_HASH} ${treasuryAddress}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });