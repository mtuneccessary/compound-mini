import { Dashboard } from "@/components/dashboard"
import { Navigation } from "@/components/navigation"
import { WelcomeMessage } from "@/components/welcome-message"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-[#0d0f14]">
      <div className="w-full max-w-md">
        <Dashboard />
        <Navigation />
        <WelcomeMessage />
      </div>
    </main>
  )
}
