"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { ArrowDownRight, CheckCircle, Shield, Zap, TrendingUp, PiggyBank } from "lucide-react"
import Image from "next/image"
import { useFeedback } from "@/lib/feedback-provider"
import cometAbi from "@/lib/abis/comet.json"
import erc20Abi from "@/lib/abis/erc20.json"
import { useAccount } from "wagmi"
import { publicClient, COMET_ADDRESS, WETH_ADDRESS, USDC_ADDRESS } from "@/lib/comet-onchain"
import { parseUnits, formatUnits } from "viem"
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi"

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

  const WETH_DECIMALS = 18
  const WETH_PRICE_USD = 3000 // Placeholder for WETH price

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
      loadSupplyData()
    }
  }, [isConnected, address])

  const loadSupplyData = async () => {
    try {
      // Load WETH balance
      const wethBal = await publicClient.readContract({
        address: WETH_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      })
      setWethBalance(Number(formatUnits(wethBal, 18)))

      // Load collateral balance
      const collateralBal = await publicClient.readContract({
        address: COMET_ADDRESS,
        abi: cometAbi,
        functionName: "collateralBalanceOf",
        args: [address, WETH_ADDRESS],
      })
      setCollateralBalance(Number(formatUnits(collateralBal, 18)))

      // Load supply APY
      const rate = await publicClient.readContract({
        address: COMET_ADDRESS,
        abi: cometAbi,
        functionName: "getSupplyRate",
        args: [WETH_ADDRESS],
      })
      setSupplyApy(Number(formatUnits(rate, 18)) * 100)
    } catch (error) {
      console.error("Error loading supply data:", error)
      setWethBalance(0)
      setCollateralBalance(0)
      setSupplyApy(0)
    }
  }

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && hash && step === 'approving') {
      // Approval confirmed, now supply
      setStep('supplying')
      const rawAmount = parseUnits(amount, WETH_DECIMALS)
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
      loadSupplyData()
      
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

  const handleSupply = async () => {
    if (!amount || Number.parseFloat(amount) <= 0) {
      showError("Invalid input", "Please enter a valid amount")
      return
    }

    if (Number.parseFloat(amount) > wethBalance) {
      showError("Insufficient Balance", `You only have ${formatCurrency(wethBalance, "WETH")} available`)
      return
    }

    try {
      setIsSubmitting(true)
      setStep('approving')
      showLoading(`Approving ${amount} WETH...`)

      const rawAmount = parseUnits(amount, WETH_DECIMALS)

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

  const handleMaxClick = () => {
    setAmount(wethBalance.toString())
  }

  const interestEarned = Number(amount) * (supplyApy / 100)
  const newCollateralBalance = collateralBalance + Number(amount)
  const newCollateralValueUSD = newCollateralBalance * WETH_PRICE_USD

  const isLoading = isPending || isConfirming || isSubmitting
  const buttonText = step === 'approving' ? 'Approving...' : 
                   step === 'supplying' ? 'Supplying...' : 
                   'Supply WETH'

  // Success state
  if (supplySuccess) {
    return (
      <div className="p-4 pb-24">
        <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/20 text-white">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <ArrowDownRight className="h-12 w-12 text-blue-400" />
            </div>
            <h2 className="text-3xl font-bold text-blue-400 mb-3">Supply Successful!</h2>
            <p className="text-xl text-white mb-2">
              You have supplied <span className="font-bold text-blue-400">{amount} WETH</span>
            </p>
            <p className="text-gray-400 mb-6">
              Supply rate: {supplyApy.toFixed(2)}% APY
            </p>
            <div className="bg-[#1a1d26] border border-[#2a2d36] rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Interest Earned Annually</span>
                <span className="text-green-400 font-semibold">
                  {interestEarned.toFixed(4)} WETH
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">USD Value</span>
                <span className="text-white font-semibold">
                  ${(interestEarned * WETH_PRICE_USD).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Total Collateral</span>
                <span className="text-white font-semibold">
                  {newCollateralBalance.toFixed(4)} WETH
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total USD Value</span>
                <span className="text-white font-semibold">
                  ${newCollateralValueUSD.toFixed(2)}
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
            <CardTitle className="text-2xl">Connect Wallet to Supply</CardTitle>
            <CardDescription className="text-gray-400">
              Please connect your wallet to supply WETH and start earning interest.
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
                <p className="text-sm text-gray-300">Wallet Balance</p>
                <p className="text-2xl font-bold">
                  {wethBalance.toFixed(4)} WETH
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-300">Supply Rate</p>
              <p className="text-xl font-bold text-green-400">
                {supplyApy > 0 ? `${supplyApy.toFixed(2)}%` : 'Loading...'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-blue-500/20">
            <div className="flex items-center gap-3">
              <Image src="/weth-icon.png" alt="WETH" width={24} height={24} className="rounded-full" />
              <div>
                <p className="text-sm text-gray-300">Supplied Collateral</p>
                <p className="text-lg font-bold">
                  {collateralBalance.toFixed(4)} WETH
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-300">USD Value</p>
              <p className="text-lg font-bold">
                ${(collateralBalance * WETH_PRICE_USD).toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supply Form */}
      <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
        <CardHeader>
          <CardTitle className="text-xl">Supply WETH</CardTitle>
          <CardDescription className="text-gray-400">
            Supply WETH to earn interest and use as collateral for borrowing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="amount" className="text-gray-300">Amount to Supply</Label>
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
                disabled={isLoading}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Image src="/weth-icon.png" alt="WETH" width={20} height={20} className="rounded-full" />
                <span className="text-white font-semibold">WETH</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-blue-400 hover:text-blue-300"
                  onClick={handleMaxClick}
                  disabled={isLoading}
                >
                  MAX
                </Button>
              </div>
            </div>
          </div>

          {/* Supply Preview */}
          <div className="bg-[#252836] p-4 rounded-lg space-y-3 border border-[#2a2d36]">
            <div className="text-lg font-semibold text-white">Supply Overview</div>
            <div className="flex justify-between text-sm text-gray-300">
              <span>Interest Earned Annually</span>
              <span className="font-medium text-green-400">
                {interestEarned.toFixed(4)} WETH
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-300">
              <span>USD Value</span>
              <span className="font-medium text-white">
                ${(interestEarned * WETH_PRICE_USD).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-300">
              <span>New Total Collateral</span>
              <span className="font-medium text-blue-400">
                {newCollateralBalance.toFixed(4)} WETH
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-300">
              <span>Total USD Value</span>
              <span className="font-medium text-white">
                ${newCollateralValueUSD.toFixed(2)}
              </span>
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white h-12 text-lg font-semibold"
            onClick={handleSupply}
            disabled={!isConnected || isLoading || !amount || Number.parseFloat(amount) <= 0 || Number.parseFloat(amount) > wethBalance}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                {buttonText}
              </div>
            ) : (
              <>
                <ArrowDownRight className="mr-2 h-5 w-5" />
                Supply WETH
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Benefits Section */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">Supply Benefits</h3>
        <div className="grid grid-cols-1 gap-3">
          <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-green-400" />
              <div>
                <h4 className="font-semibold">Earn Interest</h4>
                <p className="text-sm text-gray-400">Earn {supplyApy.toFixed(2)}% APY on your supplied WETH.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="h-6 w-6 text-blue-400" />
              <div>
                <h4 className="font-semibold">Collateral for Borrowing</h4>
                <p className="text-sm text-gray-400">Use supplied WETH as collateral to borrow other assets.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
            <CardContent className="p-4 flex items-center gap-3">
              <Zap className="h-6 w-6 text-purple-400" />
              <div>
                <h4 className="font-semibold">Flexible Supply</h4>
                <p className="text-sm text-gray-400">Supply any amount and withdraw anytime (subject to health factor).</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
