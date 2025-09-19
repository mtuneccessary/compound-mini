"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ArrowUpRight, ArrowDownLeft, Clock, Loader2, RefreshCw, AlertCircle, TrendingUp, TrendingDown } from "lucide-react"
import { CryptoIcon } from "./crypto-icon"
import Image from "next/image"
import { useAccount } from "wagmi"
import { publicClient, COMET_ADDRESS } from "@/lib/comet-onchain"
import cometAbi from "@/lib/abis/comet.json"

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
    // Add a small delay to prevent hydration issues
    setTimeout(async () => {
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

      console.log(`🔄 Cache check: forceRefresh=${forceRefresh}, cached=${!!cached}, cacheAge=${cached ? (now - cached.timestamp) / 1000 : 'N/A'}s`)

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
          Transfer: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // ERC20 Transfer
        }

        // Get user's current borrow balance to distinguish borrow vs withdraw
        let userBorrowBalance = 0n
        try {
          userBorrowBalance = await publicClient.readContract({
            address: COMET_ADDRESS,
            abi: cometAbi,
            functionName: 'borrowBalanceOf',
            args: [address as `0x${string}`],
          }) as bigint
        } catch (error) {
          console.warn('Could not fetch borrow balance:', error)
        }

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

        // Process logs to find user transactions, using a Map to avoid duplicates
        const transactionMap = new Map<string, Transaction>()

        for (const log of allLogs) {
          try {
            // Check if this log is related to our user
            const isUserTransaction = log.topics.some(topic =>
              topic && topic.toLowerCase().includes(address.toLowerCase().slice(2))
            )

            if (isUserTransaction && log.data && log.data !== '0x') {
              // Parse the amount from log data based on event type
              let amountBigInt = 0n
              let type: Transaction['type'] = 'supply'
              let asset = 'USDC'

              try {
                // Parse event data based on event type and structure
                if (log.eventName === 'Supply' || log.eventName === 'Withdraw') {
                  // Supply/Withdraw events: data contains only the amount (32 bytes)
                  amountBigInt = BigInt(log.data)
                } else if (log.eventName === 'SupplyCollateral' || log.eventName === 'WithdrawCollateral') {
                  // Collateral events: data contains asset (32 bytes) + amount (32 bytes)
                  // Extract the last 32 bytes (64 hex chars) as the amount
                  if (log.data.length >= 66) {
                    const amountHex = log.data.slice(-64)
                    amountBigInt = BigInt('0x' + amountHex)
                  } else {
                    amountBigInt = BigInt(log.data)
                  }
                } else if (log.eventName === 'Transfer') {
                  // Transfer events: data contains only the amount (32 bytes)
                  amountBigInt = BigInt(log.data)
                } else {
                  // Fallback for unknown events
                  amountBigInt = BigInt(log.data)
                }

                switch (log.eventName) {
                  case 'Supply':
                    type = 'supply'
                    asset = 'USDC'
                    break
                  case 'Withdraw':
                    // In Compound v3, Withdraw can be either actual withdrawal or borrowing/repay
                    const withdrawAmount = Number(amountBigInt) / 1e6
                    // More sophisticated logic to distinguish between withdraw, borrow, and repay
                    if (userBorrowBalance > 0n && withdrawAmount < 1000) {
                      // Small amount with existing borrow balance = repay
                      type = 'repay'
                    } else if (withdrawAmount >= 10000) {
                      // Large amount = actual withdrawal
                      type = 'withdraw'
                    } else {
                      // Medium amount = likely a borrow
                      type = 'borrow'
                    }
                    asset = 'USDC'
                    break
                  case 'SupplyCollateral':
                    // Only classify as WETH if the amount is significant (>= 0.001 WETH)
                    const wethAmount = Number(amountBigInt) / 1e18
                    if (wethAmount >= 0.001) {
                      type = 'supplyCollateral'
                      asset = 'WETH'
                    } else {
                      // This is likely a USDC transaction with collateral event
                      type = 'supply'
                      asset = 'USDC'
                    }
                    break
                  case 'WithdrawCollateral':
                    // Only classify as WETH if the amount is significant (>= 0.001 WETH)
                    const wethWithdrawAmount = Number(amountBigInt) / 1e18
                    if (wethWithdrawAmount >= 0.001) {
                      type = 'withdrawCollateral'
                      asset = 'WETH'
                    } else {
                      // This is likely a USDC transaction with collateral event
                      type = 'withdraw'
                      asset = 'USDC'
                    }
                    break
                  case 'Transfer':
                    // Transfer events from Comet contract - usually USDC transfers
                    // Check if this is a transfer to or from the user
                    if (log.topics.length >= 3) {
                      const from = log.topics[1]
                      const to = log.topics[2]
                      const transferAmount = Number(amountBigInt) / 1e6

                      // If transfer is TO the user, it's likely a borrow
                      if (to && to.toLowerCase().includes(address.toLowerCase().slice(2))) {
                        type = 'borrow'
                        asset = 'USDC'
                      }
                      // If transfer is FROM the user, it's likely a repay
                      else if (from && from.toLowerCase().includes(address.toLowerCase().slice(2))) {
                        // Additional logic to distinguish repay from withdraw
                        if (transferAmount < 1000 && userBorrowBalance > 0n) {
                          type = 'repay'
                        } else {
                          type = 'withdraw'
                        }
                        asset = 'USDC'
                      }
                    }
                    break
                }

                // Format amount based on asset decimals
                let amount = '0'
                if (asset === 'USDC') {
                  // USDC has 6 decimals
                  amount = (Number(amountBigInt) / 1e6).toFixed(2)
                } else if (asset === 'WETH') {
                  // WETH has 18 decimals
                  amount = (Number(amountBigInt) / 1e18).toFixed(6)
                } else {
                  amount = amountBigInt.toString()
                }

                if (amount !== '0') {
                  const txHash = log.transactionHash

                  // Debug logging with raw data
                  console.log(`📝 Processing ${log.eventName}: ${type} ${amount} ${asset} for tx ${txHash.slice(0, 10)}...`)
                  console.log(`   Raw data: ${log.data}, Parsed amount: ${amountBigInt.toString()}`)

                  // Priority order for transaction types (higher number = higher priority)
                  // We want to prioritize the most specific/meaningful action
                  const typePriority = {
                    'supplyCollateral': 6,    // Highest priority - WETH collateral supply
                    'withdrawCollateral': 6,  // Highest priority - WETH collateral withdraw
                    'borrow': 5,              // High priority - USDC borrow (more specific than supply)
                    'repay': 4,               // High priority - USDC repay (more specific than supply)
                    'withdraw': 3,            // Medium priority - USDC withdraw
                    'supply': 2               // Lower priority - USDC supply (generic)
                  }

                  // Only process if we haven't seen this transaction before, or if this event has higher priority
                  const existingTx = transactionMap.get(txHash)
                  const currentPriority = typePriority[type] || 0
                  const existingPriority = existingTx ? typePriority[existingTx.type] || 0 : 0

                  if (!existingTx || currentPriority > existingPriority) {
                    // Get block timestamp
                    const block = await publicClient.getBlock({ blockNumber: log.blockNumber })

                    transactionMap.set(txHash, {
                      type,
                      asset,
                      amount,
                      timestamp: Number(block.timestamp) * 1000,
                      hash: txHash,
                      user: address
                    })
                    
                    // Debug logging for transaction selection
                    if (existingTx) {
                      console.log(`🔄 Replacing ${existingTx.type} with ${type} (priority ${currentPriority} > ${existingPriority}) for tx ${txHash.slice(0, 10)}...`)
                    } else {
                      console.log(`✅ Selected ${type} for tx ${txHash.slice(0, 10)}...`)
                    }
                  } else {
                    console.log(`⏭️ Skipping ${type} (priority ${currentPriority} <= ${existingPriority}) for tx ${txHash.slice(0, 10)}...`)
                  }
                }
              } catch (parseError) {
                console.warn("⚠️ Error parsing log data:", parseError, log)
              }
            }
          } catch (logError) {
            console.warn("⚠️ Error processing log:", logError)
          }
        }

        // Convert Map to array
        const userTransactions = Array.from(transactionMap.values())

        // Sort by timestamp (newest first) - no need for additional deduplication since we used Map
        userTransactions.sort((a, b) => b.timestamp - a.timestamp)

        console.log("📊 Total transactions found:", userTransactions.length)

        // Debug: Log final transaction results
        userTransactions.forEach((tx, index) => {
          console.log(`   ${index + 1}. ${tx.type} ${tx.amount} ${tx.asset} - ${tx.hash.slice(0, 10)}...`)
        })

        // Cache the results
        transactionCache.set(cacheKey, {
          data: userTransactions,
          timestamp: now
        })

        // Force UI refresh by adding a timestamp
        const transactionsWithTimestamp = userTransactions.map(tx => ({
          ...tx,
          _refresh: Date.now() // Force React re-render
        }))

        setTransactions(transactionsWithTimestamp)
        console.log("✅ Setting transactions in state:", userTransactions.map(tx => `${tx.type} ${tx.amount} ${tx.asset}`).join(', '))
        setRetryCount(0) // Reset retry count on success

      } catch (err: any) {
        console.error("❌ Error fetching transactions:", err)
        setError(err.message || "Failed to load transaction history")
        setRetryCount(prev => prev + 1)
      } finally {
        setLoading(false)
        console.log("🏁 Transaction fetch completed")
      }
    }, 100) // 100ms delay to prevent hydration issues
  }, [mounted, isConnected, address, publicClient, COMET_ADDRESS])

  // Load cached data immediately if available
  useEffect(() => {
    if (mounted && isConnected && address) {
      // Clear cache completely to force fresh fetch
      const cacheKey = address.toLowerCase()
      transactionCache.clear() // Clear all cache entries

      console.log("🗑️ Cleared transaction cache completely")

      // Add a small delay to prevent hydration issues
      const timeoutId = setTimeout(() => {
        console.log("🚀 Triggering fresh transaction fetch...")
        fetchTransactions(true) // Force refresh
      }, 100)

      return () => clearTimeout(timeoutId)
    }
  }, [mounted, isConnected, address, fetchTransactions])

  // Memoized transaction icons and styling
  const getTransactionIcon = useCallback((type: string) => {
    switch (type) {
      case "supply":
      case "supplyCollateral":
        return <ArrowUpRight className="h-4 w-4 text-green-500" />
      case "withdraw":
        return <ArrowDownLeft className="h-4 w-4 text-orange-500" />
      case "withdrawCollateral":
        return <ArrowDownLeft className="h-4 w-4 text-yellow-500" />
      case "borrow":
        return <TrendingUp className="h-4 w-4 text-blue-500" />
      case "repay":
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }, [])

  const getTransactionBg = useCallback((type: string) => {
    switch (type) {
      case "supply":
        return "bg-green-900/30"
      case "supplyCollateral":
        return "bg-emerald-900/30"
      case "withdraw":
        return "bg-orange-900/30"
      case "withdrawCollateral":
        return "bg-yellow-900/30"
      case "borrow":
        return "bg-blue-900/30"
      case "repay":
        return "bg-red-900/30"
      default:
        return "bg-gray-900/30"
    }
  }, [])

  const getTransactionLabel = useCallback((type: string, asset: string) => {
    switch (type) {
      case "supplyCollateral":
        return `Supplied ${asset} as Collateral`
      case "withdrawCollateral":
        return `Withdrew ${asset} from Collateral`
      case "supply":
        return `Supplied ${asset} to Protocol`
      case "withdraw":
        return `Withdrew ${asset} from Protocol`
      case "borrow":
        return `Borrowed ${asset} from Protocol`
      case "repay":
        return `Repaid ${asset} Debt`
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
    console.log("🎨 Rendering transactions:", transactions.map(tx => `${tx.type} ${tx.amount} ${tx.asset}`).join(', '))
    console.log("🏷️ Transaction labels:", transactions.map(tx => getTransactionLabel(tx.type, tx.asset)).join(', '))
    return transactions.map((tx, index) => (
      <div key={`${tx.hash}-${tx.type}-${tx.amount}-${index}`} className="bg-[#252836] p-3 rounded-lg border border-green-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`${getTransactionBg(tx.type)} p-2 rounded-full`}>
                {getTransactionIcon(tx.type)}
              </div>
              {tx.asset === 'USDC' ? (
                <Image 
                  src="/usdc-icon.webp" 
                  alt="USDC" 
                  width={20} 
                  height={20} 
                  className="rounded-full"
                />
              ) : tx.asset === 'WETH' ? (
                <Image 
                  src="/weth-icon.png" 
                  alt="WETH" 
                  width={20} 
                  height={20} 
                  className="rounded-full"
                />
              ) : (
                <CryptoIcon symbol={tx.asset} size={20} />
              )}
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

  // Prevent hydration mismatches by ensuring consistent rendering
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
              <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
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
