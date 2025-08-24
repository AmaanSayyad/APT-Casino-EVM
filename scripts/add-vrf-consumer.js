const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// VRF Coordinator ABI (minimal)
const VRF_COORDINATOR_ABI = [
  "function addConsumer(uint64 subId, address consumer) external",
  "function getSubscription(uint64 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)",
];

const VRF_COORDINATOR_ADDRESS = "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625";

async function main() {
  console.log("🔗 Adding VRF Consumer to Subscription...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Load deployment info
  const deploymentsDir = path.join(__dirname, "../deployments");
  
  // Load subscription info
  const subscriptionPath = path.join(deploymentsDir, "vrf-subscription-sepolia.json");
  if (!fs.existsSync(subscriptionPath)) {
    throw new Error("Subscription info not found. Run setup-vrf-subscription.js first.");
  }
  
  const subscriptionInfo = JSON.parse(fs.readFileSync(subscriptionPath, "utf8"));
  const subscriptionId = subscriptionInfo.subscriptionId;
  
  // Load contract deployment info
  const contractPath = path.join(deploymentsDir, "vrf-consumer-sepolia.json");
  if (!fs.existsSync(contractPath)) {
    throw new Error("Contract deployment info not found. Deploy the contract first.");
  }
  
  const contractInfo = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  const contractAddress = contractInfo.contractAddress;

  console.log("Subscription ID:", subscriptionId);
  console.log("Consumer Contract:", contractAddress);

  // Connect to VRF Coordinator
  const vrfCoordinator = new ethers.Contract(
    VRF_COORDINATOR_ADDRESS,
    VRF_COORDINATOR_ABI,
    deployer
  );

  try {
    // Check current subscription state
    console.log("Checking current subscription state...");
    const subscription = await vrfCoordinator.getSubscription(subscriptionId);
    
    console.log("Current subscription details:");
    console.log("- Balance:", ethers.formatEther(subscription.balance), "LINK");
    console.log("- Request Count:", subscription.reqCount.toString());
    console.log("- Owner:", subscription.owner);
    console.log("- Current Consumers:", subscription.consumers);

    // Check if consumer is already added
    if (subscription.consumers.includes(contractAddress)) {
      console.log("✅ Consumer is already added to the subscription");
      return;
    }

    // Add consumer to subscription
    console.log("Adding consumer to subscription...");
    const addTx = await vrfCoordinator.addConsumer(subscriptionId, contractAddress);
    await addTx.wait();
    
    console.log("✅ Consumer added successfully");
    console.log("🔗 Transaction hash:", addTx.hash);

    // Verify the consumer was added
    const updatedSubscription = await vrfCoordinator.getSubscription(subscriptionId);
    console.log("\n📊 Updated Subscription Details:");
    console.log("- Balance:", ethers.formatEther(updatedSubscription.balance), "LINK");
    console.log("- Request Count:", updatedSubscription.reqCount.toString());
    console.log("- Owner:", updatedSubscription.owner);
    console.log("- Consumers:", updatedSubscription.consumers);

    // Update contract deployment info
    contractInfo.subscriptionId = subscriptionId;
    contractInfo.addedToSubscriptionAt = new Date().toISOString();
    contractInfo.addConsumerTxHash = addTx.hash;

    fs.writeFileSync(contractPath, JSON.stringify(contractInfo, null, 2));
    console.log("\n💾 Contract info updated with subscription details");

    console.log("\n🎉 VRF setup complete! Your contract can now request random numbers.");
    console.log("\n📋 Summary:");
    console.log("- Subscription ID:", subscriptionId);
    console.log("- Consumer Contract:", contractAddress);
    console.log("- LINK Balance:", ethers.formatEther(updatedSubscription.balance), "LINK");
    console.log("- Ready to request VRF!");

  } catch (error) {
    console.error("❌ Failed to add consumer:", error);
    
    if (error.message.includes("OnlySubOwner")) {
      console.log("\n💡 Error: Only the subscription owner can add consumers");
      console.log("Make sure you're using the same account that created the subscription");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });