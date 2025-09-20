const { ethers } = require("hardhat");

// Arbitrum Sepolia VRF Configuration
const VRF_CONFIG = {
  COORDINATOR: "0x6D80646bEAdd07cE68cab36c27c626790bBcf17f", // Arbitrum Sepolia VRF Coordinator
  KEY_HASH: "0x83d1b6e3388bed3d76426974512bb0d270e9542a765cd667242ea26c0cc0b730", // Arbitrum Sepolia Key Hash
  CALLBACK_GAS_LIMIT: 2500000,
  REQUEST_CONFIRMATIONS: 3,
};

// VRF Coordinator ABI for subscription creation
const VRF_COORDINATOR_ABI = [
  "function createSubscription() returns (uint64 subId)",
  "function addConsumer(uint64 subId, address consumer) external",
  "function fundSubscriptionWithNative(uint64 subId) external payable",
  "function getSubscription(uint64 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)",
  "event SubscriptionCreated(uint64 indexed subId, address indexed owner)",
];

async function main() {
  console.log("🎰 Creating Chainlink VRF Subscription for Arbitrum Sepolia...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Get VRF Consumer contract address
  const vrfConsumerAddress = process.env.NEXT_PUBLIC_VRF_CONTRACT_ADDRESS || "0xacA996A4d49e7Ed42dA68a20600F249BE6d024A4";
  console.log("VRF Consumer Address:", vrfConsumerAddress);

  // Connect to VRF Coordinator
  const vrfCoordinator = new ethers.Contract(VRF_CONFIG.COORDINATOR, VRF_COORDINATOR_ABI, deployer);
  console.log("VRF Coordinator:", VRF_CONFIG.COORDINATOR);

  try {
    // Step 1: Create subscription
    console.log("\n📝 Step 1: Creating VRF subscription...");
    const createTx = await vrfCoordinator.createSubscription();
    console.log("Transaction hash:", createTx.hash);
    console.log("Waiting for confirmation...");
    
    const createReceipt = await createTx.wait();
    console.log("Transaction confirmed in block:", createReceipt.blockNumber);
    
    // Look for SubscriptionCreated event
    let subscriptionId = null;
    for (const log of createReceipt.logs) {
      try {
        const parsedLog = vrfCoordinator.interface.parseLog(log);
        if (parsedLog && parsedLog.name === 'SubscriptionCreated') {
          subscriptionId = parsedLog.args.subId;
          break;
        }
      } catch (e) {
        // Continue to next log
      }
    }
    
    if (!subscriptionId) {
      console.log("⚠️ Could not extract subscription ID from event logs");
      console.log("Please check the transaction on Arbiscan:");
      console.log(`https://sepolia.arbiscan.io/tx/${createTx.hash}`);
      console.log("Look for 'SubscriptionCreated' event and get the subId");
      return;
    }
    
    console.log("✅ Subscription created! ID:", subscriptionId.toString());

    // Step 2: Add consumer to subscription
    console.log("\n🔗 Step 2: Adding consumer to subscription...");
    const addConsumerTx = await vrfCoordinator.addConsumer(subscriptionId, vrfConsumerAddress);
    await addConsumerTx.wait();
    console.log("✅ Consumer added to subscription!");

    // Step 3: Fund subscription with ETH (0.05 ETH)
    console.log("\n💰 Step 3: Funding subscription with 0.05 ETH...");
    const fundAmount = ethers.parseEther("0.05");
    const fundTx = await vrfCoordinator.fundSubscriptionWithNative(subscriptionId, {
      value: fundAmount
    });
    await fundTx.wait();
    console.log("✅ Subscription funded with 0.05 ETH!");

    // Step 4: Verify subscription
    console.log("\n🔍 Step 4: Verifying subscription...");
    const subscription = await vrfCoordinator.getSubscription(subscriptionId);
    console.log("Subscription balance:", ethers.formatEther(subscription.balance), "ETH");
    console.log("Request count:", subscription.reqCount.toString());
    console.log("Owner:", subscription.owner);
    console.log("Consumers:", subscription.consumers);

    // Step 5: Update VRF Consumer contract with subscription ID
    console.log("\n🔄 Step 5: Updating VRF Consumer contract...");
    const vrfConsumer = await ethers.getContractAt("CasinoVRFConsumer", vrfConsumerAddress);
    const updateTx = await vrfConsumer.updateSubscriptionId(subscriptionId);
    await updateTx.wait();
    console.log("✅ VRF Consumer contract updated with subscription ID!");

    console.log("\n🎉 VRF Setup Complete!");
    console.log("=====================================");
    console.log("Subscription ID:", subscriptionId.toString());
    console.log("VRF Coordinator:", VRF_CONFIG.COORDINATOR);
    console.log("Key Hash:", VRF_CONFIG.KEY_HASH);
    console.log("Consumer Address:", vrfConsumerAddress);
    console.log("=====================================");
    
    console.log("\n📝 Update your .env.local file:");
    console.log(`VRF_SUBSCRIPTION_ID=${subscriptionId.toString()}`);
    
    console.log("\n🔗 Explorer Links:");
    console.log(`VRF Coordinator: https://sepolia.arbiscan.io/address/${VRF_CONFIG.COORDINATOR}`);
    console.log(`VRF Consumer: https://sepolia.arbiscan.io/address/${vrfConsumerAddress}`);
    console.log(`Create Transaction: https://sepolia.arbiscan.io/tx/${createTx.hash}`);

  } catch (error) {
    console.error("❌ Error setting up VRF subscription:", error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Solution: Get more ARB ETH from faucet:");
      console.log("https://faucet.triangleplatform.com/arbitrum/sepolia");
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



