'use client'

import { useState, useEffect } from 'react'

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

export default function StravaConnectBanner() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(isMobileDevice())
  }, [])

  async function handleConnect() {
    try {
      const res = await fetch('/api/strava/connect?mobile=1&json=1')
      const { url } = await res.json()
      if (url) {
        window.location.href = url
        return
      }
    } catch { /* fall through */ }
    window.location.href = '/api/strava/connect'
  }

  return (
    <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-orange-900">Connect your Strava account</p>
        <p className="text-xs text-orange-700 mt-0.5">
          Link Strava so your runs automatically sync to athlete profiles.
        </p>
      </div>
      {isMobile ? (
        <button
          onClick={handleConnect}
          className="shrink-0 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 transition-colors"
        >
          Connect
        </button>
      ) : (
        <a
          href="/api/strava/connect"
          className="shrink-0 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 transition-colors"
        >
          Connect
        </a>
      )}
    </div>
  )
}
