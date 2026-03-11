'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

// Module-level flag to prevent the postMessage handler and the Cache API
// fallback from both firing navigation in rapid succession.
let navigating = false

// ID for the freeze overlay element
const FREEZE_OVERLAY_ID = 'sosg-freeze-overlay'

/**
 * Show a full-screen overlay that matches the app background.
 *
 * Called when the app goes to background (`visibilitychange → hidden`).
 * iOS takes a screenshot of the page for the app switcher at this point.
 * By covering the page, the screenshot shows the overlay instead of
 * page content — so when the app is restored from a frozen state,
 * the user sees the overlay (not stale/corrupted compositor layers)
 * while we reload or refresh the page underneath.
 */
function showFreezeOverlay() {
  if (document.getElementById(FREEZE_OVERLAY_ID)) return
  const overlay = document.createElement('div')
  overlay.id = FREEZE_OVERLAY_ID
  overlay.setAttribute(
    'style',
    'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;' +
      'background:#FBF9F7;transition:opacity 0.3s ease;',
  )
  document.body.appendChild(overlay)
}

/**
 * Remove the freeze overlay, optionally with a fade-out.
 */
function hideFreezeOverlay(immediate?: boolean) {
  const overlay = document.getElementById(FREEZE_OVERLAY_ID)
  if (!overlay) return
  if (immediate) {
    overlay.remove()
    return
  }
  overlay.style.opacity = '0'
  setTimeout(() => overlay.remove(), 300)
}

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
    showFreezeOverlay()
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
 *
 * - **Frozen (app was backgrounded/closed)**: The freeze overlay is already
 *   covering the page (applied on visibilitychange→hidden), hiding any
 *   stale compositor layers. Force a full reload to get a clean render.
 *   The overlay persists until the reload completes.
 *
 * - **Different page**: Use window.location.href for a full navigation.
 *   Always works because different pathname forces full compositor teardown.
 */
function handleNotificationNav(
  url: string,
  routerRef: React.RefObject<ReturnType<typeof useRouter> | null>,
) {
  const hasOverlay = !!document.getElementById(FREEZE_OVERLAY_ID)

  if (url === window.location.pathname) {
    if (hasOverlay) {
      // Frozen case: overlay is already covering stale content.
      // Reload to get a completely fresh render. The overlay persists
      // through the reload because it's in the current DOM — the new
      // page load starts clean without it.
      window.location.reload()
    } else {
      // Warm case: app was active, no stale layers. Refresh data in-place.
      window.scrollTo(0, 0)
      routerRef.current?.refresh()
    }
  } else {
    // Different page — full navigation always works.
    // Show overlay to cover any flash during navigation.
    showFreezeOverlay()
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
        if (url === window.location.pathname) {
          // The page already loaded at the correct URL (from SW navigate()
          // or openWindow()). No need to trigger another navigation or
          // refresh — the data is already fresh from the server render.
          // Just remove the overlay if present.
          hideFreezeOverlay()
          return
        }
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

    // If the page loaded with a freeze overlay still in the DOM (shouldn't
    // happen since reload clears it, but defensive), remove it.
    hideFreezeOverlay(true)

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
          // The pending nav url is cached, so the original will pick it up.
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
        // App is going to background. Show the freeze overlay so that
        // iOS's app-switcher screenshot captures the overlay instead of
        // page content. This prevents stale compositor layers from being
        // visible when the app is restored.
        showFreezeOverlay()
      } else if (document.visibilityState === 'visible') {
        // App restored from background.
        consumePendingNavigation(routerRef)
        // Check for DOM corruption after iOS process restoration.
        requestAnimationFrame(checkDomIntegrity)
        // If there's no pending notification navigation, remove the
        // overlay after a short delay (let any pending nav message
        // arrive first via postMessage).
        setTimeout(() => {
          if (!navigating) {
            hideFreezeOverlay()
          }
        }, 500)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearTimeout(integrityTimer)
      navigator.serviceWorker.removeEventListener('message', handleMessage)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      bc?.close()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
