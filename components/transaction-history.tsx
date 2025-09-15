"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ArrowUpRight, ArrowDownLeft, Clock, Loader2, RefreshCw } from "lucide-react"
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

export function TransactionHistory() {
  const { address, isConnected } = useAccount()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchTransactions = async () => {
    if (!mounted || !isConnected) return

    console.log("🚀 Starting transaction fetch...")
    setLoading(true)
    setError(null)

    try {
      // Get current block
      const currentBlock = await publicClient.getBlockNumber()
      console.log("📦 Current block:", currentBlock.toString())
      
      // Look back 100 blocks (reduced for performance)
      const fromBlock = currentBlock > BigInt(100) ? currentBlock - BigInt(100) : BigInt(0)
      console.log("📦 From block:", fromBlock.toString())

      const userTransactions: Transaction[] = []
      
      // Get recent blocks and check for user transactions
      for (let blockNum = currentBlock; blockNum >= fromBlock && blockNum > BigInt(0); blockNum--) {
        try {
          const block = await publicClient.getBlock({ blockNumber: blockNum, includeTransactions: true })
          
          if (block.transactions) {
            for (const tx of block.transactions) {
              if (typeof tx === 'object' && tx.from && tx.to) {
                // Check if this is a transaction from our user to the Comet contract
                if (tx.from.toLowerCase() === address?.toLowerCase() && 
                    tx.to.toLowerCase() === COMET_ADDRESS.toLowerCase()) {
                  
                  // Get transaction receipt to see if it was successful
                  try {
                    const receipt = await publicClient.getTransactionReceipt({ hash: tx.hash })
                    
                    if (receipt.status === 'success') {
                      // Parse transaction data to determine type and amount
                      let type: Transaction['type'] = 'supply'
                      let asset = 'USDC'
                      let amount = '0'

                      // Analyze the transaction receipt logs to determine the actual operation
                      if (receipt.logs && receipt.logs.length > 0) {
                        console.log(`🔍 Analyzing logs for tx ${tx.hash}:`, receipt.logs.length, 'logs')
                        
                        // Look for specific event signatures in the logs
                        for (const log of receipt.logs) {
                          if (log.topics && log.topics.length >= 1) {
                            const eventSignature = log.topics[0]
                            console.log(`🔍 Event signature: ${eventSignature}`)
                            
                            // Compound V3 event signatures
                            if (eventSignature === '0xd1cf3d156d5f8f0d50f6c122ed609cec09d35c9b9fb3fff6ea0959134dae424e') {
                              // Supply event
                              type = 'supply'
                              asset = 'USDC'
                              if (log.data && log.data !== '0x') {
                                const amountBigInt = BigInt(log.data)
                                amount = (Number(amountBigInt) / 1e6).toFixed(2)
                                console.log(`💰 Supply event: ${amountBigInt.toString()} -> ${amount} USDC`)
                              }
                              break
                            } else if (eventSignature === '0x9b1bfa7fa9ee420a16e124f794c35ac9f90472acc99140eb2f6447c714cad8eb') {
                              // Withdraw event
                              type = 'withdraw'
                              asset = 'USDC'
                              if (log.data && log.data !== '0x') {
                                const amountBigInt = BigInt(log.data)
                                amount = (Number(amountBigInt) / 1e6).toFixed(2)
                                console.log(`💰 Withdraw event: ${amountBigInt.toString()} -> ${amount} USDC`)
                              }
                              break
                            } else if (eventSignature === '0xfa56f7b24f17183d81894d3ac2ee654e3c26388d17a28dbd9549b8114304e1f4') {
                              // SupplyCollateral event
                              type = 'supplyCollateral'
                              asset = 'WETH'
                              if (log.data && log.data !== '0x') {
                                const amountBigInt = BigInt(log.data)
                                amount = (Number(amountBigInt) / 1e18).toFixed(6)
                                console.log(`�� SupplyCollateral event: ${amountBigInt.toString()} -> ${amount} WETH`)
                              }
                              break
                            } else if (eventSignature === '0xd6d480d5b3068db003533b170d67561494d72e3bf9fa40a266471351ebba9e16') {
                              // WithdrawCollateral event
                              type = 'withdrawCollateral'
                              asset = 'WETH'
                              if (log.data && log.data !== '0x') {
                                const amountBigInt = BigInt(log.data)
                                amount = (Number(amountBigInt) / 1e18).toFixed(6)
                                console.log(`💰 WithdrawCollateral event: ${amountBigInt.toString()} -> ${amount} WETH`)
                              }
                              break
                            }
                          }
                        }
                        
                        // If no specific event found, try to extract from Transfer events
                        if (type === 'supply' && amount === '0') {
                          console.log(`🔍 No specific event found, checking Transfer events...`)
                          for (const log of receipt.logs) {
                            if (log.topics && log.topics.length >= 3) {
                              const eventSignature = log.topics[0]
                              // Transfer event signature: 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
                              if (eventSignature === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
                                const amountHex = log.data
                                if (amountHex && amountHex !== '0x') {
                                  const amountBigInt = BigInt(amountHex)
                                  // Determine if it's USDC (6 decimals) or WETH (18 decimals) based on token address
                                  const tokenAddress = log.address.toLowerCase()
                                  if (tokenAddress === '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48') { // USDC
                                    amount = (Number(amountBigInt) / 1e6).toFixed(2)
                                    asset = 'USDC'
                                    console.log(`💰 Transfer amount from log: ${amountBigInt.toString()} -> ${amount} ${asset}`)
                                  } else if (tokenAddress === '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2') { // WETH
                                    amount = (Number(amountBigInt) / 1e18).toFixed(6)
                                    asset = 'WETH'
                                    console.log(`💰 Transfer amount from log: ${amountBigInt.toString()} -> ${amount} ${asset}`)
                                  }
                                  break
                                }
                              }
                            }
                          }
                        }
                      }

                      userTransactions.push({
                        type,
                        asset,
                        amount,
                        timestamp: Number(block.timestamp) * 1000,
                        hash: tx.hash,
                        user: tx.from
                      })

                      console.log("✅ Found transaction:", { type, asset, amount, hash: tx.hash })
                    }
                  } catch (receiptError) {
                    console.warn("⚠️ Could not get receipt for tx:", tx.hash)
                  }
                }
              }
            }
          }
        } catch (blockError) {
          console.warn("⚠️ Error processing block:", blockNum.toString())
        }
      }

      // Sort by timestamp (newest first)
      userTransactions.sort((a, b) => b.timestamp - a.timestamp)
      
      console.log("📊 Total transactions found:", userTransactions.length)
      setTransactions(userTransactions)

    } catch (err: any) {
      console.error("❌ Error fetching transactions:", err)
      setError(err.message || "Failed to load transaction history")
    } finally {
      setLoading(false)
      console.log("🏁 Transaction fetch completed")
    }
  }

  useEffect(() => {
    if (mounted && isConnected) {
      fetchTransactions()
    }
  }, [mounted, isConnected, address])

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
        return <Clock className="h-4 w-4 text-muted-foreground" />
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
        return "bg-muted/60"
    }
  }

  const getTransactionLabel = (type: string, asset: string) => {
    switch (type) {
      case "supplyCollateral":
        return `Supplied ${asset} as Collateral`
      case "withdrawCollateral":
        return `Withdrew ${asset} Collateral`
      case "supply":
        return `Supplied ${asset}`
      case "withdraw":
        return `Withdrew ${asset}`
      default:
        return `Unknown ${asset} Transaction`
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

  const getAssetDisplayName = (asset: string) => {
    switch (asset) {
      case "USDC":
        return "USDC"
      case "WETH":
        return "WETH"
      default:
        return asset
    }
  }

  return (
    <div className="p-4 pb-24">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Transaction History</CardTitle>
              <CardDescription>
                {!isConnected ? "Connect your wallet to see your transactions" : "Your recent Compound V3 activities"}
              </CardDescription>
            </div>
            {isConnected && (
              <button
                onClick={fetchTransactions}
                disabled={loading}
                className="rounded-lg p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              <Loader2 className="mx-auto h-8 w-8 mb-2 opacity-50 animate-spin" />
              <p>Loading transaction history...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">
              <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="mb-2">{error}</p>
              <button
                onClick={fetchTransactions}
                className="rounded px-2 text-sm text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Try again
              </button>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>No transactions found</p>
              <p className="text-sm mt-2">Perform some supply/withdraw actions to see them here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.hash} className="rounded-lg border border-border/60 bg-muted/40 p-3">
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
                        <div className="text-xs text-muted-foreground">
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
                      <div className="text-xs text-muted-foreground">
                        {getAssetDisplayName(tx.asset)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
