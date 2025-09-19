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
import { useSupplyWETH, useAllowance } from "@/lib/wagmi-hooks"
import { formatUnits } from "viem"

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
  const [needsApproval, setNeedsApproval] = useState(false)

  // Wagmi hooks
  const { supplyWETH, supplyWETHAfterApproval, hash, error, isPending, isConfirming, isConfirmed } = useSupplyWETH()
  const { data: allowance } = useAllowance(WETH_ADDRESS, COMET_ADDRESS, address || "0x0")

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

  // Handle transaction states
  useEffect(() => {
    if (isPending) {
      showLoading(needsApproval ? "Approving WETH..." : "Supplying WETH...")
    } else if (isConfirming) {
      showLoading("Confirming transaction...")
    } else if (isConfirmed) {
      if (needsApproval) {
        setNeedsApproval(false)
        hideLoading()
        showSuccess("Approval successful", "WETH approved for Compound Mini.")
        // Automatically proceed to supply
        setTimeout(() => {
          supplyWETHAfterApproval(amount)
        }, 1000)
      } else {
        hideLoading()
        showSuccess("Supply successful", `${amount} WETH supplied to Compound Mini.`)
        setSupplySuccess(true)
        // Refresh balances
        Promise.all([loadWethBalance(), loadCollateral()])
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

    if (!address) {
      showError("Wallet Error", "Please connect your wallet")
      return
    }

    setIsSubmitting(true)
    
    // Check if approval is needed
    const requiredAmount = BigInt(parseFloat(amount) * 1e18)
    if (!allowance || allowance < requiredAmount) {
      setNeedsApproval(true)
      supplyWETH(amount, address)
    } else {
      supplyWETHAfterApproval(amount)
    }
  }

  const formatCurrency = (value: number, symbol: string) => {
    return `${value.toFixed(4)} ${symbol}`
  }

  const projectedEarnings = Number(amount) * (supplyApy / 100)
  const newCollateralBalance = collateralBalance + Number(amount)
  const newHealthFactor = newCollateralBalance > 0 && Number(amount) > 0 ? (newCollateralBalance * 3000 * 0.85) / 0 : 999

  // Success state
  if (supplySuccess) {
    return (
      <div className="p-4 pb-24">
        <Card className="bg-gradient-to-br from-green-900/20 to-blue-900/20 border-green-500/20 text-white">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-12 w-12 text-green-400" />
            </div>
            <h2 className="text-3xl font-bold text-green-400 mb-3">Supply Successful!</h2>
            <p className="text-xl text-white mb-2">
              You have supplied <span className="font-bold text-green-400">{amount} WETH</span>
            </p>
            <p className="text-gray-400 mb-6">
              Earning {supplyApy.toFixed(2)}% APY
            </p>
            <div className="bg-[#1a1d26] border border-[#2a2d36] rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Projected Annual Earnings</span>
                <span className="text-green-400 font-semibold">
                  ${projectedEarnings.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">New Collateral Balance</span>
                <span className="text-white font-semibold">
                  {formatCurrency(newCollateralBalance, "WETH")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Health Factor</span>
                <span className="text-green-400 font-semibold">
                  {newHealthFactor > 999 ? '∞' : newHealthFactor.toFixed(2)}x
                </span>
              </div>
            </div>
            <Button 
              onClick={() => {
                setSupplySuccess(false)
                setAmount("")
                loadWethBalance()
                loadCollateral()
              }}
              size="lg" 
              className="w-full bg-green-600 hover:bg-green-700 text-white h-12"
            >
              <ArrowRight className="h-5 w-5 mr-2" />
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
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mr-4">
              <PiggyBank className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Supply WETH</h2>
              <p className="text-gray-400">Earn interest on your WETH</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Balance Display */}
            <div className="bg-[#1a1d26] border border-[#2a2d36] rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Wallet Balance</span>
                <span className="text-white font-semibold">
                  {formatCurrency(wethBalance, "WETH")}
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Currently Supplied</span>
                <span className="text-blue-400 font-semibold">
                  {formatCurrency(collateralBalance, "WETH")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Supply APY</span>
                <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {supplyApy.toFixed(2)}%
                </Badge>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Amount to Supply</label>
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
                  className="absolute right-2 top-2 bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600/30"
                  disabled={isSubmitting || isPending || isConfirming}
                >
                  MAX
                </Button>
              </div>
            </div>

            {/* Projection */}
            {amount && Number.parseFloat(amount) > 0 && (
              <div className="bg-[#1a1d26] border border-[#2a2d36] rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Supply Preview</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Annual Earnings</span>
                    <span className="text-green-400 font-semibold">
                      ${projectedEarnings.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">New Total Supplied</span>
                    <span className="text-white font-semibold">
                      {formatCurrency(collateralBalance + Number(amount), "WETH")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Button */}
            <Button
              onClick={handleSupply}
              disabled={
                !amount || 
                Number.parseFloat(amount) <= 0 || 
                Number.parseFloat(amount) > wethBalance ||
                isSubmitting || 
                isPending || 
                isConfirming
              }
              size="lg"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12"
            >
              {isSubmitting || isPending || isConfirming ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {needsApproval ? "Approving..." : "Supplying..."}
                </>
              ) : (
                <>
                  <PiggyBank className="h-5 w-5 mr-2" />
                  Supply WETH
                </>
              )}
            </Button>

            {/* Safety Notice */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-start">
                <Shield className="h-5 w-5 text-yellow-400 mr-3 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-400 mb-1">Safety Notice</h4>
                  <p className="text-xs text-gray-400">
                    Supplying assets to Compound involves smart contract risk. Your funds are secured by Compound's battle-tested protocol.
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
