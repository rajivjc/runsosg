# Plan: Reduce Mobile Auth Friction & Improve PWA Installability

## Problem Analysis

### 1. Mobile sessions expire faster than desktop

**Root cause:** Mobile browsers (especially Safari on iOS) aggressively purge cookies through Intelligent Tracking Prevention (ITP). Key behaviors:

- **Safari ITP**: Cookies set via JavaScript (which `@supabase/ssr` does under the hood) can be capped to 7 days on iOS Safari. After 7 days of not visiting the site, cookies may be deleted entirely.
- **Background tab eviction**: On mobile, browsers kill background tabs aggressively. When the user returns, the Supabase client can't auto-refresh the access token because the tab was destroyed. The middleware then calls `getUser()`, finds an expired access token, and the refresh token cookie may have been purged by ITP — forcing re-login.
- **PWA standalone mode helps**: When a site is added to the home screen and runs in `standalone` mode, Safari treats it more like a native app and is less aggressive with cookie purging. This is another reason to push the "Add to Home Screen" flow.

**Current middleware behavior** (`src/middleware.ts`): The middleware correctly refreshes sessions via `supabase.auth.getUser()` on every protected route visit. The problem is that by the time the user visits again on mobile, the refresh token cookie is already gone.

### 2. No "Add to Home Screen" prompt or service worker

**Current state:**
- `manifest.json` exists and is properly linked in `layout.tsx`
- Apple Web App meta tags are configured (`capable: true`, `statusBarStyle`, `title`)
- `apple-touch-icon` is linked
- Icons exist at `/icon-192.png` and `/icon-512.png` (valid PNGs but very small file sizes — likely solid-color placeholders at 413 and 1496 bytes respectively)

**What's missing:**
- **No service worker** — Chrome requires a service worker to fire the `beforeinstallprompt` event (the native "Add to Home Screen" banner). Without it, users can only install via the browser menu, which most people don't know about.
- **No install prompt UI** — No in-app banner or button to guide users to install the app
- **Icon quality** — 413 bytes for a 192x192 PNG is almost certainly a solid-color square, not a recognizable app icon. Users need a real branded icon.

---

## Proposed Changes

### Part A: Add a Service Worker (enables PWA installability)

**File: `public/sw.js`** — Create a minimal service worker.

This doesn't need to be a full offline-caching service worker. A minimal one that handles the `fetch` event is enough for Chrome to consider the app "installable" and fire `beforeinstallprompt`. It will use a network-first strategy so it doesn't interfere with the app's normal behavior, but caches the app shell for faster repeat loads.

```js
const CACHE_NAME = 'sosg-v1'
const SHELL_ASSETS = ['/manifest.json', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Network-first: don't interfere with normal app behavior
  // Only serve from cache if network fails (basic offline shell)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/feed') || caches.match('/'))
    )
  }
})
```

**File: `src/app/layout.tsx`** — Register the service worker via a small inline script or a client component.

### Part B: Add an Install Prompt Banner

**File: `src/components/nav/InstallPrompt.tsx`** — A client component that:

1. Listens for the `beforeinstallprompt` event (Chrome/Android)
2. Detects iOS Safari (no `beforeinstallprompt` support) and shows manual instructions
3. Checks if already running in standalone mode (`window.matchMedia('(display-mode: standalone)')`) — if so, hides itself
4. Stores a dismissal flag in `localStorage` so it doesn't nag repeatedly
5. Renders a dismissible banner at the top of the page with install CTA

This addresses both platforms:
- **Android/Chrome**: Captures `beforeinstallprompt`, shows "Install App" button that triggers native install dialog
- **iOS Safari**: Shows "Tap Share → Add to Home Screen" instructions with visual guide

**File: `src/app/layout.tsx`** — Render `<InstallPrompt />` inside the body.

### Part C: Improve Auth Session Persistence on Mobile

**File: `src/lib/supabase/server.ts`** — No changes needed (already correct).

**File: `src/middleware.ts`** — Enhance cookie options to fight ITP:

When the middleware's `setAll` callback fires (which happens when Supabase refreshes the session), explicitly set long-lived cookie attributes:

```typescript
setAll(cookiesToSet) {
  cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
  response = NextResponse.next({ request })
  cookiesToSet.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, {
      ...options,
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
      secure: true,
      httpOnly: true,
      path: '/',
    })
  )
},
```

This ensures that every time the middleware refreshes the session, the cookies are re-set with maximum longevity. The `sameSite: 'lax'` + `secure: true` + `httpOnly: true` combination is the most ITP-friendly configuration for server-set cookies.

**File: `src/app/auth/callback/route.ts`** — Same treatment: ensure the initial session cookies from `exchangeCodeForSession` are set with long-lived attributes. This may require creating the Supabase client in the callback with explicit cookie options rather than relying on defaults.

**File: `src/lib/supabase/server.ts`** — Apply the same long-lived cookie options in the server client's `setAll` to ensure consistency across all server-side session refreshes.

### Part D: Improve Icon Assets

**Files: `public/icon-192.png`, `public/icon-512.png`** — The current icons are likely solid-color placeholders (413 bytes for 192x192 is not a real logo). We should generate proper branded icons.

Options:
- Generate simple but identifiable icons with the SOSG branding (e.g., a running shoe silhouette or "SOSG" text on the teal background)
- Add a `public/icon-180.png` specifically for Apple touch icon (Apple recommends 180x180)

**File: `public/manifest.json`** — Split the `purpose` field. Currently `"purpose": "any maskable"` is a single entry. Best practice is to have separate icon entries for `any` and `maskable` purposes, since maskable icons need specific safe-zone padding.

### Part E: Add `scope` and `id` to manifest

**File: `public/manifest.json`** — Add:
```json
{
  "id": "/",
  "scope": "/",
  ...
}
```

The `id` field helps the browser identify the PWA uniquely and prevents duplicate install prompts. The `scope` field defines the navigation scope.

---

## Summary of Files Changed

| File | Change |
|------|--------|
| `public/sw.js` | **New** — minimal service worker for installability |
| `src/components/nav/InstallPrompt.tsx` | **New** — install banner (Android native prompt + iOS instructions) |
| `src/app/layout.tsx` | **Modified** — register service worker, render InstallPrompt |
| `src/middleware.ts` | **Modified** — set long-lived cookie attributes on session refresh |
| `src/lib/supabase/server.ts` | **Modified** — set long-lived cookie attributes in server client |
| `public/manifest.json` | **Modified** — add `id`, `scope`; split icon purposes |
| `public/icon-192.png` | **Modified** — replace with proper branded icon |
| `public/icon-512.png` | **Modified** — replace with proper branded icon |
| `public/icon-180.png` | **New** — Apple-specific touch icon |

## Risk Assessment

- **Service worker**: Using network-first strategy means zero risk of serving stale content. Worst case, the service worker is inert.
- **Cookie changes**: Adding explicit `maxAge`/`sameSite`/`secure`/`httpOnly` to Supabase session cookies is safe — these are the recommended values. Supabase's own options are preserved as the base via spread operator.
- **Install prompt**: Client-only component with localStorage gating — no server-side impact. Gracefully degrades (simply doesn't show) on unsupported browsers.
- **Icon changes**: Purely cosmetic, no functional risk.

## What This Won't Fix

- **Supabase-side session expiry**: If the Supabase project is configured with a short JWT expiry or short refresh token lifetime, that's a server-side setting that must be changed in the Supabase dashboard (Authentication → Settings → JWT expiry). Default is 3600s (1 hour) for access tokens which is fine — the refresh token is what matters for persistence.
- **Deliberate sign-out by user or admin deactivation**: These are intentional behaviors.
- **Very long absence**: If a user doesn't visit for months, mobile browsers may still purge cookies regardless of our settings. The PWA standalone mode mitigates this significantly.
