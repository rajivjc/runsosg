'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Props = { isAdmin: boolean; isCaregiver?: boolean }

export default function BottomNavClient({ isAdmin, isCaregiver = false }: Props) {
  const pathname = usePathname()

  const tabs = [
    { href: '/athletes', label: isCaregiver ? 'My Child' : 'Athletes', emoji: '🏃' },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', emoji: '⚙️' }] : []),
    { href: '/account', label: 'Account', emoji: '👤' },
  ]

  return (
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
            <span className="text-xl leading-none">{tab.emoji}</span>
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
