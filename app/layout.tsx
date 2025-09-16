import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { TelegramProvider } from "@/lib/telegram-provider"
import { Toaster } from "@/components/ui/toaster"
import { FeedbackProvider } from "@/lib/feedback-provider"
import { AppWagmiProvider } from "@/lib/wagmi-provider"
import { ErrorBoundary } from "@/components/error-boundary"
import { ErrorSuppressionScript } from "@/components/error-suppression-script"

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ErrorBoundary>
          <ErrorSuppressionScript />
          <AppWagmiProvider>
            <TelegramProvider>
              <FeedbackProvider>
                {children}
                <Toaster />
              </FeedbackProvider>
            </TelegramProvider>
          </AppWagmiProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
