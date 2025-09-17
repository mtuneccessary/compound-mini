"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { ArrowUpRight, CheckCircle, Shield, Zap, TrendingUp } from "lucide-react"
import Image from "next/image"
import { useFeedback } from "@/lib/feedback-provider"
import cometAbi from "@/lib/abis/comet.json"
import erc20Abi from "@/lib/abis/erc20.json"
import { useAccount } from "wagmi"
import { publicClient, COMET_ADDRESS, WETH_ADDRESS, USDC_ADDRESS } from "@/lib/comet-onchain"
import { parseUnits } from "viem"

export function WithdrawForm() {
  const { showSuccess, showError, showLoading, hideLoading } = useFeedback()
  const { address, isConnected } = useAccount()

  const [amount, setAmount] = useState("")
  const [supplyApy, setSupplyApy] = useState(0)
  const [collateralBalance, setCollateralBalance] = useState(0)
  const [borrowBalance, setBorrowBalance] = useState(0)
  const [healthFactor, setHealthFactor] = useState(999)
  const [mounted, setMounted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [withdrawSuccess, setWithdrawSuccess] = useState(false)

  const WETH_DECIMALS = 18
  const WETH_PRICE_USD = 3000 // Placeholder for WETH price

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isConnected && address) {
      loadWithdrawData()
    }
  }, [isConnected, address])

  const loadWithdrawData = async () => {
    try {
      const { ethers } = await import("ethers")
      if (!(window as any).ethereum) return
      
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const comet = new ethers.Contract(COMET_ADDRESS, cometAbi as any, provider)
      
      // Load all relevant data
      const [collateralBal, borrowBal, utilization] = await Promise.all([
        publicClient.readContract({
          address: COMET_ADDRESS,
          abi: cometAbi as any,
          functionName: "collateralBalanceOf",
          args: [address, WETH_ADDRESS],
        }) as Promise<bigint>,
        publicClient.readContract({
          address: COMET_ADDRESS,
          abi: cometAbi as any,
          functionName: "borrowBalanceOf",
          args: [address],
        }) as Promise<bigint>,
        comet.getUtilization() as Promise<bigint>
      ])

      const collateralValue = Number(collateralBal) / 1e18
      const borrowValue = Number(borrowBal) / 1e6
      
      // Calculate health factor
      const collateralValueUSD = collateralValue * WETH_PRICE_USD
      const healthFactor = borrowValue > 0 ? (collateralValueUSD * 0.85) / borrowValue : 999

      // Get real supply rate
      const supplyRate = await comet.getSupplyRate(utilization)
      const apy = (Number(supplyRate) / 1e18) * 31536000 * 100

      setCollateralBalance(collateralValue)
      setBorrowBalance(borrowValue)
      setHealthFactor(healthFactor)
      setSupplyApy(apy)
    } catch (error) {
      console.error("Error loading withdraw data:", error)
      setCollateralBalance(0)
      setBorrowBalance(0)
      setHealthFactor(999)
      setSupplyApy(0)
    }
  }

  if (!mounted) return null

  const handleWithdraw = async () => {
    if (!amount || Number.parseFloat(amount) <= 0) {
      showError("Invalid input", "Please enter a valid amount")
      return
    }

    if (collateralBalance <= 0) {
      showError("No Collateral", "You have no WETH collateral to withdraw")
      return
    }

    if (Number.parseFloat(amount) > collateralBalance) {
      showError("Insufficient Collateral", `You only have ${formatCurrency(collateralBalance, "WETH")} available`)
      return
    }

    // Check if withdrawal would make health factor too low
    const newCollateralValue = (collateralBalance - Number(amount)) * WETH_PRICE_USD
    const newHealthFactor = borrowBalance > 0 ? (newCollateralValue * 0.85) / borrowBalance : 999
    
    if (newHealthFactor < 1.2 && borrowBalance > 0) {
      showError("Health Factor Too Low", "Withdrawal would make your health factor too low. Please repay some debt first.")
      return
    }

    setIsSubmitting(true)
    showLoading(`Withdrawing ${amount} WETH...`)

    try {
      const { ethers } = await import("ethers")
      if (!(window as any).ethereum) throw new Error("No wallet detected")
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const signer = await provider.getSigner()

      const comet = new ethers.Contract(COMET_ADDRESS, cometAbi as any, signer)
      const rawAmount = parseUnits(amount, WETH_DECIMALS)

      // Execute withdraw
      showLoading(`Withdrawing ${amount} WETH...`)
      const withdrawTx = await comet.withdraw(WETH_ADDRESS, rawAmount)
      await withdrawTx.wait()

      hideLoading()
      setWithdrawSuccess(true)
    } catch (error: any) {
      hideLoading()
      const msg = error?.shortMessage || error?.reason || error?.message || "Transaction failed"
      showError("Withdraw failed", msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMaxClick = () => {
    setAmount(collateralBalance.toString())
  }

  const interestLost = Number(amount) * (supplyApy / 100)
  const newCollateralBalance = Math.max(collateralBalance - Number(amount), 0)
  const newCollateralValueUSD = newCollateralBalance * WETH_PRICE_USD
  const newHealthFactor = borrowBalance > 0 ? (newCollateralValueUSD * 0.85) / borrowBalance : 999

  // Success state
  if (withdrawSuccess) {
    return (
      <div className="p-4 pb-24">
        <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/20 text-white">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <ArrowUpRight className="h-12 w-12 text-blue-400" />
            </div>
            <h2 className="text-3xl font-bold text-blue-400 mb-3">Withdraw Successful!</h2>
            <p className="text-xl text-white mb-2">
              You have withdrawn <span className="font-bold text-blue-400">{amount} WETH</span>
            </p>
            <p className="text-gray-400 mb-6">
              Supply rate: {supplyApy.toFixed(2)}% APY
            </p>
            <div className="bg-[#1a1d26] border border-[#2a2d36] rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Interest Lost Annually</span>
                <span className="text-yellow-400 font-semibold">
                  {interestLost.toFixed(4)} WETH
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">USD Value</span>
                <span className="text-white font-semibold">
                  ${(interestLost * WETH_PRICE_USD).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">New Health Factor</span>
                <span className={`font-semibold ${newHealthFactor >= 2 ? 'text-green-400' : newHealthFactor >= 1.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {newHealthFactor > 999 ? '∞' : newHealthFactor.toFixed(2)}x
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Remaining Collateral</span>
                <span className="text-white font-semibold">
                  {newCollateralBalance.toFixed(4)} WETH
                </span>
              </div>
            </div>
            <Button 
              onClick={() => window.location.href = "/dashboard"}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="p-4">
        <Card className="bg-[#1a1d26] border-[#2a2d36] text-white text-center py-8">
          <CardHeader>
            <Image src="/weth-icon.png" alt="WETH" width={60} height={60} className="mx-auto mb-4" />
            <CardTitle className="text-2xl">Connect Wallet to Withdraw</CardTitle>
            <CardDescription className="text-gray-400">
              Please connect your wallet to withdraw your WETH collateral.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Current Position Card */}
      <Card className="bg-gradient-to-r from-blue-800/30 to-purple-800/30 border-blue-500/20 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Image src="/weth-icon.png" alt="WETH" width={32} height={32} className="rounded-full" />
              <div>
                <p className="text-sm text-gray-300">Collateral Balance</p>
                <p className="text-2xl font-bold">
                  {collateralBalance.toFixed(4)} WETH
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-300">Health Factor</p>
              <p className={`text-xl font-bold ${healthFactor >= 2 ? 'text-green-400' : healthFactor >= 1.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                {healthFactor > 999 ? '∞' : healthFactor.toFixed(2)}x
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-blue-500/20">
            <div className="flex items-center gap-3">
              <Image src="/weth-icon.png" alt="WETH" width={24} height={24} className="rounded-full" />
              <div>
                <p className="text-sm text-gray-300">USD Value</p>
                <p className="text-lg font-bold">
                  ${(collateralBalance * WETH_PRICE_USD).toFixed(2)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-300">Supply Rate</p>
              <p className="text-lg font-bold text-green-400">
                {supplyApy > 0 ? `${supplyApy.toFixed(2)}%` : 'Loading...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withdraw Form */}
      <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
        <CardHeader>
          <CardTitle className="text-xl">Withdraw WETH</CardTitle>
          <CardDescription className="text-gray-400">
            Withdraw your WETH collateral (reduces earning potential).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="amount" className="text-gray-300">Amount to Withdraw</Label>
              <span className="text-sm text-gray-400">WETH only</span>
            </div>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-[#252836] border-[#2a2d36] pr-20 h-14 text-lg"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Image src="/weth-icon.png" alt="WETH" width={20} height={20} className="rounded-full" />
                <span className="text-white font-semibold">WETH</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-blue-400 hover:text-blue-300"
                  onClick={handleMaxClick}
                >
                  MAX
                </Button>
              </div>
            </div>
          </div>

          {/* Withdraw Preview */}
          <div className="bg-[#252836] p-4 rounded-lg space-y-3 border border-[#2a2d36]">
            <div className="text-lg font-semibold text-white">Withdraw Overview</div>
            <div className="flex justify-between text-sm text-gray-300">
              <span>Interest Lost Annually</span>
              <span className="font-medium text-yellow-400">
                {interestLost.toFixed(4)} WETH
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-300">
              <span>USD Value</span>
              <span className="font-medium text-white">
                ${(interestLost * WETH_PRICE_USD).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-300">
              <span>New Health Factor</span>
              <span className={`font-medium ${newHealthFactor >= 2 ? 'text-green-400' : newHealthFactor >= 1.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                {newHealthFactor > 999 ? '∞' : newHealthFactor.toFixed(2)}x
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-300">
              <span>Remaining Collateral</span>
              <span>{newCollateralBalance.toFixed(4)} WETH</span>
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white h-12 text-lg font-semibold"
            onClick={handleWithdraw}
            disabled={!isConnected || isSubmitting || !amount || Number.parseFloat(amount) <= 0 || collateralBalance <= 0 || Number.parseFloat(amount) > collateralBalance}
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Processing Transaction...
              </div>
            ) : (
              <>
                <ArrowUpRight className="mr-2 h-5 w-5" />
                Withdraw WETH
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Benefits Section */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">Withdraw Considerations</h3>
        <div className="grid grid-cols-1 gap-3">
          <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-yellow-400" />
              <div>
                <h4 className="font-semibold">Interest Loss</h4>
                <p className="text-sm text-gray-400">You'll stop earning {supplyApy.toFixed(2)}% APY on withdrawn amount.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="h-6 w-6 text-blue-400" />
              <div>
                <h4 className="font-semibold">Health Factor Impact</h4>
                <p className="text-sm text-gray-400">Withdrawing reduces your collateral and may lower health factor.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
            <CardContent className="p-4 flex items-center gap-3">
              <Zap className="h-6 w-6 text-purple-400" />
              <div>
                <h4 className="font-semibold">Flexible Withdrawal</h4>
                <p className="text-sm text-gray-400">Withdraw any amount, anytime (subject to health factor limits).</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
