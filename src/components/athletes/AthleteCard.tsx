'use client'

import Link from 'next/link'
import type { AthleteListItem } from '@/app/athletes/page'
import { formatDate } from '@/lib/utils/dates'

export type AthleteCardProps = AthleteListItem

const FEEL_DOT: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-orange-400',
  3: 'bg-yellow-400',
  4: 'bg-green-400',
  5: 'bg-green-500',
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
      className="flex items-center gap-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-shadow"
    >
      {/* Avatar */}
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={name}
          className="rounded-full w-14 h-14 object-cover flex-shrink-0"
        />
      ) : (
        <div className="rounded-full w-14 h-14 bg-teal-100 flex items-center justify-center text-teal-700 font-semibold text-lg flex-shrink-0">
          {getInitials(name)}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{name}</p>
        <p className="text-sm text-gray-500">{totalSessions} sessions</p>
        <p className="text-sm text-gray-400">
          {lastSessionDate
            ? `Last run: ${formatDate(lastSessionDate)}`
            : 'No runs yet'}
        </p>
        {recentFeels.length > 0 && (
          <div className="flex items-center gap-1 mt-1">
            {[...recentFeels].reverse().map((feel, i) => (
              <span key={i} className={`w-2 h-2 rounded-full ${FEEL_DOT[feel]}`} />
            ))}
          </div>
        )}
      </div>

      {/* Chevron */}
      <span className="flex-shrink-0 w-5 h-5 block">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          className="text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </Link>
  )
}
