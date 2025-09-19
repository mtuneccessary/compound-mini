"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAccount } from "wagmi"
import { publicClient, COMET_ADDRESS, WETH_ADDRESS, USDC_ADDRESS } from "@/lib/comet-onchain"
import cometAbi from "@/lib/abis/comet.json"
import erc20Abi from "@/lib/abis/erc20.json"
import { RatesDashboard } from "./rates-dashboard"
import { HealthFactorMonitor } from "./health-factor-monitor"
import { MarketInsightsPanel } from "./market-insights-panel"
import { PortfolioAnalytics } from "./portfolio-analytics"
import { LendingMetricsCalculator } from "./lending-metrics-calculator"
import Image from "next/image"
import { motion } from "framer-motion"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"

export function Dashboard() {
	const [mounted, setMounted] = useState(false)
	const { address, isConnected } = useAccount()
	const [baseBorrowed, setBaseBorrowed] = useState<bigint>(BigInt(0))
	const [collateralWeth, setCollateralWeth] = useState<bigint>(BigInt(0))
	const [baseSupplied, setBaseSupplied] = useState<bigint>(BigInt(0))
	const [wethWalletBalance, setWethWalletBalance] = useState<bigint>(BigInt(0))
	const [usdcWalletBalance, setUsdcWalletBalance] = useState<bigint>(BigInt(0))
	const [baseSymbol, setBaseSymbol] = useState<string>("USDC")
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
				console.log("Loading positions for:", address)
				console.log("Using COMET_ADDRESS:", COMET_ADDRESS)
				const [bor, wethCollateral, baseSupplied, wethBalance, usdcBalance] = await Promise.all([
					publicClient.readContract({ address: COMET_ADDRESS, abi: cometAbi as any, functionName: "borrowBalanceOf", args: [address] }) as Promise<bigint>,
					publicClient.readContract({ address: COMET_ADDRESS, abi: cometAbi as any, functionName: "collateralBalanceOf", args: [address, WETH_ADDRESS] }) as Promise<bigint>,
					publicClient.readContract({ address: COMET_ADDRESS, abi: cometAbi as any, functionName: "balanceOf", args: [address] }) as Promise<bigint>,
					publicClient.readContract({ address: WETH_ADDRESS, abi: erc20Abi as any, functionName: "balanceOf", args: [address] }) as Promise<bigint>,
					publicClient.readContract({ address: USDC_ADDRESS, abi: erc20Abi as any, functionName: "balanceOf", args: [address] }) as Promise<bigint>,
				])
				setBaseBorrowed(bor)
				setCollateralWeth(wethCollateral)
				setBaseSupplied(baseSupplied)
				setWethWalletBalance(wethBalance)
				setUsdcWalletBalance(usdcBalance)
			} catch (error) {
				console.error("Error loading positions:", error)
			}
		}
		if (isConnected) loadPositions()
	}, [address, isConnected])

	if (!mounted) return null

	return (
		<motion.div 
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.3 }}
			className="p-2 pb-24"
		>
			{/* Horizontal carousel for dashboard sections */}
			<Carousel className="w-full max-w-md relative h-[560px]">
				<CarouselContent>
					{/* On-chain quick stats (FIRST) */}
					<CarouselItem className="h-full">
						<div className="px-2 h-full">
							<Card className="bg-bg-secondary border border-border-primary text-text-primary h-full flex flex-col">
								<CardHeader className="pb-2">
									<CardTitle className="text-xl text-text-primary">Dashboard</CardTitle>
									<CardDescription className="text-text-secondary">
										{isConnected ? "Your on-chain positions (live from Comet v3)" : "Connect your wallet to view positions and use the actions below."}
									</CardDescription>
								</CardHeader>
								{isConnected && (
									<CardContent className="flex-1 overflow-y-auto bg-bg-secondary">
										<div className="grid grid-cols-2 gap-3 mb-3">
											<div className="bg-bg-tertiary/60 border border-border-primary p-3 rounded-lg">
												<div className="flex items-center gap-2 mb-1">
													<Image src="/weth-icon.png" alt="WETH" width={16} height={16} className="rounded-full" />
													<div className="text-xs text-text-secondary">WETH Wallet</div>
												</div>
												<div className="text-lg font-semibold text-text-primary">{Number(wethWalletBalance) / 1e18}</div>
											</div>
											<div className="bg-bg-tertiary/60 border border-border-primary p-3 rounded-lg">
												<div className="flex items-center gap-2 mb-1">
													<Image src="/usdc-icon.webp" alt="USDC" width={16} height={16} className="rounded-full" />
													<div className="text-xs text-text-secondary">USDC Wallet</div>
												</div>
												<div className="text-lg font-semibold text-text-primary">{Number(usdcWalletBalance) / 1e6}</div>
											</div>
										</div>
										<div className="grid grid-cols-2 gap-3 mb-3">
											<div className="bg-bg-tertiary/60 border border-border-primary p-3 rounded-lg">
												<div className="flex items-center gap-2 mb-1">
													<Image src="/weth-icon.png" alt="WETH" width={16} height={16} className="rounded-full" />
													<div className="text-xs text-text-secondary">WETH Collateral</div>
												</div>
												<div className="text-lg font-semibold text-text-primary">{Number(collateralWeth) / 1e18}</div>
											</div>
											<div className="bg-bg-tertiary/60 border border-border-primary p-3 rounded-lg">
												<div className="flex items-center gap-2 mb-1">
													<Image src="/usdc-icon.webp" alt="USDC" width={16} height={16} className="rounded-full" />
													<div className="text-xs text-text-secondary">USDC Borrowed</div>
												</div>
												<div className="text-lg font-semibold text-text-primary">{Number(baseBorrowed) / 1e6}</div>
											</div>
										</div>
										{/* Removed USDC Supplied section per request */}
										{(baseSupplied === BigInt(0) && baseBorrowed === BigInt(0) && collateralWeth === BigInt(0)) && (
											<div className="bg-bg-tertiary/60 border border-border-primary p-3 rounded-lg">
												<div className="text-sm text-text-primary mb-2">🚀 Ready to start DeFi!</div>
												<div className="text-xs text-text-tertiary">
													You have {Number(wethWalletBalance) / 1e18} WETH available. Use the <strong>Supply</strong> page to deposit WETH as collateral, then <strong>Borrow</strong> USDC against your collateral.
												</div>
											</div>
										)}
										{(baseSupplied > BigInt(0) || baseBorrowed > BigInt(0) || collateralWeth > BigInt(0)) && (
											<div className="bg-bg-tertiary/60 border border-border-primary p-3 rounded-lg">
												<div className="text-sm text-compound-success-400 mb-2">✅ Active DeFi Position</div>
												<div className="text-xs text-text-tertiary">You have an active position! Use <strong>Supply</strong> to add more collateral, <strong>Borrow</strong> to increase your loan, <strong>Repay</strong> to reduce debt, or <strong>Withdraw</strong> to remove collateral.</div>
											</div>
										)}
										<div className="text-xs text-text-tertiary mt-2">Contract: {COMET_ADDRESS}</div>
									</CardContent>
								)}
							</Card>
						</div>
					</CarouselItem>

					{/* Portfolio Analytics */}
					<CarouselItem className="h-full">
						<div className="px-2 h-full overflow-y-auto">
							<PortfolioAnalytics />
						</div>
					</CarouselItem>
					{/* Health Factor */}
					<CarouselItem className="h-full">
						<div className="px-2 h-full overflow-y-auto">
							<HealthFactorMonitor />
						</div>
					</CarouselItem>
					{/* Rates */}
					<CarouselItem className="h-full">
						<div className="px-2 h-full overflow-y-auto">
							<RatesDashboard />
						</div>
					</CarouselItem>
					{/* Market Insights */}
					<CarouselItem className="h-full">
						<div className="px-2 h-full overflow-y-auto">
							<MarketInsightsPanel />
						</div>
					</CarouselItem>
					{/* Calculator */}
					<CarouselItem className="h-full">
						<div className="px-2 h-full overflow-y-auto">
							<LendingMetricsCalculator />
						</div>
					</CarouselItem>
				</CarouselContent>
				<div className="pointer-events-none absolute inset-0 z-10">
					<CarouselPrevious className="pointer-events-auto h-10 w-10 rounded-full bg-bg-secondary/80 border border-border-primary text-text-primary shadow-md hover:bg-bg-tertiary/80 left-2 md:left-3 top-1/2 -translate-y-1/2" />
					<CarouselNext className="pointer-events-auto h-10 w-10 rounded-full bg-bg-secondary/80 border border-border-primary text-text-primary shadow-md hover:bg-bg-tertiary/80 right-2 md:right-3 top-1/2 -translate-y-1/2" />
				</div>
			</Carousel>
		</motion.div>
	)
}
