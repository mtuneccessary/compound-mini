"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"
import { ArrowUpRight } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { CryptoIcon } from "./crypto-icon"
import { useFeedback } from "@/lib/feedback-provider"
import cometAbi from "@/lib/abis/comet.json"
import erc20Abi from "@/lib/abis/erc20.json"

export function WithdrawForm() {
  const { showSuccess, showError, showLoading, hideLoading } = useFeedback()

  const [selectedAsset, setSelectedAsset] = useState("WETH")
  const [amount, setAmount] = useState("")
  const [mounted, setMounted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const COMET_ADDRESS = (process.env.NEXT_PUBLIC_COMET_ADDRESS as `0x${string}`) || "0xc3d688B66703497DAA19211EEdff47f25384cdc3"
  const LOCAL_CHAIN_ID = 31337

  const COLLATERALS: Record<string, { address: `0x${string}`; decimals: number }> = {
    WETH: { address: (process.env.NEXT_PUBLIC_WETH_ADDRESS as `0x${string}`) || "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18 },
    WBTC: { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", decimals: 8 },
    LINK: { address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", decimals: 18 },
    UNI: { address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", decimals: 18 },
    wstETH: { address: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", decimals: 18 },
    cbBTC: { address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", decimals: 8 },
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const handleWithdraw = async () => {
    if (!selectedAsset || !amount || Number.parseFloat(amount) <= 0) {
      showError("Invalid input", "Please enter a valid amount")
      return
    }

    try {
      setIsSubmitting(true)
      showLoading(`Withdrawing ${amount} ${selectedAsset}...`)
      const { ethers } = await import("ethers")
      if (!(window as any).ethereum) throw new Error("No wallet")
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const network = await provider.getNetwork()
      if (Number(network.chainId) !== LOCAL_CHAIN_ID) throw new Error("Wrong network")
      const signer = await provider.getSigner()
      const comet = new ethers.Contract(COMET_ADDRESS, cometAbi as any, signer)

      const assetCfg = COLLATERALS[selectedAsset]
      if (!assetCfg) throw new Error("Unsupported asset")
      const raw = ethers.parseUnits(amount, assetCfg.decimals)

      const latest = await provider.getBlock("latest")
      const base = latest?.baseFeePerGas ?? 0n
      const maxPriorityFeePerGas = ethers.parseUnits("1", "gwei")
      const txOpts = { maxFeePerGas: base * 2n + maxPriorityFeePerGas, maxPriorityFeePerGas }

      await (await comet.withdraw(assetCfg.address, raw, txOpts)).wait()
      hideLoading()
      showSuccess("Withdrawal successful", `You have withdrawn ${amount} ${selectedAsset}`)
      setAmount("")
    } catch (error: any) {
      hideLoading()
      showError("Withdrawal failed", error?.shortMessage || error?.message || "An error occurred while withdrawing")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMaxClick = async () => {
    // Query on-protocol collateral balance and set to UI
    try {
      const { ethers } = await import("ethers")
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const address = await provider.send("eth_requestAccounts", []).then((a) => a[0])
      const comet = new ethers.Contract(COMET_ADDRESS, cometAbi as any, provider)
      const assetCfg = COLLATERALS[selectedAsset]
      const bal: bigint = await comet.collateralBalanceOf(address, assetCfg.address)
      setAmount((Number(bal) / 10 ** assetCfg.decimals).toString())
    } catch {}
  }

  return (
    <div className="p-4">
      <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
        <CardHeader>
          <CardTitle className="text-xl">Withdraw Assets</CardTitle>
          <CardDescription className="text-gray-400">Withdraw your supplied collateral</CardDescription>
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
                {Object.keys(COLLATERALS).map((sym) => (
                  <SelectItem key={sym} value={sym}>
                    <div className="flex items-center gap-2">
                      <CryptoIcon symbol={sym} size={20} />
                      <span>{sym}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="amount">Amount</Label>
              <span className="text-xs text-gray-400">Use MAX to withdraw all collateral</span>
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
            <div className="text-sm font-medium">Withdrawal Information</div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">You will receive</span>
              <span>{amount && selectedAsset ? formatCurrency(Number.parseFloat(amount) || 0, selectedAsset) : "0"}</span>
            </div>
          </div>

          <Button
            variant="compound"
            className="w-full"
            onClick={handleWithdraw}
            disabled={!amount || Number.parseFloat(amount) <= 0 || isSubmitting}
          >
            {isSubmitting ? (
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
