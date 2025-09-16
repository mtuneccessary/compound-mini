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

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```bash
# Optional: Add your Alchemy API key for better RPC performance
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

### 4. Start the Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## Onchain Development

### Start Hardhat Node

```bash
cd onchain
npm run node
```

This starts a local Ethereum node forked from mainnet at `http://localhost:8545`

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

1. **Start the local blockchain**: `cd onchain && npm run node`
2. **Wrap some ETH**: Use the wrapping scripts to get WETH for testing
3. **Start the frontend**: `npm run dev`
4. **Connect wallet**: Use MetaMask or similar to connect to localhost:8545
5. **Test features**: Supply, borrow, and manage positions

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