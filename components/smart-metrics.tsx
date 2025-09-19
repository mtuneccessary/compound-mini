"use client"

import { useAccount } from "wagmi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Shield, 
  TrendingUp, 
  DollarSign, 
  ChevronDown, 
  ChevronUp,
  RefreshCw,
  Loader2
} from "lucide-react"
import { useState, useEffect } from "react"
import { publicClient, COMET_ADDRESS, WETH_ADDRESS, USDC_ADDRESS } from "@/lib/comet-onchain"
import cometAbi from "@/lib/abis/comet.json"
import erc20Abi from "@/lib/abis/erc20.json"
import Image from "next/image"

interface SmartMetricsData {
  healthFactor: number
  netWorth: number
  collateralValue: number
  borrowValue: number
  wethPrice: number
  hasPosition: boolean
  lastUpdated: number
}

export function SmartMetrics() {
  const { address, isConnected } = useAccount()
  const [metrics, setMetrics] = useState<SmartMetricsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isConnected && address) {
      loadMetrics()
    }
  }, [isConnected, address])

  const loadMetrics = async () => {
    if (!address) return
    
    setLoading(true)
    setError(null)
    
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

      // Placeholder WETH price - in real app, get from Chainlink
      const wethPrice = 3000
      const collateralValue = collateralBal * wethPrice
      const netWorth = (wethBal + collateralBal) * wethPrice + usdcBal - borrowBal
      const healthFactor = borrowBal > 0 ? (collateralValue * 0.85) / borrowBal : 999
      const hasPosition = collateralBal > 0 || borrowBal > 0

      setMetrics({
        healthFactor,
        netWorth,
        collateralValue,
        borrowValue: borrowBal,
        wethPrice,
        hasPosition,
        lastUpdated: Date.now()
      })
    } catch (err: any) {
      console.error("Error loading metrics:", err)
      setError(err.message || "Failed to load metrics")
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

  const getHealthFactorMessage = (healthFactor: number) => {
    if (healthFactor >= 2) return "Your position is healthy"
    if (healthFactor >= 1.5) return "Consider adding more collateral"
    return "Risk of liquidation - add collateral now!"
  }

  if (!isConnected) {
    return (
      <div className="w-full max-w-md mx-auto px-4 pb-4">
        <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
            <p className="text-gray-400 text-sm">
              Connect your wallet to view your DeFi metrics and health factor.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 pb-4">
      <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Your Metrics</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMetrics}
              disabled={loading}
              className="p-1.5 hover:bg-gray-700 rounded-lg"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading && !metrics ? (
            <div className="text-center py-6">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-400" />
              <p className="text-gray-400 text-sm">Loading your metrics...</p>
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <p className="text-red-400 text-sm mb-2">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadMetrics}
                className="text-xs"
              >
                Try Again
              </Button>
            </div>
          ) : metrics ? (
            <div className="space-y-4">
              {/* Primary Metrics */}
              <div className="grid grid-cols-2 gap-4">
                {/* Health Factor */}
                <div className="bg-[#252836] p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-blue-400" />
                    <span className="text-xs text-gray-400">Health Factor</span>
                  </div>
                  <div className={`text-2xl font-bold ${getHealthFactorColor(metrics.healthFactor)}`}>
                    {metrics.healthFactor > 999 ? '∞' : metrics.healthFactor.toFixed(2)}x
                  </div>
                  <Badge 
                    variant={getHealthFactorBadge(metrics.healthFactor).variant}
                    className="text-xs mt-1"
                  >
                    {getHealthFactorBadge(metrics.healthFactor).text}
                  </Badge>
                </div>

                {/* Net Worth */}
                <div className="bg-[#252836] p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-green-400" />
                    <span className="text-xs text-gray-400">Net Worth</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    ${metrics.netWorth.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {metrics.hasPosition ? "Active Position" : "No Position"}
                  </div>
                </div>
              </div>

              {/* Health Factor Message */}
              <div className={`p-3 rounded-lg ${
                metrics.healthFactor >= 2 
                  ? 'bg-green-900/20 border border-green-700/50' 
                  : metrics.healthFactor >= 1.5
                  ? 'bg-yellow-900/20 border border-yellow-700/50'
                  : 'bg-red-900/20 border border-red-700/50'
              }`}>
                <p className="text-sm text-center">
                  {getHealthFactorMessage(metrics.healthFactor)}
                </p>
              </div>

              {/* Advanced Metrics Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full text-gray-400 hover:text-white"
              >
                {showAdvanced ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Show Details
                  </>
                )}
              </Button>

              {/* Advanced Metrics */}
              {showAdvanced && (
                <div className="space-y-3 pt-2 border-t border-gray-700">
                  <div className="bg-[#252836] p-3 rounded-lg">
                    <div className="text-xs text-gray-400 mb-2">Position Details</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">WETH Collateral:</span>
                        <span className="text-white">{(metrics.collateralValue / metrics.wethPrice).toFixed(4)} WETH</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Collateral Value:</span>
                        <span className="text-white">${metrics.collateralValue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">USDC Borrowed:</span>
                        <span className="text-white">${metrics.borrowValue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">WETH Price:</span>
                        <span className="text-white">${metrics.wethPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 text-center">
                    Last updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm">No metrics data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
