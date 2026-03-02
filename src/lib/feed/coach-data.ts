/**
 * Coach feed data loader.
 *
 * Consolidates ~25 queries from the old monolithic page into 2 parallel
 * batches plus the focus-data promise (which runs concurrently).
 */

import { adminClient } from '@/lib/supabase/admin'
import { BADGE_DEFINITIONS } from '@/lib/badges'
import { getCoachFocusData } from '@/lib/feed/today-focus'
import { computeWeeklyRecap } from '@/lib/feed/weekly-recap'
import { computeOnboardingState } from '@/lib/onboarding'
import { groupByDate, buildLookupMap } from '@/lib/feed/utils'
import type {
  CoachFeedData,
  FeedSession,
  FeedMilestone,
  MilestoneBadge,
  CelebrationMilestone,
  FeedCheer,
} from '@/lib/feed/types'

export async function loadCoachFeedData(userId: string): Promise<CoachFeedData> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  // Kick off focus data early (runs concurrently with everything else)
  const coachFocusPromise = getCoachFocusData(userId).catch(() => null)

  // ─── Batch 1: Global data + club stats ─────────────────────────
  const [
    { data: userRow },
    { data: rawSessions },
    { data: rawMilestones },
    { count: totalSessionCount },
    { count: totalAthleteCount },
    { count: totalMilestoneCount },
    { count: coachCount },
    { count: caregiverCount },
    { data: myMonthSessions },
    { data: myBadges },
    { data: rawCheers },
    { data: stravaConnection },
    { count: myTotalSessionCount },
  ] = await Promise.all([
    adminClient.from('users').select('role, name').eq('id', userId).single(),
    adminClient
      .from('sessions')
      .select('id, date, distance_km, duration_seconds, feel, note, athlete_id, coach_user_id, strava_title')
      .eq('status', 'completed')
      .order('date', { ascending: false })
      .limit(30),
    adminClient
      .from('milestones')
      .select('id, athlete_id, session_id, label, achieved_at, athletes(name), milestone_definitions(icon)')
      .order('achieved_at', { ascending: false })
      .limit(20),
    adminClient.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    adminClient.from('athletes').select('*', { count: 'exact', head: true }).eq('active', true),
    adminClient.from('milestones').select('*', { count: 'exact', head: true }),
    adminClient.from('users').select('*', { count: 'exact', head: true }).in('role', ['coach', 'admin']).eq('active', true),
    adminClient.from('users').select('*', { count: 'exact', head: true }).eq('role', 'caregiver').eq('active', true),
    adminClient.from('sessions').select('athlete_id, distance_km').eq('coach_user_id', userId).gte('date', monthStart).eq('status', 'completed'),
    adminClient.from('coach_badges').select('badge_key, earned_at').eq('user_id', userId).order('earned_at', { ascending: false }),
    adminClient
      .from('cheers')
      .select('id, athlete_id, message, created_at, viewed_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10),
    adminClient.from('strava_connections').select('user_id').eq('user_id', userId).maybeSingle(),
    adminClient.from('sessions').select('*', { count: 'exact', head: true }).eq('coach_user_id', userId).eq('status', 'completed'),
  ])

  // ─── Batch 2: Lookups for sessions in the feed ─────────────────
  const sessions = rawSessions ?? []
  const athleteIds = [...new Set(sessions.map(s => s.athlete_id).filter(Boolean))]
  const coachIds = [...new Set(sessions.map(s => s.coach_user_id).filter((id): id is string => id != null))]
  const sessionIds = sessions.map(s => s.id)

  const [
    { data: athletes },
    { data: coaches },
    { data: kudosRows },
    { data: myKudosRows },
  ] = await Promise.all([
    athleteIds.length > 0
      ? adminClient.from('athletes').select('id, name').in('id', athleteIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    coachIds.length > 0
      ? adminClient.from('users').select('id, name, email').in('id', coachIds)
      : Promise.resolve({ data: [] as { id: string; name: string | null; email: string | null }[] }),
    sessionIds.length > 0
      ? adminClient.from('kudos').select('session_id').in('session_id', sessionIds)
      : Promise.resolve({ data: [] as { session_id: string }[] }),
    sessionIds.length > 0
      ? adminClient.from('kudos').select('session_id').in('session_id', sessionIds).eq('user_id', userId)
      : Promise.resolve({ data: [] as { session_id: string }[] }),
  ])

  // ─── Build enriched feed ───────────────────────────────────────
  const athleteMap = buildLookupMap((athletes ?? []) as { id: string; name?: string | null }[])
  const coachMap = buildLookupMap((coaches ?? []) as { id: string; name?: string | null; email?: string | null }[])

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
    athlete_name: athleteMap[s.athlete_id] ?? 'Unknown athlete',
    coach_name: coachMap[s.coach_user_id ?? ''] ?? null,
  }))

  const groups = groupByDate(feed)

  // ─── Process milestones ────────────────────────────────────────
  const milestonesBySession: Record<string, MilestoneBadge[]> = {}
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentMilestoneDates: { achievedAt: string }[] = []

  for (const m of rawMilestones ?? []) {
    const fm = m as unknown as FeedMilestone & { athletes?: { name: string }; milestone_definitions?: { icon: string } }
    if (fm.session_id) {
      if (!milestonesBySession[fm.session_id]) milestonesBySession[fm.session_id] = []
      milestonesBySession[fm.session_id].push({
        id: fm.id,
        icon: (m as { milestone_definitions?: { icon?: string } }).milestone_definitions?.icon ?? '',
        label: fm.label,
      })
    }
    if (fm.achieved_at && new Date(fm.achieved_at) >= thirtyDaysAgo) {
      recentMilestoneDates.push({ achievedAt: fm.achieved_at })
    }
  }

  const oneDayAgo = new Date()
  oneDayAgo.setDate(oneDayAgo.getDate() - 1)
  const celebrationMilestones: CelebrationMilestone[] = (rawMilestones ?? [])
    .filter(m => m.achieved_at && new Date(m.achieved_at) >= oneDayAgo)
    .map(m => ({
      id: m.id,
      label: m.label,
      icon: (m as { milestone_definitions?: { icon?: string } }).milestone_definitions?.icon ?? '🏆',
      athleteName: (m as { athletes?: { name?: string } }).athletes?.name ?? 'An athlete',
      achievedAt: m.achieved_at,
    }))

  // ─── Kudos ─────────────────────────────────────────────────────
  const kudosCounts: Record<string, number> = {}
  for (const k of kudosRows ?? []) {
    kudosCounts[k.session_id] = (kudosCounts[k.session_id] ?? 0) + 1
  }
  const myKudos = new Set((myKudosRows ?? []).map(k => k.session_id))

  // ─── Weekly stats ──────────────────────────────────────────────
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const thisWeek = feed.filter(s => {
    if (!s.date) return false
    const d = new Date(s.date)
    return !isNaN(d.getTime()) && d >= weekAgo
  })
  const weeklyKm = thisWeek.reduce((sum, s) => sum + (s.distance_km ?? 0), 0)
  const weeklyAthletes = new Set(thisWeek.map(s => s.athlete_id)).size

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)
  weekStart.setHours(0, 0, 0, 0)
  const weeklyRecap = computeWeeklyRecap(
    thisWeek.map(s => ({ athlete_id: s.athlete_id, athlete_name: s.athlete_name, distance_km: s.distance_km, feel: s.feel })),
    recentMilestoneDates,
    weekStart
  )

  // ─── Coach-specific stats ──────────────────────────────────────
  const monthSessions = (myMonthSessions ?? []).length
  const monthAthletes = new Set((myMonthSessions ?? []).map(s => s.athlete_id)).size

  // ─── Total km (sum from month sessions + feed data is already limited) ──
  // For club total km we use the totalSessionCount approach:
  // Instead of fetching all rows, compute from the limited feed data
  // and accept it as approximate for display. The "all time" km stat
  // is computed from a DB aggregate (via count-only queries already done).
  // NOTE: We compute total km from the already-fetched data where we
  // fetched myMonthSessions with distance. For the all-time stat we
  // need a separate aggregation — we'll use an RPC or accept the
  // approximation. For now, fetch the total km separately.
  const { data: totalKmRows } = await adminClient
    .from('sessions')
    .select('distance_km')
    .eq('status', 'completed')
  const totalKm = (totalKmRows ?? []).reduce((sum, s) => sum + (s.distance_km ?? 0), 0)

  // ─── Badges ────────────────────────────────────────────────────
  const badges = (myBadges ?? []) as { badge_key: string; earned_at: string }[]
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentBadge = badges.find(b => b.earned_at && new Date(b.earned_at) >= sevenDaysAgo)
  const recentBadgeDef = recentBadge ? BADGE_DEFINITIONS.find(d => d.key === recentBadge.badge_key) ?? null : null

  // ─── Onboarding ────────────────────────────────────────────────
  const onboarding = computeOnboardingState({
    userName: userRow?.name ?? null,
    totalSessionsCoached: myTotalSessionCount ?? 0,
    hasStravaConnection: !!stravaConnection,
  })

  // ─── Await focus data ──────────────────────────────────────────
  const coachFocus = await coachFocusPromise

  return {
    user: { role: userRow?.role ?? 'coach', name: userRow?.name ?? null },
    sessions: feed,
    groups,
    milestonesBySession,
    celebrationMilestones,
    kudosCounts,
    myKudos,
    clubStats: {
      sessions: totalSessionCount ?? 0,
      km: totalKm,
      athletes: totalAthleteCount ?? 0,
      milestones: totalMilestoneCount ?? 0,
      coaches: coachCount ?? 0,
      caregivers: caregiverCount ?? 0,
    },
    coachStats: {
      monthSessions: monthSessions,
      monthAthletes: monthAthletes,
      totalSessions: myTotalSessionCount ?? 0,
    },
    coachFocus,
    badges,
    recentBadge: recentBadgeDef,
    recentCheers: (rawCheers ?? []) as FeedCheer[],
    hasStrava: !!stravaConnection,
    onboarding: onboarding.isNewUser ? onboarding : null,
    weeklyRecap,
    weeklyStats: { count: thisWeek.length, km: weeklyKm, athletes: weeklyAthletes },
  }
}
