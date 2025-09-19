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
      showLoading(`Supplying ${amount} WETH...`)

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
    }
  }

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && hash) {
      // Transaction confirmed, now execute the supply
      const rawAmount = parseUnits(amount, 18)
      writeContract({
        address: COMET_ADDRESS,
        abi: cometAbi,
        functionName: "supply",
        args: [WETH_ADDRESS, rawAmount],
      })
    }
  }, [isConfirmed, hash])

  // Handle supply confirmation
  useEffect(() => {
    if (isConfirmed && hash && isSubmitting) {
      // Supply transaction confirmed
      hideLoading()
      setSupplySuccess(true)
      setIsSubmitting(false)
      
      // Refresh balances
      Promise.all([loadWethBalance(), loadCollateral()])
      
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

  if (supplySuccess) {
    return (
      <div className="p-4 pb-24">
        <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/20 text-white">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">Supply Successful!</h2>
            <p className="text-gray-400 mb-6">
              You've successfully supplied {amount} WETH to Compound.
            </p>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg">
                <span className="text-green-400">Supplied Amount</span>
                <span className="font-semibold">{amount} WETH</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg">
                <span className="text-green-400">Current APY</span>
                <span className="font-semibold">{supplyApy.toFixed(2)}%</span>
              </div>
            </div>
            <Button 
              onClick={() => setSupplySuccess(false)}
              size="lg" 
              className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white h-12"
            >
              Supply More WETH
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 pb-24">
      <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/20 text-white">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <PiggyBank className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Supply WETH</h2>
              <p className="text-gray-400 text-sm">Earn interest on your WETH</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Available Balance</span>
                <div className="flex items-center gap-2">
                  <Image 
                    src="/weth-icon.png" 
                    alt="WETH" 
                    width={16} 
                    height={16} 
                    className="rounded-full"
                  />
                  <span className="font-semibold">{wethBalance.toFixed(4)} WETH</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Currently Supplied</span>
                <div className="flex items-center gap-2">
                  <Image 
                    src="/weth-icon.png" 
                    alt="WETH" 
                    width={16} 
                    height={16} 
                    className="rounded-full"
                  />
                  <span className="font-semibold">{collateralBalance.toFixed(4)} WETH</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-300">Supply APY</span>
                <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {supplyApy.toFixed(2)}%
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-300">Amount to Supply</label>
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
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30"
                  disabled={isSubmitting || isPending || isConfirming}
                >
                  MAX
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleSupply}
                disabled={
                  !amount || 
                  Number.parseFloat(amount) <= 0 || 
                  Number.parseFloat(amount) > wethBalance ||
                  isSubmitting || 
                  isPending || 
                  isConfirming ||
                  !isConnected
                }
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg"
              >
                {isSubmitting || isPending || isConfirming ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                    />
                    {isSubmitting ? "Supplying..." : isPending ? "Confirming..." : "Processing..."}
                  </>
                ) : (
                  <>
                    <PiggyBank className="h-5 w-5 mr-2" />
                    Supply WETH
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
                <span>~150,000</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
