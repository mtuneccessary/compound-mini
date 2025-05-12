"use client"

import { useState, useEffect } from "react"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type FeedbackType = "success" | "error" | "loading" | null

interface TransactionFeedbackProps {
  type: FeedbackType
  message: string
  onDismiss?: () => void
  autoHide?: boolean
  duration?: number
}

export function TransactionFeedback({
  type,
  message,
  onDismiss,
  autoHide = true,
  duration = 3000,
}: TransactionFeedbackProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (autoHide && type !== "loading") {
      const timer = setTimeout(() => {
        setIsVisible(false)
        if (onDismiss) setTimeout(onDismiss, 300)
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [autoHide, duration, onDismiss, type])

  if (!type) return null

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "loading":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return null
    }
  }

  const getBgColor = () => {
    switch (type) {
      case "success":
        return "bg-green-900/20 border-green-700/50"
      case "error":
        return "bg-red-900/20 border-red-700/50"
      case "loading":
        return "bg-blue-900/20 border-blue-700/50"
      default:
        return "bg-[#252836] border-[#2a2d36]"
    }
  }

  return (
    <div
      className={cn(
        "fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center p-3 rounded-lg border shadow-lg transition-all duration-300 transform max-w-md w-[90%]",
        getBgColor(),
        isVisible ? "opacity-100" : "opacity-0 translate-y-2",
      )}
    >
      <div className="mr-3">{getIcon()}</div>
      <div className="flex-1 text-sm">{message}</div>
    </div>
  )
}

export function useTransactionFeedback() {
  const [feedback, setFeedback] = useState<Omit<TransactionFeedbackProps, "onDismiss"> | null>(null)

  const showFeedback = (props: Omit<TransactionFeedbackProps, "onDismiss">) => {
    setFeedback(props)
  }

  const clearFeedback = () => {
    setFeedback(null)
  }

  const FeedbackContainer = () => <>{feedback && <TransactionFeedback {...feedback} onDismiss={clearFeedback} />}</>

  return { showFeedback, clearFeedback, FeedbackContainer }
}
