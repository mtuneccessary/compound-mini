"use client"

import { createPublicClient, createWalletClient, http, parseUnits } from "viem"
import { hardhat } from "viem/chains"
import cometAbi from "./abis/comet.json"
import erc20Abi from "./abis/erc20.json"

const rpcUrl = process.env.NEXT_PUBLIC_LOCAL_RPC_URL || "http://127.0.0.1:8545"

export const publicClient = createPublicClient({ chain: hardhat, transport: http(rpcUrl) })

export function getWalletClient() {
	if (typeof window === "undefined") throw new Error("wallet client only available in browser")
	return createWalletClient({ chain: hardhat, transport: http(rpcUrl) })
}

export const COMET_ADDRESS = (process.env.NEXT_PUBLIC_COMET_ADDRESS || "0xc3d688B66703497DAA19211EEdff47f25384cdc3") as `0x${string}`
export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS || "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48") as `0x${string}`
export const WETH_ADDRESS = (process.env.NEXT_PUBLIC_WETH_ADDRESS || "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2") as `0x${string}`

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