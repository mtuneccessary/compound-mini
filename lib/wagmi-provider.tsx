"use client"

import { ReactNode, useEffect } from "react"
import { WagmiProvider, createConfig, http } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { injected, metaMask, walletConnect } from "wagmi/connectors"
import { hardhat, sepolia } from "viem/chains"
import { getCurrentNetworkConfig, getRpcUrl } from "./network-config"
import { isTelegramEnv } from "./utils"

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

const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID

// Get the current origin for WalletConnect metadata
const getCurrentOrigin = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return process.env.NEXT_PUBLIC_PUBLIC_BASE_URL || 'http://localhost:3002'
}

// Runtime env & provider detection (client-only)
const runtimeHasWindow = typeof window !== 'undefined'
const isTelegram = runtimeHasWindow && isTelegramEnv()
const hasInjected = () => {
  try {
    const eth = runtimeHasWindow ? (window as any).ethereum : undefined
    if (!eth) return false
    if (Array.isArray(eth.providers)) return eth.providers.length > 0
    return true
  } catch {
    return false
  }
}

const shouldIncludeWalletConnect = runtimeHasWindow && !!wcProjectId && (isTelegram || !hasInjected())

const connectorsList = [
	// Prefer generic injected (Rabby, etc.) first, then MetaMask
	injected({ shimDisconnect: true }),
	metaMask(),
	// WalletConnect only when needed (Telegram or no injected wallet in browser)
	...(shouldIncludeWalletConnect
		? [
			walletConnect({
				projectId: wcProjectId as string,
				// Browser with injected: QR off; Telegram or no injected: QR on
				showQrModal: isTelegram || !hasInjected(),
				metadata: {
					name: "Compound Mini",
					description: "DeFi lending and borrowing",
					url: getCurrentOrigin(),
					icons: [`${getCurrentOrigin()}/complogo.png`],
				},
			}),
		]
		: []),
]

const config = createConfig({
	chains: [chain],
	transports: {
		[chain.id]: http(rpcUrl),
	},
	connectors: connectorsList,
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
