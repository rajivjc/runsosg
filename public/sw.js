const CACHE_NAME = 'sosg-v7'
const NAV_CACHE = 'sosg-pending-nav'
const SHELL_ASSETS = ['/api/manifest.json', '/icon-192.png', '/icon-512.png']

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
          .filter((k) => k !== CACHE_NAME && k !== NAV_CACHE)
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
      tag: data.tag || 'sosg-notification',
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

      for (const client of allClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Use postMessage instead of client.navigate() — on iOS PWAs,
          // client.navigate() corrupts the React tree, leaving stale
          // content from the previous page visible across all routes.
          client.postMessage({ type: 'NAVIGATE', url })
          try {
            await client.focus()
          } catch {
            // focus() can fail on frozen/discarded tabs
          }
          return
        }
      }
      // No existing window — open a new one
      return self.clients.openWindow(url)
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
