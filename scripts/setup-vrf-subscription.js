const { ethers } = require("hardhat");

// Arbitrum Sepolia VRF Coordinator ABI (sadece ihtiyacımız olan fonksiyonlar)
const VRF_COORDINATOR_ABI = [
  "function createSubscription() external returns (uint64 subId)",
  "function addConsumer(uint64 subId, address consumer) external",
  "function removeConsumer(uint64 subId, address consumer) external",
  "function getSubscription(uint64 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)",
  "function requestSubscriptionOwnerTransfer(uint64 subId, address newOwner) external",
  "function acceptSubscriptionOwnerTransfer(uint64 subId) external"
];

const ARBITRUM_SEPOLIA_VRF_COORDINATOR = "0x6D80646bEAdd07cE68cab36c27c626790bBcf17f";

async function main() {
  require('dotenv').config({ path: '.env.local' });
  console.log("🔧 Setting up VRF Subscription for Arbitrum Sepolia...");

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

  // Get action from environment variable or default to info
  const action = process.env.VRF_ACTION || "info";

  switch (action) {
    case "create":
      await createSubscription(vrfCoordinator);
      break;
    case "info":
      await getSubscriptionInfo(vrfCoordinator);
      break;
    case "add-consumer":
      await addConsumer(vrfCoordinator);
      break;
    case "remove-consumer":
      await removeConsumer(vrfCoordinator);
      break;
    default:
      console.log("Usage:");
      console.log("  npm run setup-vrf create           - Create new subscription");
      console.log("  npm run setup-vrf info             - Get subscription info");
      console.log("  npm run setup-vrf add-consumer     - Add consumer to subscription");
      console.log("  npm run setup-vrf remove-consumer  - Remove consumer from subscription");
      console.log("");
      console.log("Environment variables needed:");
      console.log("  VRF_SUBSCRIPTION_ID - Your VRF subscription ID");
      console.log("  CONSUMER_ADDRESS    - Contract address to add/remove as consumer");
  }
}

async function createSubscription(vrfCoordinator) {
  try {
    console.log("📝 Creating new VRF subscription...");
    
    const tx = await vrfCoordinator.createSubscription();
    console.log("📤 Transaction sent:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);

    // Parse logs to find subscription ID
    const subscriptionCreatedTopic = "0x464722b4166576d3dcbba877b999bc35cf911f4eaf434b7eba68fa113951d0bf";
    const log = receipt.logs.find(log => log.topics[0] === subscriptionCreatedTopic);
    
    if (log) {
      const subscriptionId = parseInt(log.topics[1], 16);
      console.log("🎯 New Subscription ID:", subscriptionId);
      console.log("");
      console.log("📋 Next steps:");
      console.log("1. Add this to your .env.local file:");
      console.log(`   VRF_SUBSCRIPTION_ID=${subscriptionId}`);
      console.log("2. Fund the subscription with LINK tokens at https://vrf.chain.link/");
      console.log("3. Deploy your contract");
      console.log("4. Add your contract as a consumer");
    } else {
      console.log("❌ Could not find subscription ID in transaction logs");
    }

  } catch (error) {
    console.error("❌ Error creating subscription:", error.message);
  }
}

async function getSubscriptionInfo(vrfCoordinator) {
  require('dotenv').config({ path: '.env.local' });
  const subscriptionId = process.env.VRF_SUBSCRIPTION_ID;
  
  if (!subscriptionId) {
    console.log("❌ VRF_SUBSCRIPTION_ID not found in environment variables");
    return;
  }

  try {
    console.log("📊 Getting subscription info for ID:", subscriptionId);
    
    const info = await vrfCoordinator.getSubscription(subscriptionId);
    
    console.log("📋 Subscription Details:");
    console.log("- Balance:", ethers.formatEther(info.balance), "LINK");
    console.log("- Request Count:", info.reqCount.toString());
    console.log("- Owner:", info.owner);
    console.log("- Consumers:", info.consumers.length);
    
    if (info.consumers.length > 0) {
      console.log("  Consumer addresses:");
      info.consumers.forEach((consumer, index) => {
        console.log(`    ${index + 1}. ${consumer}`);
      });
    }

  } catch (error) {
    console.error("❌ Error getting subscription info:", error.message);
  }
}

async function addConsumer(vrfCoordinator) {
  const subscriptionId = process.env.VRF_SUBSCRIPTION_ID;
  const consumerAddress = process.env.CONSUMER_ADDRESS;
  
  if (!subscriptionId) {
    console.log("❌ VRF_SUBSCRIPTION_ID not found in environment variables");
    return;
  }
  
  if (!consumerAddress) {
    console.log("❌ CONSUMER_ADDRESS not found in environment variables");
    return;
  }

  try {
    console.log("➕ Adding consumer to subscription...");
    console.log("- Subscription ID:", subscriptionId);
    console.log("- Consumer Address:", consumerAddress);
    
    const tx = await vrfCoordinator.addConsumer(subscriptionId, consumerAddress);
    console.log("📤 Transaction sent:", tx.hash);
    
    await tx.wait();
    console.log("✅ Consumer added successfully!");

  } catch (error) {
    console.error("❌ Error adding consumer:", error.message);
  }
}

async function removeConsumer(vrfCoordinator) {
  const subscriptionId = process.env.VRF_SUBSCRIPTION_ID;
  const consumerAddress = process.env.CONSUMER_ADDRESS;
  
  if (!subscriptionId) {
    console.log("❌ VRF_SUBSCRIPTION_ID not found in environment variables");
    return;
  }
  
  if (!consumerAddress) {
    console.log("❌ CONSUMER_ADDRESS not found in environment variables");
    return;
  }

  try {
    console.log("➖ Removing consumer from subscription...");
    console.log("- Subscription ID:", subscriptionId);
    console.log("- Consumer Address:", consumerAddress);
    
    const tx = await vrfCoordinator.removeConsumer(subscriptionId, consumerAddress);
    console.log("📤 Transaction sent:", tx.hash);
    
    await tx.wait();
    console.log("✅ Consumer removed successfully!");

  } catch (error) {
    console.error("❌ Error removing consumer:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });