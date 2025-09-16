"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { ArrowDownRight } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { CryptoIcon } from "./crypto-icon"
import Image from "next/image"
import { useFeedback } from "@/lib/feedback-provider"
import cometAbi from "@/lib/abis/comet.json"

export function BorrowForm() {
  const { showSuccess, showError, showLoading, hideLoading } = useFeedback()

  const [selectedAsset, setSelectedAsset] = useState("USDC")
  const [amount, setAmount] = useState("")
  const [estimatedApr, setEstimatedApr] = useState(0)
  const [newBorrowLimitUsed, setNewBorrowLimitUsed] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`) || "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
  const COMET_ADDRESS = (process.env.NEXT_PUBLIC_COMET_ADDRESS as `0x${string}`) || "0xc3d688B66703497DAA19211EEdff47f25384cdc3"
  const LOCAL_CHAIN_ID = 31337

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Fetch rates from Comet for display
    async function fetchRates() {
      try {
        const { ethers } = await import("ethers")
        const provider = new ethers.BrowserProvider((window as any).ethereum)
        const comet = new ethers.Contract(COMET_ADDRESS, cometAbi as any, provider)
        const util: bigint = await comet.getUtilization()
        const rate: bigint = await comet.getBorrowRate(util)
        const apr = Number((rate * 31536000n * 100n) / (10n ** 18n))
        setEstimatedApr(apr)
      } catch {}
    }
    if (mounted && typeof window !== "undefined" && (window as any).ethereum) fetchRates()
  }, [mounted, COMET_ADDRESS])

  if (!mounted) return null

  const handleBorrow = async () => {
    if (!selectedAsset || !amount || Number.parseFloat(amount) <= 0) {
      showError("Invalid input", "Please enter a valid amount")
      return
    }

    try {
      setIsSubmitting(true)
      showLoading(`Borrowing ${amount} ${selectedAsset}...`)
      const { ethers } = await import("ethers")
      if (!(window as any).ethereum) throw new Error("No wallet")
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const network = await provider.getNetwork()
      if (Number(network.chainId) !== LOCAL_CHAIN_ID) throw new Error("Wrong network")
      const signer = await provider.getSigner()
      const comet = new ethers.Contract(COMET_ADDRESS, cometAbi as any, signer)

      const minBorrow: bigint = await comet.baseBorrowMin()
      const raw = ethers.parseUnits(amount, 6)
      if (raw < minBorrow) throw new Error(`Minimum borrow is ${Number(minBorrow) / 1e6} USDC`)

      const latest = await provider.getBlock("latest")
      const base = latest?.baseFeePerGas ?? 0n
      const maxPriorityFeePerGas = ethers.parseUnits("1", "gwei")
      const txOpts = { maxFeePerGas: base * 2n + maxPriorityFeePerGas, maxPriorityFeePerGas }

      await (await comet.withdraw(USDC_ADDRESS, raw, txOpts)).wait()
      hideLoading()
      showSuccess("Borrow successful", `You have borrowed ${amount} ${selectedAsset}`)
      setAmount("")
    } catch (error: any) {
      hideLoading()
      showError("Borrow failed", error?.shortMessage || error?.message || "An error occurred while borrowing")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMaxClick = async () => {
    // For simplicity, set to baseBorrowMin in UI
    try {
      const { ethers } = await import("ethers")
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const comet = new ethers.Contract(COMET_ADDRESS, cometAbi as any, provider)
      const minBorrow: bigint = await comet.baseBorrowMin()
      setAmount((Number(minBorrow) / 1e6).toString())
    } catch {}
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
                <SelectValue placeholder="Select asset">
                  {selectedAsset && (
                    <div className="flex items-center gap-2">
                      {selectedAsset === 'USDC' ? (
                        <Image 
                          src="/usdc-icon.webp" 
                          alt="USDC" 
                          width={20} 
                          height={20} 
                          className="rounded-full"
                        />
                      ) : selectedAsset === 'WETH' ? (
                        <Image 
                          src="/weth-icon.png" 
                          alt="WETH" 
                          width={20} 
                          height={20} 
                          className="rounded-full"
                        />
                      ) : (
                        <CryptoIcon symbol={selectedAsset} size={20} />
                      )}
                      <span>{selectedAsset}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#252836] border-[#2a2d36] text-white">
                <SelectItem value="USDC">
                  <div className="flex items-center gap-2">
                    <Image 
                      src="/usdc-icon.webp" 
                      alt="USDC" 
                      width={20} 
                      height={20} 
                      className="rounded-full"
                    />
                    <span>USDC - USD Coin</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="amount">Amount</Label>
              <span className="text-xs text-gray-400">Min borrow respects protocol baseBorrowMin</span>
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
                MIN
              </Button>
            </div>
          </div>

          <div className="bg-[#252836] p-3 rounded-lg space-y-2">
            <div className="text-sm font-medium">Borrow Information</div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Borrow APR</span>
              <span>{formatPercentage(estimatedApr / 100)}</span>
            </div>
          </div>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleBorrow}
            disabled={!amount || Number.parseFloat(amount) <= 0 || isSubmitting}
          >
            {isSubmitting ? (
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
