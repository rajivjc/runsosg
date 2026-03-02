import SessionCard from '@/components/feed/SessionCard'
import type { FeedSession, MilestoneBadge } from '@/lib/feed/types'

interface Props {
  label: string
  sessions: FeedSession[]
  milestonesBySession: Record<string, MilestoneBadge[]>
  kudosCounts: Record<string, number>
  myKudos: Set<string>
  isReadOnly: boolean
  userId: string | null
}

export default function SessionGroup({
  label,
  sessions,
  milestonesBySession,
  kudosCounts,
  myKudos,
  isReadOnly,
  userId,
}: Props) {
  if (sessions.length === 0) return null

  return (
    <div className="mb-6">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 mt-1">{label}</p>
      <div className="space-y-3">
        {sessions.map(s => (
          <SessionCard
            key={s.id}
            session={s}
            badges={milestonesBySession[s.id] ?? []}
            kudosCount={kudosCounts[s.id] ?? 0}
            myKudos={myKudos.has(s.id)}
            isReadOnly={isReadOnly}
            userId={userId}
          />
        ))}
      </div>
    </div>
  )
}
