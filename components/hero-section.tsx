"use client"

import { useAccount } from "wagmi"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, TrendingUp, Shield, DollarSign } from "lucide-react"
import { useState, useEffect } from "react"
import { publicClient, COMET_ADDRESS, WETH_ADDRESS, USDC_ADDRESS } from "@/lib/comet-onchain"
import cometAbi from "@/lib/abis/comet.json"
import erc20Abi from "@/lib/abis/erc20.json"
import Image from "next/image"

interface UserPosition {
  netWorth: number
  healthFactor: number
  hasPosition: boolean
  wethBalance: number
  usdcBalance: number
  collateralValue: number
  borrowValue: number
}

export function HeroSection() {
  const { address, isConnected } = useAccount()
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isConnected && address) {
      loadUserPosition()
    }
  }, [isConnected, address])

  const loadUserPosition = async () => {
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

      // Simple calculation - in real app, you'd get WETH price from Chainlink
      const wethPrice = 3000 // Placeholder price
      const collateralValue = collateralBal * wethPrice
      const netWorth = (wethBal + collateralBal) * wethPrice + usdcBal - borrowBal
      const healthFactor = borrowBal > 0 ? (collateralValue * 0.85) / borrowBal : 999
      const hasPosition = collateralBal > 0 || borrowBal > 0

      setUserPosition({
        netWorth,
        healthFactor,
        hasPosition,
        wethBalance: wethBal,
        usdcBalance: usdcBal,
        collateralValue,
        borrowValue: borrowBal
      })
    } catch (error) {
      console.error("Error loading user position:", error)
    } finally {
      setLoading(false)
    }
  }

  const getHealthFactorColor = (healthFactor: number) => {
    if (healthFactor >= 2) return "text-green-400"
    if (healthFactor >= 1.5) return "text-yellow-400"
    return "text-red-400"
  }

  const getHealthFactorBadge = (healthFactor: number) => {
    if (healthFactor >= 2) return { text: "SAFE", variant: "default" as const }
    if (healthFactor >= 1.5) return { text: "WARNING", variant: "secondary" as const }
    return { text: "DANGER", variant: "destructive" as const }
  }

  const getPrimaryAction = () => {
    if (!isConnected) {
      return {
        title: "Connect Wallet",
        subtitle: "Start your DeFi journey",
        icon: <Wallet className="h-6 w-6" />,
        action: () => {} // This will be handled by WalletConnect component
      }
    }

    if (!userPosition?.hasPosition) {
      return {
        title: "Supply WETH",
        subtitle: "Deposit collateral to start earning",
        icon: <TrendingUp className="h-6 w-6" />,
        action: () => window.location.href = "/supply"
      }
    }

    if (userPosition.healthFactor < 1.5) {
      return {
        title: "Add Collateral",
        subtitle: "Improve your health factor",
        icon: <Shield className="h-6 w-6" />,
        action: () => window.location.href = "/supply"
      }
    }

    return {
      title: "Manage Position",
      subtitle: "View your portfolio",
      icon: <DollarSign className="h-6 w-6" />,
      action: () => window.location.href = "/"
    }
  }

  const primaryAction = getPrimaryAction()

  return (
    <div className="w-full max-w-md mx-auto px-4 pt-4 pb-6">
      <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/20 text-white overflow-hidden">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Compound Finance
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                {isConnected ? "Your DeFi Dashboard" : "DeFi Lending & Borrowing"}
              </p>
            </div>
            {isConnected && userPosition && (
              <div className="text-right">
                <div className="text-xs text-gray-400">Net Worth</div>
                <div className="text-lg font-semibold">
                  ${userPosition.netWorth.toFixed(2)}
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          {!isConnected ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="h-8 w-8 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Welcome to DeFi</h2>
              <p className="text-gray-400 text-sm mb-6">
                Connect your wallet to start lending, borrowing, and earning interest on your crypto assets.
              </p>
              <Button 
                size="lg" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={primaryAction.action}
              >
                <Wallet className="h-5 w-5 mr-2" />
                Connect Wallet
              </Button>
            </div>
          ) : loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400 text-sm">Loading your position...</p>
            </div>
          ) : userPosition ? (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/20 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-blue-400" />
                    <span className="text-xs text-gray-400">Health Factor</span>
                  </div>
                  <div className={`text-xl font-bold ${getHealthFactorColor(userPosition.healthFactor)}`}>
                    {userPosition.healthFactor > 999 ? '∞' : userPosition.healthFactor.toFixed(2)}x
                  </div>
                  <Badge 
                    variant={getHealthFactorBadge(userPosition.healthFactor).variant}
                    className="text-xs mt-1"
                  >
                    {getHealthFactorBadge(userPosition.healthFactor).text}
                  </Badge>
                </div>

                <div className="bg-black/20 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-green-400" />
                    <span className="text-xs text-gray-400">Net Worth</span>
                  </div>
                  <div className="text-xl font-bold text-white">
                    ${userPosition.netWorth.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {userPosition.hasPosition ? "Active Position" : "No Position"}
                  </div>
                </div>
              </div>

              {/* Wallet Balances */}
              <div className="bg-black/20 p-4 rounded-lg">
                <div className="text-xs text-gray-400 mb-3">Wallet Balances</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image 
                      src="/weth-icon.png" 
                      alt="WETH" 
                      width={20} 
                      height={20} 
                      className="rounded-full"
                    />
                    <span className="text-sm">WETH</span>
                  </div>
                  <span className="font-semibold">{userPosition.wethBalance.toFixed(4)}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Image 
                      src="/usdc-icon.webp" 
                      alt="USDC" 
                      width={20} 
                      height={20} 
                      className="rounded-full"
                    />
                    <span className="text-sm">USDC</span>
                  </div>
                  <span className="font-semibold">{userPosition.usdcBalance.toFixed(2)}</span>
                </div>
              </div>

              {/* Primary Action */}
              <Button 
                size="lg" 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                onClick={primaryAction.action}
              >
                {primaryAction.icon}
                <span className="ml-2">{primaryAction.title}</span>
              </Button>
              
              <p className="text-xs text-gray-400 text-center">
                {primaryAction.subtitle}
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">Unable to load position data</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
