const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking VRF Fulfillment...");

  const [deployer] = await ethers.getSigners();
  const vrfContractAddress = "0xe2B5066f1521A4b882053F6D758d4288c5928586";
  const requestId = "113417881593868547171409739842734508315888151061645521809161422665559041354788";

  try {
    const vrfContract = await ethers.getContractAt("CasinoVRFConsumer", vrfContractAddress);
    
    console.log("📋 Request ID:", requestId);
    
    // Check request status
    const request = await vrfContract.getRequest(requestId);
    console.log("\n📋 Request Status:");
    console.log("  - Fulfilled:", request.fulfilled);
    console.log("  - Random Words:", request.randomWords);
    console.log("  - Game Type:", request.gameType);
    console.log("  - Game Sub Type:", request.gameSubType);
    console.log("  - Requester:", request.requester);
    console.log("  - Timestamp:", new Date(Number(request.timestamp) * 1000).toISOString());
    
    if (request.fulfilled) {
      console.log("\n🎉 VRF Proof generated successfully!");
      console.log("🎲 Random Words:", request.randomWords.map(w => w.toString()));
    } else {
      console.log("\n⏳ VRF fulfillment still pending...");
      console.log("⏰ Waiting 30 seconds and checking again...");
      
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      const request2 = await vrfContract.getRequest(requestId);
      console.log("\n📋 Updated Request Status:");
      console.log("  - Fulfilled:", request2.fulfilled);
      console.log("  - Random Words:", request2.randomWords);
      
      if (request2.fulfilled) {
        console.log("\n🎉 VRF Proof generated successfully!");
        console.log("🎲 Random Words:", request2.randomWords.map(w => w.toString()));
      } else {
        console.log("\n⏳ VRF fulfillment still pending...");
      }
    }
    
    // Check contract stats
    const contractInfo = await vrfContract.getContractInfo();
    console.log("\n📊 Contract Stats:");
    console.log("  - Total Requests:", contractInfo.totalRequests.toString());
    console.log("  - Total Fulfilled:", contractInfo.totalFulfilled.toString());
    
  } catch (error) {
    console.error("❌ Error checking VRF fulfillment:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

