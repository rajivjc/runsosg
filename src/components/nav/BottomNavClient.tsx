'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import NotificationsPanel from '@/components/notifications/NotificationsPanel'
import { fetchUnreadNotifications } from '@/app/notifications/actions'

type Notification = {
  id: string
  type: string
  payload: Record<string, any>
  created_at: string
  read: boolean
}

type Props = {
  isAdmin: boolean
  isCaregiver?: boolean
  userId: string
}

export default function BottomNavClient({ isAdmin, isCaregiver = false, userId }: Props) {
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function fetchNotifications() {
    const result = await fetchUnreadNotifications(userId)
    setUnreadCount(result.count)
    setNotifications(result.notifications)
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const tabs = [
    { href: '/feed', label: 'Feed', emoji: '🏠' },
    { href: '/athletes', label: 'Athletes', emoji: '🏃' },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', emoji: '⚙️' }] : []),
    { href: '/account', label: 'Account', emoji: '👤' },
  ]

  return (
    <>
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
        const isFeed = tab.href === '/feed'

        if (isFeed) {
          return (
            <div key={tab.href} className="flex flex-1 relative">
              <Link
                href={tab.href}
                className={`flex flex-1 flex-col items-center justify-center py-3 gap-0.5 text-xs font-medium transition-colors ${
                  active ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <span className="text-xl leading-none">{tab.emoji}</span>
                <span>{tab.label}</span>
              </Link>
              {unreadCount > 0 && (
                <button
                  className="absolute top-1 left-1/2 -translate-x-1/2 translate-x-2 flex items-center justify-center min-w-[16px] h-[16px] px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full leading-none z-10"
                  onClick={async () => {
                    setLoading(true)
                    await fetchNotifications()
                    setLoading(false)
                    setPanelOpen(true)
                  }}
                  aria-label="Open notifications"
                >
                  {loading ? '·' : (unreadCount >= 10 ? '9+' : unreadCount)}
                </button>
              )}
            </div>
          )
        }

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-1 flex-col items-center justify-center py-3 gap-0.5 text-xs font-medium transition-colors ${
              active ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span className="relative inline-flex">
              <span className="text-xl leading-none">{tab.emoji}</span>
            </span>
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
    {panelOpen && (
      <NotificationsPanel
        notifications={notifications}
        userId={userId}
        onClose={() => {
          setPanelOpen(false)
          fetchNotifications()
        }}
      />
    )}
  </>
  )
}
