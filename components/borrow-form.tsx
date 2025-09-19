"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { ArrowDownRight, CheckCircle, Shield, Zap, TrendingUp } from "lucide-react"
import Image from "next/image"
import { useFeedback } from "@/lib/feedback-provider"
import cometAbi from "@/lib/abis/comet.json"
import erc20Abi from "@/lib/abis/erc20.json"
import { useAccount } from "wagmi"
import { publicClient, COMET_ADDRESS, WETH_ADDRESS, USDC_ADDRESS } from "@/lib/comet-onchain"
import { parseUnits } from "viem"

export function BorrowForm() {
  const { showSuccess, showError, showLoading, hideLoading } = useFeedback()
  const { address, isConnected } = useAccount()

  const [amount, setAmount] = useState("")
  const [borrowApy, setBorrowApy] = useState(0)
  const [collateralBalance, setCollateralBalance] = useState(0)
  const [borrowBalance, setBorrowBalance] = useState(0)
  const [healthFactor, setHealthFactor] = useState(999)
  const [mounted, setMounted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [borrowSuccess, setBorrowSuccess] = useState(false)

  const USDC_DECIMALS = 6
  const USDC_PRICE_USD = 1 // USDC is pegged to USD

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
      // Load collateral balance, borrow balance, and utilization
      const [collateralBal, borrowBal, utilization] = await Promise.all([
        publicClient.readContract({
          address: COMET_ADDRESS,
          abi: cometAbi as any,
          functionName: "collateralBalanceOf",
          args: [address as `0x${string}`, WETH_ADDRESS],
        }) as Promise<bigint>,
        publicClient.readContract({
          address: COMET_ADDRESS,
          abi: cometAbi as any,
          functionName: "borrowBalanceOf",
          args: [address as `0x${string}`],
        }) as Promise<bigint>,
        publicClient.readContract({
          address: COMET_ADDRESS,
          abi: cometAbi as any,
          functionName: "getUtilization",
          args: [],
        }) as Promise<bigint>,
      ])

      const collateralValue = Number(collateralBal) / 1e18
      const borrowValue = Number(borrowBal) / 1e6

      // Calculate health factor
      const wethPrice = 3000 // Placeholder
      const collateralValueUSD = collateralValue * wethPrice
      const hf = borrowValue > 0 ? (collateralValueUSD * 0.85) / borrowValue : 999

      // Get real borrow rate
      const borrowRate = (await publicClient.readContract({
        address: COMET_ADDRESS,
        abi: cometAbi as any,
        functionName: "getBorrowRate",
        args: [utilization],
      })) as bigint
      const apy = (Number(borrowRate) / 1e18) * 31536000 * 100

      setCollateralBalance(collateralValue)
      setBorrowBalance(borrowValue)
      setHealthFactor(hf)
      setBorrowApy(apy)
    } catch (error) {
      console.error("Error loading borrow data:", error)
      setCollateralBalance(0)
      setBorrowBalance(0)
      setHealthFactor(999)
      setBorrowApy(0)
    }
  }

  if (!mounted) return null

  const handleBorrow = async () => {
    if (!amount || Number.parseFloat(amount) <= 0) {
      showError("Invalid input", "Please enter a valid amount")
      return
    }

    if (collateralBalance <= 0) {
      showError("No Collateral", "You need to supply WETH as collateral before borrowing")
      return
    }

    setIsSubmitting(true)
    showLoading(`Borrowing ${amount} USDC...`)

    try {
      const { ethers } = await import("ethers")
      if (!(window as any).ethereum) throw new Error("No wallet detected")
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const signer = await provider.getSigner()

      const comet = new ethers.Contract(COMET_ADDRESS, cometAbi as any, signer)
      const rawAmount = parseUnits(amount, USDC_DECIMALS)

      // Check minimum borrow
      const minBorrow = await comet.baseBorrowMin()
      if (rawAmount < minBorrow) {
        throw new Error(`Minimum borrow is ${Number(minBorrow) / 1e6} USDC`)
      }

      // Execute borrow
      showLoading(`Borrowing ${amount} USDC...`)
      const borrowTx = await comet.withdraw(USDC_ADDRESS, rawAmount)
      await borrowTx.wait()

      hideLoading()
      setBorrowSuccess(true)
    } catch (error: any) {
      hideLoading()
      const msg = error?.shortMessage || error?.reason || error?.message || "Transaction failed"
      showError("Borrow failed", msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMaxClick = async () => {
    try {
      const { ethers } = await import("ethers")
      if (!(window as any).ethereum) return
      
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const comet = new ethers.Contract(COMET_ADDRESS, cometAbi as any, provider)
      const minBorrow = await comet.baseBorrowMin()
      setAmount((Number(minBorrow) / 1e6).toString())
    } catch (error) {
      console.error("Error getting minimum borrow:", error)
    }
  }

  const projectedInterest = Number(amount) * (borrowApy / 100)
  const newBorrowBalance = borrowBalance + Number(amount)
  const newHealthFactor = collateralBalance > 0 ? (collateralBalance * 3000 * 0.85) / newBorrowBalance : 999

  // Success state
  if (borrowSuccess) {
    return (
      <div className="p-4 pb-24">
        <Card className="bg-gradient-to-br from-yellow-900/20 to-red-900/20 border-yellow-500/20 text-white">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <ArrowDownRight className="h-12 w-12 text-yellow-400" />
            </div>
            <h2 className="text-3xl font-bold text-yellow-400 mb-3">Borrow Successful!</h2>
            <p className="text-xl text-white mb-2">
              You have borrowed <span className="font-bold text-yellow-400">{amount} USDC</span>
            </p>
            <p className="text-gray-400 mb-6">
              Borrow rate: {borrowApy.toFixed(2)}% APY
            </p>
            <div className="bg-[#1a1d26] border border-[#2a2d36] rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Projected Annual Interest</span>
                <span className="text-yellow-400 font-semibold">
                  ${projectedInterest.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">New Health Factor</span>
                <span className={`font-semibold ${newHealthFactor >= 2 ? 'text-green-400' : newHealthFactor >= 1.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {newHealthFactor > 999 ? '∞' : newHealthFactor.toFixed(2)}x
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Borrowed</span>
                <span className="text-white font-semibold">
                  ${newBorrowBalance.toFixed(2)} USDC
                </span>
              </div>
            </div>
            <Button 
              onClick={() => window.location.href = "/dashboard"}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white h-12"
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
            <CardTitle className="text-2xl">Connect Wallet to Borrow</CardTitle>
            <CardDescription className="text-gray-400">
              Please connect your wallet to borrow USDC against your collateral.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Current Position Card */}
      <Card className="bg-gradient-to-r from-yellow-800/30 to-red-800/30 border-yellow-500/20 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Image src="/weth-icon.png" alt="WETH" width={32} height={32} className="rounded-full" />
              <div>
                <p className="text-sm text-gray-300">Collateral Balance</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(collateralBalance, "WETH")}
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
          
          {borrowBalance > 0 && (
            <div className="flex items-center justify-between pt-4 border-t border-yellow-500/20">
              <div className="flex items-center gap-3">
                <Image src="/usdc-icon.webp" alt="USDC" width={24} height={24} className="rounded-full" />
                <div>
                  <p className="text-sm text-gray-300">Currently Borrowed</p>
                  <p className="text-lg font-bold">
                    ${borrowBalance.toFixed(2)} USDC
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Borrow Form */}
      <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
        <CardHeader>
          <CardTitle className="text-xl">Borrow USDC</CardTitle>
          <CardDescription className="text-gray-400">
            Borrow USDC against your WETH collateral.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="amount" className="text-gray-300">Amount to Borrow</Label>
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
                  MIN
                </Button>
              </div>
            </div>
          </div>

          {/* Borrow Preview */}
          <div className="bg-[#252836] p-4 rounded-lg space-y-3 border border-[#2a2d36]">
            <div className="text-lg font-semibold text-white">Borrow Overview</div>
            <div className="flex justify-between text-sm text-gray-300">
              <span>Borrow APY</span>
              <span className="font-medium text-yellow-400">
                {borrowApy > 0 ? `${borrowApy.toFixed(2)}%` : 'Loading...'}
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-300">
              <span>Projected Annual Interest</span>
              <span>${projectedInterest.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-300">
              <span>New Health Factor</span>
              <span className={`font-medium ${newHealthFactor >= 2 ? 'text-green-400' : newHealthFactor >= 1.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                {newHealthFactor > 999 ? '∞' : newHealthFactor.toFixed(2)}x
              </span>
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-yellow-600 to-red-600 hover:from-yellow-700 hover:to-red-700 text-white h-12 text-lg font-semibold"
            onClick={handleBorrow}
            disabled={!isConnected || isSubmitting || !amount || Number.parseFloat(amount) <= 0 || collateralBalance <= 0}
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Processing Transaction...
              </div>
            ) : (
              <>
                <ArrowDownRight className="mr-2 h-5 w-5" />
                Borrow USDC
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Benefits Section */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">Why Borrow USDC?</h3>
        <div className="grid grid-cols-1 gap-3">
          <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-yellow-400" />
              <div>
                <h4 className="font-semibold">Access Liquidity</h4>
                <p className="text-sm text-gray-400">Borrow against your collateral without selling it.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="h-6 w-6 text-blue-400" />
              <div>
                <h4 className="font-semibold">Maintain Exposure</h4>
                <p className="text-sm text-gray-400">Keep your WETH position while accessing cash.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
            <CardContent className="p-4 flex items-center gap-3">
              <Zap className="h-6 w-6 text-purple-400" />
              <div>
                <h4 className="font-semibold">Flexible Repayment</h4>
                <p className="text-sm text-gray-400">Repay anytime to reduce interest costs.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
