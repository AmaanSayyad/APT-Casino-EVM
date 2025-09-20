const { ethers } = require("hardhat");

async function main() {
  console.log("🔄 Updating VRF Contract with Correct Configuration...");

  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  const vrfContractAddress = process.env.NEXT_PUBLIC_VRF_CONTRACT_ADDRESS || "0xacA996A4d49e7Ed42dA68a20600F249BE6d024A4";
  const vrfContract = await ethers.getContractAt("CasinoVRFConsumer", vrfContractAddress);

  try {
    // Update VRF configuration
    console.log("\n🔧 Updating VRF configuration...");
    
    const newKeyHash = "0x027f94ff1465b3525f9fc03e9ff7d6d2c0953482246dd6ae07570c45d6631414";
    const newCallbackGasLimit = 2500000;
    const newRequestConfirmations = 1; // Arbitrum Sepolia uses 1 confirmation
    
    const updateTx = await vrfContract.updateVRFConfig(
      newKeyHash,
      newCallbackGasLimit,
      newRequestConfirmations
    );
    
    console.log("Transaction hash:", updateTx.hash);
    await updateTx.wait();
    console.log("✅ VRF configuration updated!");
    
    // Verify the update
    const keyHash = await vrfContract.keyHash();
    const callbackGasLimit = await vrfContract.callbackGasLimit();
    const requestConfirmations = await vrfContract.requestConfirmations();
    
    console.log("\n📋 Updated VRF Configuration:");
    console.log("  - Key Hash:", keyHash);
    console.log("  - Callback Gas Limit:", callbackGasLimit.toString());
    console.log("  - Request Confirmations:", requestConfirmations.toString());
    
    console.log("\n🎉 VRF Contract Update Complete!");
    
  } catch (error) {
    console.error("❌ Error updating VRF contract:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


