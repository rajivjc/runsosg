import Link from 'next/link'
import { formatDate, formatDistance, formatDuration } from '@/lib/utils/dates'
import KudosButton from '@/components/feed/KudosButton'
import MilestoneShareLink from '@/components/feed/MilestoneShareLink'
import type { FeedSession, MilestoneBadge } from '@/lib/feed/types'

const FEEL_EMOJI: Record<number, string> = {
  1: '😰', 2: '😐', 3: '🙂', 4: '😊', 5: '🔥',
}

const FEEL_BORDER: Record<number, string> = {
  1: 'border-l-red-400',
  2: 'border-l-orange-400',
  3: 'border-l-yellow-400',
  4: 'border-l-green-400',
  5: 'border-l-teal-500',
}

interface Props {
  session: FeedSession
  badges: MilestoneBadge[]
  kudosCount: number
  myKudos: boolean
  isReadOnly: boolean
  userId: string | null
}

export default function SessionCard({ session: s, badges, kudosCount, myKudos, isReadOnly, userId }: Props) {
  const hasMilestone = badges.length > 0
  const feelColor = s.feel ? (FEEL_BORDER[s.feel] ?? 'border-l-gray-200') : 'border-l-gray-200'
  const cardBg = hasMilestone ? 'bg-amber-50/40' : 'bg-white'

  const card = (
    <div className={`${cardBg} rounded-xl border border-gray-100 shadow-sm px-3.5 py-3 border-l-[5px] ${feelColor} hover:shadow-md transition-shadow`}>
      {s.strava_title && (
        <p className="text-xs font-semibold text-orange-600 mb-1 truncate">{s.strava_title}</p>
      )}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 leading-tight">
            {s.coach_name ? `${s.coach_name} ran with` : 'Run with'}
          </p>
          <p className="text-sm font-bold text-gray-900 truncate">{s.athlete_name}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {s.distance_km != null && (
            <span className="text-lg font-bold text-gray-900 leading-none">{formatDistance(s.distance_km * 1000)}</span>
          )}
          {s.feel != null && (
            <span className="text-lg flex-shrink-0">{FEEL_EMOJI[s.feel]}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {s.duration_seconds != null && (
          <span className="text-xs text-gray-500 font-medium">{formatDuration(s.duration_seconds)}</span>
        )}
        <p className="text-xs text-gray-400">{formatDate(s.date)}</p>
      </div>
      {s.note && (
        <p className="text-xs text-gray-500 italic mt-1.5 line-clamp-1">&ldquo;{s.note}&rdquo;</p>
      )}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {badges.map((m, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">
              {m.icon || '🏆'} {m.label}
              {m.id && <MilestoneShareLink milestoneId={m.id} />}
            </span>
          ))}
        </div>
      )}
      {userId && (
        <div className="mt-2 pt-1.5 border-t border-gray-100">
          <KudosButton
            sessionId={s.id}
            initialCount={kudosCount}
            initialGiven={myKudos}
          />
        </div>
      )}
    </div>
  )

  return (
    <Link href={`/athletes/${s.athlete_id}`}>{card}</Link>
  )
}
