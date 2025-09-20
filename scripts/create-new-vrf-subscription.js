const { ethers } = require("hardhat");

async function main() {
  console.log("🆕 Creating New VRF Subscription...");

  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  const vrfCoordinatorAddress = "0x6D80646bEAdd07cE68cab36c27c626790bBcf17f"; // Arbitrum Sepolia VRF Coordinator
  
  // VRF Coordinator ABI
  const vrfCoordinatorABI = [
    "function createSubscription() external returns (uint64 subId)",
    "function addConsumer(uint64 subId, address consumer) external",
    "function fundSubscriptionWithNative(uint64 subId) external payable",
    "function getSubscription(uint64 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)",
    "function getRequestConfig() external view returns (uint16 minimumRequestConfirmations, uint32 maxGasLimit, uint32 maxNumWords)"
  ];

  const vrfCoordinator = new ethers.Contract(vrfCoordinatorAddress, vrfCoordinatorABI, deployer);

  try {
    console.log("\n📋 VRF Coordinator Address:", vrfCoordinatorAddress);
    
    // Step 1: Create subscription
    console.log("\n🆕 Step 1: Creating VRF subscription...");
    const createTx = await vrfCoordinator.createSubscription();
    console.log("Transaction hash:", createTx.hash);
    const createReceipt = await createTx.wait();
    console.log("✅ Subscription created!");
    
    // Extract subscription ID from logs
    const subscriptionCreatedEvent = createReceipt.logs.find(
      log => log.topics[0] === ethers.id("SubscriptionCreated(uint64,address)")
    );
    
    if (!subscriptionCreatedEvent) {
      throw new Error("SubscriptionCreated event not found");
    }
    
    const subscriptionId = BigInt(subscriptionCreatedEvent.topics[1]).toString();
    console.log("🎉 New Subscription ID:", subscriptionId);
    
    // Step 2: Add consumer
    console.log("\n🔗 Step 2: Adding VRF Consumer to subscription...");
    const vrfContractAddress = process.env.NEXT_PUBLIC_VRF_CONTRACT_ADDRESS || "0xacA996A4d49e7Ed42dA68a20600F249BE6d024A4";
    const addConsumerTx = await vrfCoordinator.addConsumer(subscriptionId, vrfContractAddress);
    console.log("Transaction hash:", addConsumerTx.hash);
    await addConsumerTx.wait();
    console.log("✅ Consumer added!");
    
    // Step 3: Fund subscription
    console.log("\n💰 Step 3: Funding subscription with 0.01 ETH...");
    const fundAmount = ethers.parseEther("0.01");
    const fundTx = await vrfCoordinator.fundSubscriptionWithNative(subscriptionId, {
      value: fundAmount
    });
    console.log("Transaction hash:", fundTx.hash);
    await fundTx.wait();
    console.log("✅ Subscription funded!");
    
    // Step 4: Verify subscription
    console.log("\n🔍 Step 4: Verifying subscription...");
    const subscription = await vrfCoordinator.getSubscription(subscriptionId);
    console.log("💰 Subscription Balance:", ethers.formatEther(subscription.balance), "ETH");
    console.log("🔗 Consumers:", subscription.consumers);
    
    console.log("\n🎉 VRF Subscription Setup Complete!");
    console.log("=====================================");
    console.log("Subscription ID:", subscriptionId);
    console.log("Consumer Address:", vrfContractAddress);
    console.log("Balance:", ethers.formatEther(subscription.balance), "ETH");
    console.log("=====================================");
    
    console.log("\n📝 Update your .env.local file:");
    console.log(`VRF_SUBSCRIPTION_ID=${subscriptionId}`);
    
  } catch (error) {
    console.error("❌ Error creating VRF subscription:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});



