'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

// Module-level flag to prevent the postMessage handler and the Cache API
// fallback from both firing navigation in rapid succession.
let navigating = false

// Tracks whether the page was hidden (app backgrounded/frozen) since the
// last notification was handled. Used to distinguish warm vs frozen state
// when a notification arrives.
let appWasHidden = false
let hiddenResetTimer: ReturnType<typeof setTimeout> | null = null

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
    document.body.style.display = 'none'
    window.location.reload()
  }
}

/**
 * Handle navigation from a push notification tap.
 *
 * Two strategies based on app state:
 *
 * - **Warm (app was active/visible)**: Use router.refresh() to re-fetch
 *   server data in-place. No page navigation = no iOS compositor issue.
 *   Confirmed working.
 *
 * - **Frozen (app was backgrounded/closed)**: iOS WKWebView restores stale
 *   compositor layers when the app is foregrounded. router.refresh() updates
 *   data but can't clear those stale visual layers. For this case, hide the
 *   body to release stale layers, then reload for a clean render.
 *
 * - **Different page**: Use window.location.href for a full navigation.
 *   Always works because different pathname forces full compositor teardown.
 */
function handleNotificationNav(
  url: string,
  routerRef: React.RefObject<ReturnType<typeof useRouter> | null>,
) {
  // Capture and reset the frozen flag
  const wasFrozen = appWasHidden || document.visibilityState === 'hidden'
  appWasHidden = false
  if (hiddenResetTimer) {
    clearTimeout(hiddenResetTimer)
    hiddenResetTimer = null
  }

  if (url === window.location.pathname) {
    if (wasFrozen) {
      // Frozen case: iOS WKWebView painted stale compositor layers when
      // restoring the app. Hide the body to force the compositor to release
      // those layers, then reload to get a completely fresh render.
      document.body.style.display = 'none'
      window.location.reload()
    } else {
      // Warm case: app was active, no stale layers. Refresh data in-place.
      window.scrollTo(0, 0)
      routerRef.current?.refresh()
    }
  } else {
    // Different page — full navigation always works.
    window.location.href = url
  }
}

/**
 * Check for a pending navigation URL stored by the service worker's
 * notificationclick handler. This is the fallback for when postMessage
 * arrives before the listener is registered (cold start race condition).
 */
async function consumePendingNavigation(
  routerRef: React.RefObject<ReturnType<typeof useRouter> | null>,
) {
  if (navigating) return
  try {
    const navCache = await caches.open('sosg-pending-nav')
    const response = await navCache.match('/_pending')
    if (response) {
      const url = await response.text()
      await navCache.delete('/_pending')
      if (url) {
        navigating = true
        handleNotificationNav(url, routerRef)
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
    const token: string | undefined = manifest._pwa_token
    if (token) {
      const tokenCache = await caches.open('sosg-pwa-token')
      await tokenCache.put('/_token', new Response(token))
    }
  } catch {
    // Non-critical — notification cold starts will fall back to bare URL
  }
}

// BroadcastChannel name for duplicate PWA instance detection
const INSTANCE_CHANNEL = 'sosg-pwa-instance'

export default function ServiceWorkerRegistrar() {
  const router = useRouter()
  const routerRef = useRef<ReturnType<typeof useRouter> | null>(router)
  routerRef.current = router

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

    // Listen for NAVIGATE messages from the SW's notificationclick handler.
    const handleMessage = (event: MessageEvent) => {
      if (navigating) return
      if (event.data?.type === 'NAVIGATE' && typeof event.data.url === 'string') {
        navigating = true
        // Clear the cache fallback since we're handling it now
        caches.open('sosg-pending-nav').then((c) => c.delete('/_pending')).catch(() => {})
        handleNotificationNav(event.data.url, routerRef)
      }
    }

    navigator.serviceWorker.addEventListener('message', handleMessage)

    // Fallback: check for pending navigation on mount (cold start) and
    // when the page becomes visible (frozen → unfrozen transition).
    consumePendingNavigation(routerRef)

    // Safety net: check for DOM corruption on mount (e.g., after iOS
    // process restoration during navigation). Delay lets the page finish
    // rendering before checking for orphaned <main> elements.
    const integrityTimer = setTimeout(() => checkDomIntegrity(), 500)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Track that the app was backgrounded. This flag is consumed by
        // handleNotificationNav to distinguish warm vs frozen state.
        appWasHidden = true
        if (hiddenResetTimer) clearTimeout(hiddenResetTimer)
        hiddenResetTimer = null
      } else if (document.visibilityState === 'visible') {
        consumePendingNavigation(routerRef)
        // Check for DOM corruption after iOS process restoration.
        requestAnimationFrame(checkDomIntegrity)
        // Reset the hidden flag after a delay. If a notification-driven
        // NAVIGATE message arrives within this window, it's from a frozen
        // restoration. After the window, it's treated as a warm state.
        hiddenResetTimer = setTimeout(() => {
          appWasHidden = false
          hiddenResetTimer = null
        }, 5000)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearTimeout(integrityTimer)
      if (hiddenResetTimer) clearTimeout(hiddenResetTimer)
      navigator.serviceWorker.removeEventListener('message', handleMessage)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      bc?.close()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
