"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { ArrowDownLeft, CheckCircle, Shield, Zap, TrendingUp } from "lucide-react"
import Image from "next/image"
import { useFeedback } from "@/lib/feedback-provider"
import cometAbi from "@/lib/abis/comet.json"
import erc20Abi from "@/lib/abis/erc20.json"
import { useAccount } from "wagmi"
import { publicClient, COMET_ADDRESS, WETH_ADDRESS, USDC_ADDRESS } from "@/lib/comet-onchain"
import { parseUnits } from "viem"

export function RepayForm() {
  const { showSuccess, showError, showLoading, hideLoading } = useFeedback()
  const { address, isConnected } = useAccount()

  const [amount, setAmount] = useState("")
  const [borrowApy, setBorrowApy] = useState(0)
  const [usdcBalance, setUsdcBalance] = useState(0)
  const [borrowBalance, setBorrowBalance] = useState(0)
  const [collateralBalance, setCollateralBalance] = useState(0)
  const [healthFactor, setHealthFactor] = useState(999)
  const [mounted, setMounted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [repaySuccess, setRepaySuccess] = useState(false)

  const USDC_DECIMALS = 6
  const USDC_PRICE_USD = 1 // USDC is pegged to USD

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isConnected && address) {
      loadRepayData()
    }
  }, [isConnected, address])

  const loadRepayData = async () => {
    try {
      const { ethers } = await import("ethers")
      if (!(window as any).ethereum) return
      
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const comet = new ethers.Contract(COMET_ADDRESS, cometAbi as any, provider)
      
      // Load all relevant data
      const [usdcBal, borrowBal, collateralBal, utilization] = await Promise.all([
        publicClient.readContract({
          address: USDC_ADDRESS,
          abi: erc20Abi as any,
          functionName: "balanceOf",
          args: [address],
        }) as Promise<bigint>,
        publicClient.readContract({
          address: COMET_ADDRESS,
          abi: cometAbi as any,
          functionName: "borrowBalanceOf",
          args: [address],
        }) as Promise<bigint>,
        publicClient.readContract({
          address: COMET_ADDRESS,
          abi: cometAbi as any,
          functionName: "collateralBalanceOf",
          args: [address, WETH_ADDRESS],
        }) as Promise<bigint>,
        comet.getUtilization() as Promise<bigint>
      ])

      const usdcValue = Number(usdcBal) / 1e6
      const borrowValue = Number(borrowBal) / 1e6
      const collateralValue = Number(collateralBal) / 1e18
      
      // Calculate health factor
      const wethPrice = 3000 // Placeholder
      const collateralValueUSD = collateralValue * wethPrice
      const healthFactor = borrowValue > 0 ? (collateralValueUSD * 0.85) / borrowValue : 999

      // Get real borrow rate
      const borrowRate = await comet.getBorrowRate(utilization)
      const apy = (Number(borrowRate) / 1e18) * 31536000 * 100

      setUsdcBalance(usdcValue)
      setBorrowBalance(borrowValue)
      setCollateralBalance(collateralValue)
      setHealthFactor(healthFactor)
      setBorrowApy(apy)
    } catch (error) {
      console.error("Error loading repay data:", error)
      setUsdcBalance(0)
      setBorrowBalance(0)
      setCollateralBalance(0)
      setHealthFactor(999)
      setBorrowApy(0)
    }
  }

  if (!mounted) return null

  const handleRepay = async () => {
    if (!amount || Number.parseFloat(amount) <= 0) {
      showError("Invalid input", "Please enter a valid amount")
      return
    }

    if (borrowBalance <= 0) {
      showError("No Debt", "You have no USDC debt to repay")
      return
    }

    if (Number.parseFloat(amount) > usdcBalance) {
      showError("Insufficient Balance", `You only have ${formatCurrency(usdcBalance, "USDC")} available`)
      return
    }

    setIsSubmitting(true)
    showLoading(`Repaying ${amount} USDC...`)

    try {
      const { ethers } = await import("ethers")
      if (!(window as any).ethereum) throw new Error("No wallet detected")
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const signer = await provider.getSigner()

      const comet = new ethers.Contract(COMET_ADDRESS, cometAbi as any, signer)
      const erc20 = new ethers.Contract(USDC_ADDRESS, erc20Abi as any, signer)
      const rawAmount = parseUnits(amount, USDC_DECIMALS)

      // Check allowance
      const allowance = await erc20.allowance(address, COMET_ADDRESS)
      if (allowance < rawAmount) {
        showLoading("Approving USDC...")
        const approveTx = await erc20.approve(COMET_ADDRESS, rawAmount)
        await approveTx.wait()
        showSuccess("Approval successful", "USDC approved for Compound Mini.")
      }

      // Execute repay (supply USDC to reduce debt)
      showLoading(`Repaying ${amount} USDC...`)
      const repayTx = await comet.supply(USDC_ADDRESS, rawAmount)
      await repayTx.wait()

      hideLoading()
      setRepaySuccess(true)
    } catch (error: any) {
      hideLoading()
      const msg = error?.shortMessage || error?.reason || error?.message || "Transaction failed"
      showError("Repay failed", msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMaxClick = () => {
    setAmount(Math.min(usdcBalance, borrowBalance).toString())
  }

  const projectedInterestSaved = Number(amount) * (borrowApy / 100)
  const newBorrowBalance = Math.max(borrowBalance - Number(amount), 0)
  const newHealthFactor = collateralBalance > 0 && newBorrowBalance > 0 ? (collateralBalance * 3000 * 0.85) / newBorrowBalance : 999

  // Success state
  if (repaySuccess) {
    return (
      <div className="p-4 pb-24">
        <Card className="bg-gradient-to-br from-green-900/20 to-blue-900/20 border-green-500/20 text-white">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <ArrowDownLeft className="h-12 w-12 text-green-400" />
            </div>
            <h2 className="text-3xl font-bold text-green-400 mb-3">Repay Successful!</h2>
            <p className="text-xl text-white mb-2">
              You have repaid <span className="font-bold text-green-400">{amount} USDC</span>
            </p>
            <p className="text-gray-400 mb-6">
              Interest saved: {borrowApy.toFixed(2)}% APY
            </p>
            <div className="bg-[#1a1d26] border border-[#2a2d36] rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Interest Saved Annually</span>
                <span className="text-green-400 font-semibold">
                  ${projectedInterestSaved.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">New Health Factor</span>
                <span className={`font-semibold ${newHealthFactor >= 2 ? 'text-green-400' : newHealthFactor >= 1.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {newHealthFactor > 999 ? '∞' : newHealthFactor.toFixed(2)}x
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Remaining Debt</span>
                <span className="text-white font-semibold">
                  ${newBorrowBalance.toFixed(2)} USDC
                </span>
              </div>
            </div>
            <Button 
              onClick={() => window.location.href = "/dashboard"}
              className="w-full bg-green-600 hover:bg-green-700 text-white h-12"
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
            <Image src="/usdc-icon.webp" alt="USDC" width={60} height={60} className="mx-auto mb-4" />
            <CardTitle className="text-2xl">Connect Wallet to Repay</CardTitle>
            <CardDescription className="text-gray-400">
              Please connect your wallet to repay your USDC debt.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Current Position Card */}
      <Card className="bg-gradient-to-r from-red-800/30 to-orange-800/30 border-red-500/20 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Image src="/usdc-icon.webp" alt="USDC" width={32} height={32} className="rounded-full" />
              <div>
                <p className="text-sm text-gray-300">Current Debt</p>
                <p className="text-2xl font-bold">
                  ${borrowBalance.toFixed(2)} USDC
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
          
          <div className="flex items-center justify-between pt-4 border-t border-red-500/20">
            <div className="flex items-center gap-3">
              <Image src="/usdc-icon.webp" alt="USDC" width={24} height={24} className="rounded-full" />
              <div>
                <p className="text-sm text-gray-300">Available to Repay</p>
                <p className="text-lg font-bold">
                  ${usdcBalance.toFixed(2)} USDC
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-300">Borrow Rate</p>
              <p className="text-lg font-bold text-red-400">
                {borrowApy > 0 ? `${borrowApy.toFixed(2)}%` : 'Loading...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Repay Form */}
      <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
        <CardHeader>
          <CardTitle className="text-xl">Repay USDC</CardTitle>
          <CardDescription className="text-gray-400">
            Repay your USDC debt to reduce interest costs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="amount" className="text-gray-300">Amount to Repay</Label>
              <span className="text-sm text-gray-400">USDC only</span>
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
                <Image src="/usdc-icon.webp" alt="USDC" width={20} height={20} className="rounded-full" />
                <span className="text-white font-semibold">USDC</span>
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

          {/* Repay Preview */}
          <div className="bg-[#252836] p-4 rounded-lg space-y-3 border border-[#2a2d36]">
            <div className="text-lg font-semibold text-white">Repay Overview</div>
            <div className="flex justify-between text-sm text-gray-300">
              <span>Interest Saved Annually</span>
              <span className="font-medium text-green-400">
                ${projectedInterestSaved.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-300">
              <span>New Health Factor</span>
              <span className={`font-medium ${newHealthFactor >= 2 ? 'text-green-400' : newHealthFactor >= 1.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                {newHealthFactor > 999 ? '∞' : newHealthFactor.toFixed(2)}x
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-300">
              <span>Remaining Debt</span>
              <span>${newBorrowBalance.toFixed(2)} USDC</span>
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white h-12 text-lg font-semibold"
            onClick={handleRepay}
            disabled={!isConnected || isSubmitting || !amount || Number.parseFloat(amount) <= 0 || borrowBalance <= 0 || Number.parseFloat(amount) > usdcBalance}
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Processing Transaction...
              </div>
            ) : (
              <>
                <ArrowDownLeft className="mr-2 h-5 w-5" />
                Repay USDC
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Benefits Section */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">Why Repay Early?</h3>
        <div className="grid grid-cols-1 gap-3">
          <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <div>
                <h4 className="font-semibold">Save on Interest</h4>
                <p className="text-sm text-gray-400">Reduce your annual interest costs immediately.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="h-6 w-6 text-blue-400" />
              <div>
                <h4 className="font-semibold">Improve Health Factor</h4>
                <p className="text-sm text-gray-400">Lower your debt-to-collateral ratio for better safety.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
            <CardContent className="p-4 flex items-center gap-3">
              <Zap className="h-6 w-6 text-purple-400" />
              <div>
                <h4 className="font-semibold">Flexible Repayment</h4>
                <p className="text-sm text-gray-400">Repay any amount, anytime to reduce costs.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
