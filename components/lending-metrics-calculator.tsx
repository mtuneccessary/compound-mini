"use client"

import { useState, useEffect } from "react"
import { useAccount } from "wagmi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Calculator, TrendingUp, TrendingDown, Target, Zap, AlertTriangle, DollarSign, BarChart3, PieChart } from "lucide-react"
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

interface LendingMetrics {
  // Current Position
  collateralAmount: number
  borrowAmount: number
  healthFactor: number
  liquidationPrice: number

  // Market Rates
  supplyAPY: number
  borrowAPY: number
  utilizationRate: number

  // Projections
  projectedHealthFactor: number
  projectedLiquidationPrice: number
  netYield: number
  riskScore: number

  // Optimal Position
  optimalCollateral: number
  optimalBorrow: number
  maxSafeBorrow: number
  recommendedBorrow: number
}

export function LendingMetricsCalculator() {
  const { address } = useAccount()
  const [metrics, setMetrics] = useState<LendingMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calculator inputs
  const [collateralInput, setCollateralInput] = useState<string>("")
  const [borrowInput, setBorrowInput] = useState<string>("")
  const [wethPrice, setWethPrice] = useState<number>(0)
  const [activeTab, setActiveTab] = useState<string>("current")

  const fetchMetrics = async () => {
    if (!address || !publicClient) return

    try {
      setLoading(true)
      setError(null)

      console.log("🔍 Fetching lending metrics for:", address)

      // Fetch WETH price from Chainlink
      const priceData = await publicClient.readContract({
        address: CHAINLINK_ETH_USD_FEED,
        abi: CHAINLINK_PRICE_FEED_ABI,
        functionName: "latestRoundData"
      }) as [bigint, bigint, bigint, bigint, bigint]

      const currentWethPrice = Number(formatUnits(priceData[1], 8))
      setWethPrice(currentWethPrice)

      // Fetch current position
      const [
        wethCollateralBalance,
        usdcBorrowBalance,
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

      // Get rates
      const rates = await publicClient.readContract({
        address: COMET_ADDRESS,
        abi: cometAbi as any,
        functionName: "getUtilization",
        args: []
      }) as bigint

      const utilizationRate = totalSupply > 0 ? Number(formatUnits(totalBorrowed, 6)) / Number(formatUnits(totalSupply, 6)) : 0

      // Convert to readable amounts
      const collateralAmount = Number(formatUnits(wethCollateralBalance, 18))
      const borrowAmount = Number(formatUnits(usdcBorrowBalance, 6))

      // Calculate current metrics
      const collateralValue = collateralAmount * currentWethPrice
      const healthFactor = borrowAmount > 0 ? (collateralValue * 0.8) / borrowAmount : Infinity
      const liquidationPrice = borrowAmount > 0 && collateralAmount > 0 ? borrowAmount / (collateralAmount * 0.8) : 0

      // Calculate rates (simplified for demo)
      const supplyAPY = utilizationRate * 0.05 // 5% max supply APY
      const borrowAPY = utilizationRate * 0.08 // 8% max borrow APY

      // Calculate optimal position
      const optimalCollateral = borrowAmount > 0 ? (borrowAmount * 2) / currentWethPrice : 0 // 2x collateral ratio for safety
      const maxSafeBorrow = (collateralAmount * currentWethPrice * 0.8) // 80% of collateral value
      const recommendedBorrow = maxSafeBorrow * 0.75 // 75% of max safe borrow

      // Calculate projections
      const projectedHealthFactor = healthFactor
      const projectedLiquidationPrice = liquidationPrice
      const netYield = borrowAmount > 0 ? (borrowAmount * borrowAPY) - (collateralAmount * currentWethPrice * supplyAPY * 0.1) : 0

      // Risk scoring (1-10 scale)
      let riskScore = 10
      if (healthFactor < 1.2) riskScore = 3
      else if (healthFactor < 1.5) riskScore = 5
      else if (healthFactor < 2.0) riskScore = 7
      else if (healthFactor < 3.0) riskScore = 9

      const lendingMetrics: LendingMetrics = {
        collateralAmount,
        borrowAmount,
        healthFactor,
        liquidationPrice,
        supplyAPY,
        borrowAPY,
        utilizationRate,
        projectedHealthFactor,
        projectedLiquidationPrice,
        netYield,
        riskScore,
        optimalCollateral,
        optimalBorrow: recommendedBorrow,
        maxSafeBorrow,
        recommendedBorrow
      }

      console.log("✅ Lending Metrics:", lendingMetrics)
      setMetrics(lendingMetrics)

      // Set initial calculator values
      setCollateralInput(collateralAmount.toString())
      setBorrowInput(borrowAmount.toString())

    } catch (error: any) {
      console.error("❌ Error fetching lending metrics:", error)
      setError(error.message || "Failed to fetch lending metrics")
    } finally {
      setLoading(false)
    }
  }

  const calculateProjectedMetrics = (newCollateral: number, newBorrow: number): LendingMetrics => {
    if (!metrics || !wethPrice) return metrics as LendingMetrics

    const projectedCollateralValue = newCollateral * wethPrice
    const projectedHealthFactor = newBorrow > 0 ? (projectedCollateralValue * 0.8) / newBorrow : Infinity
    const projectedLiquidationPrice = newBorrow > 0 && newCollateral > 0 ? newBorrow / (newCollateral * 0.8) : 0

    const projectedNetYield = newBorrow > 0
      ? (newBorrow * metrics.borrowAPY) - (newCollateral * wethPrice * metrics.supplyAPY * 0.1)
      : 0

    let projectedRiskScore = 10
    if (projectedHealthFactor < 1.2) projectedRiskScore = 3
    else if (projectedHealthFactor < 1.5) projectedRiskScore = 5
    else if (projectedHealthFactor < 2.0) projectedRiskScore = 7
    else if (projectedHealthFactor < 3.0) projectedRiskScore = 9

    return {
      ...metrics,
      collateralAmount: newCollateral,
      borrowAmount: newBorrow,
      healthFactor: projectedHealthFactor,
      liquidationPrice: projectedLiquidationPrice,
      netYield: projectedNetYield,
      riskScore: projectedRiskScore
    }
  }

  useEffect(() => {
    if (address) {
      fetchMetrics()
      const interval = setInterval(fetchMetrics, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [address])

  const getRiskBadgeVariant = (riskScore: number) => {
    if (riskScore <= 3) return 'destructive'
    if (riskScore <= 5) return 'secondary'
    if (riskScore <= 7) return 'secondary'
    return 'default'
  }

  const getRiskColor = (riskScore: number) => {
    if (riskScore <= 3) return 'text-red-600 dark:text-red-400'
    if (riskScore <= 5) return 'text-yellow-600 dark:text-yellow-400'
    if (riskScore <= 7) return 'text-orange-600 dark:text-orange-400'
    return 'text-compound-success-400'
  }

  const getHealthFactorColor = (hf: number) => {
    if (hf < 1.2) return 'text-red-600 dark:text-red-400'
    if (hf < 1.5) return 'text-yellow-600 dark:text-yellow-400'
    if (hf < 2.0) return 'text-orange-600 dark:text-orange-400'
    return 'text-compound-success-400'
  }

  if (loading) {
    return (
      <Card className="compound-card">
        <CardHeader className="pb-4 bg-bg-secondary text-text-primary rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-bg-tertiary rounded-full">
              <Calculator className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">Lending Metrics Calculator</span>
          </CardTitle>
          <p className="text-compound-success-100 text-sm opacity-90">
            Advanced position analysis and risk assessment
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="compound-card">
        <CardHeader className="pb-4 bg-bg-secondary text-text-primary rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-bg-tertiary rounded-full">
              <Calculator className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">Lending Metrics Calculator</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 p-8 rounded-xl border border-red-200 dark:border-red-700 text-center">
            <div className="p-4 bg-red-100 dark:bg-red-800/50 rounded-full w-fit mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              Error Loading Metrics
            </h3>
            <p className="text-slate-600 dark:text-slate-300 mb-4">{error}</p>
            <Button onClick={fetchMetrics} className="bg-red-600 hover:bg-red-700">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!metrics) {
    return (
      <Card className="compound-card">
        <CardHeader className="pb-4 bg-bg-secondary text-text-primary rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-bg-tertiary rounded-full">
              <Calculator className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">Lending Metrics Calculator</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center text-slate-600 dark:text-slate-300 py-8">
            <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Connect wallet to access lending metrics calculator</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const projectedMetrics = calculateProjectedMetrics(
    parseFloat(collateralInput) || 0,
    parseFloat(borrowInput) || 0
  )

  return (
    <Card className="bg-bg-secondary border border-border-primary text-text-primary shadow-xl">
      <CardHeader className="pb-3 bg-bg-secondary text-text-primary rounded-t-lg">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-bg-tertiary rounded-full">
              <Calculator className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold">Lending Metrics</span>
          </div>
          <Badge
            variant={getRiskBadgeVariant(metrics.riskScore)}
            className={`text-xs px-2.5 py-0.5 font-medium ${
              metrics.riskScore <= 3
                ? 'bg-red-500/20 text-red-100 border-red-400/30'
                : metrics.riskScore <= 5
                ? 'bg-yellow-500/20 text-yellow-100 border-yellow-400/30'
                : metrics.riskScore <= 7
                ? 'bg-orange-500/20 text-orange-100 border-orange-400/30'
                : 'bg-compound-success-500/20 text-compound-success-100 border-green-400/30'
            }`}
          >
            <Target className="h-3 w-3 mr-1" />
            Risk {metrics.riskScore}/10
          </Badge>
        </CardTitle>
        <p className="text-text-secondary text-xs">Quick view and calculator</p>
      </CardHeader>

      <CardContent className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="current" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Current Position
            </TabsTrigger>
            <TabsTrigger value="calculator" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Calculator
            </TabsTrigger>
            <TabsTrigger value="optimization" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Optimization
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-4">
            {/* Current Position Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-bg-tertiary/60 p-4 rounded-lg border border-border-primary">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-bg-tertiary rounded-full">
                    <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-text-primary">Collateral</h3>
                    <p className="text-xs text-text-secondary">WETH value</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-semibold text-text-primary">${(metrics.collateralAmount * wethPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                  <div className="flex items-center justify-between text-xs">
                    <p className="text-text-secondary whitespace-normal break-words">{metrics.collateralAmount.toFixed(4)} WETH</p>
                    <p className="text-text-tertiary whitespace-normal break-words">${wethPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}/WETH</p>
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
                    <p className="text-xs text-text-secondary">USDC</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-semibold text-text-primary">${metrics.borrowAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                  <div className="flex items-center justify-between text-xs">
                    <p className="text-text-secondary whitespace-normal break-words">APY</p>
                    <p className="text-text-tertiary whitespace-normal break-words">{(metrics.borrowAPY * 100).toFixed(2)}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Health Factor */}
            <div className="bg-bg-tertiary/60 p-4 rounded-lg border border-border-primary">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-bg-tertiary rounded-full">
                    <Zap className="h-5 w-5 text-compound-success-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-text-primary">Health</h3>
                    <p className="text-xs text-text-secondary">Safety</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-semibold ${getHealthFactorColor(metrics.healthFactor)}`}>
                    {metrics.healthFactor === Infinity ? '∞' : metrics.healthFactor.toFixed(2)}
                  </span>
                  <p className="text-xs text-text-secondary">score</p>
                </div>
              </div>
              <Progress value={Math.min(100, (metrics.healthFactor / 3) * 100)} className="h-2 bg-bg-tertiary" />
            </div>

            {/* Market Rates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-bg-tertiary/60 p-4 rounded-lg border border-border-primary text-center">
                <TrendingUp className="h-8 w-8 text-compound-success-400 mx-auto mb-2" />
                <p className="text-sm text-text-secondary">Supply APY</p>
                <p className="text-2xl font-bold text-text-primary">
                  {(metrics.supplyAPY * 100).toFixed(2)}%
                </p>
              </div>

              <div className="bg-bg-tertiary/60 p-4 rounded-lg border border-border-primary text-center">
                <TrendingDown className="h-8 w-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
                <p className="text-sm text-text-secondary">Borrow APY</p>
                <p className="text-2xl font-bold text-text-primary">
                  {(metrics.borrowAPY * 100).toFixed(2)}%
                </p>
              </div>

              <div className="bg-bg-tertiary/60 p-4 rounded-lg border border-border-primary text-center">
                <PieChart className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                <p className="text-sm text-text-secondary">Utilization</p>
                <p className="text-2xl font-bold text-text-primary">
                  {(metrics.utilizationRate * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="calculator" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Calculator Inputs */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="collateral" className="text-sm font-medium">
                    WETH Collateral Amount
                  </Label>
                  <Input
                    id="collateral"
                    type="number"
                    value={collateralInput}
                    onChange={(e) => setCollateralInput(e.target.value)}
                    placeholder="Enter WETH amount"
                    className="text-lg"
                  />
                  <p className="text-xs text-text-secondary">
                    Current: {metrics.collateralAmount.toFixed(4)} WETH
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="borrow" className="text-sm font-medium">
                    USDC Borrow Amount
                  </Label>
                  <Input
                    id="borrow"
                    type="number"
                    value={borrowInput}
                    onChange={(e) => setBorrowInput(e.target.value)}
                    placeholder="Enter USDC amount"
                    className="text-lg"
                  />
                  <p className="text-xs text-text-secondary">
                    Current: ${metrics.borrowAmount.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Projected Results */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-text-primary">Projected Metrics</h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-bg-tertiary/60 rounded-lg border border-border-primary">
                    <span className="text-sm font-medium">Health Factor</span>
                    <span className={`text-lg font-bold ${getHealthFactorColor(projectedMetrics.healthFactor)}`}>
                      {projectedMetrics.healthFactor === Infinity ? '∞' : projectedMetrics.healthFactor.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-bg-tertiary/60 rounded-lg border border-border-primary">
                    <span className="text-sm font-medium">Liquidation Price</span>
                    <span className="text-lg font-bold text-text-primary">
                      ${projectedMetrics.liquidationPrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-bg-tertiary/60 rounded-lg border border-border-primary">
                    <span className="text-sm font-medium">Net Yield</span>
                    <span className={`text-lg font-bold ${
                      projectedMetrics.netYield >= 0
                        ? 'text-compound-success-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      ${projectedMetrics.netYield.toFixed(2)}/year
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-bg-tertiary/60 rounded-lg border border-border-primary">
                    <span className="text-sm font-medium">Risk Score</span>
                    <Badge variant={getRiskBadgeVariant(projectedMetrics.riskScore)}>
                      {projectedMetrics.riskScore}/10
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="optimization" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-bg-tertiary/60 p-4 rounded-lg border border-border-primary">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-bg-tertiary rounded-full">
                    <Target className="h-6 w-6 text-compound-success-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-text-primary">Optimal</h3>
                    <p className="text-xs text-text-secondary">Recs</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Opt. Collat</span>
                    <span className="text-lg font-bold text-text-primary">
                      {metrics.optimalCollateral.toFixed(4)} WETH
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Rec. Borrow</span>
                    <span className="text-lg font-bold text-text-primary">
                      ${metrics.recommendedBorrow.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Max Safe</span>
                    <span className="text-lg font-bold text-text-primary">
                      ${metrics.maxSafeBorrow.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-bg-tertiary/60 p-4 rounded-lg border border-border-primary">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-bg-tertiary rounded-full">
                    <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-text-primary">Yield</h3>
                    <p className="text-xs text-text-secondary">Annual</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Borrow Cost</span>
                    <span className="text-lg font-bold text-red-600 dark:text-red-400">
                      -${(metrics.borrowAmount * metrics.borrowAPY).toFixed(2)}/yr
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Collat. Yield</span>
                    <span className="text-lg font-bold text-compound-success-400">
                      +${((metrics.collateralAmount * wethPrice) * metrics.supplyAPY * 0.1).toFixed(2)}/yr
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-600">
                    <span className="text-sm font-semibold">Net /yr</span>
                    <span className={`text-xl font-bold ${
                      metrics.netYield >= 0
                        ? 'text-compound-success-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      ${metrics.netYield.toFixed(2)}/year
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-bg-tertiary/60 p-4 rounded-lg border border-border-primary">
              <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Risk
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-bg-tertiary rounded-lg border border-border-primary">
                  <p className="text-2xl font-bold text-text-primary mb-1">
                    {metrics.healthFactor < 1.5 ? 'High' : metrics.healthFactor < 2.0 ? 'Medium' : 'Low'}
                  </p>
                  <p className="text-xs text-text-secondary">Liquidation Risk</p>
                </div>
                <div className="text-center p-3 bg-bg-tertiary rounded-lg border border-border-primary">
                  <p className="text-2xl font-bold text-text-primary mb-1">
                    {(metrics.utilizationRate * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-text-secondary">Protocol Utilization</p>
                </div>
                <div className="text-center p-3 bg-bg-tertiary rounded-lg border border-border-primary">
                  <p className="text-2xl font-bold text-text-primary mb-1">
                    {metrics.riskScore}/10
                  </p>
                  <p className="text-xs text-text-secondary">Position Score</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
