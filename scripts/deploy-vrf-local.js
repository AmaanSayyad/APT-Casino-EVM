const { ethers } = require("hardhat");

// Mock VRF configuration for local testing
const VRF_CONFIG = {
  COORDINATOR: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625", // Sepolia VRF Coordinator (for reference)
  KEY_HASH: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", // 30 gwei Key Hash
  SUBSCRIPTION_ID: "12345", // Mock subscription ID
  CALLBACK_GAS_LIMIT: 2500000,
  REQUEST_CONFIRMATIONS: 3,
};

async function main() {
  console.log("🎰 Deploying Casino VRF Consumer Contract (Local)...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Use deployer as treasury for local testing
  const treasuryAddress = deployer.address;
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
    network: "localhost",
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
    path.join(deploymentsDir, "vrf-consumer-localhost.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n💾 Deployment info saved to deployments/vrf-consumer-localhost.json");
  console.log("\n🎉 Local deployment successful!");
  console.log("\n📋 For Sepolia deployment:");
  console.log("1. Ensure you have Sepolia ETH in your treasury wallet");
  console.log("2. Use a reliable RPC endpoint");
  console.log("3. Run: npm run deploy:vrf");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });