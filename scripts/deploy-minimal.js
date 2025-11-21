const hre = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 Deploying SecureFlow to Base mainnet...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deployer:", deployer.address);
  
  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(balance), "ETH");
  
  if (balance < hre.ethers.parseEther("0.0001")) {
    throw new Error("Insufficient balance for deployment");
  }

  // Deploy with USDC on Base mainnet
  const tokenAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const feeCollector = deployer.address;
  const platformFeeBP = 0;

  console.log("🔒 Deploying contract...");
  const SecureFlow = await hre.ethers.getContractFactory("SecureFlow");
  
  try {
    // Try with higher gas price to avoid "already known" error
    const feeData = await hre.ethers.provider.getFeeData();
    const gasPrice = feeData.gasPrice || hre.ethers.parseUnits("20", "gwei");
    const higherGasPrice = gasPrice * 2n; // Double the gas price
    
    console.log("⛽ Gas price:", hre.ethers.formatUnits(gasPrice, "gwei"), "gwei");
    console.log("⛽ Using gas price:", hre.ethers.formatUnits(higherGasPrice, "gwei"), "gwei");
    
    const secureFlow = await SecureFlow.deploy(
      tokenAddress,
      feeCollector,
      platformFeeBP,
      {
        gasPrice: higherGasPrice
      }
    );
    
    console.log("⏳ Waiting for deployment...");
    await secureFlow.waitForDeployment();
    
    const address = await secureFlow.getAddress();
    console.log("✅ Deployed to:", address);
    
    // Wait and verify
    console.log("⏳ Waiting 60 seconds before verification...");
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    try {
      console.log("🔍 Verifying contract...");
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [tokenAddress, feeCollector, platformFeeBP],
      });
      console.log("✅ Contract verified!");
    } catch (error) {
      console.log("❌ Verification failed:", error.message);
    }
    
    console.log("\n🎉 Deployment complete!");
    console.log("📄 Contract Address:", address);
    console.log("🔗 View on BaseScan: https://basescan.org/address/" + address);
    
    // Save deployment info
    const fs = require("fs");
    const deploymentInfo = {
      network: "base",
      chainId: "8453",
      deployer: deployer.address,
      contractAddress: address,
      tokenAddress: tokenAddress,
      deploymentTime: new Date().toISOString(),
    };
    
    fs.writeFileSync(
      "deployed-mainnet.json",
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("📝 Deployment info saved to deployed-mainnet.json");
    
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    
    // Check if contract is already deployed
    console.log("\n🔍 Checking if contract might already be deployed...");
    console.log("💡 Try checking BaseScan for recent transactions from your address");
    console.log("🔗 https://basescan.org/address/" + deployer.address);
  }
}

main().catch(console.error);