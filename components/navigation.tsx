"use client"

import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Home, PiggyBank, ArrowDownRight, ArrowUpRight, ArrowDownLeft, Clock } from "lucide-react"

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()

  const getActiveTab = () => {
    if (pathname === "/") return "home"
    if (pathname === "/supply") return "supply"
    if (pathname === "/withdraw") return "withdraw"
    if (pathname === "/borrow") return "borrow"
    if (pathname === "/repay") return "repay"
    if (pathname === "/history") return "history"
    return ""
  }

  const activeTab = getActiveTab()

  const items = [
    { key: "home", label: "Home", icon: Home, href: "/" },
    { key: "supply", label: "Supply", icon: PiggyBank, href: "/supply" },
    { key: "withdraw", label: "Withdraw", icon: ArrowUpRight, href: "/withdraw" },
    { key: "borrow", label: "Borrow", icon: ArrowDownRight, href: "/borrow" },
    { key: "repay", label: "Repay", icon: ArrowDownLeft, href: "/repay" },
    { key: "history", label: "History", icon: Clock, href: "/history" },
  ] as const

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-2xl items-center justify-around gap-2">
        {items.map((item) => (
          <Button
            key={item.key}
            variant="ghost"
            size="icon"
            className={cn(
              "flex h-16 w-16 flex-col items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              activeTab === item.key
                ? "border-primary/60 bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80"
                : "hover:bg-muted hover:text-foreground"
            )}
            onClick={() => router.push(item.href)}
          >
            <item.icon className="mb-1 h-5 w-5" />
            <span className="text-xs">{item.label}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
