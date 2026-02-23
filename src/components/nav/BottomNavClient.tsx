'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import NotificationsPanel from '@/components/notifications/NotificationsPanel'

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
  unreadCount: number
  notifications: Notification[]
  userId: string
}

export default function BottomNavClient({ isAdmin, isCaregiver = false, unreadCount, notifications, userId }: Props) {
  const pathname = usePathname()
  const [panelOpen, setPanelOpen] = useState(false)

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
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-1 flex-col items-center justify-center py-3 gap-0.5 text-xs font-medium transition-colors ${
              active
                ? 'text-blue-600'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span className="relative inline-flex">
              <span className="text-xl leading-none">{tab.emoji}</span>
              {tab.href === '/feed' && unreadCount > 0 && (
                <button
                  className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-[16px] px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full leading-none"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPanelOpen(true) }}
                  aria-label="Open notifications"
                >
                  {unreadCount >= 10 ? '9+' : unreadCount}
                </button>
              )}
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
        onClose={() => setPanelOpen(false)}
      />
    )}
  </>
  )
}
