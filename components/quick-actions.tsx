"use client"

import { useAccount } from "wagmi"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  PiggyBank, 
  ArrowDownRight, 
  ArrowUpRight, 
  TrendingUp,
  Wallet,
  ArrowRight
} from "lucide-react"
import { useState, useEffect } from "react"
import { publicClient, COMET_ADDRESS, WETH_ADDRESS, USDC_ADDRESS } from "@/lib/comet-onchain"
import cometAbi from "@/lib/abis/comet.json"
import erc20Abi from "@/lib/abis/erc20.json"
import Image from "next/image"

interface QuickAction {
  id: string
  title: string
  subtitle: string
  icon: React.ReactNode
  action: () => void
  disabled: boolean
  badge?: string
  badgeVariant?: "default" | "secondary" | "destructive" | "outline"
}

export function QuickActions() {
  const { address, isConnected } = useAccount()
  const [userPosition, setUserPosition] = useState<{
    wethBalance: number
    usdcBalance: number
    collateralValue: number
    borrowValue: number
    hasPosition: boolean
  } | null>(null)
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
      const hasPosition = collateralBal > 0 || borrowBal > 0

      setUserPosition({
        wethBalance: wethBal,
        usdcBalance: usdcBal,
        collateralValue: collateralBal,
        borrowValue: borrowBal,
        hasPosition
      })
    } catch (error) {
      console.error("Error loading user position:", error)
    } finally {
      setLoading(false)
    }
  }

  const getQuickActions = (): QuickAction[] => {
    if (!isConnected) {
      return [
        {
          id: "connect",
          title: "Connect Wallet",
          subtitle: "Start your DeFi journey",
          icon: <Wallet className="h-6 w-6" />,
          action: () => {},
          disabled: false,
          badge: "Required",
          badgeVariant: "outline"
        }
      ]
    }

    if (!userPosition) {
      return [
        {
          id: "loading",
          title: "Loading...",
          subtitle: "Fetching your position",
          icon: <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />,
          action: () => {},
          disabled: true
        }
      ]
    }

    const actions: QuickAction[] = []

    // Supply Action
    if (userPosition.wethBalance > 0) {
      actions.push({
        id: "supply",
        title: "Supply WETH",
        subtitle: `${userPosition.wethBalance.toFixed(4)} WETH available`,
        icon: <PiggyBank className="h-6 w-6" />,
        action: () => window.location.href = "/supply",
        disabled: false,
        badge: "Recommended",
        badgeVariant: "default"
      })
    } else {
      actions.push({
        id: "supply",
        title: "Supply Assets",
        subtitle: "Deposit collateral to earn interest",
        icon: <PiggyBank className="h-6 w-6" />,
        action: () => window.location.href = "/supply",
        disabled: true,
        badge: "No WETH",
        badgeVariant: "secondary"
      })
    }

    // Borrow Action
    if (userPosition.hasPosition && userPosition.collateralValue > 0) {
      actions.push({
        id: "borrow",
        title: "Borrow USDC",
        subtitle: "Borrow against your collateral",
        icon: <ArrowDownRight className="h-6 w-6" />,
        action: () => window.location.href = "/borrow",
        disabled: false
      })
    } else {
      actions.push({
        id: "borrow",
        title: "Borrow USDC",
        subtitle: "Supply collateral first",
        icon: <ArrowDownRight className="h-6 w-6" />,
        action: () => window.location.href = "/borrow",
        disabled: true,
        badge: "Need Collateral",
        badgeVariant: "secondary"
      })
    }

    // Withdraw Action (only if user has collateral)
    if (userPosition.hasPosition && userPosition.collateralValue > 0) {
      actions.push({
        id: "withdraw",
        title: "Withdraw",
        subtitle: `${userPosition.collateralValue.toFixed(4)} WETH collateral`,
        icon: <ArrowUpRight className="h-6 w-6" />,
        action: () => window.location.href = "/withdraw",
        disabled: false
      })
    }

    return actions
  }

  const actions = getQuickActions()

  return (
    <div className="w-full max-w-md mx-auto px-4 pb-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white mb-1">Quick Actions</h2>
        <p className="text-sm text-gray-400">
          {isConnected ? "Manage your DeFi position" : "Connect to get started"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {actions.map((action) => (
          <Card 
            key={action.id}
            className={`bg-[#1a1d26] border-[#2a2d36] text-white transition-all duration-200 ${
              action.disabled 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-[#252836] hover:border-[#3a3d46] cursor-pointer'
            }`}
            onClick={action.disabled ? undefined : action.action}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    action.disabled 
                      ? 'bg-gray-600/20' 
                      : 'bg-blue-500/20'
                  }`}>
                    {action.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{action.title}</h3>
                      {action.badge && (
                        <Badge 
                          variant={action.badgeVariant || "outline"}
                          className="text-xs"
                        >
                          {action.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{action.subtitle}</p>
                  </div>
                </div>
                {!action.disabled && (
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Info */}
      {isConnected && userPosition && (
        <div className="mt-4 p-3 bg-[#1a1d26] border border-[#2a2d36] rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Wallet Balance</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Image 
                  src="/weth-icon.png" 
                  alt="WETH" 
                  width={16} 
                  height={16} 
                  className="rounded-full"
                />
                <span className="text-white">{userPosition.wethBalance.toFixed(4)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Image 
                  src="/usdc-icon.webp" 
                  alt="USDC" 
                  width={16} 
                  height={16} 
                  className="rounded-full"
                />
                <span className="text-white">{userPosition.usdcBalance.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
