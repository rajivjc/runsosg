import SessionCard from '@/components/feed/SessionCard'
import type { FeedSession, MilestoneBadge } from '@/lib/feed/types'

interface Props {
  label: string
  sessions: FeedSession[]
  milestonesBySession: Record<string, MilestoneBadge[]>
  kudosCounts: Record<string, number>
  kudosGivers?: Record<string, string[]>
  myKudos: Set<string>
  isReadOnly: boolean
  userId: string | null
}

export default function SessionGroup({
  label,
  sessions,
  milestonesBySession,
  kudosCounts,
  kudosGivers,
  myKudos,
  isReadOnly,
  userId,
}: Props) {
  if (sessions.length === 0) return null

  return (
    <div className="mb-6">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 mt-1">{label}</p>
      <div className="space-y-3">
        {sessions.map((s, i) => (
          <div key={s.id} className="animate-list-item" style={{ animationDelay: `${i * 50}ms` }}>
            <SessionCard
              session={s}
              badges={milestonesBySession[s.id] ?? []}
              kudosCount={kudosCounts[s.id] ?? 0}
              kudosGivers={kudosGivers?.[s.id]}
              myKudos={myKudos.has(s.id)}
              isReadOnly={isReadOnly}
              userId={userId}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
