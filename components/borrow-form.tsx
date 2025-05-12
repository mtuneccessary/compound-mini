"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCompound } from "@/lib/compound-provider"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { ArrowDownRight } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useTelegram } from "@/lib/telegram-provider"
import { Progress } from "@/components/ui/progress"

export function BorrowForm() {
  const { availableAssets, borrowAsset, borrowLimit, totalBorrowed, borrowLimitUsed, isLoading } = useCompound()
  const { toast } = useToast()
  const { showConfirm } = useTelegram()

  const [selectedAsset, setSelectedAsset] = useState("")
  const [amount, setAmount] = useState("")
  const [estimatedApr, setEstimatedApr] = useState(0)
  const [newBorrowLimitUsed, setNewBorrowLimitUsed] = useState(borrowLimitUsed)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (availableAssets.length > 0) {
      setSelectedAsset(availableAssets[0].symbol)
    }
  }, [availableAssets])

  useEffect(() => {
    if (selectedAsset) {
      const asset = availableAssets.find((a) => a.symbol === selectedAsset)
      if (asset) {
        setEstimatedApr(asset.borrowRate)
      }
    }
  }, [selectedAsset, availableAssets])

  useEffect(() => {
    if (amount && selectedAsset) {
      const amountValue = Number.parseFloat(amount) || 0
      const newTotalBorrowed = totalBorrowed + amountValue
      const newUsed = (newTotalBorrowed / borrowLimit) * 100
      setNewBorrowLimitUsed(newUsed)
    } else {
      setNewBorrowLimitUsed(borrowLimitUsed)
    }
  }, [amount, selectedAsset, borrowLimit, totalBorrowed, borrowLimitUsed])

  if (!mounted) return null

  const selectedAssetData = availableAssets.find((a) => a.symbol === selectedAsset)
  const maxBorrowAmount = borrowLimit - totalBorrowed

  const handleBorrow = async () => {
    if (!selectedAsset || !amount || Number.parseFloat(amount) <= 0) {
      toast({
        title: "Invalid input",
        description: "Please enter a valid amount",
        variant: "destructive",
      })
      return
    }

    if (Number.parseFloat(amount) > maxBorrowAmount) {
      toast({
        title: "Exceeds borrow limit",
        description: "Amount exceeds your borrow limit",
        variant: "destructive",
      })
      return
    }

    const confirmed = await showConfirm(`Borrow ${amount} ${selectedAsset}?`)
    if (confirmed) {
      try {
        await borrowAsset(selectedAsset, Number.parseFloat(amount))
        toast({
          title: "Borrow successful",
          description: `You have borrowed ${amount} ${selectedAsset}`,
        })
        setAmount("")
      } catch (error: any) {
        toast({
          title: "Borrow failed",
          description: error.message || "An error occurred while borrowing",
          variant: "destructive",
        })
      }
    }
  }

  const handleMaxClick = () => {
    setAmount(maxBorrowAmount.toString())
  }

  const limitColor = newBorrowLimitUsed > 80 ? "bg-red-500" : newBorrowLimitUsed > 60 ? "bg-yellow-500" : "bg-blue-500"

  return (
    <div className="p-4">
      <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
        <CardHeader>
          <CardTitle className="text-xl">Borrow Assets</CardTitle>
          <CardDescription className="text-gray-400">Borrow against your supplied collateral</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="asset">Asset</Label>
            <Select value={selectedAsset} onValueChange={setSelectedAsset}>
              <SelectTrigger id="asset" className="bg-[#252836] border-[#2a2d36]">
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent className="bg-[#252836] border-[#2a2d36] text-white">
                {availableAssets.map((asset) => (
                  <SelectItem key={asset.symbol} value={asset.symbol}>
                    {asset.symbol} - {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="amount">Amount</Label>
              <span className="text-xs text-gray-400">Available: {formatCurrency(maxBorrowAmount, selectedAsset)}</span>
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
              <span className="text-gray-400">Borrow Limit Used</span>
              <span>{newBorrowLimitUsed.toFixed(2)}%</span>
            </div>
            <Progress value={newBorrowLimitUsed} className="h-2 bg-[#252836]" indicatorClassName={limitColor} />
            <div className="flex justify-between text-xs text-gray-400">
              <span>0%</span>
              <span>Borrow Limit: {formatCurrency(borrowLimit)}</span>
              <span>100%</span>
            </div>
          </div>

          <div className="bg-[#252836] p-3 rounded-lg space-y-2">
            <div className="text-sm font-medium">Borrow Information</div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Borrow APR</span>
              <span>{formatPercentage(estimatedApr)}</span>
            </div>
          </div>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleBorrow}
            disabled={
              isLoading || !amount || Number.parseFloat(amount) <= 0 || Number.parseFloat(amount) > maxBorrowAmount
            }
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Processing...
              </div>
            ) : (
              <>
                <ArrowDownRight className="mr-2 h-4 w-4" />
                Borrow {selectedAsset}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
