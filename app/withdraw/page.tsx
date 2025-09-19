import { WithdrawForm } from "@/components/withdraw-form"
import { Navigation } from "@/components/navigation"
import { WalletConnect } from "@/components/wallet-connect"

export default function WithdrawPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-bg-primary via-bg-primary to-bg-secondary/40 text-text-primary">
      <div className="w-full max-w-md px-4 pb-24 space-y-5">
        {/* Header with Wallet Connect */}
        <div className="pt-4">
          <div className="rounded-xl border border-border-primary bg-bg-secondary/70 backdrop-blur supports-[backdrop-filter]:bg-bg-secondary/60 shadow-sm px-3 py-2 flex justify-end">
            <WalletConnect />
          </div>
        </div>
        
        <WithdrawForm />
        <Navigation />
      </div>
    </main>
  )
}
