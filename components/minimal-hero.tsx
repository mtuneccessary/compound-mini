"use client"

import { useAccount } from "wagmi"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, TrendingUp, Shield, ArrowRight } from "lucide-react"
import { useState, useEffect } from "react"
import { publicClient, COMET_ADDRESS, WETH_ADDRESS, USDC_ADDRESS } from "@/lib/comet-onchain"
import cometAbi from "@/lib/abis/comet.json"
import erc20Abi from "@/lib/abis/erc20.json"
import Image from "next/image"
import { useConnect } from "wagmi"

interface UserStatus {
  hasPosition: boolean
  healthFactor: number
  netWorth: number
  primaryAction: {
    title: string
    subtitle: string
    action: () => void
    urgent?: boolean
  }
}

export function MinimalHero() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null)
  const [loading, setLoading] = useState(false)

  const connectDefault = () => {
    const inTelegram = typeof window !== "undefined" && (window as any).Telegram?.WebApp
    const wc = connectors.find((c) => c.id === "walletConnect")
    const injC = connectors.find((c) => c.id === "injected")

    const hasInjected = () => {
      try {
        // @ts-ignore
        const eth = typeof window !== 'undefined' ? (window as any).ethereum : undefined
        if (!eth) return false
        if (Array.isArray(eth.providers)) return eth.providers.length > 0
        return true
      } catch { return !!injC }
    }

    const preferred = inTelegram ? (wc || injC || connectors[0]) : ((hasInjected() && injC) ? injC : (wc || connectors[0]))
    if (preferred) connect({ connector: preferred })
  }

  useEffect(() => {
    if (isConnected && address) {
      loadUserStatus()
    }
  }, [isConnected, address])

  // Listen for on-chain updates (e.g., after supply/borrow), then refetch
  useEffect(() => {
    const handler = () => {
      if (isConnected && address) {
        loadUserStatus()
      }
    }
    window.addEventListener('onchain:updated', handler)
    return () => window.removeEventListener('onchain:updated', handler)
  }, [isConnected, address])

  const loadUserStatus = async () => {
    if (!address) return
    
    setLoading(true)
    try {
      const [wethBalance, usdcBalance, collateralBalance, borrowBalance] = await Promise.all([
        publicClient.readContract({ 
          address: WETH_ADDRESS, 
          abi: erc20Abi as any, 
          functionName: "balanceOf", 
          args: [address] 
        }) as Promise<bigint>,
        publicClient.readContract({ 
          address: USDC_ADDRESS, 
          abi: erc20Abi as any, 
          functionName: "balanceOf", 
          args: [address] 
        }) as Promise<bigint>,
        publicClient.readContract({ 
          address: COMET_ADDRESS, 
          abi: cometAbi as any, 
          functionName: "collateralBalanceOf", 
          args: [address, WETH_ADDRESS] 
        }) as Promise<bigint>,
        publicClient.readContract({ 
          address: COMET_ADDRESS, 
          abi: cometAbi as any, 
          functionName: "borrowBalanceOf", 
          args: [address] 
        }) as Promise<bigint>
      ])

      const wethBal = Number(wethBalance) / 1e18
      const usdcBal = Number(usdcBalance) / 1e6
      const collateralBal = Number(collateralBalance) / 1e18
      const borrowBal = Number(borrowBalance) / 1e6

      const wethPrice = 3000 // Placeholder
      const collateralValue = collateralBal * wethPrice
      const netWorth = (wethBal + collateralBal) * wethPrice + usdcBal - borrowBal
      const healthFactor = borrowBal > 0 ? (collateralValue * 0.85) / borrowBal : 999
      const hasPosition = collateralBal > 0 || borrowBal > 0

      // Determine primary action
      let primaryAction
      if (!hasPosition && wethBal > 0) {
        primaryAction = {
          title: "Start Earning",
          subtitle: "Supply WETH to earn interest",
          action: () => window.location.href = "/supply"
        }
      } else if (healthFactor < 1.5) {
        primaryAction = {
          title: "Add Collateral",
          subtitle: "Improve your health factor",
          action: () => window.location.href = "/supply",
          urgent: true
        }
      } else if (hasPosition) {
        primaryAction = {
          title: "View Dashboard",
          subtitle: "Manage your position",
          action: () => window.location.href = "/dashboard"
        }
      } else {
        primaryAction = {
          title: "Get Started",
          subtitle: "Connect and start earning",
          action: () => {}
        }
      }

      setUserStatus({
        hasPosition,
        healthFactor,
        netWorth,
        primaryAction
      })
    } catch (error) {
      console.error("Error loading user status:", error)
    } finally {
      setLoading(false)
    }
  }

  const getHealthFactorColor = (healthFactor: number) => {
    if (healthFactor >= 2) return "text-compound-success-400"
    if (healthFactor >= 1.5) return "text-yellow-400"
    return "text-red-400"
  }

  const getHealthFactorBadge = (healthFactor: number) => {
    if (healthFactor >= 2) return { text: "SAFE", variant: "default" as const }
    if (healthFactor >= 1.5) return { text: "WARNING", variant: "secondary" as const }
    return { text: "DANGER", variant: "destructive" as const }
  }

  return (
        <div className="w-full max-w-md mx-auto px-4 pt-8 pb-6">
          <Card className="bg-bg-secondary border border-border-primary text-text-primary overflow-hidden relative">
        <CardContent className="p-8">
          {/* subtle green glow */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-compound-success-500/5 via-transparent to-transparent" />
          {/* Header */}
          <div className="text-center mb-8 relative">
            <div className="flex justify-center mb-3">
              <Image src="/complogo.png" alt="Compound" width={40} height={40} className="rounded-md shadow" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-compound-success-500 to-compound-success-300 bg-clip-text text-transparent mb-2">
              Compound Finance
            </h1>
            <p className="text-text-tertiary">
              {isConnected ? "Your DeFi Gateway" : "DeFi Lending & Borrowing"}
            </p>
          </div>

          {/* Main Content */}
          {!isConnected ? (
            <div className="text-center py-8 relative">
                  <div className="w-20 h-20 bg-compound-success-500/15 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Wallet className="h-10 w-10 text-compound-success-400" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-3">Welcome to DeFi</h2>
                  <p className="text-text-tertiary mb-8 leading-relaxed">
                    Connect your wallet to start lending, borrowing, and earning interest on your crypto assets.
                  </p>
                  <Button 
                    size="lg" 
                    className="w-full h-12 text-lg bg-gradient-to-r from-compound-success-600 to-compound-success-500 hover:from-compound-success-700 hover:to-compound-success-600 text-white border-0"
                    onClick={connectDefault}
                  >
                <Wallet className="h-6 w-6 mr-3" />
                {isPending ? "Connecting..." : "Connect Wallet"}
              </Button>
            </div>
              ) : loading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-compound-success-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-text-tertiary">Loading your position...</p>
                </div>
          ) : userStatus ? (
            <div className="space-y-8">
              {/* Status Overview */}
              <div className="text-center">
                <div className="text-4xl font-bold text-text-primary mb-2">
                  ${userStatus.netWorth.toFixed(2)}
                </div>
                <div className="text-text-tertiary">Net Worth</div>
                
                    {userStatus.hasPosition && (
                      <div className="mt-4 flex items-center justify-center gap-2">
                        <Shield className="h-4 w-4 text-compound-success-400" />
                        <span className="text-sm text-text-tertiary">Health Factor:</span>
                        <span className={`text-sm font-semibold ${getHealthFactorColor(userStatus.healthFactor)}`}>
                          {userStatus.healthFactor > 999 ? '∞' : userStatus.healthFactor.toFixed(2)}x
                        </span>
                        <Badge 
                          variant={getHealthFactorBadge(userStatus.healthFactor).variant}
                          className="text-xs"
                        >
                          {getHealthFactorBadge(userStatus.healthFactor).text}
                        </Badge>
                      </div>
                    )}
              </div>

              {/* Primary Action */}
              <div className="space-y-4">
                <Button 
                  size="lg" 
                  className={`w-full h-14 text-lg ${
                    userStatus.primaryAction.urgent 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-gradient-to-r from-compound-success-600 to-compound-success-500 hover:from-compound-success-700 hover:to-compound-success-600'
                  } text-white`}
                  onClick={userStatus.primaryAction.action}
                >
                  <span className="flex items-center justify-center">
                    {userStatus.primaryAction.urgent ? (
                      <Shield className="h-6 w-6 mr-3" />
                    ) : (
                      <TrendingUp className="h-6 w-6 mr-3" />
                    )}
                    {userStatus.primaryAction.title}
                    <ArrowRight className="h-5 w-5 ml-3" />
                  </span>
                </Button>
                
                    <p className="text-center text-sm text-text-tertiary">
                      {userStatus.primaryAction.subtitle}
                    </p>
              </div>

            </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-text-tertiary">Unable to load position data</p>
                </div>
              )}
        </CardContent>
      </Card>
    </div>
  )
}
