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
  const [borrowRate, setBorrowRate] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [repaySuccess, setRepaySuccess] = useState(false)

  // Wagmi hooks for transactions
  const { writeContract, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isConnected && address) {
      loadUsdcBalance()
      loadBorrowBalance()
      loadBorrowRate()
    }
  }, [isConnected, address])

  const loadUsdcBalance = async () => {
    try {
      const balance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      })
      setUsdcBalance(Number(formatUnits(balance, USDC_DECIMALS)))
    } catch (error) {
      console.error("Error loading USDC balance:", error)
      setUsdcBalance(0)
    }
  }

  const loadBorrowBalance = async () => {
    try {
      const balance = await publicClient.readContract({
        address: COMET_ADDRESS,
        abi: cometAbi,
        functionName: "borrowBalanceOf",
        args: [address, USDC_ADDRESS],
      })
      setBorrowBalance(Number(formatUnits(balance, USDC_DECIMALS)))
    } catch (error) {
      console.error("Error loading borrow balance:", error)
      setBorrowBalance(0)
    }
  }

  const loadBorrowRate = async () => {
    try {
      const rate = await publicClient.readContract({
        address: COMET_ADDRESS,
        abi: cometAbi,
        functionName: "getBorrowRate",
        args: [USDC_ADDRESS],
      })
      setBorrowRate(Number(formatUnits(rate, 18)) * 100)
    } catch (error) {
      console.error("Error loading borrow rate:", error)
      setBorrowRate(0)
    }
  }

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
              Connect your wallet to repay your USDC borrowings.
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
      showError("Invalid Amount", "You can't repay more than you've borrowed")
      return
    }

    try {
      setIsSubmitting(true)
      showLoading(`Repaying ${amount} USDC...`)

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
    }
  }

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && hash) {
      // Transaction confirmed, now execute the repay
      const rawAmount = parseUnits(amount, USDC_DECIMALS)
      writeContract({
        address: COMET_ADDRESS,
        abi: cometAbi,
        functionName: "repay",
        args: [USDC_ADDRESS, rawAmount],
      })
    }
  }, [isConfirmed, hash])

  // Handle repay confirmation
  useEffect(() => {
    if (isConfirmed && hash && isSubmitting) {
      // Repay transaction confirmed
      hideLoading()
      setRepaySuccess(true)
      setIsSubmitting(false)
      
      // Refresh balances
      Promise.all([loadUsdcBalance(), loadBorrowBalance()])
      
      // Notify other parts of the app
      try {
        const evt = new Event('onchain:updated')
        window.dispatchEvent(evt)
      } catch {}
    }
  }, [isConfirmed, hash, isSubmitting])

  // Handle errors
  useEffect(() => {
    if (error) {
      hideLoading()
      const msg = error?.shortMessage || error?.message || "Transaction failed"
      showError("Transaction Failed", msg)
      setIsSubmitting(false)
    }
  }, [error])

  if (repaySuccess) {
    return (
      <div className="p-4 pb-24">
        <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/20 text-white">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">Repay Successful!</h2>
            <p className="text-gray-400 mb-6">
              You've successfully repaid {amount} USDC to Compound.
            </p>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg">
                <span className="text-green-400">Repaid Amount</span>
                <span className="font-semibold">{amount} USDC</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg">
                <span className="text-green-400">Remaining Borrow</span>
                <span className="font-semibold">{borrowBalance.toFixed(2)} USDC</span>
              </div>
            </div>
            <Button 
              onClick={() => setRepaySuccess(false)}
              size="lg" 
              className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white h-12"
            >
              Repay More USDC
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 pb-24">
      <Card className="bg-gradient-to-br from-red-900/20 to-orange-900/20 border-red-500/20 text-white">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
              <ArrowDownLeft className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Repay USDC</h2>
              <p className="text-gray-400 text-sm">Reduce your borrowing position</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Available Balance</span>
                <div className="flex items-center gap-2">
                  <Image 
                    src="/usdc-icon.webp" 
                    alt="USDC" 
                    width={16} 
                    height={16} 
                    className="rounded-full"
                  />
                  <span className="font-semibold">{usdcBalance.toFixed(2)} USDC</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Current Borrow</span>
                <div className="flex items-center gap-2">
                  <Image 
                    src="/usdc-icon.webp" 
                    alt="USDC" 
                    width={16} 
                    height={16} 
                    className="rounded-full"
                  />
                  <span className="font-semibold">{borrowBalance.toFixed(2)} USDC</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-300">Borrow Rate</span>
                <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-red-500/30">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {borrowRate.toFixed(2)}%
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-300">Amount to Repay</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 pr-20 h-12"
                  disabled={isSubmitting || isPending || isConfirming}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleMaxClick}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                  disabled={isSubmitting || isPending || isConfirming}
                >
                  MAX
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleRepay}
                disabled={
                  !amount || 
                  Number.parseFloat(amount) <= 0 || 
                  Number.parseFloat(amount) > usdcBalance ||
                  Number.parseFloat(amount) > borrowBalance ||
                  isSubmitting || 
                  isPending || 
                  isConfirming ||
                  !isConnected
                }
                className="w-full bg-red-600 hover:bg-red-700 text-white h-12 text-lg"
              >
                {isSubmitting || isPending || isConfirming ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                    />
                    {isSubmitting ? "Repaying..." : isPending ? "Confirming..." : "Processing..."}
                  </>
                ) : (
                  <>
                    <ArrowDownLeft className="h-5 w-5 mr-2" />
                    Repay USDC
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex justify-between">
                <span>Transaction Fee</span>
                <span>~$2-5</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Gas</span>
                <span>~120,000</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
