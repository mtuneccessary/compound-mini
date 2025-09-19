"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Network, 
  Wifi, 
  WifiOff, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  Copy,
  RefreshCw
} from "lucide-react"
import { useAccount, useChainId } from "wagmi"
import { getCurrentNetworkConfig, NetworkType, NETWORK_CONFIGS } from "@/lib/network-config"
import { motion } from "framer-motion"

interface NetworkSwitcherProps {
  className?: string
}

export function NetworkSwitcher({ className = "" }: NetworkSwitcherProps) {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const [mounted, setMounted] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const currentConfig = getCurrentNetworkConfig()
  const isCorrectNetwork = chainId === currentConfig.chainId

  useEffect(() => {
    setMounted(true)
  }, [])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const getNetworkStatus = () => {
    if (!isConnected) {
      return { 
        status: 'disconnected', 
        icon: WifiOff, 
        color: 'text-text-muted',
        bgColor: 'bg-bg-tertiary',
        message: 'Wallet not connected'
      }
    }
    
    if (!isCorrectNetwork) {
      return { 
        status: 'wrong-network', 
        icon: AlertCircle, 
        color: 'text-compound-warning-400',
        bgColor: 'bg-compound-warning-900/20',
        message: `Switch to ${currentConfig.name}`
      }
    }
    
    return { 
      status: 'connected', 
      icon: CheckCircle, 
      color: 'text-compound-success-400',
      bgColor: 'bg-compound-success-900/20',
      message: 'Connected to correct network'
    }
  }

  const networkStatus = getNetworkStatus()
  const StatusIcon = networkStatus.icon

  if (!mounted) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card className="compound-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="h-5 w-5 text-text-tertiary" />
              <CardTitle className="text-lg">Network Status</CardTitle>
            </div>
            <Badge 
              variant="outline" 
              className={`${networkStatus.bgColor} ${networkStatus.color} border-current`}
            >
              {currentConfig.isTestnet ? 'Testnet' : 'Mainnet Fork'}
            </Badge>
          </div>
          <CardDescription className="text-text-tertiary">
            Current network configuration and connection status
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Network Status */}
          <div className={`${networkStatus.bgColor} p-3 rounded-lg border border-current/20`}>
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon className={`h-4 w-4 ${networkStatus.color}`} />
              <span className={`text-sm font-medium ${networkStatus.color}`}>
                {networkStatus.message}
              </span>
            </div>
            <div className="text-xs text-text-tertiary">
              Expected: {currentConfig.name} (Chain ID: {currentConfig.chainId})
              {isConnected && (
                <span className="ml-2">
                  • Connected: {chainId}
                </span>
              )}
            </div>
          </div>

          {/* Network Details */}
          <div className="bg-bg-tertiary p-3 rounded-lg">
            <div className="text-sm font-medium text-text-primary mb-2">
              {currentConfig.name}
            </div>
            <div className="text-xs text-text-tertiary space-y-1">
              <div>Chain ID: {currentConfig.chainId}</div>
              <div>RPC: {currentConfig.rpcUrl}</div>
              <div>Explorer: {currentConfig.explorerUrl}</div>
              <div className="mt-2 text-text-muted">
                {currentConfig.description}
              </div>
            </div>
          </div>

          {/* Contract Addresses */}
          <div className="bg-bg-tertiary p-3 rounded-lg">
            <div className="text-sm font-medium text-text-primary mb-2">
              Contract Addresses
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-tertiary">Comet:</span>
                <div className="flex items-center gap-1">
                  <code className="text-text-primary font-mono">
                    {currentConfig.cometAddress.slice(0, 6)}...{currentConfig.cometAddress.slice(-4)}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 text-text-tertiary hover:text-text-primary"
                    onClick={() => copyToClipboard(currentConfig.cometAddress)}
                  >
                    {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-text-tertiary">WETH:</span>
                <div className="flex items-center gap-1">
                  <code className="text-text-primary font-mono">
                    {currentConfig.wethAddress.slice(0, 6)}...{currentConfig.wethAddress.slice(-4)}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 text-text-tertiary hover:text-text-primary"
                    onClick={() => copyToClipboard(currentConfig.wethAddress)}
                  >
                    {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-text-tertiary">USDC:</span>
                <div className="flex items-center gap-1">
                  <code className="text-text-primary font-mono">
                    {currentConfig.usdcAddress.slice(0, 6)}...{currentConfig.usdcAddress.slice(-4)}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 text-text-tertiary hover:text-text-primary"
                    onClick={() => copyToClipboard(currentConfig.usdcAddress)}
                  >
                    {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Network Switching Instructions */}
          {!isCorrectNetwork && isConnected && (
            <div className="bg-compound-warning-900/20 border border-compound-warning-700/30 p-3 rounded-lg">
              <div className="text-sm text-compound-warning-400 mb-2">
                ⚠️ Wrong Network
              </div>
              <div className="text-xs text-text-tertiary">
                Please switch your wallet to <strong>{currentConfig.name}</strong> (Chain ID: {currentConfig.chainId})
                to use this application.
              </div>
            </div>
          )}

          {/* Environment Info */}
          <div className="bg-bg-tertiary p-3 rounded-lg">
            <div className="text-xs text-text-muted text-center">
              Network: {process.env.NEXT_PUBLIC_NETWORK || 'local'} • 
              Environment: {process.env.NODE_ENV || 'development'}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
