"use client"

import { useEffect, useState } from "react"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { injected } from "wagmi/connectors"
import { Button } from "@/components/ui/button"

export function WalletConnect() {
	const { address, isConnected } = useAccount()
	const { connect, isPending } = useConnect()
	const { disconnect } = useDisconnect()
	const [mounted, setMounted] = useState(false)

	useEffect(() => setMounted(true), [])
	if (!mounted) return null

	if (isConnected) {
		return (
			<div className="flex items-center justify-between gap-2">
				<span className="text-xs text-gray-400">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
				<Button size="sm" variant="outline" className="border-[#2a2d36]" onClick={() => disconnect()}>Disconnect</Button>
			</div>
		)
	}

	return (
		<Button size="sm" onClick={() => connect({ connector: injected() })} disabled={isPending}>
			{isPending ? "Connecting..." : "Connect Wallet"}
		</Button>
	)
} 