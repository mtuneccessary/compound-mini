import { SupplyForm } from "@/components/supply-form"
import { Navigation } from "@/components/navigation"

export default function SupplyPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-[#0d0f14]">
      <div className="w-full max-w-md">
        <SupplyForm />
        <Navigation />
      </div>
    </main>
  )
}
