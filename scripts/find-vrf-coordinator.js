const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Finding correct VRF Coordinator for Arbitrum Sepolia...");
  
  // Updated addresses from Chainlink documentation
  const coordinators = [
    {
      address: "0x50d47e4142598E3411aA864e08a44284e471AC6f",
      name: "VRF Coordinator V2 (Arbitrum Sepolia)",
      keyHash: "0x83d1b6e3388bed3d76426974512bb0d270e9542a765cd667242ea26c0cc0b730"
    },
    {
      address: "0x5CE8D5A2BC84beb22a398CCA51996F7930313D61", 
      name: "Alternative VRF Coordinator",
      keyHash: "0x83d1b6e3388bed3d76426974512bb0d270e9542a765cd667242ea26c0cc0b730"
    }
  ];

  const testABI = [
    "function createSubscription() external returns (uint64 subId)",
    "function getSubscription(uint64 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)"
  ];

  for (const coord of coordinators) {
    console.log(`\n🧪 Testing: ${coord.name}`);
    console.log(`Address: ${coord.address}`);
    
    try {
      const provider = ethers.provider;
      const code = await provider.getCode(coord.address);
      
      if (code === "0x") {
        console.log("❌ No contract at this address");
        continue;
      }
      
      console.log("✅ Contract exists");
      
      const coordinator = new ethers.Contract(coord.address, testABI, provider);
      
      // Test with subscription ID 1 (commonly exists)
      try {
        const info = await coordinator.getSubscription(1);
        console.log("✅ Successfully called getSubscription(1)");
        console.log("- Owner:", info.owner);
        console.log("- Balance:", ethers.formatEther(info.balance), "LINK");
        console.log("- Consumers:", info.consumers.length);
        
        console.log("🎯 This coordinator is working!");
        console.log("📝 Update your configuration:");
        console.log(`VRF_COORDINATOR=${coord.address}`);
        console.log(`VRF_KEY_HASH=${coord.keyHash}`);
        
        return coord;
        
      } catch (error) {
        if (error.message.includes("InvalidSubscription")) {
          console.log("✅ Coordinator responds correctly (InvalidSubscription for ID 1)");
          console.log("🎯 This coordinator is working!");
          console.log("📝 Update your configuration:");
          console.log(`VRF_COORDINATOR=${coord.address}`);
          console.log(`VRF_KEY_HASH=${coord.keyHash}`);
          
          return coord;
        } else {
          console.log("❌ Error:", error.message.substring(0, 100));
        }
      }
      
    } catch (error) {
      console.log("❌ Error:", error.message.substring(0, 100));
    }
  }
  
  console.log("\n❌ No working VRF Coordinator found");
  console.log("💡 Check Chainlink documentation for latest addresses:");
  console.log("https://docs.chain.link/vrf/v2/subscription/supported-networks");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });