const { ethers } = require("hardhat");

// Arbitrum Sepolia VRF Configuration
const VRF_CONFIG = {
  SUBSCRIPTION_ID: "2719622116", // Subscription ID from transaction (0xa21a23e4)
};

async function main() {
  console.log("🎰 Updating VRF Consumer Contract...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Get VRF Consumer contract address
  const vrfConsumerAddress = process.env.NEXT_PUBLIC_VRF_CONTRACT_ADDRESS || "0xacA996A4d49e7Ed42dA68a20600F249BE6d024A4";
  console.log("VRF Consumer Address:", vrfConsumerAddress);
  console.log("Subscription ID:", VRF_CONFIG.SUBSCRIPTION_ID);

  try {
    // Update VRF Consumer contract with subscription ID
    console.log("\n🔄 Updating VRF Consumer contract with subscription ID...");
    const vrfConsumer = await ethers.getContractAt("CasinoVRFConsumer", vrfConsumerAddress);
    const updateTx = await vrfConsumer.updateSubscriptionId(VRF_CONFIG.SUBSCRIPTION_ID);
    console.log("Transaction hash:", updateTx.hash);
    await updateTx.wait();
    console.log("✅ VRF Consumer contract updated with subscription ID!");

    console.log("\n🎉 VRF Consumer Update Complete!");
    console.log("=====================================");
    console.log("Subscription ID:", VRF_CONFIG.SUBSCRIPTION_ID);
    console.log("Consumer Address:", vrfConsumerAddress);
    console.log("=====================================");
    
    console.log("\n🔗 Explorer Links:");
    console.log(`VRF Consumer: https://sepolia.arbiscan.io/address/${vrfConsumerAddress}`);

  } catch (error) {
    console.error("❌ Error updating VRF Consumer:", error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



