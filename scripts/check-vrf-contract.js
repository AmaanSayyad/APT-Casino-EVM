const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking VRF Contract Configuration...");

  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  const vrfContractAddress = process.env.NEXT_PUBLIC_VRF_CONTRACT_ADDRESS || "0xacA996A4d49e7Ed42dA68a20600F249BE6d024A4";
  const vrfContract = await ethers.getContractAt("CasinoVRFConsumer", vrfContractAddress);

  try {
    console.log("\n📋 VRF Contract Address:", vrfContractAddress);
    
    // Get contract info
    const contractInfo = await vrfContract.getContractInfo();
    console.log("\n📋 Contract Info:");
    console.log("  - Contract Address:", contractInfo.contractAddress);
    console.log("  - Treasury Address:", contractInfo.treasuryAddress);
    console.log("  - Subscription ID:", contractInfo.subscriptionId.toString());
    console.log("  - Total Requests:", contractInfo.totalRequests.toString());
    console.log("  - Total Fulfilled:", contractInfo.totalFulfilled.toString());
    
    // Get VRF configuration
    const keyHash = await vrfContract.keyHash();
    const callbackGasLimit = await vrfContract.callbackGasLimit();
    const requestConfirmations = await vrfContract.requestConfirmations();
    
    console.log("\n⚙️ VRF Configuration:");
    console.log("  - Key Hash:", keyHash);
    console.log("  - Callback Gas Limit:", callbackGasLimit.toString());
    console.log("  - Request Confirmations:", requestConfirmations.toString());
    
    // Check if treasury matches
    const treasuryFromEnv = process.env.TREASURY_ADDRESS || "0xb424d2369F07b925D1218B08e56700AF5928287b";
    console.log("\n🔍 Treasury Address from ENV:", treasuryFromEnv);
    console.log("✅ Treasury addresses match:", contractInfo.treasuryAddress.toLowerCase() === treasuryFromEnv.toLowerCase());
    
    // Check VRF Coordinator
    const vrfCoordinator = await vrfContract.COORDINATOR();
    console.log("\n🔗 VRF Coordinator in Contract:", vrfCoordinator);
    console.log("🔗 VRF Coordinator from ENV:", process.env.VRF_COORDINATOR || "0x50d47e4142598E3411aA864e08a44284e471AC6f");
    
    // Check if we can call the VRF Coordinator
    const vrfCoordinatorABI = [
      "function getSubscription(uint64 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)"
    ];
    
    try {
      const vrfCoordinatorContract = new ethers.Contract(vrfCoordinator, vrfCoordinatorABI, deployer.provider);
      const subscription = await vrfCoordinatorContract.getSubscription(contractInfo.subscriptionId);
      console.log("\n📋 VRF Subscription Status:");
      console.log("  - Balance:", ethers.formatEther(subscription.balance), "ETH");
      console.log("  - Request Count:", subscription.reqCount.toString());
      console.log("  - Owner:", subscription.owner);
      console.log("  - Consumers:", subscription.consumers);
      
      const isConsumer = subscription.consumers.includes(vrfContractAddress);
      console.log("  - Our contract is consumer:", isConsumer);
      
    } catch (error) {
      console.error("❌ Error checking VRF subscription:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Error checking VRF contract:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


