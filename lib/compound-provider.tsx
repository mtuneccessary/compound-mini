"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { mockAssets, mockTransactions, simulateMarketChanges } from "@/lib/mock-data"

interface Asset {
  symbol: string
  name: string
  price: number
  supplyRate: number
  borrowRate: number
  collateralFactor: number
  amount: number
  interestRate: number
}

interface Transaction {
  type: "supply" | "borrow" | "withdraw" | "repay"
  asset: string
  amount: number
  timestamp: number
}

interface CompoundContextType {
  availableAssets: Asset[]
  suppliedAssets: Asset[]
  borrowedAssets: Asset[]
  userBalances: Record<string, number>
  totalSupplied: number
  totalBorrowed: number
  borrowLimit: number
  borrowLimitUsed: number
  healthFactor: number
  transactions: Transaction[]
  supplyAsset: (asset: string, amount: number) => Promise<void>
  borrowAsset: (asset: string, amount: number) => Promise<void>
  withdrawAsset: (asset: string, amount: number) => Promise<void>
  repayAsset: (asset: string, amount: number) => Promise<void>
  isLoading: boolean
  resetData: () => void
  resetToHighBalance: () => void
}

// Initial high balances for simulation
const HIGH_BALANCES = {
  USDC: 10000,
  ETH: 5,
  WBTC: 0.5,
  DAI: 10000,
  USDT: 10000,
}

const CompoundContext = createContext<CompoundContextType>({
  availableAssets: [],
  suppliedAssets: [],
  borrowedAssets: [],
  userBalances: {},
  totalSupplied: 0,
  totalBorrowed: 0,
  borrowLimit: 0,
  borrowLimitUsed: 0,
  healthFactor: 0,
  transactions: [],
  supplyAsset: async () => {},
  borrowAsset: async () => {},
  withdrawAsset: async () => {},
  repayAsset: async () => {},
  isLoading: false,
  resetData: () => {},
  resetToHighBalance: () => {},
})

export function CompoundProvider({ children }: { children: ReactNode }) {
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([])
  const [suppliedAssets, setSuppliedAssets] = useState<Asset[]>([])
  const [borrowedAssets, setBorrowedAssets] = useState<Asset[]>([])
  const [userBalances, setUserBalances] = useState<Record<string, number>>({})
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(Date.now())
  const [initialized, setInitialized] = useState(false)

  // Generate a unique user ID for persistence if not already present
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!localStorage.getItem("compound_user_id")) {
        localStorage.setItem("compound_user_id", `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`)
      }
    }
  }, [])

  // Get user-specific storage key
  const getUserStorageKey = (key: string) => {
    if (typeof window !== "undefined") {
      const userId = localStorage.getItem("compound_user_id") || "default_user"
      return `${userId}_${key}`
    }
    return key
  }

  // Initialize with mock data
  useEffect(() => {
    if (initialized) return

    // Load from localStorage if available
    const storedSupplied = localStorage.getItem(getUserStorageKey("compound_supplied"))
    const storedBorrowed = localStorage.getItem(getUserStorageKey("compound_borrowed"))
    const storedBalances = localStorage.getItem(getUserStorageKey("compound_balances"))
    const storedTransactions = localStorage.getItem(getUserStorageKey("compound_transactions"))
    const storedAssets = localStorage.getItem(getUserStorageKey("compound_assets"))

    if (storedAssets) {
      setAvailableAssets(JSON.parse(storedAssets))
    } else {
      setAvailableAssets(mockAssets)
    }

    setSuppliedAssets(storedSupplied ? JSON.parse(storedSupplied) : [])
    setBorrowedAssets(storedBorrowed ? JSON.parse(storedBorrowed) : [])

    // Use high balances if no stored balances
    setUserBalances(storedBalances ? JSON.parse(storedBalances) : HIGH_BALANCES)

    setTransactions(storedTransactions ? JSON.parse(storedTransactions) : mockTransactions)
    setInitialized(true)
  }, [initialized])

  // Save to localStorage when state changes
  useEffect(() => {
    if (!initialized) return

    if (availableAssets.length > 0) {
      localStorage.setItem(getUserStorageKey("compound_assets"), JSON.stringify(availableAssets))
    }
    if (suppliedAssets.length > 0) {
      localStorage.setItem(getUserStorageKey("compound_supplied"), JSON.stringify(suppliedAssets))
    } else {
      localStorage.removeItem(getUserStorageKey("compound_supplied"))
    }

    if (borrowedAssets.length > 0) {
      localStorage.setItem(getUserStorageKey("compound_borrowed"), JSON.stringify(borrowedAssets))
    } else {
      localStorage.removeItem(getUserStorageKey("compound_borrowed"))
    }

    localStorage.setItem(getUserStorageKey("compound_balances"), JSON.stringify(userBalances))
    localStorage.setItem(getUserStorageKey("compound_transactions"), JSON.stringify(transactions))
  }, [availableAssets, suppliedAssets, borrowedAssets, userBalances, transactions, initialized])

  // Simulate market changes and interest accrual
  useEffect(() => {
    if (!initialized) return

    const interval = setInterval(() => {
      // Only update if it's been more than 30 seconds since the last update
      if (Date.now() - lastUpdate > 30000) {
        // Update market prices and interest rates
        setAvailableAssets((prev) => simulateMarketChanges(prev))

        // Apply interest to supplied assets
        if (suppliedAssets.length > 0) {
          setSuppliedAssets((prev) =>
            prev.map((asset) => {
              const marketAsset = availableAssets.find((a) => a.symbol === asset.symbol)
              if (!marketAsset) return asset

              // Calculate interest earned (simplified for demo)
              const interestRate = marketAsset.supplyRate / 365 / 24 / 12 // Approximate for 5 minutes
              const newAmount = asset.amount * (1 + interestRate)

              return {
                ...asset,
                amount: newAmount,
                price: marketAsset.price,
                interestRate: marketAsset.supplyRate,
              }
            }),
          )
        }

        // Apply interest to borrowed assets
        if (borrowedAssets.length > 0) {
          setBorrowedAssets((prev) =>
            prev.map((asset) => {
              const marketAsset = availableAssets.find((a) => a.symbol === asset.symbol)
              if (!marketAsset) return asset

              // Calculate interest accrued (simplified for demo)
              const interestRate = marketAsset.borrowRate / 365 / 24 / 12 // Approximate for 5 minutes
              const newAmount = asset.amount * (1 + interestRate)

              return {
                ...asset,
                amount: newAmount,
                price: marketAsset.price,
                interestRate: marketAsset.borrowRate,
              }
            }),
          )
        }

        setLastUpdate(Date.now())
      }
    }, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [availableAssets, suppliedAssets, borrowedAssets, lastUpdate, initialized])

  // Calculate totals
  const totalSupplied = suppliedAssets.reduce((total, asset) => {
    const marketAsset = availableAssets.find((a) => a.symbol === asset.symbol)
    const price = marketAsset ? marketAsset.price : asset.price
    return total + asset.amount * price
  }, 0)

  const totalBorrowed = borrowedAssets.reduce((total, asset) => {
    const marketAsset = availableAssets.find((a) => a.symbol === asset.symbol)
    const price = marketAsset ? marketAsset.price : asset.price
    return total + asset.amount * price
  }, 0)

  // Calculate borrow limit based on supplied assets and their collateral factors
  const borrowLimit = suppliedAssets.reduce((total, asset) => {
    const marketAsset = availableAssets.find((a) => a.symbol === asset.symbol)
    const price = marketAsset ? marketAsset.price : asset.price
    const collateralFactor = marketAsset ? marketAsset.collateralFactor : asset.collateralFactor
    return total + asset.amount * price * collateralFactor
  }, 0)

  // Calculate borrow limit used percentage
  const borrowLimitUsed = borrowLimit > 0 ? (totalBorrowed / borrowLimit) * 100 : 0

  // Calculate health factor
  const healthFactor = borrowLimit > 0 ? borrowLimit / (totalBorrowed || 1) : 0

  // Supply asset function
  const supplyAsset = async (assetSymbol: string, amount: number): Promise<void> => {
    setIsLoading(true)
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          // Update user balances
          setUserBalances((prev) => ({
            ...prev,
            [assetSymbol]: (prev[assetSymbol] || 0) - amount,
          }))

          // Find the asset in available assets
          const asset = availableAssets.find((a) => a.symbol === assetSymbol)

          if (asset) {
            // Check if already supplied
            const existingIndex = suppliedAssets.findIndex((a) => a.symbol === assetSymbol)

            if (existingIndex >= 0) {
              // Update existing supplied asset
              const updatedSupplied = [...suppliedAssets]
              updatedSupplied[existingIndex] = {
                ...updatedSupplied[existingIndex],
                amount: updatedSupplied[existingIndex].amount + amount,
              }
              setSuppliedAssets(updatedSupplied)
            } else {
              // Add new supplied asset
              setSuppliedAssets((prev) => [
                ...prev,
                {
                  ...asset,
                  amount,
                  interestRate: asset.supplyRate,
                },
              ])
            }

            // Add transaction
            setTransactions((prev) => [
              {
                type: "supply",
                asset: assetSymbol,
                amount,
                timestamp: Date.now(),
              },
              ...prev,
            ])

            setIsLoading(false)
            resolve()
          } else {
            setIsLoading(false)
            reject(new Error("Asset not found"))
          }
        } catch (error) {
          setIsLoading(false)
          reject(error)
        }
      }, 1000) // Simulate network delay
    })
  }

  // Borrow asset function
  const borrowAsset = async (assetSymbol: string, amount: number): Promise<void> => {
    setIsLoading(true)
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          // Check if borrowing would exceed borrow limit
          const asset = availableAssets.find((a) => a.symbol === assetSymbol)
          if (!asset) {
            setIsLoading(false)
            reject(new Error("Asset not found"))
            return
          }

          const newBorrowAmount = totalBorrowed + amount * asset.price
          if (newBorrowAmount > borrowLimit) {
            setIsLoading(false)
            reject(new Error("Exceeds borrow limit"))
            return
          }

          // Update user balances
          setUserBalances((prev) => ({
            ...prev,
            [assetSymbol]: (prev[assetSymbol] || 0) + amount,
          }))

          // Check if already borrowed
          const existingIndex = borrowedAssets.findIndex((a) => a.symbol === assetSymbol)

          if (existingIndex >= 0) {
            // Update existing borrowed asset
            const updatedBorrowed = [...borrowedAssets]
            updatedBorrowed[existingIndex] = {
              ...updatedBorrowed[existingIndex],
              amount: updatedBorrowed[existingIndex].amount + amount,
            }
            setBorrowedAssets(updatedBorrowed)
          } else {
            // Add new borrowed asset
            setBorrowedAssets((prev) => [
              ...prev,
              {
                ...asset,
                amount,
                interestRate: asset.borrowRate,
              },
            ])
          }

          // Add transaction
          setTransactions((prev) => [
            {
              type: "borrow",
              asset: assetSymbol,
              amount,
              timestamp: Date.now(),
            },
            ...prev,
          ])

          setIsLoading(false)
          resolve()
        } catch (error) {
          setIsLoading(false)
          reject(error)
        }
      }, 1000) // Simulate network delay
    })
  }

  // Withdraw asset function
  const withdrawAsset = async (assetSymbol: string, amount: number): Promise<void> => {
    setIsLoading(true)
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          // Find the supplied asset
          const suppliedAssetIndex = suppliedAssets.findIndex((a) => a.symbol === assetSymbol)

          if (suppliedAssetIndex === -1) {
            setIsLoading(false)
            reject(new Error("Asset not supplied"))
            return
          }

          const suppliedAsset = suppliedAssets[suppliedAssetIndex]

          // Check if withdrawal amount is valid
          if (amount > suppliedAsset.amount) {
            setIsLoading(false)
            reject(new Error("Insufficient supplied balance"))
            return
          }

          // Check if withdrawal would cause health factor to drop below 1
          const assetValue = amount * suppliedAsset.price
          const assetCollateralValue = assetValue * suppliedAsset.collateralFactor
          const newBorrowLimit = borrowLimit - assetCollateralValue

          if (totalBorrowed > 0 && newBorrowLimit < totalBorrowed) {
            setIsLoading(false)
            reject(new Error("Withdrawal would put your position at risk"))
            return
          }

          // Update supplied assets
          const updatedSupplied = [...suppliedAssets]
          if (amount === suppliedAsset.amount) {
            // Remove the asset if withdrawing all
            updatedSupplied.splice(suppliedAssetIndex, 1)
          } else {
            // Update the amount if withdrawing part
            updatedSupplied[suppliedAssetIndex] = {
              ...suppliedAsset,
              amount: suppliedAsset.amount - amount,
            }
          }
          setSuppliedAssets(updatedSupplied)

          // Update user balances
          setUserBalances((prev) => ({
            ...prev,
            [assetSymbol]: (prev[assetSymbol] || 0) + amount,
          }))

          // Add transaction
          setTransactions((prev) => [
            {
              type: "withdraw",
              asset: assetSymbol,
              amount,
              timestamp: Date.now(),
            },
            ...prev,
          ])

          setIsLoading(false)
          resolve()
        } catch (error) {
          setIsLoading(false)
          reject(error)
        }
      }, 1000) // Simulate network delay
    })
  }

  // Repay asset function
  const repayAsset = async (assetSymbol: string, amount: number): Promise<void> => {
    setIsLoading(true)
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          // Find the borrowed asset
          const borrowedAssetIndex = borrowedAssets.findIndex((a) => a.symbol === assetSymbol)

          if (borrowedAssetIndex === -1) {
            setIsLoading(false)
            reject(new Error("Asset not borrowed"))
            return
          }

          const borrowedAsset = borrowedAssets[borrowedAssetIndex]

          // Check if repay amount is valid
          if (amount > borrowedAsset.amount) {
            amount = borrowedAsset.amount // Cap at the borrowed amount
          }

          // Check if user has enough balance
          if (amount > (userBalances[assetSymbol] || 0)) {
            setIsLoading(false)
            reject(new Error("Insufficient balance to repay"))
            return
          }

          // Update borrowed assets
          const updatedBorrowed = [...borrowedAssets]
          if (amount === borrowedAsset.amount) {
            // Remove the asset if repaying all
            updatedBorrowed.splice(borrowedAssetIndex, 1)
          } else {
            // Update the amount if repaying part
            updatedBorrowed[borrowedAssetIndex] = {
              ...borrowedAsset,
              amount: borrowedAsset.amount - amount,
            }
          }
          setBorrowedAssets(updatedBorrowed)

          // Update user balances
          setUserBalances((prev) => ({
            ...prev,
            [assetSymbol]: (prev[assetSymbol] || 0) - amount,
          }))

          // Add transaction
          setTransactions((prev) => [
            {
              type: "repay",
              asset: assetSymbol,
              amount,
              timestamp: Date.now(),
            },
            ...prev,
          ])

          setIsLoading(false)
          resolve()
        } catch (error) {
          setIsLoading(false)
          reject(error)
        }
      }, 1000) // Simulate network delay
    })
  }

  // Reset all data to initial state
  const resetData = () => {
    localStorage.removeItem(getUserStorageKey("compound_supplied"))
    localStorage.removeItem(getUserStorageKey("compound_borrowed"))
    localStorage.removeItem(getUserStorageKey("compound_balances"))
    localStorage.removeItem(getUserStorageKey("compound_transactions"))
    localStorage.removeItem(getUserStorageKey("compound_assets"))

    setAvailableAssets(mockAssets)
    setSuppliedAssets([])
    setBorrowedAssets([])
    setUserBalances(HIGH_BALANCES)
    setTransactions([])
  }

  // Reset to high balance state without clearing positions
  const resetToHighBalance = () => {
    setUserBalances(HIGH_BALANCES)

    // Add a transaction to show the balance reset
    setTransactions((prev) => [
      {
        type: "supply",
        asset: "USDC",
        amount: 10000,
        timestamp: Date.now(),
      },
      ...prev,
    ])
  }

  return (
    <CompoundContext.Provider
      value={{
        availableAssets,
        suppliedAssets,
        borrowedAssets,
        userBalances,
        totalSupplied,
        totalBorrowed,
        borrowLimit,
        borrowLimitUsed,
        healthFactor,
        transactions,
        supplyAsset,
        borrowAsset,
        withdrawAsset,
        repayAsset,
        isLoading,
        resetData,
        resetToHighBalance,
      }}
    >
      {children}
    </CompoundContext.Provider>
  )
}

export function useCompound() {
  return useContext(CompoundContext)
}
