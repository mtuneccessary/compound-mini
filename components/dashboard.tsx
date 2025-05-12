"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useCompound } from "@/lib/compound-provider"
import { formatCurrency } from "@/lib/utils"
import { ArrowDownRight, PiggyBank, AlertTriangle, RefreshCw, Wallet } from "lucide-react"
import { AssetList } from "@/components/asset-list"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useTelegram } from "@/lib/telegram-provider"
import Image from "next/image"

export function Dashboard() {
  const {
    userBalances,
    totalSupplied,
    totalBorrowed,
    borrowLimit,
    healthFactor,
    borrowLimitUsed,
    resetData,
    resetToHighBalance,
    isLoading,
  } = useCompound()
  const { toast } = useToast()
  const { showConfirm } = useTelegram()

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const healthColor = healthFactor > 1.5 ? "text-green-500" : healthFactor > 1.1 ? "text-yellow-500" : "text-red-500"

  const handleReset = async () => {
    const confirmed = await showConfirm("Reset all data? This will clear your positions and balances.")
    if (confirmed) {
      resetData()
      toast({
        title: "Data reset",
        description: "All data has been reset to initial values",
      })
    }
  }

  const handleRefillWallet = async () => {
    resetToHighBalance()
    toast({
      title: "Wallet refilled",
      description: "Your wallet has been refilled with 10,000 USDC and other assets",
    })
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex justify-between">
            <span>Dashboard</span>
            <span className="text-sm flex items-center gap-1">
              Health Factor: <span className={healthColor}>{healthFactor.toFixed(2)}</span>
              {healthFactor < 1.1 && <AlertTriangle className="h-4 w-4 text-red-500" />}
            </span>
          </CardTitle>
          <CardDescription className="text-gray-400">Your DeFi portfolio overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-[#252836] p-3 rounded-lg">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <PiggyBank className="h-4 w-4" />
                <span className="text-xs">Total Supplied</span>
              </div>
              <div className="text-lg font-semibold">{formatCurrency(totalSupplied)}</div>
            </div>
            <div className="bg-[#252836] p-3 rounded-lg">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <ArrowDownRight className="h-4 w-4" />
                <span className="text-xs">Total Borrowed</span>
              </div>
              <div className="text-lg font-semibold">{formatCurrency(totalBorrowed)}</div>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Borrow Limit Used</span>
              <span>{borrowLimitUsed.toFixed(2)}%</span>
            </div>
            <Progress value={borrowLimitUsed} className="h-2 bg-[#252836]" indicatorClassName="bg-blue-500" />
            <div className="flex justify-between text-xs text-gray-400">
              <span>0%</span>
              <span>Borrow Limit: {formatCurrency(borrowLimit)}</span>
              <span>100%</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Your Supplied Assets</h3>
              <AssetList type="supplied" />
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Your Borrowed Assets</h3>
              <AssetList type="borrowed" />
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Your Wallet</h3>
              <div className="bg-[#252836] rounded-lg p-3">
                <div className="space-y-2">
                  {Object.entries(userBalances).map(([symbol, amount]) => (
                    <div key={symbol} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Image
                          src={`/images/coins/${symbol.toLowerCase()}.png`}
                          alt={symbol}
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                        <span>{symbol}</span>
                      </div>
                      <span>{formatCurrency(amount, symbol)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full border-[#2a2d36] text-blue-400 hover:text-white hover:bg-blue-600"
            onClick={handleRefillWallet}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                Processing...
              </div>
            ) : (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Refill Wallet (10,000 USDC)
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full border-[#2a2d36] text-gray-400 hover:text-white"
            onClick={handleReset}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                Processing...
              </div>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset All Data
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
