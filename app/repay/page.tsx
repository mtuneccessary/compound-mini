import { RepayForm } from "@/components/repay-form"
import { Navigation } from "@/components/navigation"

export default function RepayPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-[#0d0f14]">
      <div className="w-full max-w-md">
        <RepayForm />
        <Navigation />
      </div>
    </main>
  )
}
