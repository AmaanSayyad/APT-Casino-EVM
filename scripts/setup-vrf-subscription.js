const { ethers } = require("hardhat");

// Chainlink VRF v2 Subscription Manager for Sepolia
const SUBSCRIPTION_MANAGER_ADDRESS = "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625";

// Minimal ABI for VRF Coordinator V2
const VRF_COORDINATOR_ABI = [
  "function createSubscription() external returns (uint64 subId)",
  "function addConsumer(uint64 subId, address consumer) external",
  "function fundSubscription(uint64 subId, uint96 amount) external",
  "function getSubscription(uint64 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)",
];

// LINK Token ABI (minimal)
const LINK_TOKEN_ABI = [
  "function transfer(address to, uint256 value) external returns (bool)",
  "function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
];

const LINK_TOKEN_ADDRESS = "0x779877A7B0D9E8603169DdbD7836e478b4624789"; // Sepolia LINK

async function main() {
  console.log("🔗 Setting up Chainlink VRF v2 Subscription...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Connect to VRF Coordinator
  const vrfCoordinator = new ethers.Contract(
    SUBSCRIPTION_MANAGER_ADDRESS,
    VRF_COORDINATOR_ABI,
    deployer
  );

  // Connect to LINK token
  const linkToken = new ethers.Contract(
    LINK_TOKEN_ADDRESS,
    LINK_TOKEN_ABI,
    deployer
  );

  try {
    // Check LINK balance
    const linkBalance = await linkToken.balanceOf(deployer.address);
    console.log("LINK balance:", ethers.formatEther(linkBalance), "LINK");

    if (linkBalance < ethers.parseEther("2")) {
      console.log("⚠️  Warning: You need at least 2 LINK tokens to fund the subscription");
      console.log("Get LINK tokens from: https://faucets.chain.link/sepolia");
    }

    // Create subscription
    console.log("Creating VRF subscription...");
    const createTx = await vrfCoordinator.createSubscription();
    const receipt = await createTx.wait();
    
    // Extract subscription ID from logs
    const subscriptionId = receipt.logs[0].topics[1];
    const subId = parseInt(subscriptionId, 16);
    
    console.log("✅ Subscription created with ID:", subId);

    // Fund subscription with 2 LINK
    if (linkBalance >= ethers.parseEther("2")) {
      console.log("Funding subscription with 2 LINK...");
      
      // Encode the subscription ID for transferAndCall
      const encodedSubId = ethers.AbiCoder.defaultAbiCoder().encode(["uint64"], [subId]);
      
      const fundTx = await linkToken.transferAndCall(
        SUBSCRIPTION_MANAGER_ADDRESS,
        ethers.parseEther("2"),
        encodedSubId
      );
      await fundTx.wait();
      
      console.log("✅ Subscription funded with 2 LINK");
    }

    // Get subscription details
    const subscription = await vrfCoordinator.getSubscription(subId);
    console.log("\n📊 Subscription Details:");
    console.log("- Subscription ID:", subId);
    console.log("- Balance:", ethers.formatEther(subscription.balance), "LINK");
    console.log("- Request Count:", subscription.reqCount.toString());
    console.log("- Owner:", subscription.owner);
    console.log("- Consumers:", subscription.consumers);

    // Save subscription info
    const subscriptionInfo = {
      subscriptionId: subId,
      owner: subscription.owner,
      balance: ethers.formatEther(subscription.balance),
      network: "sepolia",
      createdAt: new Date().toISOString(),
      transactionHash: createTx.hash,
    };

    const fs = require("fs");
    const path = require("path");
    
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(deploymentsDir, "vrf-subscription-sepolia.json"),
      JSON.stringify(subscriptionInfo, null, 2)
    );

    console.log("\n💾 Subscription info saved to deployments/vrf-subscription-sepolia.json");
    console.log("\n📋 Next Steps:");
    console.log("1. Update your .env file with:");
    console.log(`   VRF_SUBSCRIPTION_ID=${subId}`);
    console.log("2. Deploy your VRF consumer contract");
    console.log("3. Add the consumer contract to this subscription");

  } catch (error) {
    console.error("❌ Setup failed:", error);
    
    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Solutions:");
      console.log("- Get ETH from Sepolia faucet: https://sepoliafaucet.com/");
      console.log("- Get LINK from Chainlink faucet: https://faucets.chain.link/sepolia");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });