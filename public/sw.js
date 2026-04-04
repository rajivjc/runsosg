const CACHE_NAME = 'kita-v17'
const NAV_CACHE = 'kita-pending-nav'
const SHELL_ASSETS = ['/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== NAV_CACHE && k !== 'kita-pwa-token')
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// Web Push Notifications
self.addEventListener('push', (event) => {
  if (!event.data) return
  try {
    const data = event.data.json()
    const options = {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'kita-notification',
      data: { url: data.url || '/' },
    }
    event.waitUntil(self.registration.showNotification(data.title || 'SOSG Running Club', options))
  } catch (e) {
    // Malformed push payload — ignore silently
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    (async () => {
      // Persist the target URL so the client can pick it up even on cold start
      // (when postMessage might arrive before the listener is registered).
      const navCache = await caches.open(NAV_CACHE)
      await navCache.put('/_pending', new Response(url))

      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      // Separate visible (warm) clients from hidden (frozen/backgrounded) ones.
      // On iOS, "closing" a PWA doesn't kill the client — it stays frozen and
      // clients.matchAll() still returns it. Reusing a frozen client via
      // postMessage + focus() causes iOS to restore stale compositor layers,
      // producing the misaligned page rendering bug.
      const originClients = allClients.filter(
        (c) => c.url.includes(self.location.origin) && 'focus' in c
      )
      const visibleClient = originClients.find((c) => c.visibilityState === 'visible')
      const frozenClient = originClients.find((c) => c.visibilityState !== 'visible')

      if (visibleClient) {
        // WARM CASE: App is in the foreground. Send a message so the client
        // can do an in-place router.refresh() without any page navigation.
        // This completely avoids the iOS compositor issue.
        visibleClient.postMessage({ type: 'NAVIGATE', url })
        try {
          await visibleClient.focus()
        } catch {
          // focus() can fail — non-critical
        }
        return
      }

      if (frozenClient) {
        // FROZEN CASE: App was backgrounded/closed but iOS kept the client.
        // Do NOT use postMessage + focus() — that restores the frozen page
        // with stale compositor layers (the root cause of the rendering bug).
        // Instead, use navigate() to force a full fresh page load, which
        // discards the frozen state entirely.
        try {
          await frozenClient.navigate(url)
          await frozenClient.focus()
          // Clear the pending nav since navigate() already went to the URL
          await navCache.delete('/_pending')
          return
        } catch {
          // navigate() can fail on some browsers for hidden clients.
          // Fall through to openWindow() below.
        }
      }

      // NO CLIENT or navigate() failed — open a fresh window.
      // Use pwa-launch with token so the new window has auth.
      let launchUrl = url
      try {
        const tokenCache = await caches.open('kita-pwa-token')
        const tokenResp = await tokenCache.match('/_token')
        if (tokenResp) {
          const token = await tokenResp.text()
          if (token) {
            launchUrl =
              '/auth/pwa-launch?token=' +
              encodeURIComponent(token) +
              '&redirect=' +
              encodeURIComponent(url)
          }
        }
      } catch {
        // Token cache unavailable — fall back to bare URL
      }
      return self.clients.openWindow(launchUrl)
    })()
  )
})

self.addEventListener('fetch', (event) => {
  // Only serve shell assets from cache. Never cache navigation responses —
  // Next.js pages are dynamic and serving stale HTML causes content bleed.
  if (event.request.mode === 'navigate') return

  if (SHELL_ASSETS.some((asset) => event.request.url.endsWith(asset))) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    )
  }
})
