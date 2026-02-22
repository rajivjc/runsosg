import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { formatDistance, formatDuration } from '@/lib/utils/dates'

const FEEL_EMOJI: Record<number, string> = {
  1: '😰',
  2: '😐',
  3: '🙂',
  4: '😊',
  5: '🔥',
}

const SGT = 'Asia/Singapore'

type DateBucket = 'today' | 'yesterday' | 'this_week' | 'earlier'

function getDateBucket(dateStr: string): DateBucket {
  const now = new Date()
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: SGT })
  const sessionDateStr = new Date(dateStr).toLocaleDateString('en-CA', { timeZone: SGT })

  if (sessionDateStr === todayStr) return 'today'

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yestStr = yesterday.toLocaleDateString('en-CA', { timeZone: SGT })
  if (sessionDateStr === yestStr) return 'yesterday'

  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  if (new Date(dateStr) > weekAgo) return 'this_week'

  return 'earlier'
}

const BUCKET_LABELS: Record<DateBucket, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'This Week',
  earlier: 'Earlier',
}

const BUCKET_ORDER: DateBucket[] = ['today', 'yesterday', 'this_week', 'earlier']

interface FeedSession {
  id: string
  date: string
  athlete_id: string
  athlete_name: string | null
  coach_name: string | null
  distance_km: number | null
  duration_seconds: number | null
  feel: number | null
  note: string | null
}

export default async function FeedPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRow } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const isCaregiver = userRow?.role === 'caregiver'

  const { data: rawSessions } = await adminClient
    .from('sessions')
    .select('*, athletes(name), users(name)')
    .eq('status', 'completed')
    .order('date', { ascending: false })
    .limit(30)

  const sessions: FeedSession[] = (rawSessions ?? []).map((s: any) => ({
    id: s.id,
    date: s.date,
    athlete_id: s.athlete_id,
    athlete_name: (s.athletes as { name: string } | null)?.name ?? null,
    coach_name: (s.users as { name: string } | null)?.name ?? null,
    distance_km: s.distance_km ?? null,
    duration_seconds: s.duration_seconds ?? null,
    feel: s.feel ?? null,
    note: s.note ?? null,
  }))

  const grouped = sessions.reduce<Record<DateBucket, FeedSession[]>>(
    (acc, s) => {
      const bucket = getDateBucket(s.date)
      acc[bucket].push(s)
      return acc
    },
    { today: [], yesterday: [], this_week: [], earlier: [] },
  )

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-900">Club Activity Feed</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
        {sessions.length === 0 && (
          <p className="text-center text-gray-500 py-12">No completed sessions yet.</p>
        )}

        {BUCKET_ORDER.map((bucket) => {
          const items = grouped[bucket]
          if (items.length === 0) return null

          return (
            <section key={bucket}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                {BUCKET_LABELS[bucket]}
              </h2>
              <ul className="space-y-2">
                {items.map((s) => {
                  const cardContent = (
                    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 space-y-1 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🏃</span>
                        <span className="text-sm font-medium text-gray-900">
                          {s.coach_name ?? 'Coach'} ran with {s.athlete_name ?? 'Athlete'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 flex-wrap">
                        {s.distance_km != null && (
                          <span>{formatDistance(s.distance_km * 1000)}</span>
                        )}
                        {s.duration_seconds != null && (
                          <span>· {formatDuration(s.duration_seconds)}</span>
                        )}
                        {s.feel != null && FEEL_EMOJI[s.feel] && (
                          <span>· {FEEL_EMOJI[s.feel]}</span>
                        )}
                        {bucket === 'today' && (
                          <span className="text-gray-400">· Today</span>
                        )}
                      </div>
                      {s.note && (
                        <p className="text-sm text-gray-400 italic">&ldquo;{s.note}&rdquo;</p>
                      )}
                    </div>
                  )

                  return (
                    <li key={s.id}>
                      {isCaregiver ? (
                        <div>{cardContent}</div>
                      ) : (
                        <Link
                          href={`/athletes/${s.athlete_id}`}
                          className="block hover:opacity-90 transition-opacity"
                        >
                          {cardContent}
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </main>
  )
}
