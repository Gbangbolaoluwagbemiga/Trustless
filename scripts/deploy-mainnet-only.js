const hre = require("hardhat");
const fs = require("fs");
require("dotenv").config();

async function main() {
  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();

  console.log("🚀 Deploying SecureFlow to Base mainnet");
  console.log("📝 Deployer address:", deployer.address);
  console.log(
    "💰 Deployer balance:",
    hre.ethers.formatEther(
      await deployer.provider.getBalance(deployer.address)
    ),
    "ETH"
  );

  // Use USDC on Base mainnet
  const tokenAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const feeCollector = deployer.address;
  const platformFeeBP = 0; // 0% fees for hackathon demo

  console.log("✅ Using USDC on Base mainnet:", tokenAddress);

  // Deploy SecureFlow
  console.log("\n🔒 Deploying SecureFlow...");
  const SecureFlow = await hre.ethers.getContractFactory("SecureFlow");

  const secureFlow = await SecureFlow.deploy(
    tokenAddress, // token address (USDC on Base)
    feeCollector, // feeCollector
    platformFeeBP // platformFeeBP
  );

  console.log("⏳ Waiting for deployment to be mined...");
  await secureFlow.waitForDeployment();

  const contractAddress = await secureFlow.getAddress();
  console.log("✅ SecureFlow deployed to:", contractAddress);

  // Get contract info
  const contractInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    contracts: {
      SecureFlow: contractAddress,
      Token: tokenAddress,
    },
    deploymentTime: new Date().toISOString(),
  };

  // Save deployment info
  const deploymentInfo = {
    ...contractInfo,
    abi: secureFlow.interface.format("json"),
  };

  fs.writeFileSync(
    "deployed-mainnet.json",
    JSON.stringify(
      deploymentInfo,
      (key, value) => (typeof value === "bigint" ? value.toString() : value),
      2
    )
  );

  console.log("\n🎉 Deployment completed successfully!");
  console.log("📄 Contract address:", contractAddress);
  console.log("🌐 Network: Base mainnet");
  console.log("🔗 Chain ID:", (await hre.ethers.provider.getNetwork()).chainId);
  console.log("📝 Deployment info saved to deployed-mainnet.json");

  // Wait a bit before verification
  console.log("\n⏳ Waiting 30 seconds before verification...");
  await new Promise((resolve) => setTimeout(resolve, 30000));

  // Verify the contract
  console.log("\n🔍 Verifying contract on BaseScan...");
  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [tokenAddress, feeCollector, platformFeeBP],
    });
    console.log("✅ Contract verified successfully on BaseScan!");
  } catch (error) {
    console.log("❌ Verification failed:", error.message);
    console.log(
      "You can verify manually at: https://basescan.org/verifyContract"
    );
    console.log("Constructor args:", [
      tokenAddress,
      feeCollector,
      platformFeeBP,
    ]);
  }
}

main()
  .then(() => {
    console.log("✅ Deployment and verification completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    console.error("Error details:", error.message);
    process.exit(1);
  });





