import './globals.css'
import { Suspense } from 'react'
import BottomNav from '@/components/nav/BottomNav'

export const metadata = { title: 'SOSG Running Club Hub' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full pb-16">
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
        {children}
      </body>
    </html>
  )
}
