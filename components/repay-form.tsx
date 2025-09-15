"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"
import { ArrowDownLeft } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { CryptoIcon } from "./crypto-icon"
import { useFeedback } from "@/lib/feedback-provider"
import cometAbi from "@/lib/abis/comet.json"
import erc20Abi from "@/lib/abis/erc20.json"

export function RepayForm() {
  const { showSuccess, showError, showLoading, hideLoading } = useFeedback()

  const [selectedAsset, setSelectedAsset] = useState("USDC")
  const [amount, setAmount] = useState("")
  const [mounted, setMounted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentDebt, setCurrentDebt] = useState<bigint>(0n)

  const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`) || "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
  const COMET_ADDRESS = (process.env.NEXT_PUBLIC_COMET_ADDRESS as `0x${string}`) || "0xc3d688B66703497DAA19211EEdff47f25384cdc3"
  const LOCAL_CHAIN_ID = 31337

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    async function fetchDebt() {
      try {
        const { ethers } = await import("ethers")
        const provider = new ethers.BrowserProvider((window as any).ethereum)
        const addr = await provider.send("eth_requestAccounts", []).then((a) => a[0])
        const comet = new ethers.Contract(COMET_ADDRESS, cometAbi as any, provider)
        const debt: bigint = await comet.borrowBalanceOf(addr)
        setCurrentDebt(debt)
      } catch {}
    }
    if (mounted && typeof window !== "undefined" && (window as any).ethereum) fetchDebt()
  }, [mounted, COMET_ADDRESS])

  if (!mounted) return null

  const handleRepay = async () => {
    if (!selectedAsset || !amount || Number.parseFloat(amount) <= 0) {
      showError("Invalid input", "Please enter a valid amount")
      return
    }

    try {
      setIsSubmitting(true)
      showLoading(`Repaying ${amount} ${selectedAsset}...`)
      const { ethers } = await import("ethers")
      if (!(window as any).ethereum) throw new Error("No wallet")
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const network = await provider.getNetwork()
      if (Number(network.chainId) !== LOCAL_CHAIN_ID) throw new Error("Wrong network")
      const signer = await provider.getSigner()
      const comet = new ethers.Contract(COMET_ADDRESS, cometAbi as any, signer)

      const raw = ethers.parseUnits(amount, 6)
      const erc20 = new ethers.Contract(USDC_ADDRESS, erc20Abi as any, signer)

      const latest = await provider.getBlock("latest")
      const base = latest?.baseFeePerGas ?? 0n
      const maxPriorityFeePerGas = ethers.parseUnits("1", "gwei")
      const txOpts = { maxFeePerGas: base * 2n + maxPriorityFeePerGas, maxPriorityFeePerGas }

      const allowance: bigint = await erc20.allowance(await signer.getAddress(), COMET_ADDRESS)
      if (allowance < raw) {
        await (await erc20.approve(COMET_ADDRESS, raw, txOpts)).wait()
      }

      await (await comet.supply(USDC_ADDRESS, raw, txOpts)).wait()
      hideLoading()
      showSuccess("Repayment successful", `You have repaid ${amount} ${selectedAsset}`)
      setAmount("")
    } catch (error: any) {
      hideLoading()
      showError("Repayment failed", error?.shortMessage || error?.message || "An error occurred while repaying")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMaxClick = () => {
    setAmount((Number(currentDebt) / 1e6).toString())
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
                <SelectItem value="USDC">
                  <div className="flex items-center gap-2">
                    <CryptoIcon symbol="USDC" size={20} />
                    <span>USDC - USD Coin</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="amount">Amount</Label>
              <span className="text-xs text-gray-400">Debt: {formatCurrency(Number(currentDebt) / 1e6, "USDC")}</span>
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
                className="absolute right-1 top-1 h-7 text-xs"
                onClick={handleMaxClick}
              >
                MAX
              </Button>
            </div>
          </div>

          <div className="bg-[#252836] p-3 rounded-lg space-y-2">
            <div className="text-sm font-medium">Repayment Information</div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Current Debt</span>
              <span>{formatCurrency(Number(currentDebt) / 1e6, "USDC")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Remaining After Repayment</span>
              <span>{formatCurrency(Math.max(Number(currentDebt) / 1e6 - (Number.parseFloat(amount) || 0), 0), "USDC")}</span>
            </div>
          </div>

          <Button
            variant="compound"
            className="w-full"
            onClick={handleRepay}
            disabled={!amount || Number.parseFloat(amount) <= 0 || isSubmitting}
          >
            {isSubmitting ? (
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
