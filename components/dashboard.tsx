"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAccount } from "wagmi"
import { publicClient, COMET_ADDRESS } from "@/lib/comet-onchain"
import cometAbi from "@/lib/abis/comet.json"
import erc20Abi from "@/lib/abis/erc20.json"

export function Dashboard() {
	const [mounted, setMounted] = useState(false)
	const { address, isConnected } = useAccount()
	const [baseBorrowed, setBaseBorrowed] = useState<bigint>(BigInt(0))
	const [collateralWeth, setCollateralWeth] = useState<bigint>(BigInt(0))
	const [baseSymbol, setBaseSymbol] = useState<string>("BASE")
	const [baseDecimals, setBaseDecimals] = useState<number>(6)

	useEffect(() => {
		setMounted(true)
	}, [])

	useEffect(() => {
		async function loadBaseTokenMeta() {
			try {
				const baseToken = (await publicClient.readContract({ address: COMET_ADDRESS, abi: cometAbi as any, functionName: "baseToken", args: [] })) as `0x${string}`
				const [dec, sym] = (await Promise.all([
					publicClient.readContract({ address: baseToken, abi: erc20Abi as any, functionName: "decimals", args: [] }),
					publicClient.readContract({ address: baseToken, abi: erc20Abi as any, functionName: "symbol", args: [] }),
				])) as [number, string]
				setBaseDecimals(Number(dec))
				setBaseSymbol(sym)
			} catch {}
		}
		loadBaseTokenMeta()
	}, [])

	useEffect(() => {
		async function loadPositions() {
			if (!address) return
			try {
				const [bor, weth] = await Promise.all([
					publicClient.readContract({ address: COMET_ADDRESS, abi: cometAbi as any, functionName: "borrowBalanceOf", args: [address] }) as Promise<bigint>,
					publicClient.readContract({ address: COMET_ADDRESS, abi: cometAbi as any, functionName: "collateralBalanceOf", args: [address, (process.env.NEXT_PUBLIC_WETH_ADDRESS as `0x${string}`) || "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"] }) as Promise<bigint>,
				])
				setBaseBorrowed(bor)
				setCollateralWeth(weth)
			} catch {}
		}
		if (isConnected) loadPositions()
	}, [address, isConnected])

	if (!mounted) return null

	return (
		<div className="p-4 space-y-4 pb-24">
                        <Card>
                                <CardHeader className="pb-2">
                                        <CardTitle className="text-xl flex justify-between">
                                                <span>Dashboard</span>
                                        </CardTitle>
                                        <CardDescription>
                                                {isConnected ? "Your on-chain positions (live from Comet v3)" : "Connect your wallet to view positions and use the actions below."}
                                        </CardDescription>
                                </CardHeader>
                                {isConnected && (
                                        <CardContent>
                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                        <div className="rounded-lg bg-muted/60 p-3">
                                                                <div className="mb-1 text-xs text-muted-foreground">Collateral (WETH)</div>
                                                                <div className="text-lg font-semibold">{Number(collateralWeth) / 1e18}</div>
                                                        </div>
                                                        <div className="rounded-lg bg-muted/60 p-3">
                                                                <div className="mb-1 text-xs text-muted-foreground">Debt ({baseSymbol})</div>
                                                                <div className="text-lg font-semibold">{Number(baseBorrowed) / 10 ** baseDecimals}</div>
                                                        </div>
                                                </div>
                                        </CardContent>
                                )}
			</Card>
		</div>
	)
}
