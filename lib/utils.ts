import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, symbol?: string): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  if (symbol) {
    return `${amount.toFixed(4)} ${symbol}`
  }

  return formatter.format(amount)
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function isTelegramEnv(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const w: any = window as any
    const ua = (navigator?.userAgent || '').toLowerCase()
    const hasTG = !!w?.Telegram?.WebApp
    const uaTelegram = ua.includes('telegram')
    const hasInitData = !!w?.Telegram?.WebApp?.initData || !!w?.Telegram?.WebApp?.initDataUnsafe?.query_id
    const platform = w?.Telegram?.WebApp?.platform
    const platformValid = typeof platform === 'string' && platform !== 'unknown'
    return !!(hasTG && (uaTelegram || hasInitData || platformValid))
  } catch {
    return false
  }
}
