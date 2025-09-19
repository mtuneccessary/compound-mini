"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowDownLeft, 
  TrendingDown, 
  ArrowRight, 
  CheckCircle,
  AlertCircle,
  Shield,
  DollarSign
} from "lucide-react"
import { useFeedback } from "@/lib/feedback-provider"
import { useAccount } from "wagmi"
import Image from "next/image"
import { motion } from "framer-motion"
import { publicClient, USDC_ADDRESS, COMET_ADDRESS } from "@/lib/comet-onchain"
import erc20Abi from "@/lib/abis/erc20.json"
import cometAbi from "@/lib/abis/comet.json"
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { parseUnits, formatUnits } from "viem"

const USDC_DECIMALS = 6

export function RepayForm() {
  const { showSuccess, showError, showLoading, hideLoading } = useFeedback()
  const { address, isConnected } = useAccount()

  const [amount, setAmount] = useState("")
  const [usdcBalance, setUsdcBalance] = useState(0)
  const [borrowBalance, setBorrowBalance] = useState(0)
  const [collateralBalance, setCollateralBalance] = useState(0)
  const [borrowRate, setBorrowRate] = useState(0)
  const [utilization, setUtilization] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [repaySuccess, setRepaySuccess] = useState(false)
  const [step, setStep] = useState<'idle' | 'approving' | 'repaying'>('idle')

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
      loadBorrowData()
    }
  }, [isConnected, address])

  const loadBorrowData = async () => {
    try {
      // Fetch collateral balance
      const collateral = await publicClient.readContract({
        address: COMET_ADDRESS,
        abi: cometAbi,
        functionName: "collateralBalanceOf",
        args: [address, "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"], // WETH address
      })
      setCollateralBalance(Number(formatUnits(collateral, 18)))

      // Fetch borrow balance
      const borrow = await publicClient.readContract({
        address: COMET_ADDRESS,
        abi: cometAbi,
        functionName: "borrowBalanceOf",
        args: [address],
      })
      setBorrowBalance(Number(formatUnits(borrow, USDC_DECIMALS)))

      // Fetch USDC balance
      const usdcBal = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      })
      setUsdcBalance(Number(formatUnits(usdcBal, USDC_DECIMALS)))

      // Fetch borrow rate
      const rate = await publicClient.readContract({
        address: COMET_ADDRESS,
        abi: cometAbi,
        functionName: "getBorrowRate",
        args: [],
      })
      setBorrowRate(Number(formatUnits(rate, 18)) * 100)

      // Fetch utilization
      const util = await publicClient.readContract({
        address: COMET_ADDRESS,
        abi: cometAbi,
        functionName: "getUtilization",
        args: [],
      })
      setUtilization(Number(formatUnits(util, 18)) * 100)
    } catch (error) {
      console.error("Error loading borrow data:", error)
      setCollateralBalance(0)
      setBorrowBalance(0)
      setUsdcBalance(0)
      setBorrowRate(0)
      setUtilization(0)
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
        functionName: "repay",
        args: [USDC_ADDRESS, rawAmount],
      })
    } else if (isConfirmed && hash && step === 'repaying') {
      // Repay confirmed
      hideLoading()
      setRepaySuccess(true)
      setIsSubmitting(false)
      setStep('idle')
      
      // Refresh balances
      loadBorrowData()
      
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

  if (!isConnected) {
    return (
      <div className="p-4 pb-24">
        <Card className="bg-gradient-to-br from-red-900/20 to-orange-900/20 border-red-500/20 text-white">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <ArrowDownLeft className="h-10 w-10 text-red-400" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-6">
              Connect your wallet to repay your borrowings.
            </p>
            <Button 
              size="lg" 
              className="w-full bg-red-600 hover:bg-red-700 text-white h-12"
            >
              <ArrowDownLeft className="h-5 w-5 mr-2" />
              Connect Wallet to Repay
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleMaxClick = () => {
    setAmount(Math.min(usdcBalance, borrowBalance).toString())
  }

  const handleRepay = async () => {
    if (!amount || Number.parseFloat(amount) <= 0) {
      showError("Invalid Amount", "Please enter a valid amount to repay")
      return
    }

    if (Number.parseFloat(amount) > usdcBalance) {
      showError("Insufficient Balance", "You don't have enough USDC in your wallet")
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

  const isLoading = isPending || isConfirming || isSubmitting
  const buttonText = step === 'approving' ? 'Approving...' : 
                   step === 'repaying' ? 'Repaying...' : 
                   'Repay USDC'

  return (
    <div className="p-4 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-gradient-to-br from-red-900/20 to-orange-900/20 border-red-500/20 text-white">
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <ArrowDownLeft className="h-8 w-8 text-red-400" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Repay USDC</h2>
                <p className="text-gray-400">Reduce your borrowing position</p>
              </div>
            </div>

            {repaySuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-green-400">Repay Successful!</h3>
                <p className="text-gray-400 mb-6">
                  Your {amount} USDC has been repaid to Compound.
                </p>
                <Button
                  onClick={() => {
                    setRepaySuccess(false)
                    setAmount("")
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Repay More USDC
                </Button>
              </motion.div>
            ) : (
              <>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Amount to Repay
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="0.0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 h-12 text-lg pr-20"
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleMaxClick}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-600/20 border-red-500/30 text-red-300 hover:bg-red-600/30"
                        disabled={isLoading}
                      >
                        MAX
                      </Button>
                    </div>
                    <div className="flex justify-between text-sm text-gray-400 mt-1">
                      <span>Balance: {usdcBalance.toFixed(2)} USDC</span>
                      <span>Borrowed: {borrowBalance.toFixed(2)} USDC</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="h-4 w-4 text-red-400" />
                        <span className="text-sm text-gray-300">Borrow Rate</span>
                      </div>
                      <div className="text-lg font-semibold text-red-400">
                        {borrowRate.toFixed(2)}%
                      </div>
                    </div>
                    <div className="bg-gray-800/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-blue-400" />
                        <span className="text-sm text-gray-300">Collateral</span>
                      </div>
                      <div className="text-lg font-semibold text-blue-400">
                        {collateralBalance.toFixed(4)} WETH
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="h-4 w-4 text-yellow-400" />
                      <span className="text-sm font-medium text-gray-300">Repay Summary</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Amount:</span>
                        <span className="text-white">{amount || "0"} USDC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Borrow Rate:</span>
                        <span className="text-red-400">{borrowRate.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Remaining Borrow:</span>
                        <span className="text-orange-400">
                          {Math.max(0, borrowBalance - Number(amount || 0)).toFixed(2)} USDC
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleRepay}
                  disabled={!amount || Number.parseFloat(amount) <= 0 || Number.parseFloat(amount) > Math.min(usdcBalance, borrowBalance) || isLoading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white h-12 text-lg font-semibold mt-8"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {buttonText}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ArrowDownLeft className="h-5 w-5" />
                      {buttonText}
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </Button>

                {error && (
                  <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Transaction Error</span>
                    </div>
                    <p className="text-red-300 text-sm mt-1">
                      {error?.shortMessage || error?.reason || error?.message || "Transaction failed"}
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
