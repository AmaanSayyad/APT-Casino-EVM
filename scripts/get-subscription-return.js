const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Getting Subscription ID from Transaction Return...");

  const [deployer] = await ethers.getSigners();
  const txHash = "0xd0ecf610a6070241e99c82008da0532c5c0edcb663e4bf137cd316277af01bf0";
  
  try {
    // Get transaction receipt
    const receipt = await deployer.provider.getTransactionReceipt(txHash);
    console.log("📋 Transaction Status:", receipt.status === 1 ? "Success" : "Failed");
    
    // Get transaction details
    const tx = await deployer.provider.getTransaction(txHash);
    console.log("📝 Transaction Data:", tx.data);
    console.log("📝 Transaction To:", tx.to);
    
    // The transaction data is 0xa21a23e4 which is createSubscription()
    // Let's try to decode the return data
    const vrfCoordinatorAddress = "0x6D80646bEAdd07cE68cab36c27c626790bBcf17f";
    
    if (tx.to?.toLowerCase() === vrfCoordinatorAddress.toLowerCase()) {
      console.log("✅ This is a VRF Coordinator transaction");
      
      // Try to call createSubscription and get the return value
      const vrfCoordinatorABI = [
        "function createSubscription() external returns (uint64 subId)"
      ];
      
      const vrfCoordinator = new ethers.Contract(vrfCoordinatorAddress, vrfCoordinatorABI, deployer);
      
      try {
        // Call the function to get the subscription ID
        const subscriptionId = await vrfCoordinator.createSubscription.staticCall();
        console.log("🎉 New Subscription ID:", subscriptionId.toString());
        
        // Now let's add consumer and fund
        console.log("\n🔗 Adding consumer...");
        const vrfContractAddress = process.env.NEXT_PUBLIC_VRF_CONTRACT_ADDRESS || "0xacA996A4d49e7Ed42dA68a20600F249BE6d024A4";
        
        const addConsumerABI = [
          "function addConsumer(uint64 subId, address consumer) external"
        ];
        const addConsumerContract = new ethers.Contract(vrfCoordinatorAddress, addConsumerABI, deployer);
        
        const addConsumerTx = await addConsumerContract.addConsumer(subscriptionId, vrfContractAddress);
        console.log("Add consumer tx:", addConsumerTx.hash);
        await addConsumerTx.wait();
        console.log("✅ Consumer added!");
        
        // Fund subscription
        console.log("\n💰 Funding subscription...");
        const fundABI = [
          "function fundSubscriptionWithNative(uint64 subId) external payable"
        ];
        const fundContract = new ethers.Contract(vrfCoordinatorAddress, fundABI, deployer);
        
        const fundTx = await fundContract.fundSubscriptionWithNative(subscriptionId, {
          value: ethers.parseEther("0.01")
        });
        console.log("Fund tx:", fundTx.hash);
        await fundTx.wait();
        console.log("✅ Subscription funded!");
        
        console.log("\n🎉 VRF Subscription Setup Complete!");
        console.log("Subscription ID:", subscriptionId.toString());
        console.log("Consumer Address:", vrfContractAddress);
        
        console.log("\n📝 Update your .env.local file:");
        console.log(`VRF_SUBSCRIPTION_ID=${subscriptionId.toString()}`);
        
      } catch (error) {
        console.error("❌ Error calling createSubscription:", error.message);
        
        // If static call fails, let's try a different approach
        console.log("\n🔄 Trying alternative approach...");
        
        // Let's try to find the subscription by checking recent transactions
        const currentBlock = await deployer.provider.getBlockNumber();
        console.log("Current block:", currentBlock);
        
        // Check if we can find the subscription by trying different IDs
        const checkSubscriptionABI = [
          "function getSubscription(uint64 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)"
        ];
        const checkContract = new ethers.Contract(vrfCoordinatorAddress, checkSubscriptionABI, deployer);
        
        // Try to find a valid subscription ID
        for (let i = 1; i <= 10; i++) {
          try {
            const subscription = await checkContract.getSubscription(i);
            console.log(`✅ Found subscription ${i}:`, {
              balance: ethers.formatEther(subscription.balance),
              reqCount: subscription.reqCount.toString(),
              owner: subscription.owner
            });
            
            if (subscription.owner.toLowerCase() === deployer.address.toLowerCase()) {
              console.log(`🎉 Found our subscription: ${i}`);
              break;
            }
          } catch (error) {
            // Subscription doesn't exist
          }
        }
      }
    } else {
      console.log("❌ This is not a VRF Coordinator transaction");
    }
    
  } catch (error) {
    console.error("❌ Error getting subscription return:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


