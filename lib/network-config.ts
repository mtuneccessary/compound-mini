// Network configuration for Compound Mini
// Supports both local mainnet fork and Sepolia testnet

export type NetworkType = 'local' | 'sepolia' | 'custom'

export interface NetworkConfig {
  name: string
  chainId: number
  rpcUrl: string
  explorerUrl: string
  cometAddress: `0x${string}`
  wethAddress: `0x${string}`
  usdcAddress: `0x${string}`
  chainlinkEthUsdFeed: `0x${string}`
  isTestnet: boolean
  description: string
}

export const NETWORK_CONFIGS: Record<NetworkType, NetworkConfig> = {
  local: {
    name: 'Local Mainnet Fork',
    chainId: 31337,
    rpcUrl: 'http://127.0.0.1:8545',
    explorerUrl: 'https://etherscan.io',
    cometAddress: '0xc3d688b66703497daa19211eedff47f25384cdc3', // Mainnet Comet v3
    wethAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // Mainnet WETH
    usdcAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // Mainnet USDC
    chainlinkEthUsdFeed: '0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419', // Mainnet ETH/USD
    isTestnet: false,
    description: 'Local Hardhat node forked from Ethereum mainnet'
  },
  sepolia: {
    name: 'Sepolia Testnet',
    chainId: 11155111,
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY', // Will be overridden by env
    explorerUrl: 'https://sepolia.etherscan.io',
    cometAddress: '0xAec1F48e02Cfb822Be958B68C7957156EB3F0b6e', // Sepolia cUSDCv3
    wethAddress: '0x2D5ee574e710219a521449679A4A7f2B43f046ad', // Sepolia WETH
    usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC
    chainlinkEthUsdFeed: '0x694AA1769357215DE4FAC081bf1f309aDC325306', // Sepolia ETH/USD
    isTestnet: true,
    description: 'Ethereum Sepolia testnet for testing'
  },
  custom: {
    name: 'Custom (Mainnet fork/RPC)',
    chainId: 1,
    // Prefer NEXT_PUBLIC_ env on the client, fallback to server env, else publicnode
    rpcUrl: (process.env.NEXT_PUBLIC_ETH_RPC_URL || process.env.ETH_RPC_URL || 'https://ethereum.publicnode.com') as string,
    explorerUrl: 'https://etherscan.io',
    cometAddress: '0xc3d688b66703497daa19211eedff47f25384cdc3', // Mainnet Comet v3
    wethAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // Mainnet WETH
    usdcAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // Mainnet USDC
    chainlinkEthUsdFeed: '0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419', // Mainnet ETH/USD
    isTestnet: false,
    description: 'Custom RPC (e.g., Tenderly Fork)'
  }
}

// Get current network from environment variable
export function getCurrentNetwork(): NetworkType {
  const network = process.env.NEXT_PUBLIC_NETWORK as NetworkType
  console.log('🔍 [DEBUG] Environment NEXT_PUBLIC_NETWORK:', process.env.NEXT_PUBLIC_NETWORK)
  console.log('🔍 [DEBUG] Parsed network:', network)
  const result = network && network in NETWORK_CONFIGS ? network : 'local'
  console.log('🔍 [DEBUG] Selected network:', result)
  return result
}

// Get current network configuration
export function getCurrentNetworkConfig(): NetworkConfig {
  const net = getCurrentNetwork()
  console.log('🔍 [DEBUG] Getting config for network:', net)
  const base = NETWORK_CONFIGS[net]
  console.log('🔍 [DEBUG] Base config chainId:', base.chainId)
  // For custom, refresh rpcUrl from env on access
  if (net === 'custom') {
    const envRpc = (process.env.NEXT_PUBLIC_ETH_RPC_URL || process.env.ETH_RPC_URL) as string | undefined
    console.log('🔍 [DEBUG] Custom network RPC URL:', envRpc)
    const result = { ...base, rpcUrl: envRpc || base.rpcUrl }
    console.log('🔍 [DEBUG] Final custom config:', result)
    return result
  }
  console.log('🔍 [DEBUG] Final config:', base)
  return base
}

// Environment variable names for each network
export const NETWORK_ENV_VARS = {
  local: {
    RPC_URL: 'ETH_RPC_URL',
    FORK_BLOCK: 'FORK_BLOCK'
  },
  sepolia: {
    RPC_URL: 'SEPOLIA_RPC_URL',
    INFURA_KEY: 'NEXT_PUBLIC_INFURA_KEY',
    ALCHEMY_KEY: 'NEXT_PUBLIC_ALCHEMY_KEY'
  },
  custom: {
    RPC_URL: 'ETH_RPC_URL'
  }
}

// Helper to get RPC URL for current network
export function getRpcUrl(): string {
  const network = getCurrentNetwork()
  const config = getCurrentNetworkConfig()
  
  if (network === 'local') {
    return config.rpcUrl
  }
  
  if (network === 'sepolia') {
    // Try environment variables in order of preference
    const sepoliaRpc = process.env.SEPOLIA_RPC_URL
    const infuraKey = process.env.NEXT_PUBLIC_INFURA_KEY
    const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_KEY
    
    if (sepoliaRpc) return sepoliaRpc
    if (infuraKey) return `https://sepolia.infura.io/v3/${infuraKey}`
    if (alchemyKey) return `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`
    
    // Fallback to public RPC (rate limited)
    return 'https://sepolia.publicnode.com'
  }

  if (network === 'custom') {
    return (process.env.NEXT_PUBLIC_ETH_RPC_URL || process.env.ETH_RPC_URL || config.rpcUrl) as string
  }
  
  return config.rpcUrl
}
