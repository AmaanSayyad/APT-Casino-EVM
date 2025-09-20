const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking VRF Coordinator ABI...");

  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  const vrfCoordinatorAddress = "0x50d47e4142598E3411aA864e08a44284e471AC6f";
  const subscriptionId = "453";

  try {
    // Try different funding methods
    console.log("\n🔍 Trying different funding methods...");
    
    const vrfCoordinatorABI = [
      "function fundSubscription(uint64 subId, uint96 amount) external",
      "function fundSubscriptionWithNative(uint64 subId) external payable",
      "function getSubscription(uint64 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)",
      "function getRequestConfig() external view returns (uint16 minimumRequestConfirmations, uint32 maxGasLimit, uint32 maxNumWords)"
    ];
    
    const vrfCoordinator = new ethers.Contract(vrfCoordinatorAddress, vrfCoordinatorABI, deployer);
    
    // Check current subscription
    const subscription = await vrfCoordinator.getSubscription(subscriptionId);
    console.log("💰 Current Balance:", ethers.formatEther(subscription.balance), "LINK");
    
    // Try method 1: fundSubscription with LINK
    console.log("\n💰 Method 1: fundSubscription with LINK...");
    try {
      const fundAmount = ethers.parseEther("1"); // 1 LINK
      const fundTx = await vrfCoordinator.fundSubscription(subscriptionId, fundAmount);
      console.log("Transaction hash:", fundTx.hash);
      await fundTx.wait();
      console.log("✅ Subscription funded with 1 LINK!");
    } catch (error) {
      console.log("❌ Method 1 failed:", error.message);
    }
    
    // Try method 2: fundSubscriptionWithNative
    console.log("\n💰 Method 2: fundSubscriptionWithNative...");
    try {
      const fundTx = await vrfCoordinator.fundSubscriptionWithNative(subscriptionId, {
        value: ethers.parseEther("0.01")
      });
      console.log("Transaction hash:", fundTx.hash);
      await fundTx.wait();
      console.log("✅ Subscription funded with 0.01 ETH!");
    } catch (error) {
      console.log("❌ Method 2 failed:", error.message);
    }
    
    // Check final balance
    const finalSubscription = await vrfCoordinator.getSubscription(subscriptionId);
    console.log("\n💰 Final Balance:", ethers.formatEther(finalSubscription.balance), "LINK");
    
  } catch (error) {
    console.error("❌ Error checking VRF Coordinator:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
