/**
 * Coach feed data loader.
 *
 * Uses Supabase joins, DB-level aggregation (RPCs), and shared helpers
 * to minimise query count and payload size.
 */

import { adminClient } from '@/lib/supabase/admin'
import { getClub } from '@/lib/club'
import { BADGE_DEFINITIONS } from '@/lib/badges'
import { getCoachFocusData } from '@/lib/feed/today-focus'
import { computeWeeklyRecap } from '@/lib/feed/weekly-recap'
import { computeOnboardingState } from '@/lib/onboarding'
import { groupByDate } from '@/lib/feed/utils'
import { loadClubStats } from '@/lib/feed/shared-queries'
import { getCoachDigestData } from '@/lib/digest/data'
import { generateCoachNarrative, generateTeaserText } from '@/lib/digest/narrative'
import { isSessionToday, isSessionTomorrow } from '@/lib/sessions/datetime'
import type {
  CoachFeedData,
  FeedSession,
  FeedMilestone,
  MilestoneBadge,
  CelebrationMilestone,
  FeedCheer,
  FeedAthleteMessage,
  CoachRsvpCardData,
  PairingsReviewCardData,
  AssignmentCardData,
  SessionCardData,
} from '@/lib/feed/types'

export async function loadCoachFeedData(userId: string): Promise<CoachFeedData> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoStr = weekAgo.toISOString().split('T')[0]

  // Kick off focus data early (runs concurrently with everything else)
  const coachFocusPromise = getCoachFocusData(userId).catch(() => null)

  // ─── Batch 1: User data + sessions (with joins) + milestones + coach-specific + club ──
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
    club,
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
    adminClient.from('sessions').select('athlete_id, distance_km').eq('coach_user_id', userId).gte('date', monthStart).eq('status', 'completed').is('strava_deleted_at', null),
    adminClient.from('coach_badges').select('badge_key, earned_at').eq('user_id', userId).order('earned_at', { ascending: false }),
    adminClient
      .from('cheers')
      .select('id, athlete_id, message, created_at, viewed_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10),
    adminClient.from('strava_connections').select('user_id').eq('user_id', userId).maybeSingle(),
    adminClient.from('sessions').select('*', { count: 'exact', head: true }).eq('coach_user_id', userId).eq('status', 'completed').is('strava_deleted_at', null),
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
    // Club config (cached, 60s) — moved here to enable parallel session cards
    getClub(),
  ])

  // ─── Batch 2: Only kudos lookups (athlete/coach names come from joins) ──
  const sessions = rawSessions ?? []
  const sessionIds = sessions.map(s => s.id)

  const [
    { data: kudosRows },
    { data: myKudosRows },
  ] = await Promise.all([
    sessionIds.length > 0
      ? adminClient.from('kudos').select('session_id, user_id').in('session_id', sessionIds)
      : Promise.resolve({ data: [] as { session_id: string; user_id: string }[] }),
    sessionIds.length > 0
      ? adminClient.from('kudos').select('session_id').in('session_id', sessionIds).eq('user_id', userId)
      : Promise.resolve({ data: [] as { session_id: string }[] }),
  ])

  // Fetch giver names separately (kudos.user_id → auth.users, not public.users, so join fails)
  const giverUserIds = [...new Set((kudosRows ?? []).map(k => k.user_id))]
  const { data: giverUsers } = giverUserIds.length > 0
    ? await adminClient.from('users').select('id, name').in('id', giverUserIds)
    : { data: [] as { id: string; name: string | null }[] }
  const giverNameMap = Object.fromEntries((giverUsers ?? []).map(u => [u.id, u.name]))

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
  const recentCelebrationRaw = (rawMilestones ?? []).filter(m => m.achieved_at && new Date(m.achieved_at) >= oneDayAgo)

  // Fetch coach names for celebration milestones (club already fetched in Batch 1)
  const celebrationCoachIds = [...new Set(recentCelebrationRaw.map(m => (m as { awarded_by?: string }).awarded_by).filter(Boolean))] as string[]
  const { data: celebCoachRows } = celebrationCoachIds.length > 0
    ? await adminClient.from('users').select('id, name').in('id', celebrationCoachIds)
    : { data: [] as { id: string; name: string | null }[] }
  const clubName = club.name
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
  const kudosCounts: Record<string, number> = {}
  const kudosGivers: Record<string, string[]> = {}
  for (const k of kudosRows ?? []) {
    kudosCounts[k.session_id] = (kudosCounts[k.session_id] ?? 0) + 1
    const name = giverNameMap[k.user_id]
    if (name) {
      if (!kudosGivers[k.session_id]) kudosGivers[k.session_id] = []
      kudosGivers[k.session_id].push(name.split(' ')[0]) // first name only
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

  // ─── Session cards + digest teaser + focus (all in parallel) ──
  const [sessionCards, coachFocus, digestTeaser] = await Promise.all([
    buildCoachSessionCards(userId, club),
    coachFocusPromise,
    (async (): Promise<{ text: string; weekLabel: string } | null> => {
      try {
        const digestData = await getCoachDigestData(userId)
        if (digestData) {
          const narrative = generateCoachNarrative(digestData)
          return { text: generateTeaserText(narrative), weekLabel: digestData.weekLabel }
        }
        return null
      } catch {
        return null
      }
    })(),
  ])

  return {
    user: { role: userRow?.role ?? 'coach', name: userRow?.name ?? null },
    sessions: feed,
    groups,
    milestonesBySession,
    celebrationMilestones,
    kudosCounts,
    kudosGivers,
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
    digestTeaser,
    clubName,
    sessionCards,
  }
}

// ─── Build coach session cards ─────────────────────────────────────

function isSessionCardVisible(sessionStart: string, status: string, timezone: string): boolean {
  if (status !== 'published') return false
  const sessionStartMs = new Date(sessionStart).getTime()
  const bufferMs = 24 * 60 * 60 * 1000 // 24 hours
  return Date.now() < sessionStartMs + bufferMs
}

function toSessionCardData(s: {
  id: string
  title: string | null
  session_start: string
  session_end: string | null
  location: string
  status: string
  pairings_published_at: string | null
  pairings_stale: boolean
}): SessionCardData {
  return {
    id: s.id,
    title: s.title,
    sessionStart: s.session_start,
    sessionEnd: s.session_end,
    location: s.location,
    status: s.status as SessionCardData['status'],
    pairingsPublishedAt: s.pairings_published_at,
    pairingsStale: s.pairings_stale,
  }
}

async function buildCoachSessionCards(
  userId: string,
  club: { timezone: string }
): Promise<(CoachRsvpCardData | PairingsReviewCardData | AssignmentCardData)[]> {
  // Fetch published training sessions that are still relevant
  const { data: trainingSessions } = await adminClient
    .from('training_sessions')
    .select('id, title, session_start, session_end, location, status, pairings_published_at, pairings_stale')
    .eq('status', 'published')
    .order('session_start', { ascending: true })

  if (!trainingSessions || trainingSessions.length === 0) return []

  // Filter to visible sessions (published + within 24h buffer)
  const visible = trainingSessions.filter(s =>
    isSessionCardVisible(s.session_start, s.status, club.timezone)
  )
  if (visible.length === 0) return []

  const sessionIds = visible.map(s => s.id)

  // Batch fetch: coach RSVPs, aggregate counts, assignments, logged runs, cues — all in parallel
  const [
    { data: myRsvps },
    { data: coachRsvpCounts },
    { data: athleteRsvpCounts },
    { data: myAssignments },
    { data: userRow },
    { data: loggedRuns },
    { data: allActiveAthletes },
    { data: allCueRows },
  ] = await Promise.all([
    adminClient
      .from('session_coach_rsvps')
      .select('session_id, status')
      .eq('coach_id', userId)
      .in('session_id', sessionIds),
    adminClient
      .from('session_coach_rsvps')
      .select('session_id, status')
      .in('session_id', sessionIds)
      .in('status', ['available', 'unavailable']),
    adminClient
      .from('session_athlete_rsvps')
      .select('session_id, status')
      .in('session_id', sessionIds)
      .in('status', ['attending', 'not_attending']),
    adminClient
      .from('session_assignments')
      .select('session_id, athlete_id, athletes(id, name, avatar)')
      .eq('coach_id', userId)
      .in('session_id', sessionIds),
    adminClient
      .from('users')
      .select('role, can_manage_sessions')
      .eq('id', userId)
      .single(),
    adminClient
      .from('sessions')
      .select('training_session_id, athlete_id, distance_km, note, sync_source')
      .in('training_session_id', sessionIds)
      .eq('status', 'completed'),
    adminClient
      .from('athletes')
      .select('id, name, avatar')
      .eq('active', true)
      .order('name'),
    adminClient
      .from('cues')
      .select('athlete_id, best_cues'),
  ])

  const isAdmin = userRow?.role === 'admin'
  const canManageSessions = isAdmin || (userRow?.role === 'coach' && userRow?.can_manage_sessions)

  // Index RSVPs by session
  const myRsvpBySession = Object.fromEntries(
    (myRsvps ?? []).map(r => [r.session_id, r.status])
  )

  // Aggregate coach/athlete response counts per session
  const coachCountBySession: Record<string, number> = {}
  for (const r of coachRsvpCounts ?? []) {
    coachCountBySession[r.session_id] = (coachCountBySession[r.session_id] ?? 0) + 1
  }
  const athleteCountBySession: Record<string, number> = {}
  for (const r of athleteRsvpCounts ?? []) {
    athleteCountBySession[r.session_id] = (athleteCountBySession[r.session_id] ?? 0) + 1
  }

  // Index assignments by session
  const assignmentsBySession: Record<string, { id: string; name: string; avatar: string | null }[]> = {}
  for (const a of myAssignments ?? []) {
    if (!assignmentsBySession[a.session_id]) assignmentsBySession[a.session_id] = []
    const ath = (a as unknown as { athletes?: { id: string; name: string; avatar: string | null } }).athletes
    if (ath) {
      assignmentsBySession[a.session_id].push({ id: ath.id, name: ath.name, avatar: ath.avatar })
    }
  }

  // Index logged runs by training_session_id → athlete_id
  const loggedRunsBySession: Record<string, Record<string, { distance_km: number | null; note: string | null; sync_source: string | null }>> = {}
  for (const r of loggedRuns ?? []) {
    if (!r.training_session_id) continue
    if (!loggedRunsBySession[r.training_session_id]) loggedRunsBySession[r.training_session_id] = {}
    loggedRunsBySession[r.training_session_id][r.athlete_id] = {
      distance_km: r.distance_km,
      note: r.note,
      sync_source: r.sync_source ?? null,
    }
  }

  // All active athletes for "add athlete" feature
  const allAthletesList = (allActiveAthletes ?? []).map(a => ({
    id: a.id,
    name: a.name,
    avatar: a.avatar,
  }))

  // Build cue lookup from pre-fetched data (already fetched in parallel above)
  const allAssignedAthleteIds = [...new Set(
    (myAssignments ?? []).map(a => a.athlete_id)
  )]
  const cuesByAthleteId: Record<string, string | null> = {}
  for (const c of allCueRows ?? []) {
    if (!allAssignedAthleteIds.includes(c.athlete_id)) continue
    const cues = c.best_cues
    cuesByAthleteId[c.athlete_id] = cues && cues.length > 0 ? cues.slice(0, 2).join(', ') : null
  }

  const cards: (CoachRsvpCardData | PairingsReviewCardData | AssignmentCardData)[] = []

  for (const s of visible) {
    const sessionCard = toSessionCardData(s)
    const rsvpStatus = (myRsvpBySession[s.id] ?? 'pending') as 'pending' | 'available' | 'unavailable'
    const isTodayOrTomorrow = isSessionToday(s.session_start, club.timezone) || isSessionTomorrow(s.session_start, club.timezone)

    // Priority 1: RSVP needed
    if (rsvpStatus === 'pending') {
      cards.push({
        type: 'session_rsvp',
        session: sessionCard,
        rsvpStatus: 'pending',
        coachCount: coachCountBySession[s.id] ?? 0,
        athleteCount: athleteCountBySession[s.id] ?? 0,
      })
    }

    // Priority 2: Pairings need review (admin/can_manage_sessions only)
    if (canManageSessions && s.pairings_stale) {
      cards.push({
        type: 'session_pairings_review',
        session: sessionCard,
        staleDetails: 'Changes have occurred since pairings were published. Some athletes may need reassignment.',
      })
    }

    // Priority 3: Assignments (day before + day of)
    const assignments = assignmentsBySession[s.id]
    if (assignments && assignments.length > 0 && isTodayOrTomorrow && s.pairings_published_at) {
      cards.push({
        type: 'session_assignment',
        session: sessionCard,
        athletes: assignments.map(a => ({
          id: a.id,
          name: a.name,
          cues: cuesByAthleteId[a.id] ?? null,
          avatar: a.avatar,
        })),
        loggedRuns: loggedRunsBySession[s.id] ?? {},
        allAthletes: allAthletesList,
      })
    }

    // Also show responded RSVP card (compact) if not pending
    if (rsvpStatus !== 'pending') {
      cards.push({
        type: 'session_rsvp',
        session: sessionCard,
        rsvpStatus,
        coachCount: coachCountBySession[s.id] ?? 0,
        athleteCount: athleteCountBySession[s.id] ?? 0,
      })
    }
  }

  return cards
}
