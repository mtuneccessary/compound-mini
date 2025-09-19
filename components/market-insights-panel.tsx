"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  RefreshCw, 
  Loader2, 
  BarChart3,
  Users,
  AlertCircle,
  Info
} from "lucide-react"
import { publicClient, COMET_ADDRESS } from "@/lib/comet-onchain"
import cometAbi from "@/onchain/abis/CometInterface.json"

interface MarketData {
  totalSupply: number
  totalBorrowed: number
  utilization: number
  supplyRate: number
  borrowRate: number
  reserveBalance: number
  totalAssets: number
  lastUpdated: number
}

export function MarketInsightsPanel() {
  const [mounted, setMounted] = useState(false)
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchMarketData = async () => {
    if (!mounted) return
    
    setLoading(true)
    setError(null)

    try {
      console.log("📊 Fetching USDC market insights from:", COMET_ADDRESS)
      
      // Get market data using correct Compound Comet v3 functions
      const [
        utilization,
        totalSupply,
        totalBorrowed,
        name,
        symbol,
        baseToken
      ] = await Promise.all([
        publicClient.readContract({
          address: COMET_ADDRESS,
          abi: cometAbi as any,
          functionName: "getUtilization"
        }) as Promise<bigint>,
        publicClient.readContract({
          address: COMET_ADDRESS,
          abi: cometAbi as any,
          functionName: "totalSupply"
        }) as Promise<bigint>,
        publicClient.readContract({
          address: COMET_ADDRESS,
          abi: cometAbi as any,
          functionName: "totalBorrow"
        }) as Promise<bigint>,
        publicClient.readContract({
          address: COMET_ADDRESS,
          abi: cometAbi as any,
          functionName: "name"
        }) as Promise<string>,
        publicClient.readContract({
          address: COMET_ADDRESS,
          abi: cometAbi as any,
          functionName: "symbol"
        }) as Promise<string>,
        publicClient.readContract({
          address: COMET_ADDRESS,
          abi: cometAbi as any,
          functionName: "baseToken"
        }) as Promise<`0x${string}`>
      ])

      // Get supply and borrow rates using the utilization
      const [supplyRate, borrowRate] = await Promise.all([
        publicClient.readContract({
          address: COMET_ADDRESS,
          abi: cometAbi as any,
          functionName: "getSupplyRate",
          args: [utilization]
        }) as Promise<bigint>,
        publicClient.readContract({
          address: COMET_ADDRESS,
          abi: cometAbi as any,
          functionName: "getBorrowRate",
          args: [utilization]
        }) as Promise<bigint>
      ])

      // Calculate reserves (totalSupply - totalBorrow) and total assets
      const reserveBalance = totalSupply - totalBorrowed
      const totalAssets = totalSupply

      console.log("📈 Raw market data:", {
        totalSupply: totalSupply.toString(),
        totalBorrowed: totalBorrowed.toString(),
        utilization: utilization.toString(),
        supplyRate: supplyRate.toString(),
        borrowRate: borrowRate.toString(),
        reserveBalance: reserveBalance.toString(),
        totalAssets: totalAssets.toString()
      })

      // Convert to readable numbers (USDC has 6 decimals)
      const processedData: MarketData = {
        totalSupply: Number(totalSupply) / 1e6,
        totalBorrowed: Number(totalBorrowed) / 1e6,
        utilization: Number(utilization) / 1e18 * 100, // Convert to percentage
        supplyRate: Number(supplyRate) / 1e18 * 100 * 365 * 24 * 3600, // Convert to annual percentage
        borrowRate: Number(borrowRate) / 1e18 * 100 * 365 * 24 * 3600, // Convert to annual percentage
        reserveBalance: Number(reserveBalance) / 1e6,
        totalAssets: Number(totalAssets) / 1e6,
        lastUpdated: Date.now()
      }

      console.log("🎯 Processed market data:", processedData)

      setMarketData(processedData)

    } catch (err: any) {
      console.error("❌ Error fetching market data:", err)
      setError(err.message || "Failed to load market data")
    } finally {
      setLoading(false)
    }
  }

  // Load data on mount
  useEffect(() => {
    if (mounted) {
      fetchMarketData()
    }
  }, [mounted])

  const getUtilizationColor = (util: number) => {
    if (util > 80) return "text-red-500"
    if (util > 60) return "text-yellow-500"
    return "text-green-500"
  }

  const getUtilizationBadge = (util: number) => {
    if (util > 80) return { color: "destructive", text: "High Risk" }
    if (util > 60) return { color: "secondary", text: "Moderate" }
    return { color: "default", text: "Healthy" }
  }

  if (!mounted) return null

  return (
    <Card className="compound-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-compound-primary-400" />
            <CardTitle className="text-lg">Market Insights</CardTitle>
          </div>
          <button
            onClick={fetchMarketData}
            disabled={loading}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh market data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <CardDescription className="text-text-tertiary text-sm">
          USDC Market Overview • Compound Comet v3
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {loading && !marketData ? (
          <div className="text-center py-6 text-text-tertiary">
            <Loader2 className="mx-auto h-6 w-6 mb-2 animate-spin" />
            <p className="text-sm">Loading market data...</p>
          </div>
        ) : error ? (
          <div className="text-center py-6 text-red-400">
            <AlertCircle className="mx-auto h-6 w-6 mb-2 opacity-50" />
            <p className="text-sm mb-2">{error}</p>
            <button 
              onClick={fetchMarketData}
              className="text-xs text-compound-primary-400 hover:text-compound-primary-300"
            >
              Try again
            </button>
          </div>
        ) : marketData ? (
          <>
            {/* Market Overview - Mobile Optimized */}
            <div className="bg-bg-tertiary p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-compound-primary-400">USDC Market</span>
                <Badge 
                  variant={getUtilizationBadge(marketData.utilization).color as any}
                  className="text-xs"
                >
                  {getUtilizationBadge(marketData.utilization).text}
                </Badge>
              </div>
              
              {/* Utilization Bar - Mobile Friendly */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-text-tertiary mb-1">
                  <span>Utilization</span>
                  <span className={getUtilizationColor(marketData.utilization)}>
                    {marketData.utilization.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      marketData.utilization > 80 ? 'bg-red-500' :
                      marketData.utilization > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(marketData.utilization, 100)}%` }}
                  />
                </div>
              </div>

              {/* Key Metrics - Stacked for Mobile */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-bg-secondary p-2 rounded">
                  <div className="text-lg font-semibold text-green-400">
                    ${(marketData.totalSupply / 1e6).toFixed(1)}M
                  </div>
                  <div className="text-xs text-text-tertiary">Total Supply</div>
                </div>
                <div className="bg-bg-secondary p-2 rounded">
                  <div className="text-lg font-semibold text-red-400">
                    ${(marketData.totalBorrowed / 1e6).toFixed(1)}M
                  </div>
                  <div className="text-xs text-text-tertiary">Total Borrowed</div>
                </div>
              </div>
            </div>

            {/* Rates Comparison - Mobile Optimized */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-bg-tertiary p-3 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-xs text-text-tertiary">Supply APY</span>
                </div>
                <div className="text-lg font-semibold text-green-400">
                  {marketData.supplyRate.toFixed(2)}%
                </div>
              </div>
              
              <div className="bg-bg-tertiary p-3 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingDown className="h-4 w-4 text-red-400" />
                  <span className="text-xs text-text-tertiary">Borrow APR</span>
                </div>
                <div className="text-lg font-semibold text-red-400">
                  {marketData.borrowRate.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Liquidity Info - Mobile Friendly */}
            <div className="bg-bg-tertiary p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-compound-primary-400" />
                <span className="text-sm font-semibold">Liquidity</span>
              </div>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Available Reserves</span>
                  <span className="text-white">
                    ${(marketData.reserveBalance / 1e6).toFixed(2)}M
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Total Assets</span>
                  <span className="text-white">
                    ${(marketData.totalAssets / 1e6).toFixed(2)}M
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Liquidity Ratio</span>
                  <span className="text-white">
                    {((marketData.reserveBalance / marketData.totalAssets) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Market Health Indicator */}
            <div className="bg-bg-tertiary p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-compound-primary-400" />
                <span className="text-sm font-semibold">Market Health</span>
              </div>
              
              {marketData.utilization > 80 ? (
                <div className="text-xs text-yellow-400">
                  ⚠️ High utilization may indicate limited liquidity for large withdrawals
                </div>
              ) : marketData.utilization > 60 ? (
                <div className="text-xs text-compound-primary-400">
                  ℹ️ Moderate utilization - healthy market conditions
                </div>
              ) : (
                <div className="text-xs text-green-400">
                  ✅ Low utilization - excellent liquidity available
                </div>
              )}
            </div>

            {/* Last Updated */}
            <div className="text-center text-xs text-text-muted">
              Last updated: {new Date(marketData.lastUpdated).toLocaleTimeString()}
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-text-tertiary">
            <BarChart3 className="mx-auto h-6 w-6 mb-2 opacity-50" />
            <p className="text-sm">No market data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
