"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { ArrowDownLeft, CheckCircle, Shield, Zap, TrendingDown, DollarSign } from "lucide-react"
import Image from "next/image"
import { useFeedback } from "@/lib/feedback-provider"
import cometAbi from "@/lib/abis/comet.json"
import erc20Abi from "@/lib/abis/erc20.json"
import { useAccount } from "wagmi"
import { publicClient, COMET_ADDRESS, WETH_ADDRESS, USDC_ADDRESS } from "@/lib/comet-onchain"
import { parseUnits, formatUnits } from "viem"
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi"

const USDC_DECIMALS = 6

export function RepayForm() {
  const { showSuccess, showError, showLoading, hideLoading } = useFeedback()
  const { address, isConnected } = useAccount()

  const [amount, setAmount] = useState("")
  const [usdcBalance, setUsdcBalance] = useState(0)
  const [borrowBalance, setBorrowBalance] = useState(0)
  const [collateralBalance, setCollateralBalance] = useState(0)
  const [borrowRate, setBorrowRate] = useState(0)
  const [healthFactor, setHealthFactor] = useState(999)
  const [mounted, setMounted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [repaySuccess, setRepaySuccess] = useState(false)
  const [step, setStep] = useState<'idle' | 'approving' | 'repaying'>('idle')

  const USDC_PRICE_USD = 1 // USDC is pegged to USD

  // Wagmi hooks - always called
  const { writeContract, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

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
      // Fetch collateral balance
      const collateral = await publicClient.readContract({
        address: COMET_ADDRESS,
        abi: cometAbi,
        functionName: "collateralBalanceOf",
        args: [address, WETH_ADDRESS],
      })
      const collateralValue = Number(formatUnits(collateral, 18))
      setCollateralBalance(collateralValue)

      // Fetch borrow balance
      const borrow = await publicClient.readContract({
        address: COMET_ADDRESS,
        abi: cometAbi,
        functionName: "borrowBalanceOf",
        args: [address],
      })
      const borrowValue = Number(formatUnits(borrow, USDC_DECIMALS))
      setBorrowBalance(borrowValue)

      // Fetch USDC balance
      const usdcBal = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      })
      setUsdcBalance(Number(formatUnits(usdcBal, USDC_DECIMALS)))

      // Fetch borrow rate - need to pass USDC_ADDRESS
      // Fetch utilization first, then borrow rate
      const utilization = await publicClient.readContract({
        address: COMET_ADDRESS,
        abi: cometAbi,
        functionName: "getUtilization",
        args: [],
      })
            const rate = await publicClient.readContract({
        address: COMET_ADDRESS,
        abi: cometAbi,
        functionName: "getBorrowRate",
        args: [USDC_ADDRESS],
      })
      setBorrowRate(Number(formatUnits(rate, 18)) * 100)

      // Calculate health factor using the fetched values
      const collateralValueUSD = collateralValue * 3000 // WETH price
      const healthFactor = borrowValue > 0 ? (collateralValueUSD * 0.85) / borrowValue : 999
      setHealthFactor(healthFactor)
    } catch (error) {
      console.error("Error loading repay data:", error)
      setCollateralBalance(0)
      setBorrowBalance(0)
      setUsdcBalance(0)
      setBorrowRate(0)
      setHealthFactor(999)
    }
  }

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && hash && step === 'approving') {
      // Approval confirmed, now repay
      setStep('repaying')
      const rawAmount = parseUnits(amount, USDC_DECIMALS)
      writeContract({
        address: COMET_ADDRESS,
        abi: cometAbi,
        functionName: "supply",
        args: [USDC_ADDRESS, rawAmount],
      })
    } else if (isConfirmed && hash && step === 'repaying') {
      // Repay confirmed
      hideLoading()
      setRepaySuccess(true)
      setIsSubmitting(false)
      setStep('idle')
      
      // Refresh balances
      loadRepayData()
      
      // Notify other parts of the app
      try {
        const evt = new Event('onchain:updated')
        window.dispatchEvent(evt)
      } catch {}
    }
  }, [isConfirmed, hash, step, amount])

  // Handle errors
  useEffect(() => {
    if (error) {
      hideLoading()
      const msg = error?.shortMessage || error?.reason || error?.message || "Transaction failed"
      showError("Transaction Failed", msg)
      setIsSubmitting(false)
      setStep('idle')
    }
  }, [error])

  if (!mounted) return null

  const handleRepay = async () => {
    if (!amount || Number.parseFloat(amount) <= 0) {
      showError("Invalid input", "Please enter a valid amount")
      return
    }

    if (Number.parseFloat(amount) > usdcBalance) {
      showError("Insufficient Balance", `You only have ${formatCurrency(usdcBalance, "USDC")} available`)
      return
    }

    if (Number.parseFloat(amount) > borrowBalance) {
      showError("Invalid Amount", "You can't repay more than you borrowed")
      return
    }

    try {
      setIsSubmitting(true)
      setStep('approving')
      showLoading(`Approving ${amount} USDC...`)

      const rawAmount = parseUnits(amount, USDC_DECIMALS)

      // First approve USDC
      writeContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [COMET_ADDRESS, rawAmount],
      })
    } catch (error: any) {
      hideLoading()
      const msg = error?.shortMessage || error?.reason || error?.message || "Transaction failed"
      showError("Repay Failed", msg)
      setIsSubmitting(false)
      setStep('idle')
    }
  }

  const handleMaxClick = () => {
    setAmount(Math.min(usdcBalance, borrowBalance).toString())
  }

  const interestSaved = Number(amount) * (borrowRate / 100)
  const newBorrowBalance = Math.max(borrowBalance - Number(amount), 0)
  const newHealthFactor = newBorrowBalance > 0 ? (collateralBalance * 3000 * 0.85) / newBorrowBalance : 999

  const isLoading = isPending || isConfirming || isSubmitting
  const buttonText = step === 'approving' ? 'Approving...' : 
                   step === 'repaying' ? 'Repaying...' : 
                   'Repay USDC'

  // Success state
  if (repaySuccess) {
    return (
      <div className="p-4 pb-24">
        <Card className="bg-gradient-to-br from-red-900/20 to-orange-900/20 border-red-500/20 text-white">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <ArrowDownLeft className="h-12 w-12 text-red-400" />
            </div>
            <h2 className="text-3xl font-bold text-red-400 mb-3">Repay Successful!</h2>
            <p className="text-xl text-white mb-2">
              You have repaid <span className="font-bold text-red-400">{amount} USDC</span>
            </p>
            <p className="text-gray-400 mb-6">
              Borrow rate: {borrowRate.toFixed(2)}% APY
            </p>
            <div className="bg-[#1a1d26] border border-[#2a2d36] rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Interest Saved Annually</span>
                <span className="text-green-400 font-semibold">
                  {interestSaved.toFixed(2)} USDC
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">USD Value</span>
                <span className="text-white font-semibold">
                  ${interestSaved.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">New Health Factor</span>
                <span className={`font-semibold ${newHealthFactor >= 2 ? 'text-green-400' : newHealthFactor >= 1.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {newHealthFactor > 999 ? '∞' : newHealthFactor.toFixed(2)}x
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Remaining Borrow</span>
                <span className="text-white font-semibold">
                  {newBorrowBalance.toFixed(2)} USDC
                </span>
              </div>
            </div>
            <Button 
              onClick={() => window.location.href = "/dashboard"}
              className="w-full bg-red-600 hover:bg-red-700 text-white h-12"
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
              Please connect your wallet to repay your USDC borrowings.
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
                <p className="text-sm text-gray-300">Borrow Balance</p>
                <p className="text-2xl font-bold">
                  {borrowBalance.toFixed(2)} USDC
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-300">Borrow Rate</p>
              <p className="text-xl font-bold text-red-400">
                {borrowRate > 0 ? `${borrowRate.toFixed(2)}%` : 'Loading...'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-red-500/20">
            <div className="flex items-center gap-3">
              <Image src="/usdc-icon.webp" alt="USDC" width={24} height={24} className="rounded-full" />
              <div>
                <p className="text-sm text-gray-300">Wallet Balance</p>
                <p className="text-lg font-bold">
                  {usdcBalance.toFixed(2)} USDC
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-300">Health Factor</p>
              <p className={`text-lg font-bold ${healthFactor >= 2 ? 'text-green-400' : healthFactor >= 1.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                {healthFactor > 999 ? '∞' : healthFactor.toFixed(2)}x
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
            Repay your USDC borrowings to reduce debt and improve health factor.
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
                disabled={isLoading}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Image src="/usdc-icon.webp" alt="USDC" width={20} height={20} className="rounded-full" />
                <span className="text-white font-semibold">USDC</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-red-400 hover:text-red-300"
                  onClick={handleMaxClick}
                  disabled={isLoading}
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
                {interestSaved.toFixed(2)} USDC
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-300">
              <span>USD Value</span>
              <span className="font-medium text-white">
                ${interestSaved.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-300">
              <span>New Health Factor</span>
              <span className={`font-medium ${newHealthFactor >= 2 ? 'text-green-400' : newHealthFactor >= 1.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                {newHealthFactor > 999 ? '∞' : newHealthFactor.toFixed(2)}x
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-300">
              <span>Remaining Borrow</span>
              <span className="font-medium text-orange-400">
                {newBorrowBalance.toFixed(2)} USDC
              </span>
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white h-12 text-lg font-semibold"
            onClick={handleRepay}
            disabled={!isConnected || isLoading || !amount || Number.parseFloat(amount) <= 0 || Number.parseFloat(amount) > Math.min(usdcBalance, borrowBalance)}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                {buttonText}
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
        <h3 className="text-lg font-semibold text-white">Repay Benefits</h3>
        <div className="grid grid-cols-1 gap-3">
          <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingDown className="h-6 w-6 text-green-400" />
              <div>
                <h4 className="font-semibold">Reduce Interest</h4>
                <p className="text-sm text-gray-400">Stop paying {borrowRate.toFixed(2)}% APY on repaid amount.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="h-6 w-6 text-blue-400" />
              <div>
                <h4 className="font-semibold">Improve Health Factor</h4>
                <p className="text-sm text-gray-400">Repaying reduces debt and improves your health factor.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
            <CardContent className="p-4 flex items-center gap-3">
              <Zap className="h-6 w-6 text-purple-400" />
              <div>
                <h4 className="font-semibold">Flexible Repayment</h4>
                <p className="text-sm text-gray-400">Repay any amount, anytime to reduce your debt.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
