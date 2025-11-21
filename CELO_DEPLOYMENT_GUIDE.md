# 🚀 SecureFlow Celo Deployment Guide

## Prerequisites

1. **Private Key**: Ensure your `.env` file contains:

   ```
   PRIVATE_KEY=your_private_key_here
   ```

2. **Celoscan API Key** (for contract verification):

   - Get your API key from: https://celoscan.io/myapikey
   - Add to `.env`:

   ```
   CELOSCAN_API_KEY=your_celoscan_api_key_here
   ```

3. **Funds**: Ensure your deployer wallet has sufficient CELO for gas fees
   - Mainnet: Recommended 0.1+ CELO
   - Testnet: Get free testnet CELO from https://faucet.celo.org/

## Network Configuration

### Celo Mainnet

- **Chain ID**: 42220
- **RPC URL**: https://forno.celo.org
- **Explorer**: https://celoscan.io
- **Native Token**: CELO
- **Stablecoin**: cUSD (0x765DE816845861e75A25fCA122bb6898B8B1282a)

### Celo Testnet (Alfajores)

- **Chain ID**: 44787
- **RPC URL**: https://alfajores-forno.celo-testnet.org
- **Explorer**: https://alfajores.celoscan.io
- **Faucet**: https://faucet.celo.org/

## Deployment Steps

### 1. Deploy to Celo Mainnet

```bash
npx hardhat run scripts/deploy.js --network celo
```

This will:

- Deploy SecureFlow contract
- Use cUSD token (0x765DE816845861e75A25fCA122bb6898B8B1282a)
- Authorize arbiters
- Whitelist the token
- Automatically verify contracts on Celoscan
- Save deployment info to `deployed.json`

### 2. Deploy to Celo Testnet (Alfajores)

```bash
npx hardhat run scripts/deploy.js --network celoTestnet
```

This will:

- Deploy MockERC20 token for testing
- Deploy SecureFlow contract
- Authorize arbiters
- Whitelist the token
- Automatically verify contracts on Celoscan
- Save deployment info to `deployed.json`

### 3. Verify Contracts (if automatic verification fails)

If automatic verification fails during deployment, you can verify manually:

```bash
# Verify all contracts from deployed.json
npx hardhat run scripts/verify-contracts.js --network celo

# Or verify individually using Hardhat
npx hardhat verify --network celo <CONTRACT_ADDRESS> <CONSTRUCTOR_ARG1> <CONSTRUCTOR_ARG2> <CONSTRUCTOR_ARG3>
```

## Contract Verification

### SecureFlow Constructor Arguments

- `tokenAddress`: The token address (cUSD on mainnet, MockERC20 on testnet)
- `feeCollector`: Deployer address
- `platformFeeBP`: 0 (0% fees)

### MockERC20 Constructor Arguments (testnet only)

- `name`: "Mock Token"
- `symbol`: "MTK"
- `initialSupply`: "1000000000000000000000000" (1000000 tokens with 18 decimals)

## Example Verification Commands

### Verify SecureFlow on Mainnet

```bash
npx hardhat verify --network celo \
  <SECUREFLOW_ADDRESS> \
  "0x765DE816845861e75A25fCA122bb6898B8B1282a" \
  "<DEPLOYER_ADDRESS>" \
  0
```

### Verify SecureFlow on Testnet

```bash
npx hardhat verify --network celoTestnet \
  <SECUREFLOW_ADDRESS> \
  "<MOCKERC20_ADDRESS>" \
  "<DEPLOYER_ADDRESS>" \
  0
```

### Verify MockERC20 on Testnet

```bash
npx hardhat verify --network celoTestnet \
  <MOCKERC20_ADDRESS> \
  "Mock Token" \
  "MTK" \
  "1000000000000000000000000"
```

## Post-Deployment

After successful deployment:

1. **Check deployed.json** for contract addresses
2. **Verify on Celoscan** using the explorer links provided
3. **Update frontend** with new contract addresses if needed
4. **Test the contracts** using the deployed addresses

## Troubleshooting

### Insufficient Gas

- Ensure your wallet has enough CELO for gas fees
- Check gas price settings in `hardhat.config.js`

### Verification Fails

- Wait a few minutes after deployment before verifying
- Ensure `CELOSCAN_API_KEY` is set in `.env`
- Try manual verification using the commands above

### Network Connection Issues

- Check RPC URL in `hardhat.config.js`
- Try using a different RPC endpoint if available

## Support

For issues or questions:

- Check contract deployment logs
- Review `deployed.json` for deployment details
- Verify contracts on Celoscan explorer

---

_Last Updated: 2025-01-27_


