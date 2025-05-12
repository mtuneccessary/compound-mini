"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCompound } from "@/lib/compound-provider"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { ArrowLeftRight } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useTelegram } from "@/lib/telegram-provider"
import Image from "next/image"

export function SupplyForm() {
  const { availableAssets, userBalances, supplyAsset, isLoading } = useCompound()
  const { toast } = useToast()
  const { showConfirm } = useTelegram()

  const [selectedAsset, setSelectedAsset] = useState("")
  const [amount, setAmount] = useState("")
  const [estimatedApy, setEstimatedApy] = useState(0)
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
        setEstimatedApy(asset.supplyRate)
      }
    }
  }, [selectedAsset, availableAssets])

  if (!mounted) return null

  const selectedAssetData = availableAssets.find((a) => a.symbol === selectedAsset)
  const walletBalance = userBalances[selectedAsset] || 0

  const handleSupply = async () => {
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
        description: "You don't have enough balance",
        variant: "destructive",
      })
      return
    }

    const confirmed = await showConfirm(`Supply ${amount} ${selectedAsset}?`)
    if (confirmed) {
      try {
        await supplyAsset(selectedAsset, Number.parseFloat(amount))
        toast({
          title: "Supply successful",
          description: `You have supplied ${amount} ${selectedAsset}`,
        })
        setAmount("")
      } catch (error: any) {
        toast({
          title: "Supply failed",
          description: error.message || "An error occurred while supplying",
          variant: "destructive",
        })
      }
    }
  }

  const handleMaxClick = () => {
    setAmount(walletBalance.toString())
  }

  return (
    <div className="p-4">
      <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
        <CardHeader>
          <CardTitle className="text-xl">Supply Assets</CardTitle>
          <CardDescription className="text-gray-400">Provide liquidity to earn interest</CardDescription>
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
                {availableAssets.map((asset) => (
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
                        {asset.symbol} - {asset.name}
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
              <span className="text-xs text-gray-400">Balance: {formatCurrency(walletBalance, selectedAsset)}</span>
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

          <div className="bg-[#252836] p-3 rounded-lg space-y-2">
            <div className="text-sm font-medium">Supply Information</div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Supply APY</span>
              <span>{formatPercentage(estimatedApy)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Collateral Factor</span>
              <span>{selectedAssetData ? `${selectedAssetData.collateralFactor * 100}%` : "0%"}</span>
            </div>
          </div>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleSupply}
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
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Supply {selectedAsset}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
