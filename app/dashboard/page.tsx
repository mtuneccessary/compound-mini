"use client"

import { Dashboard } from "@/components/dashboard"
import { Navigation } from "@/components/navigation"
import { WalletConnect } from "@/components/wallet-connect"
import { motion } from "framer-motion"

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-bg-primary">
      <div className="w-full max-w-md">
        {/* Header with Wallet Connect */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex justify-between items-center p-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
            <p className="text-sm text-text-tertiary">Your DeFi position overview</p>
          </div>
          <WalletConnect />
        </motion.div>
        
        {/* Full Dashboard with all metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Dashboard />
        </motion.div>
        
        {/* Bottom Navigation */}
        <Navigation />
      </div>
    </main>
  )
}
