/**
 * Caregiver feed data loader.
 *
 * Uses Supabase joins, DB-level aggregation (RPCs), and shared helpers
 * to minimise query count and payload size.
 */

import { adminClient } from '@/lib/supabase/admin'
import { getCaregiverFocusData } from '@/lib/feed/today-focus'
import { computeWeeklyRecap } from '@/lib/feed/weekly-recap'
import { computeCaregiverOnboardingState } from '@/lib/onboarding'
import { groupByDate } from '@/lib/feed/utils'
import { loadClubStats } from '@/lib/feed/shared-queries'
import { calculateStreakDetails } from '@/lib/streaks'
import { getCaregiverDigestData } from '@/lib/digest/data'
import { generateCaregiverNarrative, generateTeaserText } from '@/lib/digest/narrative'
import { calculateGoalProgress } from '@/lib/goals'
import type { GoalType } from '@/lib/goals'
import type { ProgressLevel } from '@/lib/supabase/types'
import type {
  CaregiverFeedData,
  FeedSession,
  MilestoneBadge,
  CelebrationMilestone,
  FeedCheer,
} from '@/lib/feed/types'

export async function loadCaregiverFeedData(userId: string): Promise<CaregiverFeedData> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoStr = weekAgo.toISOString().split('T')[0]

  // ─── Batch 1: User + feed (with joins) + milestones + caregiver's athlete ──
  const [
    { data: userRow },
    { data: rawSessions },
    { data: rawMilestones },
    { data: caregiverAthlete },
    clubStats,
    { data: weeklyStatsResult },
  ] = await Promise.all([
    adminClient.from('users').select('role, name').eq('id', userId).single(),
    // Issue 3: Supabase joins fetch athlete + coach names in one query
    adminClient
      .from('sessions')
      .select('id, date, distance_km, duration_seconds, feel, note, athlete_id, coach_user_id, strava_title, athletes(name), users!sessions_coach_user_id_fkey(name)')
      .eq('status', 'completed')
      .is('strava_deleted_at', null)
      .order('date', { ascending: false })
      .limit(30),
    adminClient
      .from('milestones')
      .select('id, athlete_id, session_id, label, achieved_at, awarded_by, athletes(name, theme_color, avatar), milestone_definitions(icon)')
      .order('achieved_at', { ascending: false })
      .limit(20),
    adminClient.from('athletes').select('id, name, allow_public_sharing, sharing_disabled_by_caregiver, working_on, recent_progress, working_on_updated_at, working_on_updated_by, avatar, goal_type, goal_target, running_goal').eq('caregiver_user_id', userId).maybeSingle(),
    // Issue 1 & 2: Shared helper for club stats (includes get_total_km RPC)
    loadClubStats(),
    // Issue 8: DB-level weekly stats instead of JS filtering
    adminClient.rpc('get_weekly_stats', { since: weekAgoStr }),
  ])

  // Start caregiver focus concurrently if athlete exists
  const caregiverFocusPromise = caregiverAthlete
    ? getCaregiverFocusData(caregiverAthlete.id).catch(() => null)
    : Promise.resolve(null)

  // ─── Batch 2: Kudos + caregiver-specific data (athlete/coach names from joins) ──
  const sessions = rawSessions ?? []
  const sessionIds = sessions.map(s => s.id)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [
    { data: kudosRows },
    { data: myKudosRows },
    { data: cgSessions },
    { data: cgMilestones },
    { data: cgNotes },
    { count: cheerTodayCount },
    { data: sentCheers },
    { data: athleteSessionDates },
    { data: focusAreasRows },
  ] = await Promise.all([
    // Kudos counts
    sessionIds.length > 0
      ? adminClient.from('kudos').select('session_id, user_id').in('session_id', sessionIds)
      : Promise.resolve({ data: [] as { session_id: string; user_id: string }[] }),
    // My kudos
    sessionIds.length > 0
      ? adminClient.from('kudos').select('session_id').in('session_id', sessionIds).eq('user_id', userId)
      : Promise.resolve({ data: [] as { session_id: string }[] }),
    // Caregiver's athlete — recent sessions this month
    caregiverAthlete
      ? adminClient.from('sessions').select('id, date, distance_km, feel').eq('athlete_id', caregiverAthlete.id).eq('status', 'completed').is('strava_deleted_at', null).gte('date', monthStart).order('date', { ascending: false })
      : Promise.resolve({ data: [] }),
    // Caregiver's athlete — milestones
    caregiverAthlete
      ? adminClient.from('milestones').select('id, label, achieved_at, milestone_definitions(icon)').eq('athlete_id', caregiverAthlete.id).order('achieved_at', { ascending: false }).limit(5)
      : Promise.resolve({ data: [] }),
    // Caregiver's athlete — recent public notes
    caregiverAthlete
      ? adminClient.from('coach_notes').select('content, created_at, users(name)').eq('athlete_id', caregiverAthlete.id).eq('visibility', 'all').order('created_at', { ascending: false }).limit(3)
      : Promise.resolve({ data: [] }),
    // Cheer sent today?
    adminClient.from('cheers').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', todayStart.toISOString()),
    // Sent cheers
    adminClient.from('cheers').select('id, athlete_id, message, created_at, viewed_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
    // All athlete session dates (for streak calculation)
    caregiverAthlete
      ? adminClient.from('sessions').select('date').eq('athlete_id', caregiverAthlete.id).eq('status', 'completed').is('strava_deleted_at', null)
      : Promise.resolve({ data: [] }),
    // Focus areas for plan card
    caregiverAthlete
      ? adminClient.from('focus_areas').select('title, progress_note, progress_level, status, created_by, updated_at, achieved_at').eq('athlete_id', caregiverAthlete.id).order('updated_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  // ─── Build enriched feed (names extracted from joins) ──────────
  const feed: FeedSession[] = sessions.map(s => ({
    id: s.id,
    date: s.date,
    distance_km: s.distance_km,
    duration_seconds: s.duration_seconds,
    feel: s.feel,
    note: s.note,
    athlete_id: s.athlete_id,
    coach_user_id: s.coach_user_id,
    strava_title: s.strava_title,
    athlete_name: (s as unknown as { athletes?: { name?: string } }).athletes?.name ?? 'Unknown athlete',
    coach_name: (s as unknown as { users?: { name?: string } }).users?.name ?? null,
  }))

  const groups = groupByDate(feed)

  // ─── Process milestones ────────────────────────────────────────
  const milestonesBySession: Record<string, MilestoneBadge[]> = {}
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentMilestoneDates: { achievedAt: string }[] = []

  for (const m of rawMilestones ?? []) {
    if (m.session_id) {
      if (!milestonesBySession[m.session_id]) milestonesBySession[m.session_id] = []
      milestonesBySession[m.session_id].push({
        id: m.id,
        icon: (m as { milestone_definitions?: { icon?: string } }).milestone_definitions?.icon ?? '',
        label: m.label,
      })
    }
    if (m.achieved_at && new Date(m.achieved_at) >= thirtyDaysAgo) {
      recentMilestoneDates.push({ achievedAt: m.achieved_at })
    }
  }

  const oneDayAgo = new Date()
  oneDayAgo.setDate(oneDayAgo.getDate() - 1)
  const recentCelebrationRaw = (rawMilestones ?? []).filter(m => m.achieved_at && new Date(m.achieved_at) >= oneDayAgo)

  // Fetch club name and coach names for celebration milestones
  const celebrationCoachIds = [...new Set(recentCelebrationRaw.map(m => (m as { awarded_by?: string }).awarded_by).filter(Boolean))] as string[]
  const [{ data: clubSettingsRow }, { data: celebCoachRows }] = await Promise.all([
    adminClient.from('club_settings').select('name').limit(1).single(),
    celebrationCoachIds.length > 0
      ? adminClient.from('users').select('id, name').in('id', celebrationCoachIds)
      : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
  ])
  const clubName = clubSettingsRow?.name ?? 'SOSG Running Club'
  const celebCoachNameMap = Object.fromEntries((celebCoachRows ?? []).map(u => [u.id, u.name]))

  const celebrationMilestones: CelebrationMilestone[] = recentCelebrationRaw.map(m => {
    const mTyped = m as { athletes?: { name?: string; theme_color?: string; avatar?: string }; milestone_definitions?: { icon?: string }; awarded_by?: string }
    return {
      id: m.id,
      label: m.label,
      icon: mTyped.milestone_definitions?.icon ?? '🏆',
      athleteName: mTyped.athletes?.name ?? 'An athlete',
      achievedAt: m.achieved_at,
      coachName: mTyped.awarded_by ? (celebCoachNameMap[mTyped.awarded_by] ?? null) : null,
      themeColor: mTyped.athletes?.theme_color ?? null,
      avatar: mTyped.athletes?.avatar ?? null,
      clubName,
    }
  })

  // ─── Kudos ─────────────────────────────────────────────────────
  // Fetch giver names separately (kudos.user_id → auth.users, not public.users, so join fails)
  const giverUserIds = [...new Set((kudosRows ?? []).map(k => k.user_id))]
  const { data: giverUsers } = giverUserIds.length > 0
    ? await adminClient.from('users').select('id, name').in('id', giverUserIds)
    : { data: [] as { id: string; name: string | null }[] }
  const giverNameMap = Object.fromEntries((giverUsers ?? []).map(u => [u.id, u.name]))

  const kudosCounts: Record<string, number> = {}
  const kudosGivers: Record<string, string[]> = {}
  for (const k of kudosRows ?? []) {
    kudosCounts[k.session_id] = (kudosCounts[k.session_id] ?? 0) + 1
    const name = giverNameMap[k.user_id]
    if (name) {
      if (!kudosGivers[k.session_id]) kudosGivers[k.session_id] = []
      kudosGivers[k.session_id].push(name.split(' ')[0])
    }
  }
  const myKudos = new Set((myKudosRows ?? []).map(k => k.session_id))

  // ─── Weekly recap (needs individual sessions for star moment) ──
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)
  weekStart.setHours(0, 0, 0, 0)
  const thisWeekSessions = feed.filter(s => {
    if (!s.date) return false
    const d = new Date(s.date)
    return !isNaN(d.getTime()) && d >= weekStart
  })
  const weeklyRecap = computeWeeklyRecap(
    thisWeekSessions.map(s => ({ athlete_id: s.athlete_id, athlete_name: s.athlete_name, distance_km: s.distance_km, feel: s.feel })),
    recentMilestoneDates,
    weekStart
  )

  // Issue 8: Use DB-computed weekly stats for accuracy
  const weeklyRow = weeklyStatsResult as unknown as { session_count: number; total_km: number; athlete_count: number } | null
  const weeklyStats = weeklyRow
    ? { count: weeklyRow.session_count, km: Number(weeklyRow.total_km), athletes: weeklyRow.athlete_count }
    : { count: thisWeekSessions.length, km: thisWeekSessions.reduce((sum, s) => sum + (s.distance_km ?? 0), 0), athletes: new Set(thisWeekSessions.map(s => s.athlete_id)).size }

  // ─── Caregiver milestones formatting ───────────────────────────
  const formattedCgMilestones = (cgMilestones ?? []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    label: m.label as string,
    icon: ((m as { milestone_definitions?: { icon?: string } }).milestone_definitions?.icon) ?? '🏆',
    achieved_at: m.achieved_at as string,
  }))

  const caregiverFocus = await caregiverFocusPromise

  // Athlete activity streak
  const athleteStreak = caregiverAthlete && (athleteSessionDates ?? []).length > 0
    ? calculateStreakDetails((athleteSessionDates as { date: string }[]).map(s => s.date).filter(Boolean))
    : null

  // ─── Auto-generated monthly summary ──────────────────────────
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0) // last day of prev month
  const lastMonthStart = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1).toISOString().split('T')[0]
  const lastMonthEndStr = lastMonthEnd.toISOString().split('T')[0]

  let lastMonthSessions: { distance_km: number | null; duration_seconds: number | null }[] = []
  if (caregiverAthlete) {
    const { data: lmSessions } = await adminClient
      .from('sessions')
      .select('distance_km, duration_seconds')
      .eq('athlete_id', caregiverAthlete.id)
      .eq('status', 'completed')
      .is('strava_deleted_at', null)
      .gte('date', lastMonthStart)
      .lte('date', lastMonthEndStr)
    lastMonthSessions = (lmSessions ?? []) as typeof lastMonthSessions
  }

  const thisMonthSessions = (cgSessions ?? []) as { id: string; date: string; distance_km: number | null; feel: number | null }[]

  // Compute summary stats
  const thisMonthKm = thisMonthSessions.reduce((sum, s) => sum + (s.distance_km ?? 0), 0)
  const thisMonthCount = thisMonthSessions.length
  const lastMonthKm = lastMonthSessions.reduce((sum, s) => sum + (s.distance_km ?? 0), 0)
  const lastMonthCount = lastMonthSessions.length

  // We need duration_seconds for pace calculation — fetch this month's sessions with duration
  let thisMonthDurationTotal = 0
  if (caregiverAthlete && thisMonthCount > 0) {
    const { data: durSessions } = await adminClient
      .from('sessions')
      .select('duration_seconds')
      .eq('athlete_id', caregiverAthlete.id)
      .eq('status', 'completed')
      .is('strava_deleted_at', null)
      .gte('date', monthStart)
    thisMonthDurationTotal = (durSessions ?? []).reduce((sum: number, s: any) => sum + (s.duration_seconds ?? 0), 0)
  }

  // ─── Working on coach name lookup ────────────────────────────
  const workingOnUpdatedBy = (caregiverAthlete as any)?.working_on_updated_by as string | null
  let workingOnCoachName: string | null = null
  if (workingOnUpdatedBy) {
    const { data: coachRow } = await adminClient
      .from('users')
      .select('name')
      .eq('id', workingOnUpdatedBy)
      .single()
    workingOnCoachName = coachRow?.name ?? null
  }

  // ─── Digest teaser ───────────────────────────────────────────
  let digestTeaser: { text: string; weekLabel: string } | null = null
  try {
    const digestData = await getCaregiverDigestData(userId)
    if (digestData) {
      const narrative = generateCaregiverNarrative(digestData)
      digestTeaser = { text: generateTeaserText(narrative), weekLabel: digestData.weekLabel }
    }
  } catch {
    // Non-critical — teaser just doesn't show
  }

  // ─── Plan data (focus areas + goal tracking) ────────────────
  const allFocusAreas = (focusAreasRows ?? []) as { title: string; progress_note: string | null; progress_level: string | null; status: string; created_by: string | null; updated_at: string | null; achieved_at: string | null }[]
  const activeFocus = allFocusAreas.find(f => f.status === 'active') ?? null
  const recentAchievedFocus = allFocusAreas.find(f => f.status === 'achieved') ?? null

  // Look up focus coach name
  let focusCoachName: string | null = null
  if (activeFocus?.created_by) {
    const { data: focusCoachRow } = await adminClient
      .from('users')
      .select('name')
      .eq('id', activeFocus.created_by)
      .single()
    focusCoachName = focusCoachRow?.name ?? null
  }

  // Compute goal progress if athlete has goal tracking fields
  const athleteGoalType = (caregiverAthlete as any)?.goal_type as string | null ?? null
  const athleteGoalTarget = (caregiverAthlete as any)?.goal_target as number | null ?? null
  const athleteRunningGoal = (caregiverAthlete as any)?.running_goal as string | null ?? null

  let goalProgress: import('@/lib/goals').GoalProgress | null = null
  if (athleteGoalType && athleteGoalTarget && caregiverAthlete) {
    // Use all completed sessions for goal progress (not just this month)
    const { data: allSessions } = await adminClient
      .from('sessions')
      .select('distance_km')
      .eq('athlete_id', caregiverAthlete.id)
      .eq('status', 'completed')
      .is('strava_deleted_at', null)
    goalProgress = calculateGoalProgress(
      athleteGoalType as GoalType,
      Number(athleteGoalTarget),
      (allSessions ?? []) as { distance_km: number | null }[]
    )
  }

  // ─── Caregiver onboarding ────────────────────────────────────
  const caregiverOnboarding = computeCaregiverOnboardingState({
    hasLinkedAthlete: !!caregiverAthlete,
    hasViewedAthlete: !!caregiverAthlete,
    hasSentCheer: (sentCheers ?? []).length > 0,
  })

  return {
    user: { role: userRow?.role ?? 'caregiver', name: userRow?.name ?? null },
    athlete: caregiverAthlete ? { id: caregiverAthlete.id, name: caregiverAthlete.name, avatar: (caregiverAthlete as any)?.avatar as string | null ?? null } : null,
    recentSessions: (cgSessions ?? []) as { id: string; date: string; distance_km: number | null; feel: number | null }[],
    milestones: formattedCgMilestones,
    recentNotes: (cgNotes ?? []).map((n: any) => ({
      content: n.content,
      created_at: n.created_at,
      coach_name: (n.users as any)?.name ?? null,
    })),
    cheersToday: cheerTodayCount ?? 0,
    sentCheers: (sentCheers ?? []) as FeedCheer[],
    caregiverFocus,
    sessions: feed,
    groups,
    kudosCounts,
    kudosGivers,
    myKudos,
    clubStats,
    milestonesBySession,
    celebrationMilestones,
    weeklyRecap,
    weeklyStats,
    athleteStreak,
    allowPublicSharing: (caregiverAthlete as Record<string, unknown>)?.allow_public_sharing === true,
    sharingDisabledByCaregiver: (caregiverAthlete as Record<string, unknown>)?.sharing_disabled_by_caregiver === true,
    onboarding: caregiverOnboarding.isNewUser ? caregiverOnboarding : null,
    workingOn: {
      text: (caregiverAthlete as any)?.working_on as string | null ?? null,
      recentProgress: (caregiverAthlete as any)?.recent_progress as string | null ?? null,
      updatedAt: (caregiverAthlete as any)?.working_on_updated_at as string | null ?? null,
      coachName: workingOnCoachName,
    },
    digestTeaser,
    planData: {
      focusTitle: activeFocus?.title ?? null,
      focusProgressNote: activeFocus?.progress_note ?? null,
      focusProgressLevel: (activeFocus?.progress_level as ProgressLevel) ?? null,
      focusUpdatedAt: activeFocus?.updated_at ?? null,
      focusCoachName,
      runningGoal: athleteRunningGoal,
      goalProgress,
      recentAchievement: recentAchievedFocus?.title ?? null,
    },
    monthlySummary: {
      thisMonth: { runs: thisMonthCount, km: thisMonthKm, durationSeconds: thisMonthDurationTotal },
      lastMonth: { runs: lastMonthCount, km: lastMonthKm },
    },
  }
}
