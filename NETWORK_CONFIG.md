# Network Configuration Guide

This app supports both **Local Mainnet Fork** and **Sepolia Testnet**. You can easily switch between them using environment variables.

## Quick Setup

### 1. Local Mainnet Fork (Default)
```bash
# Set network to local
echo 'NEXT_PUBLIC_NETWORK=local' > .env.local

# Configure mainnet fork (in onchain/.env)
cd onchain
echo 'ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY' > .env
echo 'FORK_BLOCK=23378885' >> .env

# Start local node
npm run node

# Start frontend (in main directory)
cd ..
npm run dev
```

### 2. Sepolia Testnet
```bash
# Set network to sepolia
echo 'NEXT_PUBLIC_NETWORK=sepolia' > .env.local

# Add RPC provider (choose one)
echo 'NEXT_PUBLIC_INFURA_KEY=your_infura_project_id' >> .env.local
# OR
echo 'NEXT_PUBLIC_ALCHEMY_KEY=your_alchemy_api_key' >> .env.local
# OR
echo 'SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY' >> .env.local

# Test connection
npm run test:sepolia

# Start frontend
npm run dev
```

## Environment Variables

### Network Selection
- `NEXT_PUBLIC_NETWORK`: Set to `local` or `sepolia`

### Local Mainnet Fork
- `ETH_RPC_URL`: Your Alchemy/Infura mainnet RPC endpoint
- `FORK_BLOCK`: Block number to fork from (optional)

### Sepolia Testnet
- `SEPOLIA_RPC_URL`: Custom Sepolia RPC URL
- `NEXT_PUBLIC_INFURA_KEY`: Infura project ID
- `NEXT_PUBLIC_ALCHEMY_KEY`: Alchemy API key

## Network Details

### Local Mainnet Fork
- **Chain ID**: 31337
- **RPC**: http://127.0.0.1:8545
- **Explorer**: https://etherscan.io
- **Contracts**: Real mainnet addresses
- **Use Case**: Development with real mainnet state

### Sepolia Testnet
- **Chain ID**: 11155111
- **RPC**: Your configured RPC provider
- **Explorer**: https://sepolia.etherscan.io
- **Contracts**: Testnet addresses
- **Use Case**: Testing with testnet tokens

## Contract Addresses

### Local Mainnet Fork
- **Comet**: 0xc3d688b66703497daa19211eedff47f25384cdc3
- **WETH**: 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
- **USDC**: 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48

### Sepolia Testnet
- **Comet**: 0xAec1F48e02Cfb822Be958B68C7957156EB3F0b6e (cUSDCv3)
- **WETH**: 0x2D5ee574e710219a521449679A4A7f2B43f046ad
- **USDC**: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238

## Switching Networks

1. **Change Environment Variable**:
   ```bash
   # Switch to Sepolia
   echo 'NEXT_PUBLIC_NETWORK=sepolia' > .env.local
   
   # Switch back to local
   echo 'NEXT_PUBLIC_NETWORK=local' > .env.local
   ```

2. **Restart Development Server**:
   ```bash
   npm run dev
   ```

3. **Switch Wallet Network**: Use the Network Switcher component in the dashboard

## Troubleshooting

### Wrong Network Error
- Check that your wallet is connected to the correct network
- Verify the `NEXT_PUBLIC_NETWORK` environment variable
- Restart the development server after changing environment variables

### RPC Connection Issues
- Verify your RPC provider credentials
- Check rate limits on your RPC provider
- Try a different RPC provider

### Contract Not Found
- Ensure you're using the correct network
- Check that contracts are deployed on the selected network
- Verify contract addresses in the network configuration
