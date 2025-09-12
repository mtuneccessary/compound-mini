"use client"

import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
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

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#1a1d26] border-t border-[#2a2d36] p-2 flex justify-around">
      <Button
        variant="ghost"
        size="icon"
        className={`flex flex-col items-center justify-center h-16 w-16 rounded-lg ${
          activeTab === "home" ? "bg-[#252836] text-white" : "text-gray-400"
        }`}
        onClick={() => router.push("/")}
      >
        <Home className="h-5 w-5 mb-1" />
        <span className="text-xs">Home</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className={`flex flex-col items-center justify-center h-16 w-16 rounded-lg ${
          activeTab === "supply" ? "bg-[#252836] text-white" : "text-gray-400"
        }`}
        onClick={() => router.push("/supply")}
      >
        <PiggyBank className="h-5 w-5 mb-1" />
        <span className="text-xs">Supply</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className={`flex flex-col items-center justify-center h-16 w-16 rounded-lg ${
          activeTab === "withdraw" ? "bg-[#252836] text-white" : "text-gray-400"
        }`}
        onClick={() => router.push("/withdraw")}
      >
        <ArrowUpRight className="h-5 w-5 mb-1" />
        <span className="text-xs">Withdraw</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className={`flex flex-col items-center justify-center h-16 w-16 rounded-lg ${
          activeTab === "borrow" ? "bg-[#252836] text-white" : "text-gray-400"
        }`}
        onClick={() => router.push("/borrow")}
      >
        <ArrowDownRight className="h-5 w-5 mb-1" />
        <span className="text-xs">Borrow</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className={`flex flex-col items-center justify-center h-16 w-16 rounded-lg ${
          activeTab === "repay" ? "bg-[#252836] text-white" : "text-gray-400"
        }`}
        onClick={() => router.push("/repay")}
      >
        <ArrowDownLeft className="h-5 w-5 mb-1" />
        <span className="text-xs">Repay</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className={`flex flex-col items-center justify-center h-16 w-16 rounded-lg ${
          activeTab === "history" ? "bg-[#252836] text-white" : "text-gray-400"
        }`}
        onClick={() => router.push("/history")}
      >
        <Clock className="h-5 w-5 mb-1" />
        <span className="text-xs">History</span>
      </Button>
    </div>
  )
}
