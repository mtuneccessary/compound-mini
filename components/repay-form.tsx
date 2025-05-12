"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCompound } from "@/lib/compound-provider"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { ArrowDownLeft } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useTelegram } from "@/lib/telegram-provider"
import { Progress } from "@/components/ui/progress"
import { CryptoIcon } from "./crypto-icon"

export function RepayForm() {
  const { borrowedAssets, userBalances, repayAsset, borrowLimitUsed, isLoading } = useCompound()
  const { toast } = useToast()
  const { showConfirm } = useTelegram()

  const [selectedAsset, setSelectedAsset] = useState("")
  const [amount, setAmount] = useState("")
  const [newBorrowLimitUsed, setNewBorrowLimitUsed] = useState(borrowLimitUsed)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (borrowedAssets.length > 0) {
      setSelectedAsset(borrowedAssets[0].symbol)
    }
  }, [borrowedAssets])

  useEffect(() => {
    if (amount && selectedAsset) {
      const borrowedAsset = borrowedAssets.find((a) => a.symbol === selectedAsset)
      if (borrowedAsset) {
        const amountValue = Number.parseFloat(amount) || 0
        const repayRatio = Math.min(amountValue / borrowedAsset.amount, 1)
        const newUsed = borrowLimitUsed * (1 - repayRatio)
        setNewBorrowLimitUsed(newUsed)
      }
    } else {
      setNewBorrowLimitUsed(borrowLimitUsed)
    }
  }, [amount, selectedAsset, borrowLimitUsed, borrowedAssets])

  if (!mounted) return null

  const selectedAssetData = borrowedAssets.find((a) => a.symbol === selectedAsset)
  const walletBalance = userBalances[selectedAsset] || 0
  const maxRepayAmount = selectedAssetData ? Math.min(selectedAssetData.amount, walletBalance) : 0

  const handleRepay = async () => {
    if (!selectedAsset || !amount || Number.parseFloat(amount) <= 0) {
      toast({
        title: "Invalid input",
        description: "Please enter a valid amount",
        variant: "destructive",
      })
      return
    }

    if (Number.parseFloat(amount) > walletBalance) {
      toast({
        title: "Insufficient balance",
        description: "You don't have enough balance in your wallet",
        variant: "destructive",
      })
      return
    }

    const confirmed = await showConfirm(`Repay ${amount} ${selectedAsset}?`)
    if (confirmed) {
      try {
        await repayAsset(selectedAsset, Number.parseFloat(amount))
        toast({
          title: "Repayment successful",
          description: `You have repaid ${amount} ${selectedAsset}`,
        })
        setAmount("")
      } catch (error: any) {
        toast({
          title: "Repayment failed",
          description: error.message || "An error occurred while repaying",
          variant: "destructive",
        })
      }
    }
  }

  const handleMaxClick = () => {
    if (selectedAssetData) {
      setAmount(maxRepayAmount.toString())
    }
  }

  const limitColor = newBorrowLimitUsed > 80 ? "bg-red-500" : newBorrowLimitUsed > 60 ? "bg-yellow-500" : "bg-blue-500"

  if (borrowedAssets.length === 0) {
    return (
      <div className="p-4">
        <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
          <CardHeader>
            <CardTitle className="text-xl">Repay Debt</CardTitle>
            <CardDescription className="text-gray-400">Repay your borrowed assets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-400">
              <p>You don't have any borrowed assets to repay</p>
              <Button
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => (window.location.href = "/borrow")}
              >
                Borrow Assets First
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
          <CardTitle className="text-xl">Repay Debt</CardTitle>
          <CardDescription className="text-gray-400">Repay your borrowed assets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="asset">Asset</Label>
            <Select value={selectedAsset} onValueChange={setSelectedAsset}>
              <SelectTrigger id="asset" className="bg-[#252836] border-[#2a2d36]">
                <SelectValue placeholder="Select asset">
                  {selectedAsset && (
                    <div className="flex items-center gap-2">
                      <CryptoIcon symbol={selectedAsset} size={20} />
                      <span>{selectedAsset}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#252836] border-[#2a2d36] text-white">
                {borrowedAssets.map((asset) => (
                  <SelectItem key={asset.symbol} value={asset.symbol}>
                    <div className="flex items-center gap-2">
                      <CryptoIcon symbol={asset.symbol} size={20} />
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
              <span className="text-xs text-gray-400">Wallet: {formatCurrency(walletBalance, selectedAsset)}</span>
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

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">New Borrow Limit Used</span>
              <span>{newBorrowLimitUsed.toFixed(2)}%</span>
            </div>
            <Progress value={newBorrowLimitUsed} className="h-2 bg-[#252836]" indicatorClassName={limitColor} />
            <div className="flex justify-between text-xs text-gray-400">
              <span>0%</span>
              <span>Safe</span>
              <span>100%</span>
            </div>
          </div>

          <div className="bg-[#252836] p-3 rounded-lg space-y-2">
            <div className="text-sm font-medium">Repayment Information</div>
            {selectedAssetData && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Current Debt</span>
                  <span>{formatCurrency(selectedAssetData.amount, selectedAsset)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Remaining After Repayment</span>
                  <span>
                    {formatCurrency(
                      Math.max(selectedAssetData.amount - (Number.parseFloat(amount) || 0), 0),
                      selectedAsset,
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Current APR</span>
                  <span>{formatPercentage(selectedAssetData.interestRate)}</span>
                </div>
              </>
            )}
          </div>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleRepay}
            disabled={
              isLoading || !amount || Number.parseFloat(amount) <= 0 || Number.parseFloat(amount) > walletBalance
            }
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Processing...
              </div>
            ) : (
              <>
                <ArrowDownLeft className="mr-2 h-4 w-4" />
                Repay {selectedAsset}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
