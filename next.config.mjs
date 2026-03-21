// --- Content-Security-Policy setup ---
// Extract Supabase hostname for CSP connect-src and img-src directives.
// The app connects to Supabase over HTTPS (REST API) and WSS (Realtime).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
let supabaseDomain = ''
let supabaseWsDomain = ''
if (supabaseUrl) {
  try {
    const hostname = new URL(supabaseUrl).hostname
    supabaseDomain = `https://${hostname}`
    supabaseWsDomain = `wss://${hostname}`
  } catch {
    // Fallback if URL parsing fails
    supabaseDomain = 'https://*.supabase.co'
    supabaseWsDomain = 'wss://*.supabase.co'
  }
}

// CSP directives:
//   default-src 'self'           — baseline: only same-origin resources
//   script-src 'self' 'unsafe-inline' — Next.js hydration injects inline scripts
//   style-src 'self' 'unsafe-inline'  — Tailwind + PWA splash CSS in layout.tsx
//   img-src 'self' blob: data: <supabase> — blob previews, data: SVGs, Supabase storage
//   font-src 'self'              — system fonts only
//   connect-src 'self' <supabase> <supabase-wss> — REST API + Realtime WebSocket
//   worker-src 'self' blob:      — service worker + browser-image-compression blob workers
//   frame-ancestors 'none'       — clickjacking protection (CSP equivalent of X-Frame-Options)
//   form-action 'self'           — forms submit to same origin only
//   base-uri 'self'              — prevents <base> tag injection
//
// Future improvement: migrate to nonce-based CSP via Next.js middleware to
// eliminate 'unsafe-inline' from script-src and style-src.
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data:${supabaseDomain ? ` ${supabaseDomain}` : ''}`,
  "font-src 'self'",
  `connect-src 'self'${supabaseDomain ? ` ${supabaseDomain}` : ''}${supabaseWsDomain ? ` ${supabaseWsDomain}` : ''}`,
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
].join('; ')

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '*.app.github.dev',
      ],
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: cspDirectives,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
