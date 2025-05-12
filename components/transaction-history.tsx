"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useCompound } from "@/lib/compound-provider"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ArrowDownRight, ArrowUpRight, ArrowDownLeft, ArrowUpLeft, Clock } from "lucide-react"
import Image from "next/image"

export function TransactionHistory() {
  const { transactions } = useCompound()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "supply":
        return <ArrowUpRight className="h-4 w-4 text-green-500" />
      case "borrow":
        return <ArrowDownRight className="h-4 w-4 text-blue-500" />
      case "withdraw":
        return <ArrowDownLeft className="h-4 w-4 text-yellow-500" />
      case "repay":
        return <ArrowUpLeft className="h-4 w-4 text-purple-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getTransactionBg = (type: string) => {
    switch (type) {
      case "supply":
        return "bg-green-900/30"
      case "borrow":
        return "bg-blue-900/30"
      case "withdraw":
        return "bg-yellow-900/30"
      case "repay":
        return "bg-purple-900/30"
      default:
        return "bg-gray-900/30"
    }
  }

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case "supply":
        return "Supplied"
      case "borrow":
        return "Borrowed"
      case "withdraw":
        return "Withdrawn"
      case "repay":
        return "Repaid"
      default:
        return "Unknown"
    }
  }

  const getTransactionPrefix = (type: string) => {
    switch (type) {
      case "supply":
        return "+"
      case "borrow":
        return "+"
      case "withdraw":
        return "-"
      case "repay":
        return "-"
      default:
        return ""
    }
  }

  return (
    <div className="p-4 pb-24">
      <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
        <CardHeader>
          <CardTitle className="text-xl">Transaction History</CardTitle>
          <CardDescription className="text-gray-400">Your recent activities</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx, index) => (
                <div key={index} className="bg-[#252836] p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`${getTransactionBg(tx.type)} p-2 rounded-full`}>
                          {getTransactionIcon(tx.type)}
                        </div>
                        <Image
                          src={`/images/coins/${tx.asset.toLowerCase()}.png`}
                          alt={tx.asset}
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                      </div>
                      <div>
                        <div className="font-medium">
                          {getTransactionLabel(tx.type)} {tx.asset}
                        </div>
                        <div className="text-xs text-gray-400">{formatDate(tx.timestamp)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {getTransactionPrefix(tx.type)}
                        {formatCurrency(tx.amount, tx.asset)}
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
