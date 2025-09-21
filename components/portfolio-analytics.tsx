"use client"

import { useState, useEffect } from "react"
import { useAccount } from "wagmi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, Shield, AlertTriangle, DollarSign, PieChart } from "lucide-react"
import { formatUnits } from "viem"
import { publicClient } from "@/lib/comet-onchain"
import cometAbi from "@/onchain/abis/CometInterface.json"

const COMET_ADDRESS = "0xc3d688B66703497DAA19211EEdff47f25384cdc3"
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
const CHAINLINK_ETH_USD_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"

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
]

interface PortfolioData {
  totalCollateralValue: number
  totalBorrowedValue: number
  healthFactor: number
  liquidationThreshold: number
  collateralRatio: number
  utilizationRate: number
  netPositionValue: number
  wethCollateralAmount: number
  usdcBorrowedAmount: number
  usdcSuppliedAmount: number
  wethPrice: number
  riskLevel: 'safe' | 'warning' | 'danger'
  liquidationPrice: number
  maxBorrowCapacity: number
  currentBorrowCapacity: number
}

export function PortfolioAnalytics() {
  const { address } = useAccount()
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPortfolioData = async () => {
    if (!address || !publicClient) return

    try {
      setLoading(true)
      setError(null)

      console.log("🔍 Fetching portfolio data for:", address)

      // Fetch WETH price from Chainlink
      const priceData = await publicClient.readContract({
        address: CHAINLINK_ETH_USD_FEED,
        abi: CHAINLINK_PRICE_FEED_ABI,
        functionName: "latestRoundData"
      }) as [bigint, bigint, bigint, bigint, bigint]

      const wethPrice = Number(formatUnits(priceData[1], 8))
      console.log("💰 WETH Price:", wethPrice)

      // Fetch portfolio positions
      const [
        wethCollateralBalance,
        usdcBorrowBalance,
        usdcSupplyBalance,
        liquidationThreshold,
        totalBorrowed,
        totalSupply
      ] = await Promise.all([
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
        }) as Promise<bigint>,
        publicClient.readContract({
          address: COMET_ADDRESS,
          abi: cometAbi as any,
          functionName: "balanceOf",
          args: [address]
        }) as Promise<bigint>,
        // Try to get asset info, but handle errors gracefully
        Promise.resolve({ factor: BigInt("800000000000000000") }), // Default 0.8 liquidation factor
        publicClient.readContract({
          address: COMET_ADDRESS,
          abi: cometAbi as any,
          functionName: "totalBorrow",
          args: []
        }) as Promise<bigint>,
        publicClient.readContract({
          address: COMET_ADDRESS,
          abi: cometAbi as any,
          functionName: "totalSupply",
          args: []
        }) as Promise<bigint>
      ])

      console.log("📊 Raw Portfolio Data:", {
        wethCollateralBalance: formatUnits(wethCollateralBalance, 18),
        usdcBorrowBalance: formatUnits(usdcBorrowBalance, 6),
        usdcSupplyBalance: formatUnits(usdcSupplyBalance, 6),
        assetInfo: liquidationThreshold
      })

      // Convert to readable amounts
      const wethCollateralAmount = Number(formatUnits(wethCollateralBalance, 18))
      const usdcBorrowedAmount = Number(formatUnits(usdcBorrowBalance, 6))
      const usdcSuppliedAmount = Number(formatUnits(usdcSupplyBalance, 6))
      
      // Extract liquidation factor from asset info
      // Using default liquidation factor for WETH (0.8 = 80%)
      const liquidationFactor = Number(formatUnits(liquidationThreshold.factor, 16))

      // Calculate values
      const totalCollateralValue = wethCollateralAmount * wethPrice
      const totalBorrowedValue = usdcBorrowedAmount
      const netPositionValue = totalCollateralValue - totalBorrowedValue

      // Calculate health factor
      const healthFactor = totalBorrowedValue > 0 
        ? (totalCollateralValue * liquidationFactor) / totalBorrowedValue 
        : Infinity

      // Calculate metrics
      const collateralRatio = totalBorrowedValue > 0 
        ? totalCollateralValue / totalBorrowedValue 
        : 0

      const utilizationRate = totalSupply > 0 
        ? Number(formatUnits(totalBorrowed, 6)) / Number(formatUnits(totalSupply, 6))
        : 0

      // Calculate liquidation price
      const liquidationPrice = totalBorrowedValue > 0 && wethCollateralAmount > 0
        ? totalBorrowedValue / (wethCollateralAmount * liquidationFactor)
        : 0

      // Calculate borrowing capacity
      const maxBorrowCapacity = totalCollateralValue * liquidationFactor
      const currentBorrowCapacity = Math.max(0, maxBorrowCapacity - totalBorrowedValue)

      // Determine risk level
      let riskLevel: 'safe' | 'warning' | 'danger' = 'safe'
      if (healthFactor < 1.5) riskLevel = 'danger'
      else if (healthFactor < 2.0) riskLevel = 'warning'

      const data: PortfolioData = {
        totalCollateralValue,
        totalBorrowedValue,
        healthFactor,
        liquidationThreshold: liquidationFactor,
        collateralRatio,
        utilizationRate,
        netPositionValue,
        wethCollateralAmount,
        usdcBorrowedAmount,
        usdcSuppliedAmount,
        wethPrice,
        riskLevel,
        liquidationPrice,
        maxBorrowCapacity,
        currentBorrowCapacity
      }

      console.log("✅ Processed Portfolio Data:", data)
      setPortfolioData(data)

    } catch (error: any) {
      console.error("❌ Error fetching portfolio data:", error)
      setError(error.message || "Failed to fetch portfolio data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (address) {
      fetchPortfolioData()
      const interval = setInterval(fetchPortfolioData, 30000) // Refresh every 30 seconds
      const handler = () => fetchPortfolioData()
      window.addEventListener('onchain:updated', handler)
      return () => {
        clearInterval(interval)
        window.removeEventListener('onchain:updated', handler)
      }
    }
  }, [address])

  if (loading) {
    return (
      <Card className="compound-card">
        <CardHeader className="pb-4 bg-bg-secondary text-text-primary rounded-t-lg">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-bg-tertiary rounded-full">
                <PieChart className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold">Portfolio Analytics</span>
            </div>
            <Badge className="bg-bg-tertiary text-text-primary border-border-primary animate-pulse">
              <div className="w-4 h-4 bg-compound-primary-400 rounded-full animate-pulse" />
              <span className="ml-1">Loading</span>
            </Badge>
          </CardTitle>
          <p className="text-compound-primary-100 text-sm opacity-90">
            Real-time portfolio insights and risk monitoring
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 p-6 rounded-xl border border-slate-200 dark:border-slate-600">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-compound-success-100 dark:bg-compound-success-900/20 rounded-full animate-pulse">
                    <div className="w-5 h-5 bg-compound-success-300 dark:bg-compound-success-700 rounded" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-24 animate-pulse" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32 animate-pulse" />
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <div className="h-8 bg-slate-300 dark:bg-slate-600 rounded w-16 animate-pulse" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-12 animate-pulse" />
                </div>
              </div>
              <div className="h-3 bg-slate-200 dark:bg-slate-600 rounded animate-pulse" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-xl border border-green-200 dark:border-green-700 animate-pulse">
                <div className="h-20 bg-compound-success-900/20 rounded" />
              </div>
              <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 p-6 rounded-xl border border-red-200 dark:border-red-700 animate-pulse">
                <div className="h-20 bg-compound-error-100 dark:bg-compound-error-800/20 rounded" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="compound-card">
        <CardHeader className="pb-4 bg-bg-secondary text-text-primary rounded-t-lg">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-bg-tertiary rounded-full">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold">Portfolio Analytics</span>
            </div>
            <Badge className="bg-red-500/20 text-compound-error-100 border-red-400/30">
              <AlertTriangle className="h-4 w-4" />
              <span className="ml-1">Error</span>
            </Badge>
          </CardTitle>
          <p className="text-compound-error-100 text-sm opacity-90">
            Unable to load portfolio data
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 p-8 rounded-xl border border-red-200 dark:border-red-700 text-center">
            <div className="p-4 bg-red-100 dark:bg-red-800/50 rounded-full w-fit mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              Error Loading Portfolio Data
            </h3>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-compound-error-600 hover:bg-compound-error-700 text-white rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!portfolioData) {
    return (
      <Card className="compound-card">
        <CardHeader className="pb-4 bg-bg-secondary text-text-primary rounded-t-lg">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-bg-tertiary rounded-full">
                <PieChart className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold">Portfolio Analytics</span>
            </div>
            <Badge className="bg-bg-tertiary text-text-primary border-border-primary">
              <PieChart className="h-4 w-4" />
              <span className="ml-1">Empty</span>
            </Badge>
          </CardTitle>
          <p className="text-compound-primary-100 text-sm opacity-90">
            Real-time portfolio insights and risk monitoring
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-800 dark:to-slate-700 p-8 rounded-xl border border-slate-200 dark:border-slate-600 text-center">
            <div className="p-4 bg-slate-100 dark:bg-slate-600 rounded-full w-fit mx-auto mb-4">
              <PieChart className="h-8 w-8 text-slate-600 dark:text-slate-300" />
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              No Portfolio Data Available
            </h3>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              Connect your wallet and create a position to view detailed analytics
            </p>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Start by supplying WETH as collateral and borrowing USDC
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'danger': return 'destructive'
      case 'warning': return 'secondary'
      default: return 'default'
    }
  }

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'danger': return <AlertTriangle className="h-4 w-4" />
      case 'warning': return <AlertTriangle className="h-4 w-4" />
      default: return <Shield className="h-4 w-4" />
    }
  }

  return (
    <Card className="w-full bg-bg-secondary border border-border-primary text-text-primary shadow-xl">
      <CardHeader className="pb-3 bg-bg-secondary text-text-primary rounded-t-lg">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-bg-tertiary rounded-full">
              <PieChart className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold">Portfolio</span>
          </div>
          <Badge
            variant={getRiskBadgeVariant(portfolioData.riskLevel)}
            className={`text-xs px-2.5 py-0.5 font-medium ${
              portfolioData.riskLevel === 'safe'
                ? 'bg-compound-success-900/20 text-compound-success-100 border-compound-success-700/30'
                : portfolioData.riskLevel === 'warning'
                ? 'bg-yellow-500/20 text-yellow-100 border-yellow-400/30'
                : 'bg-red-500/20 text-compound-error-100 border-red-400/30'
            }`}
          >
            {getRiskIcon(portfolioData.riskLevel)}
            <span className="ml-1 capitalize">{portfolioData.riskLevel}</span>
          </Badge>
        </CardTitle>
        <p className="text-text-secondary text-xs">Live positions and risk</p>
      </CardHeader>

      <CardContent className="p-4 space-y-4 bg-bg-secondary">
        {/* Health Factor - Enhanced */}
        <div className="bg-bg-tertiary/60 p-4 rounded-lg border border-border-primary">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-bg-tertiary rounded-full">
                <Shield className="h-5 w-5 text-compound-success-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-text-primary">Health</h3>
                <p className="text-xs text-text-secondary">Safety</p>
              </div>
            </div>
            <div className="text-right leading-tight">
              <span className="text-2xl font-semibold text-text-primary">
                {portfolioData.healthFactor === Infinity ? '∞' : portfolioData.healthFactor.toFixed(2)}
              </span>
              <p className="text-xs text-text-secondary">score</p>
            </div>
          </div>
          <Progress value={Math.min(100, (portfolioData.healthFactor / 3) * 100)} className="h-2 bg-bg-tertiary" />
        </div>

        {/* Position Overview - Enhanced Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-bg-tertiary/60 p-4 rounded-lg border border-border-primary">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-bg-tertiary rounded-full">
                <DollarSign className="h-6 w-6 text-compound-success-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-text-primary">Collateral</h3>
                <p className="text-xs text-text-secondary">WETH value</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-semibold text-text-primary">${portfolioData.totalCollateralValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              <div className="flex items-center justify-between text-xs">
                <p className="text-text-secondary whitespace-normal break-words">{portfolioData.wethCollateralAmount.toFixed(4)} WETH</p>
                <p className="text-text-tertiary whitespace-normal break-words">${portfolioData.wethPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}/WETH</p>
              </div>
            </div>
          </div>

          <div className="bg-bg-tertiary/60 p-4 rounded-lg border border-border-primary">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-bg-tertiary rounded-full">
                <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-text-primary">Borrowed</h3>
                <p className="text-xs text-text-secondary">USDC debt</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-semibold text-text-primary">${portfolioData.totalBorrowedValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              <div className="flex items-center justify-between text-xs">
                <p className="text-text-secondary whitespace-normal break-words">{portfolioData.usdcBorrowedAmount.toFixed(2)} USDC</p>
                <span className="text-text-tertiary" />
              </div>
            </div>
          </div>
        </div>

        {/* Net Position - Enhanced */}
        <div className="bg-bg-tertiary/60 p-4 rounded-lg border border-border-primary">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${
                portfolioData.netPositionValue >= 0
                  ? 'bg-compound-success-900/20'
                  : 'bg-bg-tertiary'
              }`}>
                {portfolioData.netPositionValue >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-compound-success-400" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-text-primary">Net</h3>
                <p className="text-xs text-text-secondary">Equity</p>
              </div>
            </div>
            <div className="text-right leading-tight">
              <p className={`text-2xl font-semibold ${
                portfolioData.netPositionValue >= 0
                  ? 'text-compound-success-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                ${Math.abs(portfolioData.netPositionValue).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-text-secondary">
                {portfolioData.netPositionValue >= 0 ? 'Positive equity' : 'Negative equity'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  portfolioData.netPositionValue >= 0
                    ? 'bg-gradient-to-r from-green-400 to-green-600'
                    : 'bg-gradient-to-r from-red-400 to-red-600'
                }`}
                style={{ width: `${Math.min(100, portfolioData.totalCollateralValue > 0 ? Math.abs(portfolioData.netPositionValue) / portfolioData.totalCollateralValue * 100 : 0)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Risk Metrics - Enhanced */}
        <h4 className="text-sm font-medium text-text-primary flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Risk
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-bg-tertiary/60 p-4 rounded-lg border border-border-primary">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-bg-tertiary rounded-full">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-text-primary">Liq. Price</h3>
                <p className="text-xs text-text-secondary">Threshold</p>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-semibold text-text-primary">${portfolioData.liquidationPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              <p className="text-xs text-text-secondary text-right">WETH ${portfolioData.wethPrice.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-bg-tertiary/60 p-4 rounded-lg border border-border-primary">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-bg-tertiary rounded-full">
                <PieChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-text-primary">Collateral Ratio</h3>
                <p className="text-xs text-text-secondary">Safety</p>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-semibold text-text-primary">{portfolioData.collateralRatio.toFixed(2)}x</p>
              <p className="text-xs text-text-secondary text-right">Req. {portfolioData.liquidationThreshold.toFixed(2)}x</p>
            </div>
          </div>
        </div>

        {/* Borrowing Capacity - Enhanced */}
        <div className="bg-bg-tertiary/60 p-4 rounded-lg border border-border-primary">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-bg-tertiary rounded-full">
                <DollarSign className="h-5 w-5 text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-text-primary">Capacity</h3>
                <p className="text-xs text-text-secondary">Available</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-semibold text-text-primary">${portfolioData.currentBorrowCapacity.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              <p className="text-xs text-text-secondary">now</p>
            </div>
          </div>
          <Progress value={(portfolioData.totalBorrowedValue / portfolioData.maxBorrowCapacity) * 100} className="h-2 bg-bg-tertiary" />
          <div className="flex justify-between text-xs text-text-secondary">
            <span>${portfolioData.totalBorrowedValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} used</span>
            <span>${portfolioData.maxBorrowCapacity.toLocaleString(undefined, { maximumFractionDigits: 2 })} max</span>
          </div>
        </div>

        {/* Supply Position - Enhanced */}
        {portfolioData.usdcSuppliedAmount > 0 && (
          <div className="bg-bg-tertiary/60 p-4 rounded-lg border border-border-primary">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-bg-tertiary rounded-full">
                <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-text-primary">USDC Supply</h3>
                <p className="text-xs text-text-secondary">Earning yield</p>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-semibold text-text-primary">${portfolioData.usdcSuppliedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <div className="w-2 h-2 bg-compound-success-500 rounded-full animate-pulse"></div>
                <span>yielding</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
