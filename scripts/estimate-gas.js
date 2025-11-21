const hre = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔍 Estimating gas for SecureFlow deployment...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deployer address:", deployer.address);

  // Use USDC on Base mainnet or MockERC20 for testing
  let tokenAddress;

  if (hre.network.name === "base") {
    // USDC on Base mainnet
    tokenAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  } else {
    // For testnet, we'll estimate with a dummy address
    tokenAddress = "0x0000000000000000000000000000000000000000";
  }

  const feeCollector = deployer.address;
  const platformFeeBP = 0;

  // Get contract factory
  const SecureFlow = await hre.ethers.getContractFactory("SecureFlow");

  // Estimate gas for deployment
  const deploymentData = SecureFlow.interface.encodeDeploy([
    tokenAddress,
    feeCollector,
    platformFeeBP,
  ]);

  const gasEstimate = await hre.ethers.provider.estimateGas({
    data: deploymentData,
    from: deployer.address,
  });

  // Get current gas price
  const feeData = await hre.ethers.provider.getFeeData();
  const gasPrice =
    feeData.gasPrice ||
    feeData.maxFeePerGas ||
    hre.ethers.parseUnits("20", "gwei");

  // Calculate cost
  const gasCost = gasEstimate * gasPrice;
  const gasCostInEth = hre.ethers.formatEther(gasCost);

  console.log("\n📊 Gas Estimation Results:");
  console.log("⛽ Estimated gas units:", gasEstimate.toString());
  console.log(
    "💰 Gas price:",
    hre.ethers.formatUnits(gasPrice, "gwei"),
    "gwei"
  );
  console.log("💵 Estimated cost:", gasCostInEth, "ETH");
  console.log("🌐 Network:", hre.network.name);
  console.log("🔗 Chain ID:", (await hre.ethers.provider.getNetwork()).chainId);

  // Convert to USD if on mainnet
  if (hre.network.name === "base") {
    console.log(
      "💲 Estimated cost: ~$",
      (parseFloat(gasCostInEth) * 3000).toFixed(2),
      "USD (assuming $3000 ETH)"
    );
  }
}

main()
  .then(() => {
    console.log("✅ Gas estimation completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Gas estimation failed:", error);
    process.exit(1);
  });





