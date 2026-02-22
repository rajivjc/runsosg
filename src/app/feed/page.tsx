import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDate, formatDistance, formatDuration } from '@/lib/utils/dates'

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
    ? await adminClient.from('users').select('role, name').eq('id', user.id).single()
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
      ? adminClient.from('users').select('id, name, email').in('id', coachIds)
      : Promise.resolve({ data: [] }),
  ])

  const athleteMap = Object.fromEntries((athletes ?? []).map((a: any) => [a.id, a.name]))
  const coachMap = Object.fromEntries(
    (coaches ?? []).map((u: any) => [u.id, u.name ?? u.email?.split('@')[0] ?? null])
  )

  const feed = (sessions ?? []).map((s: any) => ({
    ...s,
    athlete_name: athleteMap[s.athlete_id] ?? 'Unknown athlete',
    coach_name: coachMap[s.coach_user_id] ?? null,
  }))

  const groups = groupByDate(feed)

  const { data: milestones } = await adminClient
    .from('milestones')
    .select('id, athlete_id, session_id, label, achieved_at, athletes(name), milestone_definitions(icon)')
    .order('achieved_at', { ascending: false })
    .limit(20)

  console.log('combined today:', feed.filter((i: any) => i.date === '2026-02-22').map((i: any) => 'session:' + i.id))

  const milestonesBySession: Record<string, { icon: string; label: string }[]> = {}
  for (const m of milestones ?? []) {
    const anyM = m as any
    if (!anyM.session_id) continue
    if (!milestonesBySession[anyM.session_id]) milestonesBySession[anyM.session_id] = []
    milestonesBySession[anyM.session_id].push({
      icon: anyM.milestone_definitions?.icon ?? '',
      label: anyM.label,
    })
  }

  const thisWeek = feed.filter(s => {
    const d = new Date(s.date)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return d >= weekAgo
  })
  const weeklyKm = thisWeek.reduce((sum, s) => sum + (s.distance_km ?? 0), 0)
  const weeklyAthletes = new Set(thisWeek.map(s => s.athlete_id)).size

  // Coach card data
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  const { data: myMonthSessions } = user ? await adminClient
    .from('sessions')
    .select('id, athlete_id, feel, date')
    .eq('coach_user_id', user.id)
    .gte('date', monthStart)
    .eq('status', 'completed')
    : { data: [] }

  const myAthleteIds = [...new Set((myMonthSessions ?? []).map((s: any) => s.athlete_id))]
  const { data: myAthletes } = myAthleteIds.length > 0
    ? await adminClient.from('athletes').select('id, name').in('id', myAthleteIds)
    : { data: [] }

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const coachFirstName = (userRow as any)?.name?.split(' ')[0] ?? 'Coach'

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-32">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Club Activity Feed</h1>

      {!isReadOnly && (
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl px-4 py-4 mb-4">
          <p className="text-base font-bold text-gray-900 mb-3">
            {greeting}, {coachFirstName} 👋
          </p>
          {myMonthSessions?.length === 0 ? (
            <p className="text-sm text-teal-700">No sessions logged yet this month. Time to get running 🏃</p>
          ) : (
            <>
              <div className="space-y-2 mb-3">
                {myAthletes?.map((a: any) => {
                  const athleteSessions = (myMonthSessions ?? [])
                    .filter((s: any) => s.athlete_id === a.id)
                    .sort((x: any, y: any) => y.date.localeCompare(x.date))
                  const sessionCount = athleteSessions.length
                  const lastFeels = athleteSessions.slice(0, 3).map((s: any) => s.feel ? FEEL_EMOJI[s.feel] : '—')
                  return (
                    <div key={a.id} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800">{a.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-teal-600">{sessionCount} run{sessionCount !== 1 ? 's' : ''}</span>
                        <span className="text-sm tracking-wide">{lastFeels.join(' ')}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-teal-600 font-medium border-t border-teal-100 pt-2">
                You&apos;ve coached {myMonthSessions?.length} session{myMonthSessions?.length !== 1 ? 's' : ''} this month 💪
              </p>
            </>
          )}
        </div>
      )}

      {thisWeek.length > 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 mb-6 text-sm text-teal-800 font-medium">
          🏃 This week · {thisWeek.length} runs · {weeklyKm.toFixed(1)} km across {weeklyAthletes} athlete{weeklyAthletes !== 1 ? 's' : ''}
        </div>
      )}

      {feed.length === 0 && (
        <p className="text-center text-gray-400 py-12 text-sm">No sessions yet.</p>
      )}

      {Object.entries(groups).map(([label, items]) => {
        if (items.length === 0) return null
        return (
          <div key={label} className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{label}</p>
            <div className="space-y-3">
              {items.map((s: any) => {
                const borderClass = s.feel === 1 ? 'border-l-4 border-l-red-400'
                  : s.feel === 2 ? 'border-l-4 border-l-orange-400'
                  : 'border-l-4 border-l-transparent'
                const badges = milestonesBySession[s.id] ?? []
                const card = (
                  <div className={`bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 ${borderClass}`}>
                    <p className="text-sm font-medium text-gray-800 mb-1">
                      🏃 {s.coach_name ? `${s.coach_name} ran with` : 'Run with'} {s.athlete_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {s.distance_km != null && <span>{formatDistance(s.distance_km * 1000)}</span>}
                      {s.duration_seconds != null && <span>· {formatDuration(s.duration_seconds)}</span>}
                      {s.feel != null && <span>· {FEEL_EMOJI[s.feel]}</span>}
                    </div>
                    {s.note && (
                      <p className="text-xs text-gray-400 italic mt-1">&ldquo;{s.note}&rdquo;</p>
                    )}
                    {badges.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {badges.map((m, i) => (
                          <span key={i} className="inline-flex items-center gap-1 bg-teal-50 border border-teal-200 text-teal-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            {m.icon} {m.label}
                          </span>
                        ))}
                      </div>
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
