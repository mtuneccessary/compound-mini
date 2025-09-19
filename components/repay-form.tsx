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
import { useRepayUSDC, useAllowance } from "@/lib/wagmi-hooks"
import { formatUnits } from "viem"

const USDC_DECIMALS = 6

export function RepayForm() {
  const { showSuccess, showError, showLoading, hideLoading } = useFeedback()
  const { address, isConnected } = useAccount()

  const [amount, setAmount] = useState("")
  const [usdcBalance, setUsdcBalance] = useState(0)
  const [borrowBalance, setBorrowBalance] = useState(0)
  const [collateralBalance, setCollateralBalance] = useState(0)
  const [borrowApy, setBorrowApy] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [repaySuccess, setRepaySuccess] = useState(false)
  const [needsApproval, setNeedsApproval] = useState(false)

  // Wagmi hooks
  const { repayUSDC, repayUSDCAfterApproval, hash, error, isPending, isConfirming, isConfirmed } = useRepayUSDC()
  const { data: allowance } = useAllowance(USDC_ADDRESS, COMET_ADDRESS, address || "0x0")

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isConnected && address) {
      loadRepayData()
    }
  }, [isConnected, address])

  // Handle transaction states
  useEffect(() => {
    if (isPending) {
      showLoading(needsApproval ? "Approving USDC..." : "Repaying USDC...")
    } else if (isConfirming) {
      showLoading("Confirming transaction...")
    } else if (isConfirmed) {
      if (needsApproval) {
        setNeedsApproval(false)
        hideLoading()
        showSuccess("Approval successful", "USDC approved for Compound Mini.")
        // Automatically proceed to repay
        setTimeout(() => {
          repayUSDCAfterApproval(amount)
        }, 1000)
      } else {
        hideLoading()
        showSuccess("Repay successful", `${amount} USDC repaid to Compound Mini.`)
        setRepaySuccess(true)
        // Refresh balances
        loadRepayData()
        // Notify other parts of the app
        try {
          const evt = new Event('onchain:updated')
          window.dispatchEvent(evt)
        } catch {}
      }
    } else if (error) {
      hideLoading()
      const msg = error?.shortMessage || error?.message || "Transaction failed"
      showError("Transaction Failed", msg)
    }
  }, [isPending, isConfirming, isConfirmed, error, needsApproval, amount])

  const loadRepayData = async () => {
    try {
      // Fetch USDC balance
      const usdcBalance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      })
      setUsdcBalance(Number(formatUnits(usdcBalance, USDC_DECIMALS)))

      // Fetch borrow balance
      const borrowBalance = await publicClient.readContract({
        address: COMET_ADDRESS,
        abi: cometAbi,
        functionName: "borrowBalanceOf",
        args: [address, USDC_ADDRESS],
      })
      setBorrowBalance(Number(formatUnits(borrowBalance, USDC_DECIMALS)))

      // Fetch collateral balance
      const collateralBalance = await publicClient.readContract({
        address: COMET_ADDRESS,
        abi: cometAbi,
        functionName: "collateralBalanceOf",
        args: [address, "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"], // WETH address
      })
      setCollateralBalance(Number(formatUnits(collateralBalance, 18)))

      // Fetch borrow rate
      const borrowRate = await publicClient.readContract({
        address: COMET_ADDRESS,
        abi: cometAbi,
        functionName: "getBorrowRate",
        args: [USDC_ADDRESS],
      })
      setBorrowApy(Number(formatUnits(borrowRate, 18)) * 100)
    } catch (error) {
      console.error("Error loading repay data:", error)
      setUsdcBalance(0)
      setBorrowBalance(0)
      setCollateralBalance(0)
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

    if (!address) {
      showError("Wallet Error", "Please connect your wallet")
      return
    }

    setIsSubmitting(true)
    
    // Check if approval is needed
    const requiredAmount = BigInt(parseFloat(amount) * 1e6) // USDC has 6 decimals
    if (!allowance || allowance < requiredAmount) {
      setNeedsApproval(true)
      repayUSDC(amount, address)
    } else {
      repayUSDCAfterApproval(amount)
    }
  }

  const handleMaxClick = () => {
    setAmount(Math.min(usdcBalance, borrowBalance).toString())
  }

  const formatCurrency = (value: number, symbol: string) => {
    return `${value.toFixed(2)} ${symbol}`
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
              onClick={() => {
                setRepaySuccess(false)
                setAmount("")
                loadRepayData()
              }}
              size="lg" 
              className="w-full bg-green-600 hover:bg-green-700 text-white h-12"
            >
              <ArrowRight className="h-5 w-5 mr-2" />
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
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mr-4">
              <ArrowDownLeft className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Repay USDC</h2>
              <p className="text-gray-400">Reduce your debt and save on interest</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Balance Display */}
            <div className="bg-[#1a1d26] border border-[#2a2d36] rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">USDC Balance</span>
                <span className="text-white font-semibold">
                  {formatCurrency(usdcBalance, "USDC")}
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Current Debt</span>
                <span className="text-red-400 font-semibold">
                  {formatCurrency(borrowBalance, "USDC")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Borrow APY</span>
                <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-red-500/30">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {borrowApy.toFixed(2)}%
                </Badge>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Amount to Repay</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-[#1a1d26] border-[#2a2d36] text-white placeholder-gray-500 h-12 pr-20"
                  disabled={isSubmitting || isPending || isConfirming}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleMaxClick}
                  className="absolute right-2 top-2 bg-red-600/20 border-red-500/30 text-red-400 hover:bg-red-600/30"
                  disabled={isSubmitting || isPending || isConfirming}
                >
                  MAX
                </Button>
              </div>
            </div>

            {/* Projection */}
            {amount && Number.parseFloat(amount) > 0 && (
              <div className="bg-[#1a1d26] border border-[#2a2d36] rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Repay Preview</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Interest Saved Annually</span>
                    <span className="text-green-400 font-semibold">
                      ${projectedInterestSaved.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">New Debt Balance</span>
                    <span className="text-white font-semibold">
                      {formatCurrency(Math.max(borrowBalance - Number(amount), 0), "USDC")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">New Health Factor</span>
                    <span className={`font-semibold ${newHealthFactor >= 2 ? 'text-green-400' : newHealthFactor >= 1.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {newHealthFactor > 999 ? '∞' : newHealthFactor.toFixed(2)}x
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Button */}
            <Button
              onClick={handleRepay}
              disabled={
                !amount || 
                Number.parseFloat(amount) <= 0 || 
                Number.parseFloat(amount) > usdcBalance ||
                borrowBalance <= 0 ||
                isSubmitting || 
                isPending || 
                isConfirming
              }
              size="lg"
              className="w-full bg-red-600 hover:bg-red-700 text-white h-12"
            >
              {isSubmitting || isPending || isConfirming ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {needsApproval ? "Approving..." : "Repaying..."}
                </>
              ) : (
                <>
                  <ArrowDownLeft className="h-5 w-5 mr-2" />
                  Repay USDC
                </>
              )}
            </Button>

            {/* Safety Notice */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-start">
                <Shield className="h-5 w-5 text-yellow-400 mr-3 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-400 mb-1">Repay Notice</h4>
                  <p className="text-xs text-gray-400">
                    Repaying reduces your debt and saves on interest payments. Your health factor will improve.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
