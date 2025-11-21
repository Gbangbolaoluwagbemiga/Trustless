const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Paymaster contract...");

  // Get the contract factory
  const Paymaster = await ethers.getContractFactory("Paymaster");

  // Deploy the contract
  const paymaster = await Paymaster.deploy();

  // Wait for deployment to complete
  await paymaster.waitForDeployment();

  const paymasterAddress = await paymaster.getAddress();

  console.log("Paymaster deployed to:", paymasterAddress);

  // Fund the paymaster with some ETH for gas sponsorship
  const [deployer] = await ethers.getSigners();
  const fundingAmount = ethers.parseEther("1.0"); // 1 ETH

  console.log(
    "Funding paymaster with",
    ethers.formatEther(fundingAmount),
    "ETH...",
  );

  const tx = await deployer.sendTransaction({
    to: paymasterAddress,
    value: fundingAmount,
  });

  await tx.wait();
  console.log("Paymaster funded successfully!");

  // Authorize the SecureFlow contract to use this paymaster
  const SECUREFLOW_ADDRESS = "0x540fDEc0D5675711f7Be40a648b3F8739Be3be5a"; // Update with actual address
  console.log("Authorizing SecureFlow contract...");

  const authTx = await paymaster.authorizeContract(SECUREFLOW_ADDRESS);
  await authTx.wait();
  console.log("SecureFlow contract authorized!");

  console.log("\n=== Paymaster Deployment Summary ===");
  console.log("Paymaster Address:", paymasterAddress);
  console.log("Funded Amount:", ethers.formatEther(fundingAmount), "ETH");
  console.log("Authorized Contract:", SECUREFLOW_ADDRESS);
  console.log("Owner:", await deployer.getAddress());

  console.log("\n=== Next Steps ===");
  console.log("1. Update your frontend to use this paymaster address");
  console.log(
    "2. Ensure the paymaster has sufficient funds for gas sponsorship",
  );
  console.log("3. Test gasless transactions with the paymaster");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });



