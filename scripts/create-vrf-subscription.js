const { ethers } = require("hardhat");

// Arbitrum Sepolia VRF Coordinator ABI
const VRF_COORDINATOR_ABI = [
  "function createSubscription() external returns (uint64 subId)",
  "function addConsumer(uint64 subId, address consumer) external",
  "function getSubscription(uint64 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)",
  "event SubscriptionCreated(uint64 indexed subId, address owner)"
];

const ARBITRUM_SEPOLIA_VRF_COORDINATOR = "0x6D80646bEAdd07cE68cab36c27c626790bBcf17f";

async function main() {
  console.log("🚀 Creating VRF Subscription on Arbitrum Sepolia...");

  const [signer] = await ethers.getSigners();
  console.log("Using account:", signer.address);

  const balance = await ethers.provider.getBalance(signer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Connect to VRF Coordinator
  const vrfCoordinator = new ethers.Contract(
    ARBITRUM_SEPOLIA_VRF_COORDINATOR,
    VRF_COORDINATOR_ABI,
    signer
  );

  try {
    console.log("📝 Creating new VRF subscription...");
    
    const tx = await vrfCoordinator.createSubscription();
    console.log("📤 Transaction sent:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);

    // Parse logs to find subscription ID
    let subscriptionId = null;
    
    for (const log of receipt.logs) {
      try {
        const parsed = vrfCoordinator.interface.parseLog(log);
        if (parsed.name === "SubscriptionCreated") {
          subscriptionId = parsed.args.subId.toString();
          break;
        }
      } catch (e) {
        // Skip logs that don't match our interface
      }
    }

    if (subscriptionId) {
      console.log("🎯 New Subscription ID:", subscriptionId);
      
      // Verify subscription was created
      console.log("🔍 Verifying subscription...");
      const info = await vrfCoordinator.getSubscription(subscriptionId);
      console.log("✅ Subscription verified!");
      console.log("- Owner:", info.owner);
      console.log("- Balance:", ethers.formatEther(info.balance), "LINK");
      console.log("- Consumers:", info.consumers.length);

      console.log("\n📋 Next steps:");
      console.log("1. Update your .env.local file:");
      console.log(`   VRF_SUBSCRIPTION_ID=${subscriptionId}`);
      console.log("2. Fund the subscription with LINK tokens:");
      console.log("   https://vrf.chain.link/arbitrum-sepolia");
      console.log("3. Add your contract as a consumer");
      console.log("4. Test VRF functionality");

    } else {
      console.log("❌ Could not find subscription ID in transaction logs");
      console.log("Transaction receipt:", receipt);
    }

  } catch (error) {
    console.error("❌ Error creating subscription:", error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.log("💡 You need more ETH to pay for gas fees");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });