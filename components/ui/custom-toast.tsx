"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const toastVariants = cva(
  "fixed z-50 flex items-center justify-between p-4 rounded-lg shadow-lg transition-all duration-300 transform",
  {
    variants: {
      variant: {
        default: "bg-[#252836] text-white border border-[#2a2d36]",
        success: "bg-green-900/80 text-white border border-green-700",
        destructive: "bg-red-900/80 text-white border border-red-700",
      },
      position: {
        top: "top-4 left-1/2 -translate-x-1/2",
        bottom: "bottom-20 left-1/2 -translate-x-1/2", // Positioned above the navigation
      },
    },
    defaultVariants: {
      variant: "default",
      position: "top",
    },
  },
)

export interface ToastProps extends VariantProps<typeof toastVariants> {
  title: string
  description?: string
  duration?: number
  onClose?: () => void
}

export function CustomToast({ title, description, variant, position, duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      if (onClose) setTimeout(onClose, 300) // Allow time for exit animation
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  return (
    <div
      className={cn(
        toastVariants({ variant, position }),
        "max-w-md w-[90%]",
        isVisible ? "opacity-100" : "opacity-0 translate-y-2",
      )}
      role="alert"
    >
      <div className="flex-1">
        <h3 className="font-medium">{title}</h3>
        {description && <p className="text-sm opacity-90">{description}</p>}
      </div>
      <button
        onClick={() => {
          setIsVisible(false)
          if (onClose) setTimeout(onClose, 300)
        }}
        className="ml-4 p-1 rounded-full hover:bg-black/20"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function useCustomToast() {
  const [toasts, setToasts] = useState<(ToastProps & { id: string })[]>([])

  const toast = (props: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { ...props, id }])
    return id
  }

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  const ToastContainer = () => (
    <>
      {toasts.map((t) => (
        <CustomToast key={t.id} {...t} onClose={() => dismiss(t.id)} />
      ))}
    </>
  )

  return { toast, dismiss, ToastContainer }
}
