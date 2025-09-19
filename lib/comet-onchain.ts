"use client"

import { createPublicClient, createWalletClient, http, parseUnits, defineChain } from "viem"
import { hardhat, sepolia } from "viem/chains"
import cometAbi from "./abis/comet.json"
import erc20Abi from "./abis/erc20.json"
import { getCurrentNetworkConfig, getRpcUrl } from "./network-config"

// Get current network configuration
const networkConfig = getCurrentNetworkConfig()
const rpcUrl = getRpcUrl()

// Create chain configuration based on current network
const chain = networkConfig.chainId === 31337 
  ? hardhat 
  : networkConfig.chainId === 11155111 
    ? sepolia 
    : defineChain({
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
      })

export const publicClient = createPublicClient({ chain, transport: http(rpcUrl) })

export function getWalletClient() {
	if (typeof window === "undefined") throw new Error("wallet client only available in browser")
	return createWalletClient({ chain, transport: http(rpcUrl) })
}

// Use network configuration for contract addresses
export const COMET_ADDRESS = networkConfig.cometAddress
export const USDC_ADDRESS = networkConfig.usdcAddress
export const WETH_ADDRESS = networkConfig.wethAddress
export const CHAINLINK_ETH_USD_FEED = networkConfig.chainlinkEthUsdFeed

export async function getBaseBalances(account: `0x${string}`) {
	const [supplied, borrowed] = await Promise.all([
		publicClient.readContract({ address: COMET_ADDRESS, abi: cometAbi, functionName: "balanceOf", args: [account] }),
		publicClient.readContract({ address: COMET_ADDRESS, abi: cometAbi, functionName: "borrowBalanceOf", args: [account] }),
	])
	return { supplied: BigInt(supplied as any), borrowed: BigInt(borrowed as any) }
}

export async function getRates() {
	const util = (await publicClient.readContract({ address: COMET_ADDRESS, abi: cometAbi, functionName: "getUtilization" })) as bigint
	const [supplyRate, borrowRate] = (await Promise.all([
		publicClient.readContract({ address: COMET_ADDRESS, abi: cometAbi, functionName: "getSupplyRate", args: [util] }),
		publicClient.readContract({ address: COMET_ADDRESS, abi: cometAbi, functionName: "getBorrowRate", args: [util] }),
	])) as [bigint, bigint]
	return { utilization: util, supplyRate, borrowRate }
}

export async function approve(asset: `0x${string}`, owner: `0x${string}`, spender: `0x${string}`, amount: bigint) {
	const hash = await getWalletClient().writeContract({ address: asset, abi: erc20Abi, functionName: "approve", args: [spender, amount], account: owner })
	return hash
}

export async function supply(asset: `0x${string}`, account: `0x${string}`, amount: bigint) {
	return await getWalletClient().writeContract({ address: COMET_ADDRESS, abi: cometAbi, functionName: "supply", args: [asset, amount], account })
}

export async function withdraw(asset: `0x${string}`, account: `0x${string}`, amount: bigint) {
	return await getWalletClient().writeContract({ address: COMET_ADDRESS, abi: cometAbi, functionName: "withdraw", args: [asset, amount], account })
} 