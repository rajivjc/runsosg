import './globals.css'
import { Suspense } from 'react'
import BottomNav from '@/components/nav/BottomNav'
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
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
        {children}
      </body>
    </html>
  )
}
