"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ArrowUpRight, ArrowDownLeft, Clock, Loader2 } from "lucide-react"
import { CryptoIcon } from "./crypto-icon"
import { useAccount } from "wagmi"
import { publicClient, COMET_ADDRESS } from "@/lib/comet-onchain"

interface Transaction {
  type: "supply" | "withdraw" | "supplyCollateral" | "withdrawCollateral"
  asset: string
  amount: string
  timestamp: number
  hash: string
  user: string
}

const EVENT_TOPICS = {
  supplyCollateral: "0xfa56f7b24f17183d81894d3ac2ee654e3c26388d17a28dbd9549b8114304e1f4",
  withdrawCollateral: "0xd6d480d5b3068db003533b170d67561494d72e3bf9fa40a266471351ebba9e16",
  supply: "0xd1cf3d156d5f8f0d50f6c122ed609cec09d35c9b9fb3fff6ea0959134dae424e",
  withdraw: "0x9b1bfa7fa9ee420a16e124f794c35ac9f90472acc99140eb2f6447c714cad8eb"
}

export function TransactionHistory() {
  const { address, isConnected } = useAccount()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true)
      setError(null)

      try {
        // get current block and compute fromBlock
        const tip = await publicClient.getBlockNumber()
        const fromBlock = tip > BigInt(10000) ? tip - BigInt(10000) : BigInt(0)

        // fetch logs per event topic to avoid invalid-params on some RPCs
        const [supplyColLogs, withdrawColLogs, supplyLogs, withdrawLogs] = await Promise.all([
          publicClient.getLogs({ address: COMET_ADDRESS, fromBlock, toBlock: tip, topics: [EVENT_TOPICS.supplyCollateral] }),
          publicClient.getLogs({ address: COMET_ADDRESS, fromBlock, toBlock: tip, topics: [EVENT_TOPICS.withdrawCollateral] }),
          publicClient.getLogs({ address: COMET_ADDRESS, fromBlock, toBlock: tip, topics: [EVENT_TOPICS.supply] }),
          publicClient.getLogs({ address: COMET_ADDRESS, fromBlock, toBlock: tip, topics: [EVENT_TOPICS.withdraw] }),
        ])
        const logs = [...supplyColLogs, ...withdrawColLogs, ...supplyLogs, ...withdrawLogs]

        // parse logs
        const parsed: Transaction[] = []
        for (const log of logs) {
          const eventTopic = log.topics?.[0]
          if (!eventTopic) continue

          let type: Transaction["type"] = "supply"
          let asset = "UNKNOWN"
          let amount = "0"
          let user = "unknown"

          if (log.topics && log.topics.length >= 2) {
            user = ("0x" + log.topics[1].slice(26)) as `0x${string}`
          }

          if (eventTopic === EVENT_TOPICS.supplyCollateral) {
            type = "supplyCollateral"
            asset = "WETH"
            if (log.data && log.data !== "0x") amount = (Number(BigInt(log.data)) / 1e18).toFixed(6)
          } else if (eventTopic === EVENT_TOPICS.withdrawCollateral) {
            type = "withdrawCollateral"
            asset = "WETH"
            if (log.data && log.data !== "0x") amount = (Number(BigInt(log.data)) / 1e18).toFixed(6)
          } else if (eventTopic === EVENT_TOPICS.supply) {
            type = "supply"
            asset = "USDC"
            if (log.data && log.data !== "0x") amount = (Number(BigInt(log.data)) / 1e6).toFixed(2)
          } else if (eventTopic === EVENT_TOPICS.withdraw) {
            type = "withdraw"
            asset = "USDC"
            if (log.data && log.data !== "0x") amount = (Number(BigInt(log.data)) / 1e6).toFixed(2)
          }

          if (!log.blockNumber) continue
          if (!log.transactionHash) continue
          const block = await publicClient.getBlock({ blockNumber: log.blockNumber as bigint })
          const timestamp = Number(block.timestamp) * 1000

          parsed.push({ type, asset, amount, timestamp, hash: log.transactionHash!, user })
        }

        parsed.sort((a, b) => b.timestamp - a.timestamp)
        setTransactions(parsed)
      } catch (err: any) {
        const msg = err?.shortMessage || err?.message || "Failed to load transaction history"
        setError(msg)
        setTransactions([])
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [isConnected, address])

  if (!mounted) return null

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "supply":
      case "supplyCollateral":
        return <ArrowUpRight className="h-4 w-4 text-green-500" />
      case "withdraw":
      case "withdrawCollateral":
        return <ArrowDownLeft className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getTransactionBg = (type: string) => {
    switch (type) {
      case "supply":
      case "supplyCollateral":
        return "bg-green-900/30"
      case "withdraw":
      case "withdrawCollateral":
        return "bg-yellow-900/30"
      default:
        return "bg-gray-900/30"
    }
  }

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case "supplyCollateral":
        return "Supplied Collateral"
      case "withdrawCollateral":
        return "Withdrew Collateral"
      case "supply":
        return "Supplied Base"
      case "withdraw":
        return "Withdrew Base"
      default:
        return "Unknown Transaction"
    }
  }

  const getTransactionPrefix = (type: string) => {
    switch (type) {
      case "supply":
      case "supplyCollateral":
        return "+"
      case "withdraw":
      case "withdrawCollateral":
        return "-"
      default:
        return ""
    }
  }

  const isUserTransaction = (tx: Transaction) => {
    if (!address) return false
    return tx.user.toLowerCase() === address.toLowerCase()
  }

  const userTransactions = transactions.filter(isUserTransaction)
  const recentTransactions = transactions.slice(0, 10) // Show recent 10 for demo

  return (
    <div className="p-4 pb-24">
      <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
        <CardHeader>
          <CardTitle className="text-xl">Transaction History</CardTitle>
          <CardDescription className="text-gray-400">
            {!isConnected ? "Connect your wallet to see your transactions" : "Your recent activities"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-400">
              <Loader2 className="mx-auto h-8 w-8 mb-2 opacity-50 animate-spin" />
              <p>Loading transaction history...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-400">
              <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="mb-2">{error}</p>
              <p className="text-sm text-gray-500">Check console for details</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>No transactions found on this contract</p>
              <p className="text-sm mt-2">Try performing some supply/withdraw actions first</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* User's transactions */}
              {isConnected && userTransactions.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3 text-green-400">Your Transactions</h3>
                  <div className="space-y-3">
                    {userTransactions.map((tx) => (
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
                                {getTransactionLabel(tx.type)} ({tx.asset})
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
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent transactions on contract */}
              {isConnected && userTransactions.length === 0 && recentTransactions.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3 text-blue-400">Recent Contract Activity</h3>
                  <p className="text-sm text-gray-400 mb-3">No transactions found for your account. Here are recent transactions on the contract:</p>
                  <div className="space-y-3">
                    {recentTransactions.map((tx) => (
                      <div key={tx.hash} className="bg-[#252836] p-3 rounded-lg opacity-75">
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
                                {getTransactionLabel(tx.type)} ({tx.asset})
                              </div>
                              <div className="text-xs text-gray-400">
                                {formatDate(tx.timestamp / 1000)}
                              </div>
                              <div className="text-xs text-gray-500 font-mono">
                                {tx.user.slice(0, 6)}...{tx.user.slice(-4)}
                              </div>
                              <div className="text-xs text-gray-500 font-mono">
                                {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              {getTransactionPrefix(tx.type)}
                              {formatCurrency(parseFloat(tx.amount), tx.asset)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No transactions at all */}
              {isConnected && userTransactions.length === 0 && recentTransactions.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No transactions found</p>
                  <p className="text-sm mt-2">Be the first to perform a supply/withdraw action!</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
