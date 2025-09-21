"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Shield, TrendingDown, RefreshCw, Loader2 } from "lucide-react"
import { useAccount } from "wagmi"
import { publicClient, COMET_ADDRESS, WETH_ADDRESS, USDC_ADDRESS, CHAINLINK_ETH_USD_FEED } from "@/lib/comet-onchain"
import cometAbi from "@/lib/abis/comet.json"
import erc20Abi from "@/lib/abis/erc20.json"

// Chainlink ETH/USD Price Feed
const CHAINLINK_PRICE_FEED_ABI = [
  {
    "inputs": [],
    "name": "latestRoundData",
    "outputs": [
      {"internalType": "uint80", "name": "roundId", "type": "uint80"},
      {"internalType": "int256", "name": "price", "type": "int256"},
      {"internalType": "uint256", "name": "startedAt", "type": "uint256"},
      {"internalType": "uint256", "name": "updatedAt", "type": "uint256"},
      {"internalType": "uint80", "name": "answeredInRound", "type": "uint80"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const

interface HealthData {
  healthFactor: number
  collateralValue: number
  borrowValue: number
  collateralRatio: number
  liquidationThreshold: number
  liquidationRisk: 'safe' | 'warning' | 'danger'
  wethPrice: number
  priceUpdatedAt: number
}

export function HealthFactorMonitor() {
  const [mounted, setMounted] = useState(false)
  const { address, isConnected } = useAccount()
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchHealthData = async () => {
    if (!mounted || !address) return
    
    setLoading(true)
    setError(null)

    try {
      console.log("🏥 Fetching health data for:", address)
      
      // Get user positions and real WETH price from Chainlink
      const [borrowBalance, collateralBalance, priceData] = await Promise.all([
        publicClient.readContract({
          address: COMET_ADDRESS,
          abi: cometAbi as any,
          functionName: "borrowBalanceOf",
          args: [address]
        }) as Promise<bigint>,
        publicClient.readContract({
          address: COMET_ADDRESS,
          abi: cometAbi as any,
          functionName: "collateralBalanceOf",
          args: [address, WETH_ADDRESS]
        }) as Promise<bigint>,
        // Get real WETH price from Chainlink
        publicClient.readContract({
          address: CHAINLINK_ETH_USD_FEED,
          abi: CHAINLINK_PRICE_FEED_ABI,
          functionName: "latestRoundData",
          args: []
        }) as Promise<[bigint, bigint, bigint, bigint, bigint]>
      ])

      // Extract price data from Chainlink
      const [, price, , updatedAt] = priceData
      const wethPriceUsd = Number(price) / 1e8 // Chainlink prices have 8 decimals

      console.log("📊 Raw health data:", {
        borrowBalance: borrowBalance.toString(),
        collateralBalance: collateralBalance.toString(),
        wethPriceUsd: wethPriceUsd,
        priceUpdatedAt: new Date(Number(updatedAt) * 1000).toISOString()
      })

      // Convert to readable numbers
      const borrowValue = Number(borrowBalance) / 1e6 // USDC has 6 decimals
      const collateralAmount = Number(collateralBalance) / 1e18 // WETH has 18 decimals
      const collateralValue = collateralAmount * wethPriceUsd // Convert WETH to USDC value using real price

      // Calculate health factor
      // Health Factor = (Collateral Value * Liquidation Factor) / Borrow Value
      // Using Compound's typical liquidation factor of 0.85 for WETH
      const liquidationFactor = 0.85
      const liquidationThreshold = collateralValue * liquidationFactor
      const healthFactor = borrowValue > 0 ? liquidationThreshold / borrowValue : 999
      const collateralRatio = borrowValue > 0 ? (collateralValue / borrowValue) * 100 : 0

      // Determine risk level
      let liquidationRisk: 'safe' | 'warning' | 'danger' = 'safe'
      if (healthFactor < 1.1) {
        liquidationRisk = 'danger'
      } else if (healthFactor < 1.5) {
        liquidationRisk = 'warning'
      }

      const data: HealthData = {
        healthFactor,
        collateralValue,
        borrowValue,
        collateralRatio,
        liquidationThreshold,
        liquidationRisk,
        wethPrice: wethPriceUsd,
        priceUpdatedAt: Number(updatedAt) * 1000
      }

      console.log("🎯 Processed health data:", data)

      setHealthData(data)

    } catch (err: any) {
      console.error("❌ Error fetching health data:", err)
      setError(err.message || "Failed to load health data")
    } finally {
      setLoading(false)
    }
  }

  // Load health data when wallet connects
  useEffect(() => {
    if (mounted && isConnected) {
      fetchHealthData()
    }
  }, [mounted, isConnected, address])

  useEffect(() => {
    if (isConnected && address) {
      fetchHealthData()
      const handler = () => fetchHealthData()
      window.addEventListener('onchain:updated', handler)
      return () => window.removeEventListener('onchain:updated', handler)
    }
  }, [isConnected, address, mounted])

  const getRiskColor = (risk: 'safe' | 'warning' | 'danger') => {
    switch (risk) {
      case 'safe': return 'text-compound-success-400'
      case 'warning': return 'text-compound-warning-400'
      case 'danger': return 'text-compound-error-400'
    }
  }

  const getRiskBg = (risk: 'safe' | 'warning' | 'danger') => {
    switch (risk) {
      case 'safe': return 'bg-compound-success-900/20 border-compound-success-700/30'
      case 'warning': return 'bg-compound-warning-900/20 border-compound-warning-700/30'
      case 'danger': return 'bg-compound-error-900/20 border-compound-error-700/30'
    }
  }

  const getRiskIcon = (risk: 'safe' | 'warning' | 'danger') => {
    switch (risk) {
      case 'safe': return <Shield className="h-4 w-4" />
      case 'warning': return <TrendingDown className="h-4 w-4" />
      case 'danger': return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getRiskMessage = (risk: 'safe' | 'warning' | 'danger', healthFactor: number) => {
    switch (risk) {
      case 'safe':
        return `Your position is healthy with ${healthFactor.toFixed(2)}x safety margin`
      case 'warning':
        return `Health factor is low at ${healthFactor.toFixed(2)}x. Consider adding collateral`
      case 'danger':
        return `DANGER: Health factor is ${healthFactor.toFixed(2)}x. Risk of liquidation!`
    }
  }

  if (!mounted) return null

  return (
    <Card className="compound-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Health Factor</CardTitle>
            <CardDescription className="text-text-tertiary">
              WETH collateral safety monitoring
            </CardDescription>
          </div>
          {isConnected && (
            <button
              onClick={fetchHealthData}
              disabled={loading}
              className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh health data"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {!isConnected ? (
          <div className="text-center py-6 text-text-tertiary">
            <Shield className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Connect your wallet to monitor health factor</p>
          </div>
        ) : loading && !healthData ? (
          <div className="text-center py-6 text-text-tertiary">
            <Loader2 className="mx-auto h-6 w-6 mb-2 animate-spin" />
            <p className="text-sm">Loading health data...</p>
          </div>
        ) : error ? (
          <div className="text-center py-6 text-compound-error-400">
            <p className="text-sm mb-2">{error}</p>
            <button 
              onClick={fetchHealthData}
              className="text-xs text-compound-primary-400 hover:text-compound-primary-300"
            >
              Try again
            </button>
          </div>
        ) : healthData ? (
          <div className="space-y-4">
            {/* Health Factor Display */}
            <div className="bg-bg-tertiary p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-full ${getRiskBg(healthData.liquidationRisk)}`}>
                    {getRiskIcon(healthData.liquidationRisk)}
                  </div>
                  <span className="font-medium">Health Factor</span>
                </div>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getRiskColor(healthData.liquidationRisk)}`}
                >
                  {healthData.liquidationRisk.toUpperCase()}
                </Badge>
              </div>
              
              <div className="text-center mb-3">
                <div className={`text-3xl font-bold mb-1 ${getRiskColor(healthData.liquidationRisk)}`}>
                  {healthData.healthFactor > 999 ? '∞' : healthData.healthFactor.toFixed(2)}x
                </div>
                <div className="text-xs text-text-tertiary">Safety Margin</div>
              </div>

              {/* Risk Message */}
              <div className={`p-3 rounded-lg ${getRiskBg(healthData.liquidationRisk)}`}>
                <p className="text-sm text-center">
                  {getRiskMessage(healthData.liquidationRisk, healthData.healthFactor)}
                </p>
              </div>
            </div>

            {/* Position Details */}
            <div className="bg-bg-tertiary p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">W</span>
                </div>
                <span className="font-medium">Position Details</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-lg font-semibold text-compound-success-400">
                    ${healthData.collateralValue.toFixed(2)}
                  </div>
                  <div className="text-xs text-text-tertiary">WETH Collateral Value</div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-semibold text-compound-error-400">
                    ${healthData.borrowValue.toFixed(2)}
                  </div>
                  <div className="text-xs text-text-tertiary">USDC Borrowed</div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border-primary">
                <div className="flex justify-between text-sm">
                  <span className="text-text-tertiary">Collateral Ratio:</span>
                  <span className="font-medium">{healthData.collateralRatio.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-tertiary">Liquidation Threshold:</span>
                  <span className="font-medium">${healthData.liquidationThreshold.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="bg-bg-tertiary p-3 rounded-lg">
              <div className="text-xs text-text-tertiary text-center">
                Health factor updates when you refresh<br/>
                WETH price: ${healthData.wethPrice.toFixed(2)} (Chainlink)<br/>
                Updated: {new Date(healthData.priceUpdatedAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-text-tertiary">
            <p className="text-sm">No position data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
