const { ethers } = require("hardhat");

// Arbitrum Sepolia VRF Configuration
const VRF_CONFIG = {
  COORDINATOR: "0x6D80646bEAdd07cE68cab36c27c626790bBcf17f", // Arbitrum Sepolia VRF Coordinator
  SUBSCRIPTION_ID: "2719622116", // Subscription ID from transaction (0xa21a23e4)
};

// VRF Coordinator ABI
const VRF_COORDINATOR_ABI = [
  "function addConsumer(uint64 subId, address consumer) external",
  "function fundSubscriptionWithNative(uint64 subId) external payable",
  "function getSubscription(uint64 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)",
  "function removeConsumer(uint64 subId, address consumer) external",
];

async function main() {
  console.log("🎰 Configuring VRF Subscription for Arbitrum Sepolia...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Get VRF Consumer contract address
  const vrfConsumerAddress = process.env.NEXT_PUBLIC_VRF_CONTRACT_ADDRESS || "0xacA996A4d49e7Ed42dA68a20600F249BE6d024A4";
  console.log("VRF Consumer Address:", vrfConsumerAddress);
  console.log("Subscription ID:", VRF_CONFIG.SUBSCRIPTION_ID);

  // Connect to VRF Coordinator
  const vrfCoordinator = new ethers.Contract(VRF_CONFIG.COORDINATOR, VRF_COORDINATOR_ABI, deployer);
  console.log("VRF Coordinator:", VRF_CONFIG.COORDINATOR);

  try {
    // Step 1: Check current subscription status
    console.log("\n🔍 Step 1: Checking subscription status...");
    const subscription = await vrfCoordinator.getSubscription(VRF_CONFIG.SUBSCRIPTION_ID);
    console.log("Current balance:", ethers.formatEther(subscription.balance), "ETH");
    console.log("Request count:", subscription.reqCount.toString());
    console.log("Owner:", subscription.owner);
    console.log("Consumers:", subscription.consumers);

    // Step 2: Add consumer to subscription
    console.log("\n🔗 Step 2: Adding consumer to subscription...");
    const addConsumerTx = await vrfCoordinator.addConsumer(VRF_CONFIG.SUBSCRIPTION_ID, vrfConsumerAddress);
    await addConsumerTx.wait();
    console.log("✅ Consumer added to subscription!");

    // Step 3: Fund subscription with ETH (0.03 ETH)
    console.log("\n💰 Step 3: Funding subscription with 0.03 ETH...");
    const fundAmount = ethers.parseEther("0.03");
    const fundTx = await vrfCoordinator.fundSubscriptionWithNative(VRF_CONFIG.SUBSCRIPTION_ID, {
      value: fundAmount
    });
    await fundTx.wait();
    console.log("✅ Subscription funded with 0.03 ETH!");

    // Step 4: Verify final subscription status
    console.log("\n🔍 Step 4: Verifying final subscription status...");
    const finalSubscription = await vrfCoordinator.getSubscription(VRF_CONFIG.SUBSCRIPTION_ID);
    console.log("Final balance:", ethers.formatEther(finalSubscription.balance), "ETH");
    console.log("Request count:", finalSubscription.reqCount.toString());
    console.log("Owner:", finalSubscription.owner);
    console.log("Consumers:", finalSubscription.consumers);

    // Step 5: Update VRF Consumer contract with subscription ID
    console.log("\n🔄 Step 5: Updating VRF Consumer contract...");
    const vrfConsumer = await ethers.getContractAt("CasinoVRFConsumer", vrfConsumerAddress);
    const updateTx = await vrfConsumer.updateSubscriptionId(VRF_CONFIG.SUBSCRIPTION_ID);
    await updateTx.wait();
    console.log("✅ VRF Consumer contract updated with subscription ID!");

    console.log("\n🎉 VRF Configuration Complete!");
    console.log("=====================================");
    console.log("Subscription ID:", VRF_CONFIG.SUBSCRIPTION_ID);
    console.log("VRF Coordinator:", VRF_CONFIG.COORDINATOR);
    console.log("Consumer Address:", vrfConsumerAddress);
    console.log("Final Balance:", ethers.formatEther(finalSubscription.balance), "ETH");
    console.log("=====================================");
    
    console.log("\n🔗 Explorer Links:");
    console.log(`VRF Coordinator: https://sepolia.arbiscan.io/address/${VRF_CONFIG.COORDINATOR}`);
    console.log(`VRF Consumer: https://sepolia.arbiscan.io/address/${vrfConsumerAddress}`);

  } catch (error) {
    console.error("❌ Error configuring VRF subscription:", error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Solution: Get more ARB ETH from faucet:");
      console.log("https://faucet.triangleplatform.com/arbitrum/sepolia");
    }
    
    if (error.message.includes("InvalidSubscription")) {
      console.log("\n💡 Solution: Check if subscription ID is correct");
    }
    
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
