/**
 * Coach feed data loader.
 *
 * Uses Supabase joins, DB-level aggregation (RPCs), and shared helpers
 * to minimise query count and payload size.
 */

import { adminClient } from '@/lib/supabase/admin'
import { BADGE_DEFINITIONS } from '@/lib/badges'
import { getCoachFocusData } from '@/lib/feed/today-focus'
import { computeWeeklyRecap } from '@/lib/feed/weekly-recap'
import { computeOnboardingState } from '@/lib/onboarding'
import { groupByDate } from '@/lib/feed/utils'
import { loadClubStats } from '@/lib/feed/shared-queries'
import type {
  CoachFeedData,
  FeedSession,
  FeedMilestone,
  MilestoneBadge,
  CelebrationMilestone,
  FeedCheer,
  FeedAthleteMessage,
} from '@/lib/feed/types'

export async function loadCoachFeedData(userId: string): Promise<CoachFeedData> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoStr = weekAgo.toISOString().split('T')[0]

  // Kick off focus data early (runs concurrently with everything else)
  const coachFocusPromise = getCoachFocusData(userId).catch(() => null)

  // ─── Batch 1: User data + sessions (with joins) + milestones + coach-specific ──
  const [
    { data: userRow },
    { data: rawSessions },
    { data: rawMilestones },
    { data: myMonthSessions },
    { data: myBadges },
    { data: rawCheers },
    { data: stravaConnection },
    { count: myTotalSessionCount },
    clubStats,
    { data: weeklyStatsResult },
    { data: rawAthleteMessages },
  ] = await Promise.all([
    adminClient.from('users').select('role, name').eq('id', userId).single(),
    // Issue 3: Supabase joins fetch athlete + coach names in one query
    adminClient
      .from('sessions')
      .select('id, date, distance_km, duration_seconds, feel, note, athlete_id, coach_user_id, strava_title, athletes(name), users!sessions_coach_user_id_fkey(name)')
      .eq('status', 'completed')
      .order('date', { ascending: false })
      .limit(30),
    adminClient
      .from('milestones')
      .select('id, athlete_id, session_id, label, achieved_at, athletes(name), milestone_definitions(icon)')
      .order('achieved_at', { ascending: false })
      .limit(20),
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
    // Issue 1 & 2: Shared helper for club stats (includes get_total_km RPC)
    loadClubStats(),
    // Issue 8: DB-level weekly stats instead of JS filtering
    adminClient.rpc('get_weekly_stats', { since: weekAgoStr }),
    // Athlete messages (unviewed, last 7 days)
    adminClient
      .from('athlete_messages')
      .select('id, athlete_id, message, created_at, athletes(name)')
      .is('viewed_by_coach_at', null)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  // ─── Batch 2: Only kudos lookups (athlete/coach names come from joins) ──
  const sessions = rawSessions ?? []
  const sessionIds = sessions.map(s => s.id)

  const [
    { data: kudosRows },
    { data: myKudosRows },
  ] = await Promise.all([
    sessionIds.length > 0
      ? adminClient.from('kudos').select('session_id').in('session_id', sessionIds)
      : Promise.resolve({ data: [] as { session_id: string }[] }),
    sessionIds.length > 0
      ? adminClient.from('kudos').select('session_id').in('session_id', sessionIds).eq('user_id', userId)
      : Promise.resolve({ data: [] as { session_id: string }[] }),
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

  // ─── Coach-specific stats ──────────────────────────────────────
  const monthSessions = (myMonthSessions ?? []).length
  const monthAthletes = new Set((myMonthSessions ?? []).map(s => s.athlete_id)).size

  // ─── Badges ────────────────────────────────────────────────────
  const badges = (myBadges ?? []) as { badge_key: string; earned_at: string }[]
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentBadge = badges.find(b => b.earned_at && new Date(b.earned_at) >= sevenDaysAgo)
  const recentBadgeDef = recentBadge ? BADGE_DEFINITIONS.find(d => d.key === recentBadge.badge_key) ?? null : null

  // ─── Onboarding ────────────────────────────────────────────────
  const onboarding = computeOnboardingState({
    totalSessionsCoached: myTotalSessionCount ?? 0,
    hasStravaConnection: !!stravaConnection,
  })

  // ─── Athlete messages ──────────────────────────────────────────
  const athleteMessages: FeedAthleteMessage[] = (rawAthleteMessages ?? []).map(m => ({
    id: m.id,
    athlete_id: m.athlete_id,
    athlete_name: (m as unknown as { athletes?: { name?: string } }).athletes?.name ?? 'An athlete',
    message: m.message,
    created_at: m.created_at,
  }))

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
    clubStats,
    coachStats: {
      monthSessions: monthSessions,
      monthAthletes: monthAthletes,
      totalSessions: myTotalSessionCount ?? 0,
    },
    coachFocus,
    badges,
    recentBadge: recentBadgeDef,
    recentCheers: (rawCheers ?? []) as FeedCheer[],
    athleteMessages,
    hasStrava: !!stravaConnection,
    onboarding: onboarding.isNewUser ? onboarding : null,
    weeklyRecap,
    weeklyStats,
  }
}
