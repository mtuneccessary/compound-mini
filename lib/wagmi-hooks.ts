"use client"

import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi"
import { parseUnits, formatUnits } from "viem"
import { COMET_ADDRESS, WETH_ADDRESS, USDC_ADDRESS } from "./comet-onchain"
import cometAbi from "./abis/comet.json"
import erc20Abi from "./abis/erc20.json"

// Supply WETH hook
export function useSupplyWETH() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const supplyWETH = async (amount: string, address: `0x${string}`) => {
    const rawAmount = parseUnits(amount, 18)
    
    // First approve WETH
    writeContract({
      address: WETH_ADDRESS,
      abi: erc20Abi,
      functionName: "approve",
      args: [COMET_ADDRESS, rawAmount],
    })
  }

  const supplyWETHAfterApproval = async (amount: string) => {
    const rawAmount = parseUnits(amount, 18)
    
    writeContract({
      address: COMET_ADDRESS,
      abi: cometAbi,
      functionName: "supply",
      args: [WETH_ADDRESS, rawAmount],
    })
  }

  return {
    supplyWETH,
    supplyWETHAfterApproval,
    hash,
    error,
    isPending,
    isConfirming,
    isConfirmed,
  }
}

// Repay USDC hook
export function useRepayUSDC() {
  const { writeContract, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const repayUSDC = async (amount: string, address: `0x${string}`) => {
    const rawAmount = parseUnits(amount, 6) // USDC has 6 decimals
    
    // First approve USDC
    writeContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "approve",
      args: [COMET_ADDRESS, rawAmount],
    })
  }

  const repayUSDCAfterApproval = async (amount: string) => {
    const rawAmount = parseUnits(amount, 6)
    
    writeContract({
      address: COMET_ADDRESS,
      abi: cometAbi,
      functionName: "supply",
      args: [USDC_ADDRESS, rawAmount],
    })
  }

  return {
    repayUSDC,
    repayUSDCAfterApproval,
    hash,
    error,
    isPending,
    isConfirming,
    isConfirmed,
  }
}

// Check allowance hook
export function useAllowance(tokenAddress: `0x${string}`, spender: `0x${string}`, owner: `0x${string}`) {
  return useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, spender],
  })
}
