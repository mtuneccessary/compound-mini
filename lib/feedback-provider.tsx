"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface FeedbackContextType {
  showSuccess: (title: string, description?: string) => void
  showError: (title: string, description?: string) => void
  showLoading: (message: string) => void
  hideLoading: () => void
  feedback: {
    type: "success" | "error" | "loading" | null
    title: string
    message: string
    visible: boolean
  }
}

const initialFeedback = {
  type: null,
  title: "",
  message: "",
  visible: false,
}

const FeedbackContext = createContext<FeedbackContextType>({
  showSuccess: () => {},
  showError: () => {},
  showLoading: () => {},
  hideLoading: () => {},
  feedback: initialFeedback,
})

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [feedback, setFeedback] = useState(initialFeedback)

  const showSuccess = (title: string, description?: string) => {
    setFeedback({
      type: "success",
      title,
      message: description || title,
      visible: true,
    })

    // Auto-hide success messages after 3 seconds
    setTimeout(() => {
      setFeedback((prev) => ({ ...prev, visible: false }))
    }, 3000)
  }

  const showError = (title: string, description?: string) => {
    setFeedback({
      type: "error",
      title,
      message: description || title,
      visible: true,
    })

    // Auto-hide error messages after 3 seconds
    setTimeout(() => {
      setFeedback((prev) => ({ ...prev, visible: false }))
    }, 3000)
  }

  const showLoading = (message: string) => {
    setFeedback({
      type: "loading",
      title: "Loading",
      message,
      visible: true,
    })
  }

  const hideLoading = () => {
    setFeedback((prev) => ({ ...prev, visible: false }))
  }

  return (
    <FeedbackContext.Provider value={{ showSuccess, showError, showLoading, hideLoading, feedback }}>
      {children}
      {feedback.visible && (
        <div
          className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center p-3 rounded-lg border shadow-lg max-w-md w-[90%] ${
            feedback.type === "success"
              ? "bg-green-900/20 border-green-700/50"
              : feedback.type === "error"
                ? "bg-red-900/20 border-red-700/50"
                : "bg-blue-900/20 border-blue-700/50"
          }`}
        >
          <div className="mr-3">
            {feedback.type === "success" ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-green-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : feedback.type === "error" ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-red-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-blue-500 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
          </div>
          <div className="flex-1 text-sm">{feedback.message}</div>
        </div>
      )}
    </FeedbackContext.Provider>
  )
}

export function useFeedback() {
  return useContext(FeedbackContext)
}
