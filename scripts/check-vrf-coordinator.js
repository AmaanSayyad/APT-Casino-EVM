const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking VRF Coordinator addresses for Arbitrum Sepolia...");

  const provider = ethers.provider;
  
  // Known VRF Coordinator addresses to test
  const coordinators = [
    "0x6D80646bEAdd07cE68cab36c27c626790bBcf17f", // Current one we're using
    "0x50d47e4142598E3411aA864e08a44284e471AC6f", // Alternative Arbitrum Sepolia
    "0x5CE8D5A2BC84beb22a398CCA51996F7930313D61"  // Another possible address
  ];

  const testABI = [
    "function createSubscription() external returns (uint64 subId)",
    "function getSubscription(uint64 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)"
  ];

  for (const address of coordinators) {
    console.log(`\n🧪 Testing coordinator: ${address}`);
    
    try {
      // Check if contract exists
      const code = await provider.getCode(address);
      if (code === "0x") {
        console.log("❌ No contract at this address");
        continue;
      }
      
      console.log("✅ Contract exists");
      
      // Try to create a contract instance
      const coordinator = new ethers.Contract(address, testABI, provider);
      
      // Test with a known invalid subscription ID to see if we get the right error
      try {
        await coordinator.getSubscription(999999999);
        console.log("❌ Unexpected success");
      } catch (error) {
        if (error.message.includes("InvalidSubscription") || 
            error.message.includes("SubscriptionNotFound") ||
            error.message.includes("could not decode result data")) {
          console.log("✅ Coordinator responds correctly to invalid subscription");
        } else {
          console.log("❓ Unexpected error:", error.message.substring(0, 100));
        }
      }
      
    } catch (error) {
      console.log("❌ Error:", error.message.substring(0, 100));
    }
  }

  // Check Chainlink documentation for Arbitrum Sepolia
  console.log("\n📚 According to Chainlink docs:");
  console.log("Arbitrum Sepolia VRF Coordinator should be:");
  console.log("0x6D80646bEAdd07cE68cab36c27c626790bBcf17f");
  console.log("\nKey Hash (500 gwei):");
  console.log("0x83d1b6e3388bed3d76426974512bb0d270e9542a765cd667242ea26c0cc0b730");
  
  console.log("\n🔗 Verify at:");
  console.log("https://docs.chain.link/vrf/v2/subscription/supported-networks#arbitrum-sepolia-testnet");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });