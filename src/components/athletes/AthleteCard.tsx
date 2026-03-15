'use client'

import Link from 'next/link'
import Image from 'next/image'
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

export function isInactive(lastSessionDate: string | null): boolean {
  if (!lastSessionDate) return true
  const last = new Date(lastSessionDate)
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  return last < twoWeeksAgo
}

export default function AthleteCard({
  id,
  name,
  photoUrl,
  totalSessions,
  lastSessionDate,
  recentFeels,
}: AthleteCardProps) {
  const needsAttention = isInactive(lastSessionDate)

  return (
    <Link
      href={`/athletes/${id}`}
      className={`flex items-center gap-4 rounded-xl shadow-sm p-4 hover:shadow-md active:scale-[0.98] transition-all duration-200 ${
        needsAttention
          ? 'bg-amber-50/60 border border-amber-200/80 hover:border-amber-300'
          : 'bg-white border border-gray-100 hover:border-gray-200'
      }`}
    >
      {/* Avatar */}
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={name}
          width={48}
          height={48}
          unoptimized
          className="rounded-full w-12 h-12 object-cover flex-shrink-0"
        />
      ) : (
        <div className={`rounded-full w-12 h-12 flex items-center justify-center font-semibold text-base flex-shrink-0 ${
          needsAttention ? 'bg-amber-100 text-amber-700' : 'bg-teal-50 text-teal-600'
        }`}>
          {getInitials(name)}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm text-gray-500">{totalSessions} run{totalSessions !== 1 ? 's' : ''}</span>
          {lastSessionDate ? (
            <>
              <span className="text-gray-300">·</span>
              <span className={`text-sm ${needsAttention ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                Last run {formatDate(lastSessionDate)}
              </span>
            </>
          ) : (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-sm text-amber-600 font-medium">No runs yet</span>
            </>
          )}
        </div>
        {recentFeels.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[10px] text-gray-400 font-medium mr-0.5">Recent feel</span>
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
