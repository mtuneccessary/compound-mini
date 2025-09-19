#!/usr/bin/env node

/**
 * Network Switcher Script
 * 
 * Usage:
 *   node scripts/switch-network.js local
 *   node scripts/switch-network.js sepolia
 */

const fs = require('fs');
const path = require('path');

const validNetworks = ['local', 'sepolia'];

function showUsage() {
  console.log(`
🌐 Network Switcher for Compound Mini

Usage:
  node scripts/switch-network.js <network>

Networks:
  local    - Local mainnet fork (default)
  sepolia  - Sepolia testnet

Examples:
  node scripts/switch-network.js local
  node scripts/switch-network.js sepolia
`);
}

function switchNetwork(network) {
  if (!validNetworks.includes(network)) {
    console.error(`❌ Invalid network: ${network}`);
    showUsage();
    process.exit(1);
  }

  const envPath = path.join(process.cwd(), '.env.local');
  
  try {
    // Read existing .env.local if it exists
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Remove existing NEXT_PUBLIC_NETWORK line
    envContent = envContent.replace(/^NEXT_PUBLIC_NETWORK=.*$/m, '');

    // Add new network configuration
    envContent += `\n# Network Configuration\nNEXT_PUBLIC_NETWORK=${network}\n`;

    // Add network-specific configuration
    if (network === 'local') {
      envContent += `
# Local Mainnet Fork Configuration
# Configure your mainnet RPC in onchain/.env
# ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
# FORK_BLOCK=23378885
`;
    } else if (network === 'sepolia') {
      envContent += `
# Sepolia Testnet Configuration
# Add one of the following RPC providers:
# NEXT_PUBLIC_INFURA_KEY=your_infura_project_id
# NEXT_PUBLIC_ALCHEMY_KEY=your_alchemy_api_key
# SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
`;
    }

    // Write the updated .env.local
    fs.writeFileSync(envPath, envContent.trim() + '\n');

    console.log(`✅ Switched to ${network} network`);
    console.log(`📝 Updated .env.local file`);
    
    if (network === 'local') {
      console.log(`
🚀 Next steps for local mainnet fork:
1. Configure your RPC in onchain/.env:
   echo 'ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY' > onchain/.env
   echo 'FORK_BLOCK=23378885' >> onchain/.env

2. Start the local node:
   cd onchain && npm run node

3. Start the frontend:
   npm run dev
`);
    } else if (network === 'sepolia') {
      console.log(`
🚀 Next steps for Sepolia testnet:
1. Add your RPC provider to .env.local:
   echo 'NEXT_PUBLIC_INFURA_KEY=your_infura_project_id' >> .env.local

2. Start the frontend:
   npm run dev

3. Switch your wallet to Sepolia testnet
`);
    }

  } catch (error) {
    console.error(`❌ Error switching network: ${error.message}`);
    process.exit(1);
  }
}

// Main execution
const network = process.argv[2];

if (!network) {
  showUsage();
  process.exit(1);
}

switchNetwork(network);
