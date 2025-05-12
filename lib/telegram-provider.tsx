"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

interface TelegramWebApp {
  ready: () => void
  expand: () => void
  close: () => void
  showConfirm: (message: string) => Promise<boolean>
  MainButton: {
    text: string
    show: () => void
    hide: () => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
    enable: () => void
    disable: () => void
  }
  BackButton: {
    show: () => void
    hide: () => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
  }
  initData: string
  initDataUnsafe: {
    user?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
    }
  }
}

interface TelegramContextType {
  webApp: TelegramWebApp | null
  user: {
    id: number
    first_name: string
    last_name?: string
    username?: string
  } | null
  showConfirm: (message: string) => Promise<boolean>
}

const TelegramContext = createContext<TelegramContextType>({
  webApp: null,
  user: null,
  showConfirm: async () => false,
})

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null)
  const [user, setUser] = useState<TelegramContextType["user"]>(null)

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window !== "undefined") {
      // Access the Telegram WebApp API
      const tgWebApp = window.Telegram?.WebApp as TelegramWebApp

      if (tgWebApp) {
        // Initialize the WebApp
        tgWebApp.ready()
        tgWebApp.expand()

        // Set the WebApp in state
        setWebApp(tgWebApp)

        // Set user if available
        if (tgWebApp.initDataUnsafe?.user) {
          setUser(tgWebApp.initDataUnsafe.user)
        }
      } else {
        // Mock Telegram WebApp for development
        console.log("Telegram WebApp not found, using mock implementation")

        const mockWebApp: TelegramWebApp = {
          ready: () => console.log("WebApp ready"),
          expand: () => console.log("WebApp expanded"),
          close: () => console.log("WebApp closed"),
          showConfirm: async (message) => {
            return window.confirm(message)
          },
          MainButton: {
            text: "CONTINUE",
            show: () => console.log("MainButton shown"),
            hide: () => console.log("MainButton hidden"),
            onClick: (callback) => console.log("MainButton onClick set"),
            offClick: (callback) => console.log("MainButton offClick set"),
            enable: () => console.log("MainButton enabled"),
            disable: () => console.log("MainButton disabled"),
          },
          BackButton: {
            show: () => console.log("BackButton shown"),
            hide: () => console.log("BackButton hidden"),
            onClick: (callback) => console.log("BackButton onClick set"),
            offClick: (callback) => console.log("BackButton offClick set"),
          },
          initData: "",
          initDataUnsafe: {
            user: {
              id: 12345,
              first_name: "Test",
              last_name: "User",
              username: "testuser",
            },
          },
        }

        setWebApp(mockWebApp)
        setUser(mockWebApp.initDataUnsafe.user || null)
      }
    }
  }, [])

  const showConfirm = async (message: string): Promise<boolean> => {
    if (webApp) {
      return webApp.showConfirm(message)
    }
    return window.confirm(message)
  }

  return <TelegramContext.Provider value={{ webApp, user, showConfirm }}>{children}</TelegramContext.Provider>
}

export function useTelegram() {
  return useContext(TelegramContext)
}
