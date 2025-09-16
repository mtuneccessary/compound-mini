"use client"

import { ReactNode, useEffect } from "react"
import { WagmiProvider, createConfig, http } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { injected, metaMask } from "wagmi/connectors"

const localhost = {
	id: 31337,
	name: "Hardhat",
	nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
	rpcUrls: {
		default: { http: [process.env.NEXT_PUBLIC_LOCAL_RPC_URL || "http://127.0.0.1:8545"] },
	},
} as const

const config = createConfig({
	chains: [localhost],
	transports: {
		[localhost.id]: http(localhost.rpcUrls.default.http[0]),
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