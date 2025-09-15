import { Dashboard } from "@/components/dashboard"
import { Navigation } from "@/components/navigation"
import { WelcomeMessage } from "@/components/welcome-message"
import { WalletConnect } from "@/components/wallet-connect"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-background bg-gradient-to-b from-background via-background/95 to-background/80">
      <div className="w-full max-w-md">
        <div className="flex justify-end p-4">
          <WalletConnect />
        </div>
        <Dashboard />
        <Navigation />
        <WelcomeMessage />
      </div>
    </main>
  )
}
