// Add TypeScript declarations for Telegram WebApp
declare global {
  interface Window {
    Telegram: {
      WebApp: any
    }
  }
}

export {}
