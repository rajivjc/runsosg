import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDistance, formatDuration } from '@/lib/utils/dates'

const FEEL_EMOJI: Record<number, string> = {
  1: '😰', 2: '😐', 3: '🙂', 4: '😊', 5: '🔥',
}

function groupByDate(sessions: any[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(today.getDate() - 7)

  const groups: Record<string, any[]> = {
    'TODAY': [], 'YESTERDAY': [], 'THIS WEEK': [], 'EARLIER': [],
  }

  for (const s of sessions) {
    const d = new Date(s.date)
    d.setHours(0, 0, 0, 0)
    if (d.getTime() === today.getTime()) groups['TODAY'].push(s)
    else if (d.getTime() === yesterday.getTime()) groups['YESTERDAY'].push(s)
    else if (d >= weekAgo) groups['THIS WEEK'].push(s)
    else groups['EARLIER'].push(s)
  }
  return groups
}

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: userRow } = user
    ? await adminClient.from('users').select('role').eq('id', user.id).single()
    : { data: null }

  const isReadOnly = userRow?.role === 'caregiver'

  const { data: sessions, error } = await adminClient
    .from('sessions')
    .select('id, date, distance_km, duration_seconds, feel, note, athlete_id, coach_user_id')
    .eq('status', 'completed')
    .order('date', { ascending: false })
    .limit(30)

  console.log('feed sessions:', sessions?.length, 'error:', error?.message)

  // Fetch athlete and coach names separately
  const athleteIds = [...new Set((sessions ?? []).map((s: any) => s.athlete_id).filter(Boolean))]
  const coachIds = [...new Set((sessions ?? []).map((s: any) => s.coach_user_id).filter(Boolean))]

  const [{ data: athletes }, { data: coaches }] = await Promise.all([
    athleteIds.length > 0
      ? adminClient.from('athletes').select('id, name').in('id', athleteIds)
      : Promise.resolve({ data: [] }),
    coachIds.length > 0
      ? adminClient.from('users').select('id, name').in('id', coachIds)
      : Promise.resolve({ data: [] }),
  ])

  const athleteMap = Object.fromEntries((athletes ?? []).map((a: any) => [a.id, a.name]))
  const coachMap = Object.fromEntries((coaches ?? []).map((u: any) => [u.id, u.name]))

  const feed = (sessions ?? []).map((s: any) => ({
    ...s,
    athlete_name: athleteMap[s.athlete_id] ?? 'Unknown athlete',
    coach_name: coachMap[s.coach_user_id] ?? 'Unknown coach',
  }))

  const groups = groupByDate(feed)

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-32">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Club Activity Feed</h1>

      {feed.length === 0 && (
        <p className="text-center text-gray-400 py-12 text-sm">No sessions yet.</p>
      )}

      {Object.entries(groups).map(([label, items]) => {
        if (items.length === 0) return null
        return (
          <div key={label} className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{label}</p>
            <div className="space-y-3">
              {items.map((s) => {
                const card = (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
                    <p className="text-sm font-medium text-gray-800 mb-1">
                      🏃 {s.coach_name} ran with {s.athlete_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {s.distance_km != null && <span>{formatDistance(s.distance_km * 1000)}</span>}
                      {s.duration_seconds != null && <span>· {formatDuration(s.duration_seconds)}</span>}
                      {s.feel != null && <span>· {FEEL_EMOJI[s.feel]}</span>}
                    </div>
                    {s.note && (
                      <p className="text-xs text-gray-400 italic mt-1">&ldquo;{s.note}&rdquo;</p>
                    )}
                  </div>
                )
                return isReadOnly ? (
                  <div key={s.id}>{card}</div>
                ) : (
                  <Link key={s.id} href={`/athletes/${s.athlete_id}`}>{card}</Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </main>
  )
}
