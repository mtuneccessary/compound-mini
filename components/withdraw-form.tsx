"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCompound } from "@/lib/compound-provider"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { ArrowUpRight } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useTelegram } from "@/lib/telegram-provider"
import { Progress } from "@/components/ui/progress"
import Image from "next/image"

export function WithdrawForm() {
  const { suppliedAssets, withdrawAsset, totalBorrowed, borrowLimit, borrowLimitUsed, isLoading } = useCompound()
  const { toast } = useToast()
  const { showConfirm } = useTelegram()

  const [selectedAsset, setSelectedAsset] = useState("")
  const [amount, setAmount] = useState("")
  const [newBorrowLimitUsed, setNewBorrowLimitUsed] = useState(borrowLimitUsed)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (suppliedAssets.length > 0) {
      setSelectedAsset(suppliedAssets[0].symbol)
    }
  }, [suppliedAssets])

  useEffect(() => {
    if (amount && selectedAsset) {
      const suppliedAsset = suppliedAssets.find((a) => a.symbol === selectedAsset)
      if (suppliedAsset) {
        const amountValue = Number.parseFloat(amount) || 0
        const assetValue = amountValue * suppliedAsset.price
        const assetCollateralValue = assetValue * suppliedAsset.collateralFactor
        const newBorrowLimit = borrowLimit - assetCollateralValue
        const newUsed = newBorrowLimit > 0 ? (totalBorrowed / newBorrowLimit) * 100 : 100
        setNewBorrowLimitUsed(newUsed)
      }
    } else {
      setNewBorrowLimitUsed(borrowLimitUsed)
    }
  }, [amount, selectedAsset, borrowLimit, totalBorrowed, borrowLimitUsed, suppliedAssets])

  if (!mounted) return null

  const selectedAssetData = suppliedAssets.find((a) => a.symbol === selectedAsset)
  const maxWithdrawAmount = selectedAssetData ? selectedAssetData.amount : 0

  const handleWithdraw = async () => {
    if (!selectedAsset || !amount || Number.parseFloat(amount) <= 0) {
      toast({
        title: "Invalid input",
        description: "Please enter a valid amount",
        variant: "destructive",
      })
      return
    }

    if (!selectedAssetData || Number.parseFloat(amount) > selectedAssetData.amount) {
      toast({
        title: "Insufficient balance",
        description: "You don't have enough supplied balance",
        variant: "destructive",
      })
      return
    }

    // Check if withdrawal would put position at risk
    if (newBorrowLimitUsed > 100) {
      toast({
        title: "Withdrawal would put your position at risk",
        description: "This withdrawal would exceed your borrow limit",
        variant: "destructive",
      })
      return
    }

    const confirmed = await showConfirm(`Withdraw ${amount} ${selectedAsset}?`)
    if (confirmed) {
      try {
        await withdrawAsset(selectedAsset, Number.parseFloat(amount))
        toast({
          title: "Withdrawal successful",
          description: `You have withdrawn ${amount} ${selectedAsset}`,
        })
        setAmount("")
      } catch (error: any) {
        toast({
          title: "Withdrawal failed",
          description: error.message || "An error occurred while withdrawing",
          variant: "destructive",
        })
      }
    }
  }

  const handleMaxClick = () => {
    if (selectedAssetData) {
      setAmount(selectedAssetData.amount.toString())
    }
  }

  const limitColor = newBorrowLimitUsed > 80 ? "bg-red-500" : newBorrowLimitUsed > 60 ? "bg-yellow-500" : "bg-blue-500"

  if (suppliedAssets.length === 0) {
    return (
      <div className="p-4">
        <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
          <CardHeader>
            <CardTitle className="text-xl">Withdraw Assets</CardTitle>
            <CardDescription className="text-gray-400">Withdraw your supplied assets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-400">
              <p>You don't have any supplied assets to withdraw</p>
              <Button
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => (window.location.href = "/supply")}
              >
                Supply Assets First
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4">
      <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
        <CardHeader>
          <CardTitle className="text-xl">Withdraw Assets</CardTitle>
          <CardDescription className="text-gray-400">Withdraw your supplied assets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="asset">Asset</Label>
            <Select value={selectedAsset} onValueChange={setSelectedAsset}>
              <SelectTrigger id="asset" className="bg-[#252836] border-[#2a2d36]">
                <SelectValue placeholder="Select asset">
                  {selectedAsset && (
                    <div className="flex items-center gap-2">
                      <Image
                        src={`/images/coins/${selectedAsset.toLowerCase()}.png`}
                        alt={selectedAsset}
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                      <span>{selectedAsset}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#252836] border-[#2a2d36] text-white">
                {suppliedAssets.map((asset) => (
                  <SelectItem key={asset.symbol} value={asset.symbol}>
                    <div className="flex items-center gap-2">
                      <Image
                        src={`/images/coins/${asset.symbol.toLowerCase()}.png`}
                        alt={asset.name}
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                      <span>
                        {asset.symbol} - {formatCurrency(asset.amount, asset.symbol)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="amount">Amount</Label>
              <span className="text-xs text-gray-400">
                Supplied: {selectedAssetData ? formatCurrency(selectedAssetData.amount, selectedAsset) : "0"}
              </span>
            </div>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-[#252836] border-[#2a2d36] pr-16"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-7 text-xs text-blue-400 hover:text-blue-300"
                onClick={handleMaxClick}
              >
                MAX
              </Button>
            </div>
          </div>

          {totalBorrowed > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">New Borrow Limit Used</span>
                <span className={newBorrowLimitUsed > 100 ? "text-red-500" : ""}>{newBorrowLimitUsed.toFixed(2)}%</span>
              </div>
              <Progress
                value={Math.min(newBorrowLimitUsed, 100)}
                className="h-2 bg-[#252836]"
                indicatorClassName={limitColor}
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>0%</span>
                <span>Safe</span>
                <span>100%</span>
              </div>
            </div>
          )}

          <div className="bg-[#252836] p-3 rounded-lg space-y-2">
            <div className="text-sm font-medium">Withdrawal Information</div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">You will receive</span>
              <span>
                {amount && selectedAsset ? formatCurrency(Number.parseFloat(amount) || 0, selectedAsset) : "0"}
              </span>
            </div>
            {selectedAssetData && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Current APY</span>
                <span>{formatPercentage(selectedAssetData.interestRate)}</span>
              </div>
            )}
          </div>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleWithdraw}
            disabled={
              isLoading ||
              !amount ||
              Number.parseFloat(amount) <= 0 ||
              !selectedAssetData ||
              Number.parseFloat(amount) > selectedAssetData.amount ||
              newBorrowLimitUsed > 100
            }
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Processing...
              </div>
            ) : (
              <>
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Withdraw {selectedAsset}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
