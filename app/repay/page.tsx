import { RepayForm } from "@/components/repay-form"
import { Navigation } from "@/components/navigation"
import { WalletConnect } from "@/components/wallet-connect"

export default function RepayPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-[#0d0f14]">
      <div className="w-full max-w-md">
        {/* Header with Wallet Connect */}
        <div className="flex justify-between items-center p-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Repay USDC</h1>
            <p className="text-sm text-gray-400">Repay your USDC debt to reduce interest</p>
          </div>
          <WalletConnect />
        </div>
        
        <RepayForm />
        <Navigation />
      </div>
    </main>
  )
}
