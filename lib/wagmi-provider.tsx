"use client"

import { ReactNode } from "react"
import { WagmiProvider, createConfig, http } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { injected } from "wagmi/connectors"

const localhost = {
	id: 31337,
	name: "Hardhat",
	nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
	rpcUrls: {
		default: { http: [process.env.NEXT_PUBLIC_LOCAL_RPC_URL || "http://127.0.0.1:18545"] },
	},
} as const

const config = createConfig({
	chains: [localhost],
	transports: {
		[localhost.id]: http(localhost.rpcUrls.default.http[0]),
	},
	connectors: [injected()],
})

const queryClient = new QueryClient()

export function AppWagmiProvider({ children }: { children: ReactNode }) {
	return (
		<WagmiProvider config={config}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</WagmiProvider>
	)
} 