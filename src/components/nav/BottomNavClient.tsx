'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Props = {
  isAdmin: boolean
  isCaregiver?: boolean
  unreadCount: number
}

export default function BottomNavClient({ isAdmin, isCaregiver = false, unreadCount }: Props) {
  const pathname = usePathname()

  const tabs = [
    { href: '/feed', label: 'Feed', emoji: '🏠' },
    { href: '/athletes', label: 'Athletes', emoji: '🏃' },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', emoji: '⚙️' }] : []),
    { href: '/account', label: 'Account', emoji: '👤' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
        const isFeed = tab.href === '/feed'
        const feedHref = isFeed && unreadCount > 0 ? '/notifications' : tab.href
        const isNotifications = isFeed && pathname === '/notifications'

        return (
          <Link
            key={tab.href}
            href={feedHref}
            className={`flex flex-1 flex-col items-center justify-center py-3 gap-0.5 text-xs font-medium transition-colors ${
              active || isNotifications ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span className="relative inline-flex">
              <span className="text-xl leading-none">{tab.emoji}</span>
              {isFeed && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-[16px] px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full leading-none">
                  {unreadCount >= 10 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
