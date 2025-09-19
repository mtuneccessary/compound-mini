"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  PiggyBank, 
  TrendingUp, 
  ArrowRight, 
  CheckCircle,
  AlertCircle,
  Shield,
  Zap
} from "lucide-react"
import { useFeedback } from "@/lib/feedback-provider"
import { useAccount } from "wagmi"
import Image from "next/image"
import { motion } from "framer-motion"
import { publicClient, WETH_ADDRESS, COMET_ADDRESS } from "@/lib/comet-onchain"
import erc20Abi from "@/lib/abis/erc20.json"
import cometAbi from "@/lib/abis/comet.json"
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { parseUnits, formatUnits } from "viem"

export function SupplyForm() {
  const { showSuccess, showError, showLoading, hideLoading } = useFeedback()
  const { address, isConnected } = useAccount()

  const [amount, setAmount] = useState("")
  const [wethBalance, setWethBalance] = useState(0)
  const [collateralBalance, setCollateralBalance] = useState(0)
  const [supplyApy, setSupplyApy] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [supplySuccess, setSupplySuccess] = useState(false)
  const [step, setStep] = useState<'idle' | 'approving' | 'supplying'>('idle')

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
      loadWethBalance()
      loadCollateral()
      loadSupplyApy()
    }
  }, [isConnected, address])

  const loadWethBalance = async () => {
    try {
      const balance = await publicClient.readContract({
        address: WETH_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      })
      setWethBalance(Number(formatUnits(balance, 18)))
    } catch (error) {
      console.error("Error loading WETH balance:", error)
      setWethBalance(0)
    }
  }

  const loadCollateral = async () => {
    try {
      const balance = await publicClient.readContract({
        address: COMET_ADDRESS,
        abi: cometAbi,
        functionName: "collateralBalanceOf",
        args: [address, WETH_ADDRESS],
      })
      setCollateralBalance(Number(formatUnits(balance, 18)))
    } catch (error) {
      console.error("Error loading collateral balance:", error)
      setCollateralBalance(0)
    }
  }

  const loadSupplyApy = async () => {
    try {
      const rate = await publicClient.readContract({
        address: COMET_ADDRESS,
        abi: cometAbi,
        functionName: "getSupplyRate",
        args: [WETH_ADDRESS],
      })
      setSupplyApy(Number(formatUnits(rate, 18)) * 100)
    } catch (error) {
      console.error("Error loading supply APY:", error)
      setSupplyApy(0)
    }
  }

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && hash && step === 'approving') {
      // Approval confirmed, now supply
      setStep('supplying')
      const rawAmount = parseUnits(amount, 18)
      writeContract({
        address: COMET_ADDRESS,
        abi: cometAbi,
        functionName: "supply",
        args: [WETH_ADDRESS, rawAmount],
      })
    } else if (isConfirmed && hash && step === 'supplying') {
      // Supply confirmed
      hideLoading()
      setSupplySuccess(true)
      setIsSubmitting(false)
      setStep('idle')
      
      // Refresh balances
      Promise.all([loadWethBalance(), loadCollateral()])
      
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
        <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/20 text-white">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <PiggyBank className="h-10 w-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-6">
              Connect your wallet to start supplying WETH and earning interest.
            </p>
            <Button 
              size="lg" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12"
            >
              <PiggyBank className="h-5 w-5 mr-2" />
              Connect Wallet to Supply
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleMaxClick = () => {
    setAmount(wethBalance.toString())
  }

  const handleSupply = async () => {
    if (!amount || Number.parseFloat(amount) <= 0) {
      showError("Invalid Amount", "Please enter a valid amount to supply")
      return
    }

    if (Number.parseFloat(amount) > wethBalance) {
      showError("Insufficient Balance", "You don't have enough WETH in your wallet")
      return
    }

    try {
      setIsSubmitting(true)
      setStep('approving')
      showLoading(`Approving ${amount} WETH...`)

      const rawAmount = parseUnits(amount, 18)

      // First approve WETH
      writeContract({
        address: WETH_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [COMET_ADDRESS, rawAmount],
      })
    } catch (error: any) {
      hideLoading()
      const msg = error?.shortMessage || error?.reason || error?.message || "Transaction failed"
      showError("Supply Failed", msg)
      setIsSubmitting(false)
      setStep('idle')
    }
  }

  const isLoading = isPending || isConfirming || isSubmitting
  const buttonText = step === 'approving' ? 'Approving...' : 
                   step === 'supplying' ? 'Supplying...' : 
                   'Supply WETH'

  return (
    <div className="p-4 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/20 text-white">
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                <PiggyBank className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Supply WETH</h2>
                <p className="text-gray-400">Earn interest on your WETH</p>
              </div>
            </div>

            {supplySuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-green-400">Supply Successful!</h3>
                <p className="text-gray-400 mb-6">
                  Your {amount} WETH has been supplied to Compound.
                </p>
                <Button
                  onClick={() => {
                    setSupplySuccess(false)
                    setAmount("")
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Supply More WETH
                </Button>
              </motion.div>
            ) : (
              <>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Amount to Supply
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
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600/20 border-blue-500/30 text-blue-300 hover:bg-blue-600/30"
                        disabled={isLoading}
                      >
                        MAX
                      </Button>
                    </div>
                    <div className="flex justify-between text-sm text-gray-400 mt-1">
                      <span>Balance: {wethBalance.toFixed(4)} WETH</span>
                      <span>Supplied: {collateralBalance.toFixed(4)} WETH</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-green-400" />
                        <span className="text-sm text-gray-300">Supply APY</span>
                      </div>
                      <div className="text-lg font-semibold text-green-400">
                        {supplyApy.toFixed(2)}%
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
                      <Zap className="h-4 w-4 text-yellow-400" />
                      <span className="text-sm font-medium text-gray-300">Supply Summary</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Amount:</span>
                        <span className="text-white">{amount || "0"} WETH</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">APY:</span>
                        <span className="text-green-400">{supplyApy.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Supplied:</span>
                        <span className="text-blue-400">
                          {(Number(amount || 0) + collateralBalance).toFixed(4)} WETH
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSupply}
                  disabled={!amount || Number.parseFloat(amount) <= 0 || Number.parseFloat(amount) > wethBalance || isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg font-semibold mt-8"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {buttonText}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <PiggyBank className="h-5 w-5" />
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
