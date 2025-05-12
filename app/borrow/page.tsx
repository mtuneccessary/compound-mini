import { BorrowForm } from "@/components/borrow-form"
import { Navigation } from "@/components/navigation"

export default function BorrowPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-[#0d0f14]">
      <div className="w-full max-w-md">
        <BorrowForm />
        <Navigation />
      </div>
    </main>
  )
}
