"use client"

import { useState, useEffect } from "react"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { injected } from "wagmi/connectors"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Wallet, LogOut, Copy, Check } from "lucide-react"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { isTelegramEnv } from "@/lib/utils"

export function WalletConnect() {
	const { address, isConnected } = useAccount()
	const { connect, connectors, isPending } = useConnect()
	const { disconnect } = useDisconnect()
	const [mounted, setMounted] = useState(false)
	const [copied, setCopied] = useState(false)
	const [confirmOpen, setConfirmOpen] = useState(false)

	useEffect(() => setMounted(true), [])
	if (!mounted) return null

	const copyAddress = async () => {
		if (address) {
			await navigator.clipboard.writeText(address)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		}
	}

	const connectDefault = () => {
		const inTelegram = isTelegramEnv()
		const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
		const isMobile = /iPhone|iPad|iPod|Android/i.test(ua)

		console.log("🔍 Telegram WebApp detected:", !!inTelegram)
		console.log("🔍 isMobile:", isMobile)
		console.log("🔍 Available connectors:", connectors.map(c => c.id))
		
		const wc = connectors.find((c) => c.id === "walletConnect")
		const injC = connectors.find((c) => c.id === "injected")

		const hasInjected = () => {
			try {
				const eth = typeof window !== 'undefined' ? (window as any).ethereum : undefined
				if (!eth) return false
				if (Array.isArray(eth.providers)) return eth.providers.length > 0
				return true
			} catch { return !!injC }
		}

		if (wc) {
			try {
				// @ts-ignore - wagmi connector emits messages
				wc.on?.('message', (m: any) => {
					if (m?.type === 'display_uri' && typeof m?.data === 'string') {
						const uri = m.data as string
						console.log('🔗 WC URI ready')
						if (inTelegram && isMobile) {
							const mmDeepLink = `metamask://wc?uri=${encodeURIComponent(uri)}`
							const mmUniversal = `https://metamask.app.link/wc?uri=${encodeURIComponent(uri)}`
							try {
								;(window as any).Telegram?.WebApp?.openLink?.(mmDeepLink, { try_instant_view: false })
							} catch {}
							setTimeout(() => {
								try {
									(window as any).Telegram?.WebApp?.openLink?.(mmUniversal, { try_instant_view: false })
								} catch {
								window.location.href = mmUniversal
								}
							}, 400)
						}
					}
				})
			} catch {}
		}
		
		let preferred
		if (inTelegram) {
			// Telegram: use WalletConnect (deep link on mobile, QR/modal on desktop)
			preferred = wc || injC || connectors[0]
			console.log("🔍 Telegram mode - preferred connector:", preferred?.id)
		} else {
			// Browser: use injected if available, otherwise WalletConnect
			preferred = (hasInjected() && injC) ? injC : (wc || connectors[0])
			console.log("🔍 Browser mode - preferred connector:", preferred?.id)
		}
		
		if (preferred) {
			console.log("🔍 Attempting to connect with:", preferred.id)
			connect({ connector: preferred })
		} else {
			console.log("🔍 Fallback to injected connector")
			connect({ connector: injected() })
		}
	}

	if (isConnected) {
		return (
			<div className="flex items-center gap-2">
				<Badge variant="outline" className="bg-green-900/20 border-green-700/50 text-green-400">
					<div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
					Connected
				</Badge>
				<div className="flex items-center gap-2 bg-[#1a1d26] border border-[#2a2d36] rounded-lg px-3 py-2">
					<Wallet className="h-4 w-4 text-blue-400" />
					<span className="text-sm text-white font-mono">
						{address?.slice(0, 6)}...{address?.slice(-4)}
					</span>
					<Button
						variant="ghost"
						size="sm"
						onClick={copyAddress}
						className="p-1 h-6 w-6 hover:bg-[#252836]"
					>
						{copied ? (
							<Check className="h-3 w-3 text-green-400" />
						) : (
							<Copy className="h-3 w-3 text-gray-400" />
						)}
					</Button>
					<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
						<AlertDialogTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="p-1 h-6 w-6 hover:bg-[#252836] text-gray-400 hover:text-red-400"
								onClick={() => setConfirmOpen(true)}
							>
								<LogOut className="h-3 w-3" />
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Disconnect wallet?</AlertDialogTitle>
								<AlertDialogDescription>
									You can reconnect anytime. This will end your current session.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction onClick={() => disconnect()}>Disconnect</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>
		)
	}

	return (
		<Button
			size="sm"
			onClick={connectDefault}
			disabled={isPending}
			className="bg-blue-600 hover:bg-blue-700 text-white border-0"
		>
			<Wallet className="h-4 w-4 mr-2" />
			{isPending ? "Connecting..." : "Connect Wallet"}
		</Button>
	)
}
