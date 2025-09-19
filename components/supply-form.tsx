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
      if (!address) return
      const balance = (await publicClient.readContract({
        address: WETH_ADDRESS as `0x${string}`,
        abi: erc20Abi as any,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      })) as bigint
      setWethBalance(Number(balance) / 1e18)
    } catch (error) {
      console.error("Error loading WETH balance:", error)
      setWethBalance(0)
    }
  }

  const loadCollateral = async () => {
    try {
      if (!address) return
      const collateral = (await publicClient.readContract({
        address: COMET_ADDRESS as `0x${string}`,
        abi: cometAbi as any,
        functionName: "collateralBalanceOf",
        args: [address as `0x${string}`, WETH_ADDRESS as `0x${string}`],
      })) as bigint
      setCollateralBalance(Number(collateral) / 1e18)
    } catch (error) {
      console.error("Error loading collateral:", error)
      setCollateralBalance(0)
    }
  }

  const loadSupplyApy = async () => {
    try {
      const utilization = (await publicClient.readContract({
        address: COMET_ADDRESS as `0x${string}`,
        abi: cometAbi as any,
        functionName: "getUtilization",
        args: [],
      })) as bigint
      const supplyRate = (await publicClient.readContract({
        address: COMET_ADDRESS as `0x${string}`,
        abi: cometAbi as any,
        functionName: "getSupplyRate",
        args: [utilization],
      })) as bigint
      const secondsPerYear = 31536000
      const apy = (Number(supplyRate) / 1e18) * secondsPerYear * 100
      setSupplyApy(apy)
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

      const { ethers } = await import("ethers")
      if (!(window as any).ethereum) throw new Error("No wallet detected")
      
      const provider = new ethers.BrowserProvider((window as any).ethereum)
      const signer = await provider.getSigner()

      // WETH contract
      const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
      const wethAbi = [
        "function balanceOf(address owner) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)"
      ]
      
      // Comet contract
      const cometAddress = "0xc3d688B66703497DAA19211EEdff47f25384cdc3"
      const cometAbi = [
        "function supply(address asset, uint256 amount) external"
      ]

      const weth = new ethers.Contract(wethAddress, wethAbi, signer)
      const comet = new ethers.Contract(cometAddress, cometAbi, signer)

      const rawAmount = ethers.parseUnits(amount, 18)

      // Check allowance and approve if needed
      const allowance = await weth.allowance(address, cometAddress)
      if (allowance < rawAmount) {
        showLoading("Approving WETH...")
        await (await weth.approve(cometAddress, rawAmount)).wait()
      }

      showLoading("Supplying WETH...")
      await (await comet.supply(wethAddress, rawAmount)).wait()

      // Refresh balances so UI reflects immediately
      await Promise.all([loadWethBalance(), loadCollateral()])

      // Notify other parts of the app to refetch on-chain state
      try {
        const evt = new Event('onchain:updated')
        window.dispatchEvent(evt)
      } catch {}

      hideLoading()
      setSupplySuccess(true)
    } catch (error: any) {
      hideLoading()
      const msg = error?.shortMessage || error?.reason || error?.message || "Transaction failed"
      showError("Supply Failed", msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const projectedEarnings = Number(amount) * (supplyApy / 100)

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
              Your WETH is now earning interest at {supplyApy.toFixed(2)}% APY
            </p>
            <div className="bg-[#1a1d26] border border-[#2a2d36] rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Currently Supplied (Collateral)</span>
                <span className="text-green-400 font-semibold">{collateralBalance.toFixed(4)} WETH</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Projected Annual Earnings</span>
                <span className="text-white font-semibold">{projectedEarnings.toFixed(4)} WETH</span>
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

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-4 pb-24 space-y-4"
    >
      {/* WETH Balance Card */}
      <Card className="bg-gradient-to-br from-green-900/20 to-blue-900/20 border-green-500/20 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <Image 
                  src="/weth-icon.png" 
                  alt="WETH" 
                  width={24} 
                  height={24} 
                  className="rounded-full"
                />
              </div>
              <div>
                <h3 className="font-semibold text-lg">WETH</h3>
                <p className="text-sm text-gray-400">Wallet balance and supplied</p>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="text-2xl font-bold text-green-400">
                {wethBalance.toFixed(4)} WETH
              </div>
              <div className="text-sm text-gray-400">Wallet</div>
              <div className="text-lg font-semibold text-blue-300">
                {collateralBalance.toFixed(4)} WETH
              </div>
              <div className="text-sm text-gray-400">Supplied</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supply Form */}
      <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
        <CardContent className="p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Supply WETH</h2>
            <p className="text-gray-400">Earn interest on your WETH assets</p>
          </div>

          {/* Amount Input */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Amount</label>
              <span className="text-xs text-gray-400">
                Balance: {wethBalance.toFixed(4)} WETH
              </span>
            </div>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-[#252836] border-[#2a2d36] text-white text-lg h-14 pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                  onClick={handleMaxClick}
                >
                  MAX
                </Button>
                <div className="flex items-center gap-1 text-sm text-gray-400">
                  <Image 
                    src="/weth-icon.png" 
                    alt="WETH" 
                    width={16} 
                    height={16} 
                    className="rounded-full"
                  />
                  <span>WETH</span>
                </div>
              </div>
            </div>
          </div>

          {/* Supply Preview */}
          {amount && Number(amount) > 0 && (
            <Card className="bg-[#252836] border-[#2a2d36]">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium">Supply Preview</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Supply APY</span>
                    <span className="text-green-400 font-medium">
                      {supplyApy > 0 ? `${supplyApy.toFixed(2)}%` : 'Loading...'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Projected Annual Earnings</span>
                    <span className="text-white font-medium">
                      {projectedEarnings.toFixed(4)} WETH
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">USD Value</span>
                    <span className="text-white font-medium">
                      ${(Number(amount) * 3000).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Supply Button */}
          <Button
            className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white h-14 text-lg font-semibold"
            onClick={handleSupply}
            disabled={!isConnected || !amount || Number.parseFloat(amount) <= 0 || Number.parseFloat(amount) > wethBalance || isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                Processing Supply...
              </div>
            ) : (
              <div className="flex items-center">
                <PiggyBank className="h-5 w-5 mr-3" />
                Supply {amount || '0'} WETH
                <ArrowRight className="h-5 w-5 ml-3" />
              </div>
            )}
          </Button>

          {/* Benefits Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Why Supply WETH?</h3>
            <div className="grid grid-cols-1 gap-3">
              <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
                <CardContent className="p-4 flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                  <div>
                    <h4 className="font-semibold">Earn Interest</h4>
                    <p className="text-sm text-gray-400">Start earning {supplyApy > 0 ? `${supplyApy.toFixed(2)}%` : 'variable'} APY on your WETH immediately.</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
                <CardContent className="p-4 flex items-center gap-3">
                  <Shield className="h-6 w-6 text-blue-400" />
                  <div>
                    <h4 className="font-semibold">Use as Collateral</h4>
                    <p className="text-sm text-gray-400">Supplied WETH can be used as collateral to borrow other assets.</p>
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
        </CardContent>
      </Card>
    </motion.div>
  )
}