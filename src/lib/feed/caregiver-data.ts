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
      .select('id, athlete_id, session_id, label, achieved_at, athletes(name), milestone_definitions(icon)')
      .order('achieved_at', { ascending: false })
      .limit(20),
    adminClient.from('athletes').select('id, name, allow_public_sharing, sharing_disabled_by_caregiver').eq('caregiver_user_id', userId).maybeSingle(),
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
  ] = await Promise.all([
    // Kudos counts (with giver names)
    sessionIds.length > 0
      ? adminClient.from('kudos').select('session_id, users(name)').in('session_id', sessionIds)
      : Promise.resolve({ data: [] as { session_id: string; users: { name: string | null } | null }[] }),
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
  const kudosGivers: Record<string, string[]> = {}
  for (const k of kudosRows ?? []) {
    kudosCounts[k.session_id] = (kudosCounts[k.session_id] ?? 0) + 1
    const name = (k as any).users?.name
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

  // ─── Caregiver onboarding ────────────────────────────────────
  const caregiverOnboarding = computeCaregiverOnboardingState({
    hasLinkedAthlete: !!caregiverAthlete,
    hasViewedAthlete: !!caregiverAthlete,
    hasSentCheer: (sentCheers ?? []).length > 0,
  })

  return {
    user: { role: userRow?.role ?? 'caregiver', name: userRow?.name ?? null },
    athlete: caregiverAthlete ? { id: caregiverAthlete.id, name: caregiverAthlete.name } : null,
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
  }
}
