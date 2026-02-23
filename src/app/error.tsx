'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
      <p className="text-sm text-gray-500 mb-6">
        Don&apos;t worry — let&apos;s try again.
      </p>
      <button
        onClick={reset}
        className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg px-6 py-2.5 transition-colors"
      >
        Try again
      </button>
    </main>
  )
}
