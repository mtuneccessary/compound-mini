"use client"

import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Home,
  PiggyBank,
  ArrowDownRight,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

type NavigationKey =
  | "home"
  | "supply"
  | "withdraw"
  | "borrow"
  | "repay"
  | "history"

type NavigationItem = {
  key: NavigationKey
  label: string
  href: string
  icon: LucideIcon
}

const navigationItems: NavigationItem[] = [
  { key: "home", label: "Home", href: "/", icon: Home },
  { key: "supply", label: "Supply", href: "/supply", icon: PiggyBank },
  { key: "withdraw", label: "Withdraw", href: "/withdraw", icon: ArrowUpRight },
  { key: "borrow", label: "Borrow", href: "/borrow", icon: ArrowDownRight },
  { key: "repay", label: "Repay", href: "/repay", icon: ArrowDownLeft },
  { key: "history", label: "History", href: "/history", icon: Clock },
]

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()

  const getActiveTab = (): NavigationKey | "" => {
    if (pathname === "/") return "home"
    if (pathname === "/supply") return "supply"
    if (pathname === "/withdraw") return "withdraw"
    if (pathname === "/borrow") return "borrow"
    if (pathname === "/repay") return "repay"
    if (pathname === "/history") return "history"
    return ""
  }

  const activeTab = getActiveTab()

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-border bg-background p-2">
      {navigationItems.map((item) => {
        const Icon = item.icon
        const isActive = activeTab === item.key

        return (
          <Button
            key={item.key}
            variant="ghost"
            size="icon"
            className={cn(
              "flex h-16 w-16 flex-col items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200",
              isActive && "bg-primary text-primary-foreground"
            )}
            onClick={() => router.push(item.href)}
          >
            <Icon className="mb-1 h-5 w-5" />
            <span className="text-xs">{item.label}</span>
          </Button>
        )
      })}
    </div>
  )
}
