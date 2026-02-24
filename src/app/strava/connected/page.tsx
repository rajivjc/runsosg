'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

function StravaConnectedContent() {
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
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8 text-center space-y-4">
          <div className="text-4xl">🚫</div>
          <h1 className="text-xl font-bold text-gray-900">Connection cancelled</h1>
          <p className="text-sm text-gray-600">
            You chose not to connect your Strava account. You can try again anytime from the app.
          </p>
          <p className="text-xs text-gray-400">
            You can close this window and go back to the app.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Strava connected!</h1>
        <p className="text-sm text-gray-600">
          Your runs will now sync automatically to athlete profiles.
        </p>

        {!isStandalone && (
          <div className="pt-2 space-y-3">
            <div className="rounded-lg bg-teal-50 border border-teal-200 px-4 py-3">
              <p className="text-sm font-medium text-teal-800 mb-1">
                Go back to the SOSG Run app
              </p>
              <p className="text-xs text-teal-600">
                Tap your SOSG Run icon on the home screen. You can close this browser tab.
              </p>
            </div>
            <a
              href="/account?connected=strava"
              className="inline-block text-sm text-gray-500 hover:text-teal-600 transition-colors"
            >
              Or continue in browser
            </a>
          </div>
        )}
      </div>
    </main>
  )
}

export default function StravaConnectedPage() {
  return (
    <Suspense fallback={null}>
      <StravaConnectedContent />
    </Suspense>
  )
}
