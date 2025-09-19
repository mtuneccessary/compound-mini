"use client"

import { SupplyForm } from "@/components/supply-form"
import { Navigation } from "@/components/navigation"
import { WalletConnect } from "@/components/wallet-connect"
import { motion } from "framer-motion"

export default function SupplyPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-bg-primary via-bg-primary to-bg-secondary/40 text-text-primary">
      <div className="w-full max-w-md px-4 pb-24 space-y-5">
        {/* Header with Wallet Connect */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="pt-4"
        >
          <div className="rounded-xl border border-border-primary bg-bg-secondary/70 backdrop-blur supports-[backdrop-filter]:bg-bg-secondary/60 shadow-sm px-3 py-2 flex justify-end">
            <WalletConnect />
          </div>
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
