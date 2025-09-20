const { ethers } = require("hardhat");

async function main() {
  console.log("🔄 Updating VRF Contract with Correct Subscription ID...");

  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  const vrfContractAddress = "0xe2B5066f1521A4b882053F6D758d4288c5928586";
  const subscriptionId = "453";

  try {
    const vrfContract = await ethers.getContractAt("CasinoVRFConsumer", vrfContractAddress);
    
    // Check current subscription ID
    const currentSubscriptionId = await vrfContract.s_subscriptionId();
    console.log("📋 Current Subscription ID in contract:", currentSubscriptionId.toString());
    
    if (currentSubscriptionId.toString() === "0") {
      console.log("\n🔄 Updating VRF contract with subscription ID:", subscriptionId);
      const updateTx = await vrfContract.updateSubscriptionId(subscriptionId);
      console.log("Transaction hash:", updateTx.hash);
      await updateTx.wait();
      console.log("✅ VRF contract updated with subscription ID!");
      
      // Verify the update
      const newSubscriptionId = await vrfContract.s_subscriptionId();
      console.log("📋 New Subscription ID in contract:", newSubscriptionId.toString());
    } else {
      console.log("✅ Subscription ID already set:", currentSubscriptionId.toString());
    }
    
    // Now test VRF request
    console.log("\n🎯 Testing VRF request after update...");
    
    const gameType = 0; // MINES
    const gameSubType = "MINES";
    
    // Estimate gas for single request
    const gasEstimate = await vrfContract.requestRandomWords.estimateGas(
      gameType,
      gameSubType
    );
    console.log("⛽ Estimated gas:", gasEstimate.toString());
    
    // Send single request
    const tx = await vrfContract.requestRandomWords(
      gameType,
      gameSubType,
      { gasLimit: gasEstimate + 50000n }
    );
    
    console.log("🚀 Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed:", receipt.hash);
    
    // Extract request ID from logs
    const vrfRequestedEvent = receipt.logs.find(
      log => log.topics[0] === ethers.id("VRFRequested(uint256,uint8,string,address)")
    );
    
    if (vrfRequestedEvent) {
      const requestId = vrfRequestedEvent.topics[1];
      console.log("🎲 Request ID:", BigInt(requestId).toString());
      console.log("🎉 VRF request successful!");
    } else {
      console.log("❌ VRFRequested event not found");
    }
    
  } catch (error) {
    console.error("❌ Error updating VRF contract:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
