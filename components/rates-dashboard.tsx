"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react"
import Image from "next/image"
import { publicClient, COMET_ADDRESS, getRates } from "@/lib/comet-onchain"
import cometAbi from "@/lib/abis/comet.json"

export function RatesDashboard() {
  const [mounted, setMounted] = useState(false)
  const [rates, setRates] = useState<{
    supplyRate: number
    borrowRate: number
    utilization: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchRates = async () => {
    if (!mounted) return
    
    setLoading(true)
    setError(null)

    try {
      console.log("🚀 Fetching rates from COMET_ADDRESS:", COMET_ADDRESS)
      console.log("🔗 Using RPC URL:", publicClient.transport.url)
      
      // Use the existing getRates function
      const rateData = await getRates()
      
      console.log("📊 Raw blockchain data:", {
        utilization: rateData.utilization.toString(),
        supplyRate: rateData.supplyRate.toString(),
        borrowRate: rateData.borrowRate.toString()
      })

      const processedRates = {
        supplyRate: Number(rateData.supplyRate) / 1e18 * 100, // Convert to percentage
        borrowRate: Number(rateData.borrowRate) / 1e18 * 100,
        utilization: Number(rateData.utilization) / 1e18 * 100
      }

      // Convert very small rates to a more readable format (APY)
      processedRates.supplyRate = processedRates.supplyRate * 365 * 24 * 3600 // Convert to annual
      processedRates.borrowRate = processedRates.borrowRate * 365 * 24 * 3600 // Convert to annual

      console.log("🎯 Processed rates:", processedRates)

      setRates(processedRates)

    } catch (err: any) {
      console.error("❌ Error fetching rates:", err)
      console.error("❌ Error details:", {
        message: err.message,
        code: err.code,
        cause: err.cause
      })
      setError(err.message || "Failed to load rates")
    } finally {
      setLoading(false)
    }
  }

  // Load rates on mount
  useEffect(() => {
    if (mounted) {
      // Test connection first
      const testConnection = async () => {
        try {
          console.log("🧪 Testing blockchain connection...")
          const blockNumber = await publicClient.getBlockNumber()
          console.log("✅ Connected to blockchain, current block:", blockNumber.toString())
          fetchRates()
        } catch (err) {
          console.error("❌ Blockchain connection failed:", err)
          setError("Cannot connect to blockchain. Make sure Hardhat node is running.")
        }
      }
      testConnection()
    }
  }, [mounted])

  if (!mounted) return null

  return (
    <Card className="compound-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Live USDC Rates</CardTitle>
            <CardDescription className="text-text-tertiary">
              Real-time market rates
            </CardDescription>
          </div>
          <button
            onClick={fetchRates}
            disabled={loading}
            className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh rates"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </button>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading && !rates ? (
          <div className="text-center py-6 text-text-tertiary">
            <Loader2 className="mx-auto h-6 w-6 mb-2 animate-spin" />
            <p className="text-sm">Loading rates...</p>
          </div>
        ) : error ? (
          <div className="text-center py-6 text-compound-error-400">
            <p className="text-sm mb-2">{error}</p>
            <div className="text-xs text-text-muted mb-2">
              RPC: {publicClient.transport.url}<br/>
              Contract: {COMET_ADDRESS}
            </div>
            <button 
              onClick={fetchRates}
              className="text-xs text-compound-primary-400 hover:text-compound-primary-300"
            >
              Try again
            </button>
          </div>
        ) : rates ? (
          <div className="space-y-4">
            {/* USDC Rates */}
            <div className="bg-bg-tertiary p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Image 
                    src="/usdc-icon.webp" 
                    alt="USDC" 
                    width={24} 
                    height={24} 
                    className="rounded-full"
                  />
                  <span className="font-medium">USDC Market</span>
                </div>
                <div className="text-xs text-text-tertiary">
                  {rates.utilization.toFixed(1)}% utilized
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-compound-success-400 mb-1">
                    {rates.supplyRate > 0.01 ? rates.supplyRate.toFixed(2) + '%' : rates.supplyRate.toFixed(4) + '%'}
                  </div>
                  <div className="text-xs text-text-tertiary">Supply APY</div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-semibold text-compound-error-400 mb-1">
                    {rates.borrowRate > 0.01 ? rates.borrowRate.toFixed(2) + '%' : rates.borrowRate.toFixed(4) + '%'}
                  </div>
                  <div className="text-xs text-text-tertiary">Borrow APR</div>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="bg-bg-tertiary p-3 rounded-lg">
              <div className="text-xs text-text-tertiary text-center">
                Rates update when you refresh • Click refresh button above
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-text-tertiary">
            <p className="text-sm">No rate data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
