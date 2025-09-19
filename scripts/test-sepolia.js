#!/usr/bin/env node

/**
 * Test Sepolia Network Connection
 * 
 * This script tests the connection to Sepolia testnet and verifies contract addresses
 */

const { createPublicClient, http } = require('viem');
const { sepolia } = require('viem/chains');

// Sepolia configuration
const SEPOLIA_RPC = 'https://eth-sepolia.g.alchemy.com/v2/l8MuEZH4Xyi2Mq5gR42_C';
const COMET_ADDRESS = '0xAec1F48e02Cfb822Be958B68C7957156EB3F0b6e';
const WETH_ADDRESS = '0x2D5ee574e710219a521449679A4A7f2B43f046ad';
const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';

async function testSepoliaConnection() {
  console.log('🌐 Testing Sepolia Network Connection...\n');

  try {
    // Create public client
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(SEPOLIA_RPC)
    });

    // Test 1: Get latest block
    console.log('📦 Test 1: Getting latest block...');
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`✅ Latest block: ${blockNumber.toString()}\n`);

    // Test 2: Get chain ID
    console.log('🔗 Test 2: Getting chain ID...');
    const chainId = await publicClient.getChainId();
    console.log(`✅ Chain ID: ${chainId} (expected: 11155111)\n`);

    // Test 3: Check contract codes
    console.log('📋 Test 3: Checking contract addresses...');
    
    const contracts = [
      { name: 'Comet (cUSDCv3)', address: COMET_ADDRESS },
      { name: 'WETH', address: WETH_ADDRESS },
      { name: 'USDC', address: USDC_ADDRESS }
    ];

    for (const contract of contracts) {
      try {
        const code = await publicClient.getCode({ address: contract.address });
        const status = code && code !== '0x' ? '✅ Deployed' : '❌ Not deployed';
        console.log(`   ${contract.name}: ${status} (${contract.address})`);
      } catch (error) {
        console.log(`   ${contract.name}: ❌ Error - ${error.message}`);
      }
    }

    console.log('\n🎉 Sepolia network test completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Open http://localhost:3000 in your browser');
    console.log('2. Connect your wallet to Sepolia testnet');
    console.log('3. Check the Network Status in the dashboard');
    console.log('4. Try supplying WETH or borrowing USDC');

  } catch (error) {
    console.error('❌ Error testing Sepolia connection:', error.message);
    process.exit(1);
  }
}

// Run the test
testSepoliaConnection();
