const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Arbitrum Sepolia VRF Coordinator ABI
const VRF_COORDINATOR_ABI = [
  "function getSubscription(uint64 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)"
];

const ARBITRUM_SEPOLIA_VRF_COORDINATOR = "0x6D80646bEAdd07cE68cab36c27c626790bBcf17f";
const SUBSCRIPTION_ID = "2719622116"; // From .env.local
const CONTRACT_ADDRESS = "0xacA996A4d49e7Ed42dA68a20600F249BE6d024A4"; // From deployment

async function main() {
  console.log("🔍 Checking VRF Status on Arbitrum Sepolia...");

  const [signer] = await ethers.getSigners();
  console.log("Using account:", signer.address);

  // Connect to VRF Coordinator
  const vrfCoordinator = new ethers.Contract(
    ARBITRUM_SEPOLIA_VRF_COORDINATOR,
    VRF_COORDINATOR_ABI,
    signer
  );

  try {
    console.log("\n📊 Checking Subscription:", SUBSCRIPTION_ID);
    
    const info = await vrfCoordinator.getSubscription(SUBSCRIPTION_ID);
    
    console.log("📋 Subscription Details:");
    console.log("- Balance:", ethers.formatEther(info.balance), "LINK");
    console.log("- Request Count:", info.reqCount.toString());
    console.log("- Owner:", info.owner);
    console.log("- Consumers:", info.consumers.length);
    
    if (info.consumers.length > 0) {
      console.log("  Consumer addresses:");
      info.consumers.forEach((consumer, index) => {
        console.log(`    ${index + 1}. ${consumer}`);
        if (consumer.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
          console.log("       ✅ Our contract is registered as consumer");
        }
      });
    }

    // Check if our contract is a consumer
    const isConsumer = info.consumers.some(
      consumer => consumer.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()
    );

    console.log("\n🎯 Status Summary:");
    console.log("- Subscription ID:", SUBSCRIPTION_ID);
    console.log("- Contract Address:", CONTRACT_ADDRESS);
    console.log("- Is Consumer:", isConsumer ? "✅ YES" : "❌ NO");
    console.log("- Has LINK Balance:", parseFloat(ethers.formatEther(info.balance)) > 0 ? "✅ YES" : "❌ NO");
    console.log("- Owner:", info.owner);
    console.log("- Signer:", signer.address);
    console.log("- Is Owner:", info.owner.toLowerCase() === signer.address.toLowerCase() ? "✅ YES" : "❌ NO");

    if (!isConsumer) {
      console.log("\n❌ Problem: Contract is not registered as consumer");
      console.log("💡 Solution: Add contract as consumer to subscription");
    }

    if (parseFloat(ethers.formatEther(info.balance)) === 0) {
      console.log("\n❌ Problem: Subscription has no LINK balance");
      console.log("💡 Solution: Fund subscription with LINK tokens");
      console.log("🔗 Go to: https://vrf.chain.link/arbitrum-sepolia");
    }

    // Check contract
    console.log("\n🔍 Checking Contract...");
    const CasinoVRFConsumer = await ethers.getContractFactory("CasinoVRFConsumer");
    const contract = CasinoVRFConsumer.attach(CONTRACT_ADDRESS);

    const contractInfo = await contract.getContractInfo();
    console.log("📋 Contract Info:");
    console.log("- Treasury:", contractInfo.treasuryAddress);
    console.log("- Subscription ID:", contractInfo.subscriptionId.toString());
    console.log("- Total Requests:", contractInfo.totalRequests.toString());

  } catch (error) {
    console.error("❌ Error:", error.message);
    
    if (error.message.includes("InvalidSubscription")) {
      console.log("💡 The subscription ID doesn't exist or is invalid");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });