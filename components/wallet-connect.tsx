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
                                <span
                                        tabIndex={0}
                                        aria-label={address ? `Connected wallet ${address}` : "Connected wallet"}
                                        className="inline-flex items-center rounded-full border border-primary bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:bg-secondary/80"
                                >
                                        {address?.slice(0, 6)}...{address?.slice(-4)}
                                </span>
                                <Button size="sm" variant="outline" onClick={() => disconnect()}>
                                        Disconnect
                                </Button>
                        </div>
                )
        }

	return (
		<Button size="sm" onClick={() => connect({ connector: injected() })} disabled={isPending}>
			{isPending ? "Connecting..." : "Connect Wallet"}
		</Button>
	)
} 