import { WithdrawForm } from "@/components/withdraw-form"
import { Navigation } from "@/components/navigation"

export default function WithdrawPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-[#0d0f14]">
      <div className="w-full max-w-md">
        <WithdrawForm />
        <Navigation />
      </div>
    </main>
  )
}
