"use client"

import { useAccount } from "wagmi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  PiggyBank, 
  ArrowDownLeft,
  Clock,
  ExternalLink,
  TrendingUp
} from "lucide-react"
import { useState, useEffect } from "react"
import Image from "next/image"

interface ActivityItem {
  id: string
  type: 'supply' | 'withdraw' | 'borrow' | 'repay'
  asset: string
  amount: string
  timestamp: number
  status: 'completed' | 'pending' | 'failed'
  txHash?: string
}

export function RecentActivity() {
  const { address, isConnected } = useAccount()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isConnected && address) {
      loadRecentActivity()
    }
  }, [isConnected, address])

  const loadRecentActivity = async () => {
    setLoading(true)
    try {
      // In a real app, you'd fetch from a transaction history API
      // For now, we'll show some mock data or empty state
      const mockActivities: ActivityItem[] = [
        // You could load from localStorage or an API here
      ]
      setActivities(mockActivities)
    } catch (error) {
      console.error("Error loading recent activity:", error)
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'supply':
        return <PiggyBank className="h-4 w-4" />
      case 'withdraw':
        return <ArrowUpRight className="h-4 w-4" />
      case 'borrow':
        return <ArrowDownRight className="h-4 w-4" />
      case 'repay':
        return <ArrowDownLeft className="h-4 w-4" />
      default:
        return <TrendingUp className="h-4 w-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'supply':
        return 'text-green-400'
      case 'withdraw':
        return 'text-blue-400'
      case 'borrow':
        return 'text-yellow-400'
      case 'repay':
        return 'text-purple-400'
      default:
        return 'text-gray-400'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return { text: 'Completed', variant: 'default' as const }
      case 'pending':
        return { text: 'Pending', variant: 'secondary' as const }
      case 'failed':
        return { text: 'Failed', variant: 'destructive' as const }
      default:
        return { text: 'Unknown', variant: 'outline' as const }
    }
  }

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  if (!isConnected) {
    return null // Don't show recent activity if wallet not connected
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 pb-4">
      <Card className="bg-[#1a1d26] border-[#2a2d36] text-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = "/history"}
              className="text-blue-400 hover:text-blue-300"
            >
              View All
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-6">
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400 text-sm">Loading activity...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Recent Activity</h3>
              <p className="text-gray-400 text-sm mb-4">
                Your recent DeFi transactions will appear here.
              </p>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.href = "/supply"}
                  className="w-full"
                >
                  <PiggyBank className="h-4 w-4 mr-2" />
                  Start by Supplying
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => window.location.href = "/history"}
                  className="w-full text-gray-400"
                >
                  View Transaction History
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 3).map((activity) => (
                <div 
                  key={activity.id}
                  className="flex items-center justify-between p-3 bg-[#252836] rounded-lg hover:bg-[#2a2d36] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gray-600/20 ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">{activity.type}</span>
                        <Badge 
                          variant={getStatusBadge(activity.status).variant}
                          className="text-xs"
                        >
                          {getStatusBadge(activity.status).text}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>{activity.amount} {activity.asset}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(activity.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                  {activity.txHash && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`https://etherscan.io/tx/${activity.txHash}`, '_blank')}
                      className="p-1"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              {activities.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = "/history"}
                  className="w-full text-gray-400 hover:text-white"
                >
                  View {activities.length - 3} more transactions
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
