'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Settings, User, Bell } from 'lucide-react'

const POLL_INTERVAL_MS = 30_000

type Props = {
  isAdmin: boolean
  isCaregiver?: boolean
  unreadCount: number
}

const ICONS: Record<string, any> = {
  '/feed': Home,
  '/athletes': Users,
  '/notifications': Bell,
  '/admin': Settings,
  '/account': User,
}

export default function BottomNavClient({ isAdmin, isCaregiver = false, unreadCount: initialCount }: Props) {
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(initialCount)
  const [isStandalone, setIsStandalone] = useState(false)

  // Detect PWA standalone mode — in standalone mode, use full page reloads
  // instead of Next.js soft navigation to prevent iOS WKWebView from
  // retaining stale page content across route transitions.
  useEffect(() => {
    setIsStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as any).standalone === true)
    )
  }, [])

  // Keep in sync with server-rendered prop (e.g. after navigation)
  useEffect(() => {
    setUnreadCount(initialCount)
  }, [initialCount])

  const pollUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/unread-count')
      if (res.ok) {
        const { count } = await res.json()
        setUnreadCount(count)
      }
    } catch {
      // Silently ignore network errors — will retry next interval
    }
  }, [])

  useEffect(() => {
    if (isCaregiver) return

    const id = setInterval(pollUnreadCount, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [isCaregiver, pollUnreadCount])

  const tabs = [
    { href: '/feed', label: 'Feed' },
    { href: '/athletes', label: 'Athletes' },
    ...(!isCaregiver ? [{ href: '/notifications', label: 'Alerts' }] : []),
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
    { href: '/account', label: 'Account' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
      <div className="flex max-w-2xl mx-auto">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
        const Icon = ICONS[tab.href] ?? Home
        const isNotifTab = tab.href === '/notifications'

        const tabContent = (
          <>
            <span className="relative inline-flex">
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              {isNotifTab && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full leading-none animate-badge-pop">
                  {unreadCount >= 10 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            <span className="text-[11px] leading-none mt-0.5">{tab.label}</span>
          </>
        )

        const baseClasses = `flex flex-1 flex-col items-center justify-center min-h-[44px] py-3 gap-1 font-medium transition-all duration-150 rounded-lg mx-0.5 active:scale-95 ${
          active
            ? 'text-teal-600 bg-teal-50'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
        }`

        // In PWA standalone mode, use <a> tags for full page reloads to
        // prevent iOS WKWebView from retaining stale content across routes.
        if (isStandalone) {
          return (
            <a
              key={tab.href}
              href={tab.href}
              className={baseClasses}
            >
              {tabContent}
            </a>
          )
        }

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={baseClasses}
          >
            {tabContent}
          </Link>
        )
      })}
      </div>
    </nav>
  )
}
