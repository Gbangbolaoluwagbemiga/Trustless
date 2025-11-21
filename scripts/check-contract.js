const hre = require("hardhat");

async function main() {
  const contractAddress = "0x540fDEc0D5675711f7Be40a648b3F8739Be3be5a";

  try {
    // Get the contract
    const SecureFlow = await hre.ethers.getContractFactory("SecureFlow");
    const contract = SecureFlow.attach(contractAddress);

    console.log("Checking contract status...");
    console.log("Contract Address:", contractAddress);

    // Check if contract is paused
    const paused = await contract.paused();
    console.log("Contract Paused:", paused);

    // Check if job creation is paused
    const jobCreationPaused = await contract.jobCreationPaused();
    console.log("Job Creation Paused:", jobCreationPaused);

    // Check next escrow ID
    const nextEscrowId = await contract.nextEscrowId();
    console.log("Next Escrow ID:", nextEscrowId.toString());

    // Check platform fee
    const platformFee = await contract.platformFeeBP();
    console.log("Platform Fee (BP):", platformFee.toString());

    // Check owner
    const owner = await contract.owner();
    console.log("Contract Owner:", owner);

    // Check if arbiters are authorized
    const arbiterAddress = "0x3be7fbbdbc73fc4731d60ef09c4ba1a94dc58e41";
    const isArbiterAuthorized =
      await contract.authorizedArbiters(arbiterAddress);
    console.log("Arbiter Authorized:", isArbiterAuthorized);

    // Check if MockERC20 is whitelisted
    const mockTokenAddress = "0xFE0F1320a49C5Ec0A341fef1f1e38de2E05Ff628";
    const isTokenWhitelisted =
      await contract.whitelistedTokens(mockTokenAddress);
    console.log("MockERC20 Whitelisted:", isTokenWhitelisted);

    console.log("\nContract is ready for escrow creation!");
  } catch (error) {
    console.error("Error checking contract:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
