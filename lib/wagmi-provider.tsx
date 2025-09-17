"use client"

import { ReactNode, useEffect } from "react"
import { WagmiProvider, createConfig, http } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { injected, metaMask } from "wagmi/connectors"
import { hardhat, sepolia } from "viem/chains"
import { getCurrentNetworkConfig, getRpcUrl } from "./network-config"

// Get current network configuration
const networkConfig = getCurrentNetworkConfig()
const rpcUrl = getRpcUrl()

// Create chain configuration based on current network
const chain = networkConfig.chainId === 31337 
  ? hardhat 
  : networkConfig.chainId === 11155111 
    ? sepolia 
    : {
        id: networkConfig.chainId,
        name: networkConfig.name,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: {
          default: { http: [rpcUrl] },
          public: { http: [rpcUrl] }
        },
        blockExplorers: {
          default: { name: 'Explorer', url: networkConfig.explorerUrl }
        }
      } as const

const config = createConfig({
	chains: [chain],
	transports: {
		[chain.id]: http(rpcUrl),
	},
	connectors: [
		// Try MetaMask first, then fallback to injected
		metaMask(),
		injected(),
	],
	// Add error handling for connector issues
	ssr: false,
})

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: (failureCount, error: any) => {
				// Don't retry wallet-related errors
				if (error?.message?.includes('wallet') || error?.code === 4001) {
					return false
				}
				return failureCount < 3
			},
		},
	},
})

export function AppWagmiProvider({ children }: { children: ReactNode }) {
	return (
		<WagmiProvider config={config}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</WagmiProvider>
	)
} 