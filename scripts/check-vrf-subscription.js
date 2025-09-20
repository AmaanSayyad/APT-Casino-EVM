const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking VRF Subscription Status...");

  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  const vrfCoordinatorAddress = "0x6D80646bEAdd07cE68cab36c27c626790bBcf17f"; // Arbitrum Sepolia VRF Coordinator
  const subscriptionId = "2719622116";
  
  // VRF Coordinator ABI
  const vrfCoordinatorABI = [
    "function getSubscription(uint64 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)",
    "function getRequestConfig() external view returns (uint16 minimumRequestConfirmations, uint32 maxGasLimit, uint32 maxNumWords)",
    "function getConfig() external view returns (uint16 minimumRequestConfirmations, uint32 maxGasLimit, uint32 maxNumWords, bytes32 keyHash)"
  ];

  const vrfCoordinator = new ethers.Contract(vrfCoordinatorAddress, vrfCoordinatorABI, deployer.provider);

  try {
    console.log("\n📋 VRF Coordinator Address:", vrfCoordinatorAddress);
    console.log("📝 Subscription ID:", subscriptionId);
    
    // Check subscription details
    const subscription = await vrfCoordinator.getSubscription(subscriptionId);
    console.log("\n💰 Subscription Balance:", ethers.formatEther(subscription.balance), "ETH");
    console.log("🔢 Request Count:", subscription.reqCount.toString());
    console.log("👤 Owner:", subscription.owner);
    console.log("🔗 Consumers:", subscription.consumers);
    
    // Check if our contract is in consumers
    const vrfContractAddress = process.env.NEXT_PUBLIC_VRF_CONTRACT_ADDRESS || "0xacA996A4d49e7Ed42dA68a20600F249BE6d024A4";
    const isConsumer = subscription.consumers.includes(vrfContractAddress);
    console.log("✅ Our contract is consumer:", isConsumer);
    
    // Check VRF configuration
    const requestConfig = await vrfCoordinator.getRequestConfig();
    console.log("\n⚙️ VRF Request Config:");
    console.log("  - Minimum Request Confirmations:", requestConfig.minimumRequestConfirmations);
    console.log("  - Max Gas Limit:", requestConfig.maxGasLimit);
    console.log("  - Max Num Words:", requestConfig.maxNumWords);
    
    const config = await vrfCoordinator.getConfig();
    console.log("\n🔧 VRF Config:");
    console.log("  - Key Hash:", config.keyHash);
    console.log("  - Min Request Confirmations:", config.minimumRequestConfirmations);
    console.log("  - Max Gas Limit:", config.maxGasLimit);
    console.log("  - Max Num Words:", config.maxNumWords);
    
  } catch (error) {
    console.error("❌ Error checking VRF subscription:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});



