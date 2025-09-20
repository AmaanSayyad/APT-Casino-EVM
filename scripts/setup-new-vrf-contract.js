const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Setting up New VRF Contract...");

  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  const vrfContractAddress = "0xe2B5066f1521A4b882053F6D758d4288c5928586";
  const subscriptionId = "453";
  const vrfCoordinatorAddress = "0x50d47e4142598E3411aA864e08a44284e471AC6f";

  try {
    // Step 1: Add consumer to subscription
    console.log("\n🔗 Step 1: Adding VRF Consumer to subscription...");
    const vrfCoordinatorABI = [
      "function addConsumer(uint64 subId, address consumer) external",
      "function fundSubscriptionWithNative(uint64 subId) external payable",
      "function getSubscription(uint64 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)"
    ];
    
    const vrfCoordinator = new ethers.Contract(vrfCoordinatorAddress, vrfCoordinatorABI, deployer);
    
    const addConsumerTx = await vrfCoordinator.addConsumer(subscriptionId, vrfContractAddress);
    console.log("Transaction hash:", addConsumerTx.hash);
    await addConsumerTx.wait();
    console.log("✅ Consumer added!");
    
    // Step 2: Fund subscription
    console.log("\n💰 Step 2: Funding subscription with 0.01 ETH...");
    const fundAmount = ethers.parseEther("0.01");
    const fundTx = await vrfCoordinator.fundSubscriptionWithNative(subscriptionId, {
      value: fundAmount
    });
    console.log("Transaction hash:", fundTx.hash);
    await fundTx.wait();
    console.log("✅ Subscription funded!");
    
    // Step 3: Update VRF contract with subscription ID
    console.log("\n🔄 Step 3: Updating VRF contract with subscription ID...");
    const vrfContract = await ethers.getContractAt("CasinoVRFConsumer", vrfContractAddress);
    const updateTx = await vrfContract.updateSubscriptionId(subscriptionId);
    console.log("Transaction hash:", updateTx.hash);
    await updateTx.wait();
    console.log("✅ VRF contract updated!");
    
    // Step 4: Verify setup
    console.log("\n🔍 Step 4: Verifying setup...");
    const subscription = await vrfCoordinator.getSubscription(subscriptionId);
    console.log("💰 Subscription Balance:", ethers.formatEther(subscription.balance), "ETH");
    console.log("🔗 Consumers:", subscription.consumers);
    
    const contractInfo = await vrfContract.getContractInfo();
    console.log("📋 Contract Subscription ID:", contractInfo.subscriptionId.toString());
    
    console.log("\n🎉 VRF Setup Complete!");
    console.log("=====================================");
    console.log("Contract Address:", vrfContractAddress);
    console.log("Subscription ID:", subscriptionId);
    console.log("Balance:", ethers.formatEther(subscription.balance), "ETH");
    console.log("=====================================");
    
  } catch (error) {
    console.error("❌ Error setting up VRF contract:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


