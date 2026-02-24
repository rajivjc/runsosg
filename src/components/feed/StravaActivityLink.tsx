'use client'

import { useEffect, useState } from 'react'

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

export default function StravaActivityLink({
  activityId,
  className,
}: {
  activityId: number
  className?: string
}) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(isMobileDevice())
  }, [])

  const webUrl = `https://www.strava.com/activities/${activityId}`

  function handleClick(e: React.MouseEvent) {
    if (!isMobile) return // Let the normal <a> link work on desktop

    e.preventDefault()
    // Try the deep link first — opens Strava app directly on mobile
    const deepLink = `strava://activities/${activityId}`
    const start = Date.now()

    // If the deep link fails (app not installed), the timeout fires and opens web
    const timeout = setTimeout(() => {
      // Only redirect to web if we're still on this page (app didn't open)
      if (Date.now() - start < 2500) {
        window.location.href = webUrl
      }
    }, 1500)

    window.addEventListener(
      'blur',
      () => clearTimeout(timeout),
      { once: true }
    )

    window.location.href = deepLink
  }

  return (
    <a
      href={webUrl}
      onClick={handleClick}
      target={isMobile ? undefined : '_blank'}
      rel="noopener noreferrer"
      className={className ?? 'text-xs text-orange-500 hover:text-orange-600 font-medium'}
    >
      View on Strava ↗
    </a>
  )
}
