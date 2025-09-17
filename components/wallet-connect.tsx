"use client"

import { useEffect, useState } from "react"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { injected } from "wagmi/connectors"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Wallet, LogOut, Copy, Check } from "lucide-react"

export function WalletConnect() {
	const { address, isConnected } = useAccount()
	const { connect, isPending } = useConnect()
	const { disconnect } = useDisconnect()
	const [mounted, setMounted] = useState(false)
	const [copied, setCopied] = useState(false)

	useEffect(() => setMounted(true), [])
	if (!mounted) return null

	const copyAddress = async () => {
		if (address) {
			await navigator.clipboard.writeText(address)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
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
					<Button
						variant="ghost"
						size="sm"
						onClick={() => disconnect()}
						className="p-1 h-6 w-6 hover:bg-[#252836] text-gray-400 hover:text-red-400"
					>
						<LogOut className="h-3 w-3" />
					</Button>
				</div>
			</div>
		)
	}

	return (
		<Button 
			size="sm" 
			onClick={() => connect({ connector: injected() })} 
			disabled={isPending}
			className="bg-blue-600 hover:bg-blue-700 text-white border-0"
		>
			<Wallet className="h-4 w-4 mr-2" />
			{isPending ? "Connecting..." : "Connect Wallet"}
		</Button>
	)
} 