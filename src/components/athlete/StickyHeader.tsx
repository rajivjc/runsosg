'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { ChevronLeft, Pencil } from 'lucide-react'

interface StickyHeaderProps {
  athleteName: string
  athleteId: string
  backHref: string
  backLabel: string
  showEdit?: boolean
}

export default function StickyHeader({
  athleteName,
  athleteId,
  backHref,
  backLabel,
  showEdit = false,
}: StickyHeaderProps) {
  const [visible, setVisible] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting)
      },
      { threshold: 0 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      {/* Sentinel element — placed inline where the main header is */}
      <div ref={sentinelRef} className="h-0 w-0" aria-hidden="true" />

      {/* Sticky header — appears when sentinel scrolls out of view */}
      <div
        className={`fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 transition-all duration-200 ${
          visible
            ? 'translate-y-0 opacity-100'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-2xl mx-auto px-4 h-11 flex items-center justify-between">
          <div className="flex items-center gap-1 min-w-0">
            <Link
              href={backHref}
              className="flex items-center gap-0.5 text-teal-600 hover:text-teal-700 transition-colors flex-shrink-0 -ml-1 p-1"
              aria-label={`Back to ${backLabel}`}
            >
              <ChevronLeft size={18} />
            </Link>
            <p className="text-sm font-semibold text-gray-900 truncate">{athleteName}</p>
          </div>
          {showEdit && (
            <Link
              href={`/athletes/${athleteId}/edit`}
              className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all flex-shrink-0"
              aria-label="Edit athlete profile"
            >
              <Pencil size={16} />
            </Link>
          )}
        </div>
      </div>
    </>
  )
}
