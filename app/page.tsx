"use client"

import { MinimalHero } from "@/components/minimal-hero"
import { PrimaryActions } from "@/components/primary-actions"
import { Navigation } from "@/components/navigation"
import { WelcomeMessage } from "@/components/welcome-message"
import { WalletConnect } from "@/components/wallet-connect"
import { motion } from "framer-motion"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-bg-primary via-bg-primary to-bg-secondary/40 text-text-primary">
      <div className="w-full max-w-md px-4 pb-24 space-y-5">
        {/* Header with Wallet Connect */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="sticky top-0 z-20 pt-4"
        >
          <div className="rounded-xl border border-border-primary bg-bg-secondary/70 backdrop-blur supports-[backdrop-filter]:bg-bg-secondary/60 shadow-sm px-3 py-2 flex justify-end">
            <WalletConnect />
          </div>
        </motion.div>
        
        {/* Minimal Hero - Just the essentials */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="rounded-2xl border border-border-primary bg-bg-secondary/60 backdrop-blur shadow-sm p-4">
            <MinimalHero />
          </div>
        </motion.div>
        
        {/* Primary Actions - Only the most important actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="rounded-2xl border border-border-primary bg-bg-secondary/60 backdrop-blur shadow-sm p-4">
            <PrimaryActions />
          </div>
        </motion.div>
        
        {/* Bottom Navigation */}
        <Navigation />
        
        {/* Welcome Message (only shows on first visit) */}
        <WelcomeMessage />
      </div>
    </main>
  )
}
