'use client'

import { useEffect } from 'react'

/**
 * Check for a pending navigation URL stored by the service worker's
 * notificationclick handler. This is the fallback for when postMessage
 * arrives before the listener is registered (cold start race condition).
 */
async function consumePendingNavigation() {
  try {
    const navCache = await caches.open('sosg-pending-nav')
    const response = await navCache.match('/_pending')
    if (response) {
      const url = await response.text()
      await navCache.delete('/_pending')
      if (url && url !== window.location.pathname) {
        window.location.href = url
      }
    }
  } catch {
    // Cache API unavailable — ignore
  }
}

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed — non-critical, ignore silently
    })

    // Fast path: listen for NAVIGATE messages from the SW's notificationclick.
    // We use postMessage + full page reload instead of client.navigate()
    // because client.navigate() corrupts the React tree on iOS PWAs, causing
    // stale content to persist across all routes.
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NAVIGATE' && typeof event.data.url === 'string') {
        // Clear the cache fallback since we're handling it now
        caches.open('sosg-pending-nav').then((c) => c.delete('/_pending')).catch(() => {})
        window.location.href = event.data.url
      }
    }

    navigator.serviceWorker.addEventListener('message', handleMessage)

    // Fallback: check for pending navigation on mount (cold start) and
    // when the page becomes visible (frozen → unfrozen transition).
    consumePendingNavigation()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        consumePendingNavigation()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return null
}
