import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { TelegramProvider } from "@/lib/telegram-provider"
import { CompoundProvider } from "@/lib/compound-provider"
import { Toaster } from "@/components/ui/toaster"
import { FeedbackProvider } from "@/lib/feedback-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Compound Finance",
  description: "DeFi lending and borrowing on Telegram",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TelegramProvider>
          <CompoundProvider>
            <FeedbackProvider>
              {children}
              <Toaster />
            </FeedbackProvider>
          </CompoundProvider>
        </TelegramProvider>
      </body>
    </html>
  )
}
