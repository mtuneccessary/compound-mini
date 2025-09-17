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
import { NetworkSwitcher } from "./network-switcher"
import Image from "next/image"
import { motion } from "framer-motion"

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
				
				console.log("Raw data:", { bor: bor.toString(), wethCollateral: wethCollateral.toString(), baseSupplied: baseSupplied.toString() })
				
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
			className="p-4 space-y-4 pb-24"
		>
			{/* Network Switcher - Show network status and configuration */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4, delay: 0.05 }}
			>
				<NetworkSwitcher />
			</motion.div>
			
			{/* Portfolio Analytics - User's current position (most important) */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4, delay: 0.1 }}
			>
				<PortfolioAnalytics />
			</motion.div>
			
			{/* Health Factor Monitor - Critical safety metric */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4, delay: 0.2 }}
			>
				<HealthFactorMonitor />
			</motion.div>
			
			{/* Live Rates Dashboard - Current market rates */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4, delay: 0.3 }}
			>
				<RatesDashboard />
			</motion.div>
			
			{/* Market Insights Panel - Market context */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4, delay: 0.4 }}
			>
				<MarketInsightsPanel />
			</motion.div>

			{/* Lending Metrics Calculator - Advanced calculations */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4, delay: 0.5 }}
			>
				<LendingMetricsCalculator />
			</motion.div>

			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4, delay: 0.6 }}
			>
				<Card className="compound-card">
				<CardHeader className="pb-2">
					<CardTitle className="text-xl flex justify-between">
						<span>Dashboard</span>
					</CardTitle>
					<CardDescription className="text-text-tertiary">
						{isConnected ? "Your on-chain positions (live from Comet v3)" : "Connect your wallet to view positions and use the actions below."}
					</CardDescription>
				</CardHeader>
				{isConnected && (
					<CardContent>
						<div className="grid grid-cols-2 gap-4 mb-4">
							<div className="bg-bg-tertiary p-3 rounded-lg">
								<div className="flex items-center gap-2 mb-1">
									<Image 
										src="/weth-icon.png" 
										alt="WETH" 
										width={16} 
										height={16} 
										className="rounded-full"
									/>
									<div className="text-xs text-text-tertiary">WETH Wallet</div>
								</div>
								<div className="text-lg font-semibold">{Number(wethWalletBalance) / 1e18}</div>
							</div>
							<div className="bg-bg-tertiary p-3 rounded-lg">
								<div className="flex items-center gap-2 mb-1">
									<Image 
										src="/usdc-icon.webp" 
										alt="USDC" 
										width={16} 
										height={16} 
										className="rounded-full"
									/>
									<div className="text-xs text-text-tertiary">USDC Wallet</div>
								</div>
								<div className="text-lg font-semibold">{Number(usdcWalletBalance) / 1e6}</div>
							</div>
						</div>
						
						<div className="grid grid-cols-2 gap-4 mb-4">
							<div className="bg-bg-tertiary p-3 rounded-lg">
								<div className="flex items-center gap-2 mb-1">
									<Image 
										src="/weth-icon.png" 
										alt="WETH" 
										width={16} 
										height={16} 
										className="rounded-full"
									/>
									<div className="text-xs text-text-tertiary">WETH Collateral</div>
								</div>
								<div className="text-lg font-semibold">{Number(collateralWeth) / 1e18}</div>
							</div>
							<div className="bg-bg-tertiary p-3 rounded-lg">
								<div className="flex items-center gap-2 mb-1">
									<Image 
										src="/usdc-icon.webp" 
										alt="USDC" 
										width={16} 
										height={16} 
										className="rounded-full"
									/>
									<div className="text-xs text-text-tertiary">USDC Borrowed</div>
								</div>
								<div className="text-lg font-semibold">{Number(baseBorrowed) / 1e6}</div>
							</div>
						</div>
						
						<div className="grid grid-cols-1 gap-4 mb-4">
							<div className="bg-bg-tertiary p-3 rounded-lg">
								<div className="flex items-center gap-2 mb-1">
									<Image 
										src="/usdc-icon.webp" 
										alt="USDC" 
										width={16} 
										height={16} 
										className="rounded-full"
									/>
									<div className="text-xs text-text-tertiary">USDC Supplied</div>
								</div>
								<div className="text-lg font-semibold">{Number(baseSupplied) / 1e6}</div>
							</div>
						</div>
						
						{(baseSupplied === BigInt(0) && baseBorrowed === BigInt(0) && collateralWeth === BigInt(0)) && (
							<div className="bg-compound-primary-900/10 border border-compound-primary-700/30 p-3 rounded-lg">
								<div className="text-sm text-compound-primary-400 mb-2">🚀 Ready to start DeFi!</div>
								<div className="text-xs text-text-tertiary">
									You have {Number(wethWalletBalance) / 1e18} WETH available. 
									Use the <strong>Supply</strong> page to deposit WETH as collateral, 
									then <strong>Borrow</strong> USDC against your collateral.
								</div>
							</div>
						)}
						
						{(baseSupplied > BigInt(0) || baseBorrowed > BigInt(0) || collateralWeth > BigInt(0)) && (
							<div className="bg-compound-success-900/10 border border-compound-success-700/30 p-3 rounded-lg">
								<div className="text-sm text-compound-success-400 mb-2">✅ Active DeFi Position</div>
								<div className="text-xs text-text-tertiary">
									You have an active position! Use <strong>Supply</strong> to add more collateral, 
									<strong>Borrow</strong> to increase your loan, <strong>Repay</strong> to reduce debt, 
									or <strong>Withdraw</strong> to remove collateral.
								</div>
							</div>
						)}
						
						<div className="text-xs text-text-muted mt-2">
							Contract: {COMET_ADDRESS}
						</div>
					</CardContent>
				)}
			</Card>
			</motion.div>
		</motion.div>
	)
}
