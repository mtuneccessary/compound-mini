"use client"

import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Home, PiggyBank, ArrowDownRight, ArrowUpRight, ArrowDownLeft, BarChart3, Clock } from "lucide-react"
import { motion } from "framer-motion"

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()

  const getActiveTab = () => {
    if (pathname === "/") return "home"
    if (pathname === "/dashboard") return "dashboard"
    if (pathname === "/supply") return "supply"
    if (pathname === "/withdraw") return "withdraw"
    if (pathname === "/borrow") return "borrow"
    if (pathname === "/repay") return "repay"
    if (pathname === "/history") return "history"
    return ""
  }

  const activeTab = getActiveTab()

      return (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-0 left-0 right-0 bg-bg-secondary/95 backdrop-blur-sm border-t border-border-primary p-2 flex justify-around max-w-md mx-auto"
        >
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <Button
          variant="ghost"
          size="icon"
          className={`flex flex-col items-center justify-center h-12 w-12 rounded-lg transition-all duration-200 ${
            activeTab === "home" 
              ? "bg-compound-primary-600 text-white shadow-lg compound-shadow-colored" 
              : "text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary"
          }`}
          onClick={() => router.push("/")}
        >
          <Home className="h-4 w-4 mb-1" />
          <span className="text-xs font-medium">Home</span>
        </Button>
      </motion.div>

      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <Button
          variant="ghost"
          size="icon"
          className={`flex flex-col items-center justify-center h-12 w-12 rounded-lg transition-all duration-200 ${
            activeTab === "supply" 
              ? "bg-supply text-white shadow-lg compound-shadow-colored" 
              : "text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary"
          }`}
          onClick={() => router.push("/supply")}
        >
          <PiggyBank className="h-4 w-4 mb-1" />
          <span className="text-xs font-medium">Supply</span>
        </Button>
      </motion.div>

      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <Button
          variant="ghost"
          size="icon"
          className={`flex flex-col items-center justify-center h-12 w-12 rounded-lg transition-all duration-200 ${
            activeTab === "withdraw" 
              ? "bg-withdraw text-white shadow-lg compound-shadow-colored-blue" 
              : "text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary"
          }`}
          onClick={() => router.push("/withdraw")}
        >
          <ArrowUpRight className="h-4 w-4 mb-1" />
          <span className="text-xs font-medium">Withdraw</span>
        </Button>
      </motion.div>

      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <Button
          variant="ghost"
          size="icon"
          className={`flex flex-col items-center justify-center h-12 w-12 rounded-lg transition-all duration-200 ${
            activeTab === "borrow" 
              ? "bg-borrow text-white shadow-lg" 
              : "text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary"
          }`}
          onClick={() => router.push("/borrow")}
        >
          <ArrowDownRight className="h-4 w-4 mb-1" />
          <span className="text-xs font-medium">Borrow</span>
        </Button>
      </motion.div>

      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <Button
          variant="ghost"
          size="icon"
          className={`flex flex-col items-center justify-center h-12 w-12 rounded-lg transition-all duration-200 ${
            activeTab === "repay" 
              ? "bg-repay text-white shadow-lg" 
              : "text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary"
          }`}
          onClick={() => router.push("/repay")}
        >
          <ArrowDownLeft className="h-4 w-4 mb-1" />
          <span className="text-xs font-medium">Repay</span>
        </Button>
      </motion.div>

      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <Button
          variant="ghost"
          size="icon"
          className={`flex flex-col items-center justify-center h-12 w-12 rounded-lg transition-all duration-200 ${
            activeTab === "dashboard" 
              ? "bg-compound-accent-600 text-white shadow-lg compound-shadow-colored-purple" 
              : "text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary"
          }`}
          onClick={() => router.push("/dashboard")}
        >
          <BarChart3 className="h-4 w-4 mb-1" />
          <span className="text-xs font-medium">Dashboard</span>
        </Button>
      </motion.div>
        </motion.div>
      )
    }
