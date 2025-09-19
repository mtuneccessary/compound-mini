"use client"

import { useEffect } from 'react'

export function ErrorSuppressionScript() {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    // Suppress hydration warnings for wallet extension scripts
    const suppressHydrationWarnings = () => {
      if (typeof document === 'undefined') return

      try {
        // Find all scripts injected by browser extensions
        const scripts = document.querySelectorAll('script[src*="chrome-extension"], script[src*="pageProvider"]')
        scripts.forEach(script => {
          if (script && script.parentNode) {
            // Mark extension scripts to suppress hydration warnings
            script.setAttribute('data-suppress-hydration-warning', 'true')
          }
        })

        // Also handle scripts with injected content
        const allScripts = document.querySelectorAll('script')
        allScripts.forEach(script => {
          const src = script.getAttribute('src') || ''
          if (src.includes('chrome-extension') || src.includes('pageProvider')) {
            script.setAttribute('data-suppress-hydration-warning', 'true')
          }
        })
      } catch (error) {
        console.warn('Error suppressing hydration warnings:', error)
      }
    }

    // Run immediately and after a short delay to catch dynamically injected scripts
    suppressHydrationWarnings()
    const timeoutId = setTimeout(suppressHydrationWarnings, 100)

    // More aggressive error suppression for wallet extensions
    const handleError = (event: ErrorEvent) => {
      const message = event.error?.message || event.message || ''
      const filename = event.filename || ''

      if (filename.includes('pageProvider.js') ||
          filename.includes('chrome-extension') ||
          message.includes('ethereum') ||
          message.includes('Cannot set property ethereum') ||
          message.includes('hydrat') ||
          message.includes('hydration')) {
        console.warn('Wallet extension error suppressed:', event.error)
        event.preventDefault()
        event.stopImmediatePropagation()
        return false
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const message = reason?.message || reason?.toString() || ''

      if (message.includes('ethereum') ||
          message.includes('Cannot set property ethereum') ||
          message.includes('hydrat') ||
          message.includes('hydration') ||
          reason?.code === 4001 ||
          message.includes('wallet must has at least one account')) {
        console.warn('Wallet extension promise rejection suppressed:', reason)
        event.preventDefault()
        event.stopImmediatePropagation()
        return false
      }
    }

    // Override console.error to filter extension errors
    const originalConsoleError = console.error
    console.error = (...args) => {
      const message = args.join(' ')
      if (message.includes('ethereum') ||
          message.includes('pageProvider.js') ||
          message.includes('Cannot set property ethereum') ||
          message.includes('chrome-extension') ||
          message.includes('hydrat') ||
          message.includes('hydration')) {
        console.warn('Console error from extension suppressed:', ...args)
        return
      }
      originalConsoleError.apply(console, args)
    }

    // Override window.onerror to catch more errors
    const originalOnError = window.onerror
    window.onerror = (message, source, lineno, colno, error) => {
      const errorMessage = message?.toString() || ''
      const sourceFile = source?.toString() || ''

      if (sourceFile.includes('pageProvider.js') ||
          sourceFile.includes('chrome-extension') ||
          errorMessage.includes('ethereum') ||
          errorMessage.includes('Cannot set property ethereum') ||
          errorMessage.includes('hydrat') ||
          errorMessage.includes('hydration')) {
        console.warn('Window error from extension suppressed:', { message, source, error })
        return true // Prevent default error handling
      }

      if (originalOnError) {
        return originalOnError(message, source, lineno, colno, error)
      }
      return false
    }

    // Override window.onunhandledrejection
    const originalOnUnhandledRejection = window.onunhandledrejection
    window.onunhandledrejection = (event) => {
      const reason = event.reason
      const message = reason?.message || reason?.toString() || ''

      if (message.includes('ethereum') ||
          message.includes('Cannot set property ethereum') ||
          message.includes('hydrat') ||
          message.includes('hydration') ||
          reason?.code === 4001) {
        console.warn('Unhandled rejection from extension suppressed:', reason)
        event.preventDefault()
        return
      }

      if (originalOnUnhandledRejection) {
        return originalOnUnhandledRejection(event)
      }
    }

    // Add event listeners with highest priority
    window.addEventListener('error', handleError, { capture: true, passive: true })
    window.addEventListener('unhandledrejection', handleUnhandledRejection, { capture: true, passive: true })

    // Monitor DOM changes for new extension scripts
    let observer: MutationObserver | null = null

    if (typeof document !== 'undefined') {
      try {
        observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element
                if (element.tagName === 'SCRIPT') {
                  const script = element as HTMLScriptElement
                  const src = script.getAttribute('src') || ''
                  if (src.includes('chrome-extension') || src.includes('pageProvider')) {
                    script.setAttribute('data-suppress-hydration-warning', 'true')
                  }
                }
              }
            })
          })
        })

        observer.observe(document.head, {
          childList: true,
          subtree: true
        })
      } catch (error) {
        console.warn('Error setting up mutation observer:', error)
      }
    }

    return () => {
      clearTimeout(timeoutId)
      if (typeof window !== 'undefined') {
        window.removeEventListener('error', handleError, true)
        window.removeEventListener('unhandledrejection', handleUnhandledRejection, true)
      }
      console.error = originalConsoleError
      window.onerror = originalOnError
      window.onunhandledrejection = originalOnUnhandledRejection
      if (observer) {
        observer.disconnect()
      }
    }
  }, [])

  return null
}
