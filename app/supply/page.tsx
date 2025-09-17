"use client"

import { SupplyForm } from "@/components/supply-form"
import { Navigation } from "@/components/navigation"
import { WalletConnect } from "@/components/wallet-connect"
import { motion } from "framer-motion"

export default function SupplyPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-[#0d0f14]">
      <div className="w-full max-w-md">
        {/* Header with Wallet Connect */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex justify-between items-center p-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-white">Supply WETH</h1>
            <p className="text-sm text-gray-400">Earn interest on your WETH</p>
          </div>
          <WalletConnect />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <SupplyForm />
        </motion.div>
        <Navigation />
      </div>
    </main>
  )
}
