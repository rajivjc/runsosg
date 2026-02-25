import './globals.css'
import { Suspense } from 'react'
import BottomNav from '@/components/nav/BottomNav'
import ServiceWorkerRegistrar from '@/components/nav/ServiceWorkerRegistrar'
import InstallPrompt from '@/components/nav/InstallPrompt'
import SplashHider from '@/components/nav/SplashHider'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'SOSG Running Club',
  description: 'Running club hub for coaches and athletes — growing together',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SOSG Run',
  },
}

export const viewport: Viewport = {
  themeColor: '#0D9488',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="h-full pb-16">
        {/* Inline PWA splash screen — renders before React hydrates */}
        <div
          id="pwa-splash"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
          }}
        >
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @keyframes splash-pulse {
                  0%, 100% { opacity: 0.4; transform: scale(1); }
                  50% { opacity: 1; transform: scale(1.1); }
                }
                @keyframes splash-fade-dots {
                  0%, 100% { opacity: 0.3; }
                  50% { opacity: 1; }
                }
                #pwa-splash-icon {
                  animation: splash-pulse 2s ease-in-out infinite;
                }
                .splash-dot {
                  width: 6px;
                  height: 6px;
                  border-radius: 50%;
                  background: rgba(255,255,255,0.7);
                  animation: splash-fade-dots 1.4s ease-in-out infinite;
                }
                .splash-dot:nth-child(2) { animation-delay: 0.2s; }
                .splash-dot:nth-child(3) { animation-delay: 0.4s; }
              `,
            }}
          />
          {/* Running icon */}
          <svg
            id="pwa-splash-icon"
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="37" cy="14" r="5.5" fill="white" />
            <path
              d="M24.5 56L29 42L35 46V56M35 46L43 34L52 36M43 34L36 22L24 26L18 36"
              stroke="white"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {/* App name */}
          <p
            style={{
              color: 'white',
              fontSize: '18px',
              fontWeight: 600,
              letterSpacing: '0.5px',
              marginTop: '16px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            SOSG Running Club
          </p>
          {/* Loading dots */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '24px' }}>
            <div className="splash-dot" />
            <div className="splash-dot" />
            <div className="splash-dot" />
          </div>
        </div>

        <SplashHider />
        <ServiceWorkerRegistrar />
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
        <InstallPrompt />
        {children}
      </body>
    </html>
  )
}
