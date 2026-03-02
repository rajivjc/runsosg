/**
 * Caregiver feed data loader.
 *
 * Fetches only the data caregivers need: their linked athlete's stats,
 * plus the shared global feed (sessions + kudos).
 */

import { adminClient } from '@/lib/supabase/admin'
import { getCaregiverFocusData } from '@/lib/feed/today-focus'
import { computeWeeklyRecap } from '@/lib/feed/weekly-recap'
import { groupByDate, buildLookupMap } from '@/lib/feed/utils'
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

  // ─── Batch 1: User + global feed + club stats + caregiver's athlete ──
  const [
    { data: userRow },
    { data: rawSessions },
    { data: rawMilestones },
    { count: totalSessionCount },
    { count: totalAthleteCount },
    { count: totalMilestoneCount },
    { count: coachCount },
    { count: caregiverCount },
    { data: caregiverAthlete },
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
    adminClient.from('athletes').select('id, name, allow_public_sharing, sharing_disabled_by_caregiver').eq('caregiver_user_id', userId).maybeSingle(),
  ])

  // Start caregiver focus concurrently if athlete exists
  const caregiverFocusPromise = caregiverAthlete
    ? getCaregiverFocusData(caregiverAthlete.id).catch(() => null)
    : Promise.resolve(null)

  // ─── Batch 2: Session lookups + caregiver-specific data ────────
  const sessions = rawSessions ?? []
  const athleteIds = [...new Set(sessions.map(s => s.athlete_id).filter(Boolean))]
  const coachIds = [...new Set(sessions.map(s => s.coach_user_id).filter((id): id is string => id != null))]
  const sessionIds = sessions.map(s => s.id)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const batch2 = await Promise.all([
    // Athlete names for feed sessions
    athleteIds.length > 0
      ? adminClient.from('athletes').select('id, name').in('id', athleteIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    // Coach names for feed sessions
    coachIds.length > 0
      ? adminClient.from('users').select('id, name, email').in('id', coachIds)
      : Promise.resolve({ data: [] as { id: string; name: string | null; email: string | null }[] }),
    // Kudos counts
    sessionIds.length > 0
      ? adminClient.from('kudos').select('session_id').in('session_id', sessionIds)
      : Promise.resolve({ data: [] as { session_id: string }[] }),
    // My kudos
    sessionIds.length > 0
      ? adminClient.from('kudos').select('session_id').in('session_id', sessionIds).eq('user_id', userId)
      : Promise.resolve({ data: [] as { session_id: string }[] }),
    // Caregiver's athlete — recent sessions this month
    caregiverAthlete
      ? adminClient.from('sessions').select('id, date, distance_km, feel').eq('athlete_id', caregiverAthlete.id).eq('status', 'completed').gte('date', monthStart).order('date', { ascending: false })
      : Promise.resolve({ data: [] }),
    // Caregiver's athlete — milestones
    caregiverAthlete
      ? adminClient.from('milestones').select('id, label, achieved_at, milestone_definitions(icon)').eq('athlete_id', caregiverAthlete.id).order('achieved_at', { ascending: false }).limit(5)
      : Promise.resolve({ data: [] }),
    // Caregiver's athlete — recent public notes
    caregiverAthlete
      ? adminClient.from('coach_notes').select('content, created_at').eq('athlete_id', caregiverAthlete.id).eq('visibility', 'all').order('created_at', { ascending: false }).limit(3)
      : Promise.resolve({ data: [] }),
    // Cheer sent today?
    adminClient.from('cheers').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', todayStart.toISOString()),
    // Sent cheers
    adminClient.from('cheers').select('id, athlete_id, message, created_at, viewed_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
    // Total km (shared with coach, needed for club stats)
    adminClient.from('sessions').select('distance_km').eq('status', 'completed'),
  ])

  const [
    { data: athletes },
    { data: coaches },
    { data: kudosRows },
    { data: myKudosRows },
    { data: cgSessions },
    { data: cgMilestones },
    { data: cgNotes },
    { count: cheerTodayCount },
    { data: sentCheers },
    { data: totalKmRows },
  ] = batch2

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

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)
  weekStart.setHours(0, 0, 0, 0)
  const weeklyRecap = computeWeeklyRecap(
    thisWeek.map(s => ({ athlete_id: s.athlete_id, athlete_name: s.athlete_name, distance_km: s.distance_km, feel: s.feel })),
    recentMilestoneDates,
    weekStart
  )

  const totalKm = (totalKmRows ?? []).reduce((sum, s) => sum + (s.distance_km ?? 0), 0)

  // ─── Caregiver milestones formatting ───────────────────────────
  const formattedCgMilestones = (cgMilestones ?? []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    label: m.label as string,
    icon: ((m as { milestone_definitions?: { icon?: string } }).milestone_definitions?.icon) ?? '🏆',
    achieved_at: m.achieved_at as string,
  }))

  const caregiverFocus = await caregiverFocusPromise

  return {
    user: { role: userRow?.role ?? 'caregiver', name: userRow?.name ?? null },
    athlete: caregiverAthlete ? { id: caregiverAthlete.id, name: caregiverAthlete.name } : null,
    recentSessions: (cgSessions ?? []) as { id: string; date: string; distance_km: number | null; feel: number | null }[],
    milestones: formattedCgMilestones,
    recentNotes: (cgNotes ?? []) as { content: string; created_at: string }[],
    cheerSentToday: (cheerTodayCount ?? 0) > 0,
    sentCheers: (sentCheers ?? []) as FeedCheer[],
    caregiverFocus,
    sessions: feed,
    groups,
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
    milestonesBySession,
    celebrationMilestones,
    weeklyRecap,
    weeklyStats: {
      count: thisWeek.length,
      km: thisWeek.reduce((sum, s) => sum + (s.distance_km ?? 0), 0),
      athletes: new Set(thisWeek.map(s => s.athlete_id)).size,
    },
    allowPublicSharing: (caregiverAthlete as Record<string, unknown>)?.allow_public_sharing === true,
    sharingDisabledByCaregiver: (caregiverAthlete as Record<string, unknown>)?.sharing_disabled_by_caregiver === true,
  }
}
