'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Settings, User, Bell } from 'lucide-react'

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

export default function BottomNavClient({ isAdmin, isCaregiver = false, unreadCount }: Props) {
  const pathname = usePathname()

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
                <span className="absolute -top-1.5 -right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full leading-none">
                  {unreadCount >= 10 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            <span className="text-[11px] leading-none mt-0.5">{tab.label}</span>
          </>
        )

        const baseClasses = `flex flex-1 flex-col items-center justify-center min-h-[44px] py-3 gap-1 font-medium transition-all rounded-lg mx-0.5 ${
          active
            ? 'text-teal-600 bg-teal-50'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
        }`

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
