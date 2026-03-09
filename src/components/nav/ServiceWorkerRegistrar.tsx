'use client'

import { useEffect } from 'react'

// Module-level flag to prevent the postMessage handler and the Cache API
// fallback from both firing window.location.href in rapid succession.
let navigating = false

/**
 * Detect DOM corruption from iOS WKWebView process restoration.
 * When iOS terminates and restores a PWA's WebView process, orphaned DOM
 * nodes from the previous page can persist. We detect this by checking for
 * multiple <main> elements (each page renders exactly one). If found, we
 * reload the entire page rather than surgically removing nodes (which would
 * crash React with a removeChild error).
 */
function checkDomIntegrity() {
  if (document.querySelectorAll('main').length > 1) {
    window.location.reload()
  }
}

/**
 * Force a full page load to the given URL. If the URL matches the current
 * page, window.location.href assignment is a no-op in WebKit, so we must
 * use window.location.reload() instead.
 */
function forceNavigate(url: string) {
  if (url === window.location.pathname || url === window.location.href) {
    window.location.reload()
  } else {
    window.location.href = url
  }
}

/**
 * Check for a pending navigation URL stored by the service worker's
 * notificationclick handler. This is the fallback for when postMessage
 * arrives before the listener is registered (cold start race condition).
 */
async function consumePendingNavigation() {
  if (navigating) return
  try {
    const navCache = await caches.open('sosg-pending-nav')
    const response = await navCache.match('/_pending')
    if (response) {
      const url = await response.text()
      await navCache.delete('/_pending')
      if (url) {
        navigating = true
        forceNavigate(url)
      }
    }
  } catch {
    // Cache API unavailable — ignore
  }
}

/**
 * Fetch the PWA manifest and cache the PWA token so the service worker
 * can use it in notificationclick to open authenticated windows.
 */
async function cachePwaToken() {
  try {
    const res = await fetch('/api/manifest.json')
    const manifest = await res.json()
    const startUrl: string = manifest.start_url || ''
    const match = startUrl.match(/token=([^&]+)/)
    if (match) {
      const tokenCache = await caches.open('sosg-pwa-token')
      await tokenCache.put('/_token', new Response(match[1]))
    }
  } catch {
    // Non-critical — notification cold starts will fall back to bare URL
  }
}

// BroadcastChannel name for duplicate PWA instance detection
const INSTANCE_CHANNEL = 'sosg-pwa-instance'

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Reset on mount — if the component re-mounts after a soft navigation
    // that didn't trigger location.href, the flag should be cleared.
    navigating = false

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed — non-critical, ignore silently
    })

    // Cache the PWA token for the service worker to use in notificationclick
    cachePwaToken()

    // Duplicate instance detection via BroadcastChannel.
    // When a notification opens a second PWA window (iOS frozen window bug),
    // the original instance broadcasts a claim. The newer instance closes itself.
    let bc: BroadcastChannel | null = null
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel(INSTANCE_CHANNEL)
      // Announce this instance
      bc.postMessage({ type: 'INSTANCE_PING', ts: Date.now() })
      bc.onmessage = (event) => {
        if (event.data?.type === 'INSTANCE_PING') {
          // Another instance just opened — tell it we're already here
          bc?.postMessage({ type: 'INSTANCE_PONG' })
        }
        if (event.data?.type === 'INSTANCE_PONG') {
          // An older instance is already running — close this duplicate.
          // The pending nav URL is cached, so the original will pick it up.
          window.close()
        }
      }
    }

    // Fast path: listen for NAVIGATE messages from the SW's notificationclick.
    // We use postMessage + full page reload instead of client.navigate()
    // because client.navigate() corrupts the React tree on iOS PWAs, causing
    // stale content to persist across all routes.
    const handleMessage = (event: MessageEvent) => {
      if (navigating) return
      if (event.data?.type === 'NAVIGATE' && typeof event.data.url === 'string') {
        navigating = true
        // Clear the cache fallback since we're handling it now
        caches.open('sosg-pending-nav').then((c) => c.delete('/_pending')).catch(() => {})
        forceNavigate(event.data.url)
      }
    }

    navigator.serviceWorker.addEventListener('message', handleMessage)

    // Fallback: check for pending navigation on mount (cold start) and
    // when the page becomes visible (frozen → unfrozen transition).
    consumePendingNavigation()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        consumePendingNavigation()
        // Check for DOM corruption after iOS process restoration.
        // One-frame delay lets the WebView finish re-compositing.
        requestAnimationFrame(checkDomIntegrity)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      bc?.close()
    }
  }, [])

  return null
}
