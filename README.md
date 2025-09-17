# Compound Mini App

A decentralized lending and borrowing application built with Next.js, integrating with Compound Protocol for on-chain DeFi operations.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/nashons-projects/v0-telegram-mini-app)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)

## Features

- 🏦 **Supply Assets**: Deposit tokens to earn interest
- 💰 **Borrow Assets**: Borrow against your supplied collateral
- 📊 **Portfolio Analytics**: Track your lending positions and health factor
- 🔄 **Real-time Rates**: Live interest rates and market data
- 🎯 **Health Factor Monitoring**: Automated risk management
- 🌐 **Multi-Network Support**: Local mainnet fork and Sepolia testnet
- 📱 **Responsive UI**: Modern, mobile-first design

## Requirements

- Node.js version ≥ 18.18.0
- npm or yarn package manager
- Git

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/itsored/compound-mini.git
cd compound-mini
```

### 2. Install Dependencies

```bash
# Install main app dependencies
npm install

# Install onchain dependencies
cd onchain
npm install
cd ..
```

### 3. Network Configuration

The app supports two network modes:

#### Option A: Local Mainnet Fork (Recommended for Development)
```bash
# Set network to local mainnet fork
echo 'NEXT_PUBLIC_NETWORK=local' > .env.local

# Configure mainnet fork (in onchain directory)
cd onchain
echo 'ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY' > .env
echo 'FORK_BLOCK=23378885' >> .env
cd ..
```

#### Option B: Sepolia Testnet
```bash
# Set network to Sepolia testnet
echo 'NEXT_PUBLIC_NETWORK=sepolia' > .env.local

# Add RPC provider (choose one)
echo 'NEXT_PUBLIC_INFURA_KEY=your_infura_project_id' >> .env.local
# OR
echo 'NEXT_PUBLIC_ALCHEMY_KEY=your_alchemy_api_key' >> .env.local
```

📖 **See [NETWORK_CONFIG.md](./NETWORK_CONFIG.md) for detailed network configuration guide**

#### Quick Network Switching
```bash
# Switch to local mainnet fork
npm run switch:local

# Switch to Sepolia testnet  
npm run switch:sepolia

# Test Sepolia connection
npm run test:sepolia
```

### 4. Start the Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## Onchain Development

### Setting Up a Local Mainnet Fork

To run the application with a real mainnet fork (recommended for testing), you'll need to configure the Hardhat node with proper RPC credentials.

#### 1. Create Environment File

Create a `.env` file in the `onchain` directory:

```bash
cd onchain
echo 'ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY' > .env
echo 'FORK_BLOCK=23378885' >> .env
```

**Required Environment Variables:**
- `ETH_RPC_URL`: Your Alchemy or Infura mainnet RPC endpoint
- `FORK_BLOCK`: The block number to fork from (optional, defaults to latest)

#### 2. Start Hardhat Node with Mainnet Fork

```bash
cd onchain
npm run node
```

This starts a local Ethereum node forked from mainnet at `http://localhost:8545`

#### 3. Verify Mainnet Fork is Working

Test that you have real mainnet data:

```bash
# Check block number (should be your fork block)
curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://127.0.0.1:8545

# Check real contract (USDC should exist)
curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_getCode","params":["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "latest"],"id":1}' \
  http://127.0.0.1:8545
```

#### 4. Test Account Information

The Hardhat node provides 20 test accounts with 10,000 ETH each:

**Account #0 (Primary Test Account):**
- **Address**: `0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266`
- **Private Key**: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- **Balance**: 10,000 ETH

#### 5. MetaMask Configuration

Add the local network to MetaMask:
- **Network Name**: Hardhat Local
- **RPC URL**: `http://127.0.0.1:8545`
- **Chain ID**: 31337
- **Currency Symbol**: ETH

#### 6. Wrap ETH to WETH

To test DeFi functionality, you'll need WETH (Wrapped ETH). The application requires WETH for supply and borrow operations.

**Wrap ETH for a single account:**
```bash
cd onchain
npx hardhat run scripts/wrap-eth-simple.ts --network localhost
```

**Wrap ETH for multiple accounts:**
```bash
npx hardhat run scripts/wrap-multiple.ts --network localhost
```

**Wrap half of your ETH:**
```bash
npx hardhat run scripts/wrap-half.ts --network localhost
```

**Expected Results:**
- Account #0: 3.0 WETH (from multiple wrapping operations)
- Account #1: 2.0 WETH 
- Account #2: 2.0 WETH
- Each account retains ~9,998 ETH for gas fees

**Why WETH is needed:**
- The Compound Protocol (Comet) requires WETH for supply operations
- WETH is the wrapped version of ETH that can be used in DeFi protocols
- Your test accounts start with 10,000 ETH but need WETH for lending/borrowing

### Alternative: Fresh Local Network

If you don't need mainnet data, you can run without forking:

```bash
cd onchain
# Remove or comment out ETH_RPC_URL in .env
npm run node
```

**Note**: Without mainnet forking, you'll only have the test accounts and no real contract data.

### Available Scripts

#### ETH Wrapping Scripts

**Wrap ETH to WETH (Simple)**
```bash
cd onchain
npx hardhat run scripts/wrap-eth-simple.ts --network localhost
```

**Wrap Half of Your ETH**
```bash
npx hardhat run scripts/wrap-half.ts --network localhost
```

**Wrap Multiple Amounts**
```bash
npx hardhat run scripts/wrap-multiple.ts --network localhost
```

#### Other Utility Scripts

**Check Comet Protocol Status**
```bash
npx hardhat run scripts/check-comet.ts --network localhost
```

**Get WETH Price**
```bash
npx hardhat run scripts/get-weth-price.ts --network localhost
```

**Test User Positions**
```bash
npx hardhat run scripts/test-positions.ts --network localhost
```

**Seed Test Data**
```bash
npx hardhat run scripts/seed.ts --network hardhat
```

**Demo Supply & Borrow**
```bash
npx hardhat run scripts/demo-supply-borrow.ts --network localhost
```

### Compile Contracts

```bash
cd onchain
npm run compile
```

## Project Structure

```
compound-mini/
├── app/                    # Next.js app directory
│   ├── borrow/            # Borrow page
│   ├── supply/            # Supply page
│   ├── withdraw/          # Withdraw page
│   ├── repay/             # Repay page
│   └── history/           # Transaction history
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── dashboard.tsx     # Main dashboard
│   ├── asset-list.tsx    # Asset management
│   └── ...               # Other components
├── lib/                  # Utility libraries
│   ├── comet-onchain.ts  # Compound integration
│   ├── wagmi-provider.tsx # Web3 provider
│   └── utils.ts          # Helper functions
├── onchain/              # Hardhat project
│   ├── scripts/          # Deployment & utility scripts
│   ├── abis/            # Contract ABIs
│   └── hardhat.config.ts # Hardhat configuration
└── public/               # Static assets
```

## Technologies Used

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Web3**: Wagmi, Viem, Ethers.js
- **Blockchain**: Hardhat, Ethereum
- **DeFi**: Compound Protocol (Comet)
- **State Management**: TanStack Query
- **Forms**: React Hook Form, Zod validation

## Development Workflow

### With Mainnet Fork (Recommended)

1. **Set up environment**: Create `.env` file in `onchain/` with your RPC URL
2. **Start the local blockchain**: `cd onchain && npm run node`
3. **Verify fork**: Check that you have real mainnet data
4. **Wrap ETH to WETH**: Use the wrapping scripts to get WETH for testing
   - Single account: `npx hardhat run scripts/wrap-eth-simple.ts --network localhost`
   - Multiple accounts: `npx hardhat run scripts/wrap-multiple.ts --network localhost`
5. **Start the frontend**: `npm run dev`
6. **Connect wallet**: Use MetaMask to connect to localhost:8545
7. **Test features**: Supply, borrow, and manage positions with real contracts

### With Fresh Local Network

1. **Start the local blockchain**: `cd onchain && npm run node`
2. **Wrap ETH to WETH**: Use the wrapping scripts to get WETH for testing
   - Single account: `npx hardhat run scripts/wrap-eth-simple.ts --network localhost`
   - Multiple accounts: `npx hardhat run scripts/wrap-multiple.ts --network localhost`
3. **Start the frontend**: `npm run dev`
4. **Connect wallet**: Use MetaMask or similar to connect to localhost:8545
5. **Test features**: Supply, borrow, and manage positions (limited to test contracts)

## Deployment

### Vercel (Recommended)

1. Push your changes to the `staging` branch
2. Connect your GitHub repository to Vercel
3. Deploy from the staging branch

### Manual Deployment

```bash
npm run build
npm run start
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For questions or support, please open an issue on GitHub or contact the development team.