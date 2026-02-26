import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDate, formatDistance, formatDuration } from '@/lib/utils/dates'
import KudosButton from '@/components/feed/KudosButton'
import { BADGE_DEFINITIONS } from '@/lib/badges'
import { getCoachFocusData, getCaregiverFocusData } from '@/lib/feed/today-focus'
import type { CoachFocusData, CaregiverFocusData } from '@/lib/feed/today-focus'
import CheerBox from '@/components/feed/CheerBox'
import { computeWeeklyRecap } from '@/lib/feed/weekly-recap'

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

function groupByDate(sessions: any[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(today.getDate() - 7)

  const groups: Record<string, any[]> = {
    'Today': [], 'Yesterday': [], 'This week': [], 'Earlier': [],
  }

  for (const s of sessions) {
    const d = new Date(s.date)
    d.setHours(0, 0, 0, 0)
    if (d.getTime() === today.getTime()) groups['Today'].push(s)
    else if (d.getTime() === yesterday.getTime()) groups['Yesterday'].push(s)
    else if (d >= weekAgo) groups['This week'].push(s)
    else groups['Earlier'].push(s)
  }
  return groups
}

export default async function FeedPage() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Start focus data fetches early — they run concurrently with the phases below
  let coachFocusPromise: Promise<CoachFocusData | null> = Promise.resolve(null)
  let caregiverFocusPromise: Promise<CaregiverFocusData | null> = Promise.resolve(null)

  // Phase 1: Fetch user role + sessions + milestones + club stats in parallel
  const [
    { data: userRow },
    { data: sessions },
    { data: milestones },
    { count: totalSessionCount },
    { data: totalDistanceRows },
    { count: totalAthleteCount },
    { count: totalMilestoneCount },
  ] = await Promise.all([
    user
      ? adminClient.from('users').select('role, name').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
    adminClient
      .from('sessions')
      .select('id, date, distance_km, duration_seconds, feel, note, athlete_id, coach_user_id, strava_title, avg_heart_rate, max_heart_rate')
      .eq('status', 'completed')
      .order('date', { ascending: false })
      .limit(30),
    adminClient
      .from('milestones')
      .select('id, athlete_id, session_id, label, achieved_at, athletes(name), milestone_definitions(icon)')
      .order('achieved_at', { ascending: false })
      .limit(20),
    adminClient.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    adminClient.from('sessions').select('distance_km').eq('status', 'completed'),
    adminClient.from('athletes').select('*', { count: 'exact', head: true }).eq('active', true),
    adminClient.from('milestones').select('*', { count: 'exact', head: true }),
  ])

  const isReadOnly = userRow?.role === 'caregiver'
  const totalKm = (totalDistanceRows ?? []).reduce((sum: number, s: any) => sum + (s.distance_km ?? 0), 0)

  // Kick off focus data (runs concurrently with Phase 2+3)
  if (user && !isReadOnly) {
    coachFocusPromise = getCoachFocusData(user.id)
  }

  // Phase 2: Fetch athlete/coach names, kudos, and role-specific data in parallel
  const athleteIds = [...new Set((sessions ?? []).map((s: any) => s.athlete_id).filter(Boolean))]
  const coachIds = [...new Set((sessions ?? []).map((s: any) => s.coach_user_id).filter(Boolean))]
  const sessionIds = (sessions ?? []).map((s: any) => s.id)

  const [
    { data: athletes },
    { data: coaches },
    { data: kudosCounts },
    { data: myKudos },
    { data: myMonthSessions },
    { data: caregiverData },
    { data: myBadges },
    { data: recentCheers },
  ] = await Promise.all([
    athleteIds.length > 0
      ? adminClient.from('athletes').select('id, name').in('id', athleteIds)
      : Promise.resolve({ data: [] }),
    coachIds.length > 0
      ? adminClient.from('users').select('id, name, email').in('id', coachIds)
      : Promise.resolve({ data: [] }),
    sessionIds.length > 0
      ? adminClient.from('kudos').select('session_id').in('session_id', sessionIds)
      : Promise.resolve({ data: [] }),
    sessionIds.length > 0 && user
      ? adminClient.from('kudos').select('session_id').in('session_id', sessionIds).eq('user_id', user.id)
      : Promise.resolve({ data: [] }),
    user && !isReadOnly
      ? adminClient.from('sessions').select('id, athlete_id, feel, date').eq('coach_user_id', user.id).gte('date', monthStart).eq('status', 'completed')
      : Promise.resolve({ data: [] }),
    isReadOnly && user
      ? adminClient.from('athletes').select('id, name').eq('caregiver_user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    user && !isReadOnly
      ? adminClient.from('coach_badges').select('badge_key, earned_at').eq('user_id', user.id).order('earned_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    user && !isReadOnly
      ? adminClient
          .from('cheers')
          .select('id, athlete_id, message, created_at')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(10)
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

  const milestonesBySession: Record<string, { id: string; icon: string; label: string }[]> = {}
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentMilestones: { id: string; icon: string; label: string; athleteName: string; achievedAt: string; athleteId: string }[] = []
  for (const m of milestones ?? []) {
    const anyM = m as any
    if (anyM.session_id) {
      if (!milestonesBySession[anyM.session_id]) milestonesBySession[anyM.session_id] = []
      milestonesBySession[anyM.session_id].push({
        id: anyM.id,
        icon: anyM.milestone_definitions?.icon ?? '',
        label: anyM.label,
      })
    }
    if (new Date(anyM.achieved_at) >= thirtyDaysAgo) {
      recentMilestones.push({
        id: anyM.id,
        icon: anyM.milestone_definitions?.icon ?? '🏆',
        label: anyM.label,
        athleteName: anyM.athletes?.name ?? 'An athlete',
        achievedAt: anyM.achieved_at,
        athleteId: anyM.athlete_id,
      })
    }
  }

  const kudosCountMap: Record<string, number> = {}
  for (const k of kudosCounts ?? []) {
    kudosCountMap[k.session_id] = (kudosCountMap[k.session_id] ?? 0) + 1
  }
  const myKudosSet = new Set((myKudos ?? []).map((k: any) => k.session_id))

  const thisWeek = feed.filter(s => {
    const d = new Date(s.date)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return d >= weekAgo
  })
  const weeklyKm = thisWeek.reduce((sum, s) => sum + (s.distance_km ?? 0), 0)
  const weeklyAthletes = new Set(thisWeek.map(s => s.athlete_id)).size

  // Compute weekly recap from already-fetched data (no new queries)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  weekAgo.setHours(0, 0, 0, 0)
  const weeklyRecap = computeWeeklyRecap(
    thisWeek.map(s => ({ athlete_id: s.athlete_id, athlete_name: s.athlete_name, distance_km: s.distance_km, feel: s.feel })),
    recentMilestones.map(m => ({ achievedAt: m.achievedAt })),
    weekAgo
  )

  // Phase 3: Fetch remaining role-specific data that depends on previous results
  const myAthleteIds = [...new Set((myMonthSessions ?? []).map((s: any) => s.athlete_id))]
  const { data: myAthletes } = myAthleteIds.length > 0
    ? await adminClient.from('athletes').select('id, name').in('id', myAthleteIds)
    : { data: [] }

  // Caregiver card data
  const caregiverAthlete = caregiverData ?? null
  if (caregiverAthlete) {
    caregiverFocusPromise = getCaregiverFocusData(caregiverAthlete.id)
  }
  let caregiverRecentSessions: any[] = []
  let caregiverMilestones: any[] = []
  let caregiverRecentNotes: any[] = []
  let cheerSentToday = false
  if (caregiverAthlete) {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const [
      { data: recentSessions },
      { data: cgMilestones },
      { data: cgNotes },
      { count: cheerTodayCount },
    ] = await Promise.all([
      adminClient
        .from('sessions')
        .select('id, date, distance_km, feel')
        .eq('athlete_id', caregiverAthlete.id)
        .eq('status', 'completed')
        .gte('date', monthStart)
        .order('date', { ascending: false }),
      adminClient
        .from('milestones')
        .select('id, label, achieved_at, milestone_definitions(icon)')
        .eq('athlete_id', caregiverAthlete.id)
        .order('achieved_at', { ascending: false })
        .limit(5),
      adminClient
        .from('coach_notes')
        .select('content, created_at')
        .eq('athlete_id', caregiverAthlete.id)
        .eq('visibility', 'all')
        .order('created_at', { ascending: false })
        .limit(3),
      user
        ? adminClient.from('cheers').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', todayStart.toISOString())
        : Promise.resolve({ count: 0 }),
    ])
    caregiverRecentSessions = recentSessions ?? []
    caregiverMilestones = cgMilestones ?? []
    caregiverRecentNotes = cgNotes ?? []
    cheerSentToday = (cheerTodayCount ?? 0) > 0
  }

  // Recent badge (earned in last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentBadge = (myBadges ?? []).find((b: any) => new Date(b.earned_at) >= sevenDaysAgo)
  const recentBadgeDef = recentBadge ? BADGE_DEFINITIONS.find(d => d.key === recentBadge.badge_key) : null
  const badgeCount = (myBadges ?? []).length

  // Await focus data (likely already resolved by now)
  const coachFocus = await coachFocusPromise
  const caregiverFocus = await caregiverFocusPromise

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = (userRow as any)?.name?.split(' ')[0] ?? (isReadOnly ? 'there' : 'Coach')

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-28">
      {/* Coach greeting card */}
      {!isReadOnly && (
        <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200/60 rounded-2xl px-5 py-5 mb-5 shadow-sm">
          <p className="text-lg font-bold text-gray-900 mb-1">
            {greeting}, {firstName}
          </p>
          {coachFocus && coachFocus.streak.current > 0 && (
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm">🔥</span>
              <span className="text-sm font-semibold text-teal-700">
                {coachFocus.streak.current}-week streak
              </span>
              {!coachFocus.streak.activeThisWeek && (
                <span className="text-xs text-teal-500/70">· Log a run to keep it!</span>
              )}
            </div>
          )}
          {myMonthSessions?.length === 0 ? (
            <p className="text-sm text-teal-700">
              No sessions this month yet — let&apos;s get out there!
            </p>
          ) : (
            <>
              <p className="text-sm text-teal-700 mb-3">
                {myMonthSessions?.length} session{myMonthSessions?.length !== 1 ? 's' : ''} coached this month with {myAthletes?.length} athlete{myAthletes?.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between px-3 mb-1">
                  <span className="text-[10px] font-semibold text-teal-600/70 uppercase tracking-wider">Athlete</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-semibold text-teal-600/70 uppercase tracking-wider">Runs</span>
                    <span className="text-[10px] font-semibold text-teal-600/70 uppercase tracking-wider w-16 text-right">Recent feel</span>
                  </div>
                </div>
                {myAthletes?.map((a: any) => {
                  const athleteSessions = (myMonthSessions ?? [])
                    .filter((s: any) => s.athlete_id === a.id)
                    .sort((x: any, y: any) => y.date.localeCompare(x.date))
                  const sessionCount = athleteSessions.length
                  const lastFeels = athleteSessions.slice(0, 3).map((s: any) => s.feel ? FEEL_EMOJI[s.feel] : '—')
                  return (
                    <div key={a.id} className="flex items-center justify-between bg-white/50 rounded-lg px-3 py-2">
                      <span className="text-sm font-medium text-gray-800">{a.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-teal-600 font-medium">{sessionCount}</span>
                        <div className="flex items-center gap-0.5 w-16 justify-end">
                          {lastFeels.map((emoji, i) => (
                            <span key={i} className="text-sm" title={`Feel score from recent run ${i + 1}`}>
                              {emoji}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
          {/* Badge celebration + count */}
          {recentBadgeDef && (
            <div className="mt-3 bg-white/50 rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="text-xl">{recentBadgeDef.icon}</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-teal-800">New badge: {recentBadgeDef.label}!</p>
                <p className="text-[10px] text-teal-600">{recentBadgeDef.description}</p>
              </div>
            </div>
          )}
          {!recentBadgeDef && badgeCount > 0 && (
            <div className="mt-3 flex items-center gap-1.5">
              {(myBadges ?? []).slice(0, 6).map((b: any) => {
                const def = BADGE_DEFINITIONS.find(d => d.key === b.badge_key)
                return def ? <span key={b.badge_key} className="text-sm" title={def.label}>{def.icon}</span> : null
              })}
              <Link href="/account" className="text-[10px] text-teal-600 hover:text-teal-700 font-medium ml-1">
                {badgeCount} badge{badgeCount !== 1 ? 's' : ''} earned
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Caregiver greeting card */}
      {isReadOnly && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl px-5 py-5 mb-5 shadow-sm">
          <p className="text-lg font-bold text-gray-900 mb-1">
            {greeting}, {firstName}
          </p>
          {caregiverAthlete ? (
            <>
              {caregiverRecentSessions.length === 0 ? (
                <p className="text-sm text-amber-700 mb-3">
                  No runs logged for {caregiverAthlete.name} this month yet — stay tuned!
                </p>
              ) : (
                <>
                  <p className="text-sm text-amber-700 mb-3">
                    Here&apos;s how {caregiverAthlete.name} is doing this month
                  </p>
                  <div className="flex items-center gap-4 bg-white/50 rounded-lg px-4 py-3 mb-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{caregiverRecentSessions.length}</p>
                      <p className="text-xs text-amber-600 font-medium">run{caregiverRecentSessions.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="w-px self-stretch bg-amber-200/60" />
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">
                        {caregiverRecentSessions.reduce((sum: number, s: any) => sum + (s.distance_km ?? 0), 0).toFixed(1)}
                      </p>
                      <p className="text-xs text-amber-600 font-medium">km</p>
                    </div>
                    <div className="w-px self-stretch bg-amber-200/60" />
                    <div className="text-center">
                      <div className="flex items-center gap-0.5 justify-center">
                        {caregiverRecentSessions.slice(0, 5).map((s: any, i: number) => (
                          <span key={i} className="text-lg">{s.feel ? FEEL_EMOJI[s.feel] : '—'}</span>
                        ))}
                      </div>
                      <p className="text-xs text-amber-600 font-medium">recent feels</p>
                    </div>
                  </div>
                </>
              )}

              {/* Milestones earned */}
              {caregiverMilestones.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Milestones</p>
                  <div className="flex flex-wrap gap-1.5">
                    {caregiverMilestones.map((m: any) => (
                      <Link key={m.id} href={`/milestone/${m.id}`}>
                        <span className="inline-flex items-center gap-1 bg-white/70 hover:bg-white border border-amber-200 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors">
                          {(m as any).milestone_definitions?.icon ?? '🏆'} {m.label}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Next milestone progress */}
              {caregiverFocus?.nextMilestone && (
                <div className="mb-3">
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Next milestone</p>
                  <div className="bg-white/50 rounded-lg px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-gray-800">
                        {caregiverFocus.nextMilestone.icon} {caregiverFocus.nextMilestone.label}
                      </span>
                      <span className="text-[10px] text-amber-600 font-medium">
                        {caregiverFocus.nextMilestone.current}/{caregiverFocus.nextMilestone.target}
                      </span>
                    </div>
                    <div className="w-full bg-amber-100 rounded-full h-1.5">
                      <div
                        className="bg-amber-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.round((caregiverFocus.nextMilestone.current / caregiverFocus.nextMilestone.target) * 100))}%` }}
                      />
                    </div>
                    {(caregiverFocus.nextMilestone.target - caregiverFocus.nextMilestone.current) <= 2 && (
                      <p className="text-[10px] text-amber-600 mt-1">
                        Just {caregiverFocus.nextMilestone.target - caregiverFocus.nextMilestone.current} more run{(caregiverFocus.nextMilestone.target - caregiverFocus.nextMilestone.current) !== 1 ? 's' : ''} to go!
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Recent coach notes (visibility: all) */}
              {caregiverRecentNotes.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Coach notes</p>
                  <div className="space-y-1.5">
                    {caregiverRecentNotes.map((n: any, i: number) => (
                      <p key={i} className="text-xs text-amber-800 bg-white/50 rounded-lg px-3 py-2 italic line-clamp-2">
                        &ldquo;{n.content}&rdquo;
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Journey story link */}
              <div className="mt-3 text-center">
                <Link
                  href={`/story/${caregiverAthlete.id}`}
                  className="text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors"
                >
                  View {caregiverAthlete.name?.split(' ')[0]}&apos;s journey story &rarr;
                </Link>
              </div>

              {/* Send a cheer */}
              <div className="mt-3 pt-3 border-t border-amber-200/40">
                <CheerBox
                  athleteId={caregiverAthlete.id}
                  athleteFirstName={caregiverAthlete.name?.split(' ')[0] ?? 'your athlete'}
                  alreadySentToday={cheerSentToday}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-amber-700">
              Welcome to the SOSG Running Club! Your athlete hasn&apos;t been linked yet — please ask a coach.
            </p>
          )}
        </div>
      )}

      {/* Cheers from home — coaches see recent cheers from caregivers */}
      {!isReadOnly && (recentCheers ?? []).length > 0 && (
        <div className="bg-amber-50/40 border border-amber-100 rounded-xl px-4 py-3 mb-5 shadow-sm">
          <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-2.5">Cheers from home 📣</p>
          <div className="space-y-2">
            {(recentCheers ?? []).map((c: any) => (
              <Link key={c.id} href={`/athletes/${c.athlete_id}`}>
                <div className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-amber-50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm text-amber-800">&ldquo;{c.message}&rdquo;</p>
                    <p className="text-[10px] text-amber-400">
                      for {athleteMap[c.athlete_id] ?? 'an athlete'} · {formatDate(c.created_at)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Today's Focus — only shown when there are actionable items */}
      {!isReadOnly && coachFocus && coachFocus.items.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 mb-5 shadow-sm">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Today&apos;s focus</p>
          <div className="space-y-2">
            {coachFocus.items.map((item, i) => (
              <Link key={i} href={`/athletes/${item.athleteId}`}>
                <div className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors">
                  <span className="text-base flex-shrink-0">{item.type === 'approaching_milestone' ? '⭐' : item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.subtitle}</p>
                  </div>
                  <span className="text-gray-300 flex-shrink-0 text-sm">&#x203A;</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent milestones celebration */}
      {recentMilestones.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200/60 rounded-2xl px-5 py-4 mb-5 shadow-sm">
          <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-3">Recent milestones</p>
          <div className="space-y-2">
            {recentMilestones.slice(0, 5).map((m) => (
              <Link key={m.id} href={`/milestone/${m.id}`}>
                <div className="flex items-center gap-3 bg-white/60 rounded-lg px-3 py-2 hover:bg-white/80 transition-colors">
                  <span className="text-xl flex-shrink-0">{m.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{m.athleteName}</p>
                    <p className="text-xs text-amber-700">{m.label}</p>
                  </div>
                  <p className="text-[10px] text-amber-400 flex-shrink-0">{formatDate(m.achievedAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Weekly club summary */}
      {thisWeek.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 mb-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🏃</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {thisWeek.length} run{thisWeek.length !== 1 ? 's' : ''} this week
              </p>
              <p className="text-xs text-gray-500">
                {weeklyKm.toFixed(1)} km across {weeklyAthletes} athlete{weeklyAthletes !== 1 ? 's' : ''} — growing together
              </p>
            </div>
          </div>
          {(weeklyRecap.starMoment || weeklyRecap.milestonesEarned > 0) && (
            <div className="mt-2 pt-2 border-t border-gray-50 space-y-1">
              {weeklyRecap.starMoment && (
                <p className="text-xs text-teal-600">
                  ⭐ {weeklyRecap.starMoment.athleteName} {weeklyRecap.starMoment.value}
                </p>
              )}
              {weeklyRecap.milestonesEarned > 0 && (
                <p className="text-xs text-amber-600">
                  🏆 {weeklyRecap.milestonesEarned} milestone{weeklyRecap.milestonesEarned !== 1 ? 's' : ''} earned this week
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Club statistics */}
      {(totalSessionCount ?? 0) > 0 && (
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200/60 rounded-xl px-4 py-4 mb-5 shadow-sm">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Club stats — all time</p>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center">
              <p className="text-2xl font-extrabold text-gray-900">{totalSessionCount}</p>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">runs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-extrabold text-gray-900">{totalKm.toFixed(1)}</p>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">km</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-extrabold text-gray-900">{totalAthleteCount ?? 0}</p>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">athletes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-extrabold text-gray-900">{totalMilestoneCount ?? 0}</p>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">milestones</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {feed.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">👟</p>
          <p className="text-base font-semibold text-gray-900 mb-1">The club is quiet today</p>
          <p className="text-sm text-gray-500">Be the first to log a run!</p>
        </div>
      )}

      {/* Session groups */}
      {Object.entries(groups).map(([label, items]) => {
        if (items.length === 0) return null
        return (
          <div key={label} className="mb-6">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 mt-1">{label}</p>
            <div className="space-y-3">
              {items.map((s: any) => {
                const hasMilestone = (milestonesBySession[s.id] ?? []).length > 0
                const feelColor = s.feel ? (FEEL_BORDER[s.feel] ?? 'border-l-gray-200') : 'border-l-gray-200'
                const badges = milestonesBySession[s.id] ?? []
                const cardBg = hasMilestone ? 'bg-amber-50/40' : 'bg-white'
                const card = (
                  <div className={`${cardBg} rounded-xl border border-gray-100 shadow-sm px-3.5 py-3 border-l-[5px] ${feelColor} hover:shadow-md transition-shadow`}>
                    {/* Strava title — shown when present (e.g. race name) */}
                    {s.strava_title && (
                      <p className="text-xs font-semibold text-orange-600 mb-1 truncate">{s.strava_title}</p>
                    )}
                    {/* Header: coach + athlete + stats inline */}
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
                    {/* Stats row — duration + HR + date */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {s.duration_seconds != null && (
                        <span className="text-xs text-gray-500 font-medium">{formatDuration(s.duration_seconds)}</span>
                      )}
                      {s.avg_heart_rate != null && (
                        <span className="text-xs font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
                          {s.avg_heart_rate} bpm{s.max_heart_rate != null ? ` / ${s.max_heart_rate} max` : ''}
                        </span>
                      )}
                      <p className="text-xs text-gray-400">{formatDate(s.date)}</p>
                    </div>
                    {/* Note */}
                    {s.note && (
                      <p className="text-xs text-gray-500 italic mt-1.5 line-clamp-1">&ldquo;{s.note}&rdquo;</p>
                    )}
                    {/* Milestone badges — unified amber style with share links */}
                    {badges.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {badges.map((m, i) => (
                          <span key={i} className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                            {m.icon || '🏆'} {m.label}
                            {m.id && (
                              <Link
                                href={`/milestone/${m.id}`}
                                className="ml-0.5 text-amber-400 hover:text-amber-600"
                                title="Share this milestone"
                              >
                                ↗
                              </Link>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Kudos / high five — available to all logged-in users including caregivers */}
                    {user && (
                      <div className="mt-2 pt-1.5 border-t border-gray-100">
                        <KudosButton
                          sessionId={s.id}
                          initialCount={kudosCountMap[s.id] ?? 0}
                          initialGiven={myKudosSet.has(s.id)}
                        />
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
