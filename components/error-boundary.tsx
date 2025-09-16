"use client"

import { Component, ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Filter out wallet extension errors
    if (error.message?.includes('ethereum') || 
        error.message?.includes('wallet') ||
        error.message?.includes('pageProvider.js')) {
      console.warn('Wallet extension error caught by boundary:', error.message)
      return { hasError: false } // Don't show error UI for wallet issues
    }
    
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Filter out wallet extension errors
    if (error.message?.includes('ethereum') || 
        error.message?.includes('wallet') ||
        error.message?.includes('pageProvider.js')) {
      console.warn('Wallet extension error caught:', error.message)
      return
    }
    
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d0f14] text-white p-4">
          <Card className="bg-[#1a1d26] border-[#2a2d36] text-white w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-xl text-red-500 flex items-center gap-2">
                <AlertCircle className="h-6 w-6" /> Something went wrong.
              </CardTitle>
              <CardDescription className="text-gray-400">
                An unexpected error occurred. Please try refreshing the page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {this.state.error && (
                <div className="bg-red-900/20 border border-red-700/50 p-3 rounded-lg text-sm text-red-300 break-words">
                  <p className="font-semibold mb-1">Error Details:</p>
                  <p>{this.state.error.message}</p>
                </div>
              )}
              <button
                onClick={() => window.location.reload()}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Refresh Page
              </button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
