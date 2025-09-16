"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ArrowUpRight, ArrowDownLeft, Clock, Loader2, RefreshCw, AlertCircle, TrendingUp, TrendingDown } from "lucide-react"
import { CryptoIcon } from "./crypto-icon"
import { useAccount } from "wagmi"
import { publicClient, COMET_ADDRESS } from "@/lib/comet-onchain"

interface Transaction {
  type: "supply" | "withdraw" | "supplyCollateral" | "withdrawCollateral" | "borrow" | "repay"
  asset: string
  amount: string
  timestamp: number
  hash: string
  user: string
}

// Cache for transaction data
const transactionCache = new Map<string, { data: Transaction[], timestamp: number }>()
const CACHE_DURATION = 30000 // 30 seconds

export function TransactionHistory() {
  const { address, isConnected } = useAccount()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Optimized transaction fetching with caching and reduced blockchain calls
  const fetchTransactions = useCallback(async (forceRefresh = false) => {
    if (!mounted || !isConnected || !address) return

    const cacheKey = address.toLowerCase()
    const cached = transactionCache.get(cacheKey)
    const now = Date.now()

    // Return cached data if still valid and not forcing refresh
    if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log("📋 Using cached transaction data")
      setTransactions(cached.data)
      return
    }

    console.log("🚀 Fetching fresh transaction data...")
    setLoading(true)
    setError(null)

    try {
      // Use getLogs for more efficient event filtering
      const currentBlock = await publicClient.getBlockNumber()
      const fromBlock = currentBlock > BigInt(1000) ? currentBlock - BigInt(1000) : BigInt(0)
      
      console.log(`📦 Scanning blocks ${fromBlock} to ${currentBlock}`)

      // Event signatures for Compound V3
      const eventSignatures = {
        Supply: '0xd1cf3d156d5f8f0d50f6c122ed609cec09d35c9b9fb3fff6ea0959134dae424e',
        Withdraw: '0x9b1bfa7fa9ee420a16e124f794c35ac9f90472acc99140eb2f6447c714cad8eb',
        SupplyCollateral: '0xfa56f7b24f17183d81894d3ac2ee654e3c26388d17a28dbd9549b8114304e1f4',
        WithdrawCollateral: '0xd6d480d5b3068db003533b170d67561494d72e3bf9fa40a266471351ebba9e16',
      }

      const userTransactions: Transaction[] = []

      // Fetch logs for each event type in parallel
      const logPromises = Object.entries(eventSignatures).map(async ([eventName, signature]) => {
        try {
          const logs = await publicClient.getLogs({
            address: COMET_ADDRESS,
            topics: [signature as `0x${string}`],
            fromBlock,
            toBlock: currentBlock,
          })

          return logs.map(log => ({
            ...log,
            eventName: eventName as keyof typeof eventSignatures
          }))
        } catch (error) {
          console.warn(`⚠️ Error fetching ${eventName} logs:`, error)
          return []
        }
      })

      const allLogs = (await Promise.all(logPromises)).flat()

      // Process logs to find user transactions
      for (const log of allLogs) {
        try {
          // Check if this log is related to our user
          const isUserTransaction = log.topics.some(topic => 
            topic && topic.toLowerCase().includes(address.toLowerCase().slice(2))
          )

          if (isUserTransaction && log.data && log.data !== '0x') {
            const amountBigInt = BigInt(log.data)
            let type: Transaction['type'] = 'supply'
            let asset = 'USDC'
            let amount = '0'

            switch (log.eventName) {
              case 'Supply':
                type = 'supply'
                asset = 'USDC'
                amount = (Number(amountBigInt) / 1e6).toFixed(2)
                break
              case 'Withdraw':
                type = 'withdraw'
                asset = 'USDC'
                amount = (Number(amountBigInt) / 1e6).toFixed(2)
                break
              case 'SupplyCollateral':
                type = 'supplyCollateral'
                asset = 'WETH'
                amount = (Number(amountBigInt) / 1e18).toFixed(6)
                break
              case 'WithdrawCollateral':
                type = 'withdrawCollateral'
                asset = 'WETH'
                amount = (Number(amountBigInt) / 1e18).toFixed(6)
                break
            }

            if (amount !== '0') {
              // Get block timestamp
              const block = await publicClient.getBlock({ blockNumber: log.blockNumber })
              
              userTransactions.push({
                type,
                asset,
                amount,
                timestamp: Number(block.timestamp) * 1000,
                hash: log.transactionHash,
                user: address
              })
            }
          }
        } catch (logError) {
          console.warn("⚠️ Error processing log:", logError)
        }
      }

      // Sort by timestamp (newest first)
      userTransactions.sort((a, b) => b.timestamp - a.timestamp)
      
      console.log("📊 Total transactions found:", userTransactions.length)
      
      // Cache the results
      transactionCache.set(cacheKey, {
        data: userTransactions,
        timestamp: now
      })

      setTransactions(userTransactions)
      setRetryCount(0) // Reset retry count on success

    } catch (err: any) {
      console.error("❌ Error fetching transactions:", err)
      setError(err.message || "Failed to load transaction history")
      setRetryCount(prev => prev + 1)
    } finally {
      setLoading(false)
      console.log("🏁 Transaction fetch completed")
    }
  }, [mounted, isConnected, address, publicClient, COMET_ADDRESS])

  // Load cached data immediately if available
  useEffect(() => {
    if (mounted && isConnected && address) {
      const cacheKey = address.toLowerCase()
      const cached = transactionCache.get(cacheKey)
      if (cached) {
        setTransactions(cached.data)
      }
      fetchTransactions()
    }
  }, [mounted, isConnected, address, fetchTransactions])

  // Memoized transaction icons and styling
  const getTransactionIcon = useCallback((type: string) => {
    switch (type) {
      case "supply":
      case "supplyCollateral":
        return <ArrowUpRight className="h-4 w-4 text-green-500" />
      case "withdraw":
      case "withdrawCollateral":
        return <ArrowDownLeft className="h-4 w-4 text-yellow-500" />
      case "borrow":
        return <TrendingUp className="h-4 w-4 text-blue-500" />
      case "repay":
        return <TrendingDown className="h-4 w-4 text-purple-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }, [])

  const getTransactionBg = useCallback((type: string) => {
    switch (type) {
      case "supply":
      case "supplyCollateral":
        return "bg-green-900/30"
      case "withdraw":
      case "withdrawCollateral":
        return "bg-yellow-900/30"
      case "borrow":
        return "bg-blue-900/30"
      case "repay":
        return "bg-purple-900/30"
      default:
        return "bg-gray-900/30"
    }
  }, [])

  const getTransactionLabel = useCallback((type: string, asset: string) => {
    switch (type) {
      case "supplyCollateral":
        return `Supplied ${asset} as Collateral`
      case "withdrawCollateral":
        return `Withdrew ${asset} Collateral`
      case "supply":
        return `Supplied ${asset}`
      case "withdraw":
        return `Withdrew ${asset}`
      case "borrow":
        return `Borrowed ${asset}`
      case "repay":
        return `Repaid ${asset}`
      default:
        return `Unknown ${asset} Transaction`
    }
  }, [])

  const getTransactionPrefix = useCallback((type: string) => {
    switch (type) {
      case "supply":
      case "supplyCollateral":
        return "+"
      case "withdraw":
      case "withdrawCollateral":
        return "-"
      case "borrow":
        return "+"
      case "repay":
        return "-"
      default:
        return ""
    }
  }, [])

  const getAssetDisplayName = useCallback((asset: string) => {
    switch (asset) {
      case "USDC":
        return "USDC"
      case "WETH":
        return "WETH"
      default:
        return asset
    }
  }, [])

  // Memoized transaction list to prevent unnecessary re-renders
  const transactionList = useMemo(() => {
    return transactions.map((tx) => (
      <div key={tx.hash} className="bg-[#252836] p-3 rounded-lg border border-green-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`${getTransactionBg(tx.type)} p-2 rounded-full`}>
                {getTransactionIcon(tx.type)}
              </div>
              <CryptoIcon symbol={tx.asset} size={20} />
            </div>
            <div>
              <div className="font-medium">
                {getTransactionLabel(tx.type, getAssetDisplayName(tx.asset))}
              </div>
              <div className="text-xs text-gray-400">
                {formatDate(tx.timestamp / 1000)}
              </div>
              <div className="text-xs text-green-400 font-mono">
                {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-medium">
              {getTransactionPrefix(tx.type)}
              {formatCurrency(parseFloat(tx.amount), tx.asset)}
            </div>
            <div className="text-xs text-gray-400">
              {getAssetDisplayName(tx.asset)}
            </div>
          </div>
        </div>
      </div>
    ))
  }, [transactions, getTransactionBg, getTransactionIcon, getTransactionLabel, getAssetDisplayName, getTransactionPrefix])

  if (!mounted) {
    return (
      <div className="p-4 pb-24">
        <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
          <CardHeader>
            <CardTitle className="text-xl">Transaction History</CardTitle>
            <CardDescription className="text-gray-400">Loading...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-400">
              <Loader2 className="mx-auto h-8 w-8 mb-2 opacity-50 animate-spin" />
              <p>Initializing...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 pb-24">
      <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Transaction History</CardTitle>
              <CardDescription className="text-gray-400">
                {!isConnected ? "Connect your wallet to see your transactions" : "Your recent Compound V3 activities"}
              </CardDescription>
            </div>
            {isConnected && (
              <button
                onClick={() => fetchTransactions(true)}
                disabled={loading}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh transactions"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-400">
              <Loader2 className="mx-auto h-8 w-8 mb-2 opacity-50 animate-spin" />
              <p>Loading transaction history...</p>
              {retryCount > 0 && (
                <p className="text-xs mt-2 text-yellow-400">
                  Retry attempt {retryCount}
                </p>
              )}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-400">
              <AlertCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="mb-2">{error}</p>
              <button 
                onClick={() => fetchTransactions(true)}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Try again
              </button>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>No transactions found</p>
              <p className="text-sm mt-2">Perform some supply/withdraw actions to see them here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactionList}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
