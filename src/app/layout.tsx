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
  viewportFit: 'cover',
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
            viewBox="0 0 512 512"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g fill="white" stroke="white" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="312" cy="135" r="32" stroke="none" />
              <line x1="298" y1="167" x2="252" y2="280" strokeWidth="42" />
              <circle cx="290" cy="193" r="16" stroke="none" />
              <circle cx="255" cy="276" r="15" stroke="none" />
              <line x1="290" y1="193" x2="342" y2="208" strokeWidth="22" />
              <circle cx="342" cy="208" r="9" stroke="none" />
              <line x1="342" y1="208" x2="354" y2="178" strokeWidth="18" />
              <line x1="290" y1="193" x2="243" y2="174" strokeWidth="22" />
              <circle cx="243" cy="174" r="9" stroke="none" />
              <line x1="243" y1="174" x2="218" y2="190" strokeWidth="18" />
              <line x1="255" y1="276" x2="318" y2="338" strokeWidth="28" />
              <circle cx="318" cy="338" r="11" stroke="none" />
              <line x1="318" y1="338" x2="354" y2="320" strokeWidth="23" />
              <line x1="255" y1="276" x2="198" y2="342" strokeWidth="28" />
              <circle cx="198" cy="342" r="11" stroke="none" />
              <line x1="198" y1="342" x2="166" y2="365" strokeWidth="23" />
            </g>
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
