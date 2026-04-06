'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

function StravaConnectedInner() {
  const searchParams = useSearchParams()
  const isDenied = searchParams.get('error') === 'denied'
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    setIsStandalone(standalone)

    // If running inside the PWA (rare — usually this page opens in the browser),
    // redirect to account directly.
    if (standalone && !isDenied) {
      window.location.href = '/account?connected=strava'
    }
  }, [isDenied])

  if (isDenied) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface-raised px-4">
        <div className="w-full max-w-sm bg-surface rounded-2xl shadow-md p-8 text-center space-y-4">
          <div className="text-4xl">🚫</div>
          <h1 className="text-xl font-bold text-text-primary">Connection cancelled</h1>
          <p className="text-sm text-text-secondary">
            You chose not to connect your Strava account. You can try again anytime from the app.
          </p>
          <p className="text-xs text-text-hint">
            You can close this window and go back to the app.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-raised px-4">
      <div className="w-full max-w-sm bg-surface rounded-2xl shadow-md p-8 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-green-600 dark:text-green-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-text-primary">Strava connected!</h1>
        <p className="text-sm text-text-secondary">
          Your runs will now sync automatically to athlete profiles.
        </p>

        {!isStandalone && (
          <div className="pt-2 space-y-3">
            <div className="rounded-lg bg-teal-50 dark:bg-teal-900/10 border border-teal-200 dark:border-teal-400/20 px-4 py-3">
              <p className="text-sm font-medium text-teal-800 dark:text-teal-300 mb-1">
                Go back to the Kita app
              </p>
              <p className="text-xs text-teal-600 dark:text-teal-300">
                Tap your Kita icon on the home screen. You can close this browser tab.
              </p>
            </div>
            <a
              href="/account?connected=strava"
              className="inline-block text-sm text-text-muted hover:text-teal-600 dark:hover:text-teal-300 transition-colors"
            >
              Or continue in browser
            </a>
          </div>
        )}
      </div>
    </main>
  )
}

export default function StravaConnectedContent() {
  return (
    <Suspense fallback={null}>
      <StravaConnectedInner />
    </Suspense>
  )
}
