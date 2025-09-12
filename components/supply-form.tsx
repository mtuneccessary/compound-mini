"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { ArrowLeftRight } from "lucide-react"
import { CryptoIcon } from "./crypto-icon"
import { useFeedback } from "@/lib/feedback-provider"
import cometAbi from "@/lib/abis/comet.json"
import erc20Abi from "@/lib/abis/erc20.json"
import { useAccount } from "wagmi"

export function SupplyForm() {
	const { showSuccess, showError, showLoading, hideLoading } = useFeedback()
	const { address, isConnected } = useAccount()

	const [selectedAsset, setSelectedAsset] = useState("USDC")
	const [amount, setAmount] = useState("")
	const [estimatedApy, setEstimatedApy] = useState(0)
	const [mounted, setMounted] = useState(false)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [walletBalance, setWalletBalance] = useState<number>(0)

	const SUPPORTED: Record<string, { address: `0x${string}`; decimals: number; name: string }> = {
		USDC: { address: (process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`) || "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6, name: "USD Coin" },
		WETH: { address: (process.env.NEXT_PUBLIC_WETH_ADDRESS as `0x${string}`) || "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18, name: "Wrapped Ether" },
	}
	const COMET_ADDRESS = (process.env.NEXT_PUBLIC_COMET_ADDRESS as `0x${string}`) || "0xc3d688B66703497DAA19211EEdff47f25384cdc3"
	const LOCAL_CHAIN_ID = 31337

	useEffect(() => {
		setMounted(true)
	}, [])

	useEffect(() => {
		// Fetch APY estimate from Comet without BigInt literal math
		async function fetchApy() {
			try {
				const { ethers } = await import("ethers")
				if (!(window as any).ethereum) return
				const provider = new ethers.BrowserProvider((window as any).ethereum)
				const comet = new ethers.Contract(COMET_ADDRESS, cometAbi as any, provider)
				const util: bigint = await comet.getUtilization()
				const rate: bigint = await comet.getSupplyRate(util)
				// rate is per-second, scaled by 1e18
				const secondsPerYear = 31536000 // number
				const aprPercent = (Number(rate) / 1e18) * secondsPerYear * 100
				setEstimatedApy(aprPercent)
			} catch {}
		}
		if (mounted) fetchApy()
	}, [mounted, COMET_ADDRESS])

	useEffect(() => {
		// Fetch onchain wallet balance for the selected asset
		async function loadBalance() {
			try {
				const { ethers } = await import("ethers")
				if (!isConnected || !address) { setWalletBalance(0); return }
				const provider = new ethers.BrowserProvider((window as any).ethereum)
				const token = SUPPORTED[selectedAsset]
				const erc20 = new ethers.Contract(token.address, erc20Abi as any, provider)
				const bal: bigint = await erc20.balanceOf(address)
				setWalletBalance(Number(bal) / 10 ** token.decimals)
			} catch { setWalletBalance(0) }
		}
		loadBalance()
	}, [isConnected, address, selectedAsset])

	if (!mounted) return null

	async function onchainSupply(): Promise<void> {
		const token = SUPPORTED[selectedAsset]
		if (!token) throw new Error("Unsupported asset")
		const { ethers } = await import("ethers")
		if (!(window as any).ethereum) throw new Error("No wallet detected")
		const provider = new ethers.BrowserProvider((window as any).ethereum)
		const network = await provider.getNetwork()
		if (Number(network.chainId) !== LOCAL_CHAIN_ID) throw new Error("Wrong network: please switch to 31337")
		const signer = await provider.getSigner()
		const erc20 = new ethers.Contract(token.address, erc20Abi as any, signer)
		const comet = new ethers.Contract(COMET_ADDRESS, cometAbi as any, signer)

		const rawAmount = ethers.parseUnits(amount, token.decimals)

		// Pre-check user balance to avoid inscrutable revert messages
		const userBal: bigint = await erc20.balanceOf(await signer.getAddress())
		if (userBal < rawAmount) {
			throw new Error(`Insufficient ${selectedAsset} balance`)
		}

		const allowance: bigint = await erc20.allowance(await signer.getAddress(), COMET_ADDRESS)
		if (allowance < rawAmount) {
			await (await erc20.approve(COMET_ADDRESS, rawAmount)).wait()
		}
		await (await comet.supply(token.address, rawAmount)).wait()
	}

	const handleSupply = async () => {
		if (!amount || Number.parseFloat(amount) <= 0) {
			showError("Invalid input", "Please enter a valid amount")
			return
		}
		try {
			setIsSubmitting(true)
			showLoading(`Supplying ${amount} ${selectedAsset}...`)
			await onchainSupply()
			hideLoading()
			showSuccess("Supply successful", `You have supplied ${amount} ${selectedAsset}`)
			setAmount("")
			// refresh balance
			const token = SUPPORTED[selectedAsset]
			const { ethers } = await import("ethers")
			const provider = new ethers.BrowserProvider((window as any).ethereum)
			const erc20 = new ethers.Contract(token.address, erc20Abi as any, provider)
			const bal: bigint = await erc20.balanceOf(address as `0x${string}`)
			setWalletBalance(Number(bal) / 10 ** token.decimals)
		} catch (error: any) {
			hideLoading()
			const msg = error?.shortMessage || error?.reason || error?.message || "Transaction failed"
			showError("Supply failed", msg)
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleMaxClick = () => {
		setAmount(walletBalance.toString())
	}

	return (
		<div className="p-4">
			<Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
				<CardHeader>
					<CardTitle className="text-xl">Supply Assets</CardTitle>
					<CardDescription className="text-gray-400">Provide liquidity to earn interest</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="asset">Asset</Label>
						<Select value={selectedAsset} onValueChange={setSelectedAsset}>
							<SelectTrigger id="asset" className="bg-[#252836] border-[#2a2d36]">
								<SelectValue placeholder="Select asset">
									{selectedAsset && (
										<div className="flex items-center gap-2">
											<CryptoIcon symbol={selectedAsset} size={20} />
											<span>{selectedAsset}</span>
										</div>
									)}
								</SelectValue>
							</SelectTrigger>
							<SelectContent className="bg-[#252836] border-[#2a2d36] text-white">
								{Object.entries(SUPPORTED).map(([sym, token]) => (
									<SelectItem key={sym} value={sym}>
										<div className="flex items-center gap-2">
											<CryptoIcon symbol={sym} size={20} />
											<span>
												{sym} - {token.name}
											</span>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<div className="flex justify-between">
							<Label htmlFor="amount">Amount</Label>
							<span className="text-xs text-gray-400">Wallet: {formatCurrency(walletBalance, selectedAsset)}</span>
						</div>
						<div className="relative">
							<Input
								id="amount"
								type="number"
								placeholder="0.0"
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
								className="bg-[#252836] border-[#2a2d36] pr-16"
							/>
							<Button
								variant="ghost"
								size="sm"
								className="absolute right-1 top-1 h-7 text-xs text-blue-400 hover:text-blue-300"
								onClick={handleMaxClick}
							>
								MAX
							</Button>
						</div>
					</div>

					<div className="bg-[#252836] p-3 rounded-lg space-y-2">
						<div className="text-sm font-medium">Supply Information</div>
						<div className="flex justify-between text-sm">
							<span className="text-gray-400">Supply APY</span>
							<span>{formatPercentage(estimatedApy)}</span>
						</div>
					</div>

					<Button
						className="w-full bg-blue-600 hover:bg-blue-700 text-white"
						onClick={handleSupply}
						disabled={!isConnected || isSubmitting || !amount || Number.parseFloat(amount) <= 0}
					>
						{isSubmitting ? (
							<div className="flex items-center">
								<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
								Processing...
							</div>
						) : (
							<>
								<ArrowLeftRight className="mr-2 h-4 w-4" />
								Supply {selectedAsset}
							</>
						)}
					</Button>
				</CardContent>
			</Card>
		</div>
	)
}
