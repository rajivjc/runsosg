'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { AthleteListItem } from '@/app/athletes/page'
import { formatDate } from '@/lib/utils/dates'

export type AthleteCardProps = AthleteListItem

const FEEL_DOT: Record<number, string> = {
  1: 'bg-red-400',
  2: 'bg-orange-400',
  3: 'bg-yellow-400',
  4: 'bg-green-400',
  5: 'bg-teal-500',
}

const FEEL_LABELS: Record<number, string> = {
  1: 'Very hard', 2: 'Hard', 3: 'OK', 4: 'Good', 5: 'Great',
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].charAt(0).toUpperCase()
  return (
    words[0].charAt(0).toUpperCase() +
    words[words.length - 1].charAt(0).toUpperCase()
  )
}

export default function AthleteCard({
  id,
  name,
  photoUrl,
  totalSessions,
  lastSessionDate,
  recentFeels,
}: AthleteCardProps) {
  return (
    <Link
      href={`/athletes/${id}`}
      className="flex items-center gap-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all"
    >
      {/* Avatar */}
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={name}
          className="rounded-full w-12 h-12 object-cover flex-shrink-0"
        />
      ) : (
        <div className="rounded-full w-12 h-12 bg-teal-50 flex items-center justify-center text-teal-600 font-semibold text-base flex-shrink-0">
          {getInitials(name)}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm text-gray-500">{totalSessions} run{totalSessions !== 1 ? 's' : ''}</span>
          {lastSessionDate && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-sm text-gray-400">{formatDate(lastSessionDate)}</span>
            </>
          )}
        </div>
        {recentFeels.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {[...recentFeels].reverse().map((feel, i) => (
              <span
                key={i}
                className={`w-2.5 h-2.5 rounded-full ${FEEL_DOT[feel]}`}
                title={FEEL_LABELS[feel]}
              />
            ))}
          </div>
        )}
      </div>

      {/* Chevron */}
      <ChevronRight size={18} className="text-gray-300 flex-shrink-0" aria-hidden="true" />
    </Link>
  )
}
