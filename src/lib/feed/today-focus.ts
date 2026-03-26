import { adminClient } from '@/lib/supabase/admin'
import { calculateStreakDetails, type StreakDetails } from '@/lib/streaks'
import { todayInTimezone } from '@/lib/utils/dates'
import {
  detectFeelDecline,
  detectRecentPersonalBest,
  detectBestWeekEver,
  type SessionForInsights,
} from '@/lib/analytics/coaching-insights'
import { getMilestoneDefinitions } from '@/lib/feed/shared-queries'

export interface FocusItem {
  type: 'approaching_milestone' | 'not_seen_recently' | 'feel_declining' | 'personal_best' | 'best_week_ever'
  athleteId: string
  athleteName: string
  icon: string
  title: string
  subtitle: string
}

export interface CoachFocusData {
  streak: StreakDetails
  items: FocusItem[]
}

export interface CaregiverFocusData {
  nextMilestone: {
    label: string
    icon: string
    current: number
    target: number
  } | null
  lastRunDate: string | null
  lastRunFeel: number | null
  totalSessions: number
}

/**
 * Fetch Today's Focus data for a coach.
 * Returns streak info + actionable focus items (max 3).
 */
export async function getCoachFocusData(coachUserId: string, timezone = 'Asia/Singapore'): Promise<CoachFocusData> {
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0]

  // Fetch session dates for streak calculation (2 years is generous for streak tracking)
  // and recent sessions for focus items (90 days, with athlete_id)
  const twoYearsAgo = new Date()
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
  const twoYearsAgoStr = twoYearsAgo.toISOString().split('T')[0]

  const [{ data: allStreakDates }, { data: coachSessions }] = await Promise.all([
    adminClient
      .from('sessions')
      .select('date')
      .eq('coach_user_id', coachUserId)
      .eq('status', 'completed')
      .is('strava_deleted_at', null)
      .gte('date', twoYearsAgoStr),
    adminClient
      .from('sessions')
      .select('date, athlete_id')
      .eq('coach_user_id', coachUserId)
      .eq('status', 'completed')
      .is('strava_deleted_at', null)
      .gte('date', ninetyDaysAgoStr),
  ])

  if (!coachSessions || coachSessions.length === 0) {
    // Still calculate streak from all dates even if no recent sessions
    const streak = allStreakDates && allStreakDates.length > 0
      ? calculateStreakDetails(allStreakDates.map(s => s.date).filter((d): d is string => d != null && d !== ''))
      : { current: 0, longest: 0, activeThisWeek: false, weeklyActivity: [] }
    return { streak, items: [] }
  }

  // Calculate streak from all historical dates for accuracy
  const streak = calculateStreakDetails(
    (allStreakDates ?? []).map(s => s.date).filter((d): d is string => d != null && d !== '')
  )

  // Unique athlete IDs this coach has worked with (recent)
  const athleteIds = [...new Set(coachSessions.map(s => s.athlete_id))]

  // 4. Parallel: athlete names, milestone defs (cached), earned milestones,
  //    and recent sessions per athlete for insights
  const [
    { data: athleteRows },
    { data: allAthleteIds },
    milestoneDefs,
    { data: earnedMilestones },
    { data: latestPerAthlete },
  ] = await Promise.all([
    adminClient.from('athletes').select('id, name').in('id', athleteIds).eq('active', true),
    // Lightweight: only athlete_id column for session counting
    adminClient.from('sessions').select('athlete_id').in('athlete_id', athleteIds).eq('status', 'completed').is('strava_deleted_at', null),
    // Issue 5: Use cached milestone definitions
    getMilestoneDefinitions(),
    adminClient.from('milestones').select('athlete_id, milestone_definition_id').in('athlete_id', athleteIds),
    // Limit insight data to last 90 days (feel trends, PBs, best weeks)
    adminClient.from('sessions').select('athlete_id, date, distance_km, feel').in('athlete_id', athleteIds).eq('status', 'completed').is('strava_deleted_at', null).gte('date', ninetyDaysAgoStr).order('date', { ascending: false }),
  ])

  const nameMap = Object.fromEntries((athleteRows ?? []).map(a => [a.id, a.name]))
  const activeAthleteIds = new Set((athleteRows ?? []).map(a => a.id))

  // 5. Per-athlete: session count (from lightweight id-only query)
  const sessionCountMap: Record<string, number> = {}
  for (const s of allAthleteIds ?? []) {
    sessionCountMap[s.athlete_id] = (sessionCountMap[s.athlete_id] ?? 0) + 1
  }

  // Per-athlete: last session date (first occurrence per athlete since sorted desc)
  const lastDateMap: Record<string, string> = {}
  for (const s of latestPerAthlete ?? []) {
    if (!s.date) continue
    if (!lastDateMap[s.athlete_id]) {
      lastDateMap[s.athlete_id] = s.date
    }
  }

  // 6. Per-athlete: earned milestone definition IDs
  const earnedMap: Record<string, Set<string>> = {}
  for (const m of earnedMilestones ?? []) {
    if (!earnedMap[m.athlete_id]) earnedMap[m.athlete_id] = new Set()
    if (m.milestone_definition_id) earnedMap[m.athlete_id].add(m.milestone_definition_id)
  }

  const items: FocusItem[] = []

  // 7. Athletes approaching session_count milestones (within 2 sessions)
  for (const athleteId of athleteIds) {
    if (!activeAthleteIds.has(athleteId)) continue
    const count = sessionCountMap[athleteId] ?? 0
    const earned = earnedMap[athleteId] ?? new Set()

    for (const def of milestoneDefs) {
      if (earned.has(def.id)) continue
      const condition = def.condition as { metric?: string; threshold?: number } | null
      if (!condition || condition.metric !== 'session_count' || !condition.threshold) continue

      const left = condition.threshold - count
      if (left > 0 && left <= 2) {
        items.push({
          type: 'approaching_milestone',
          athleteId,
          athleteName: nameMap[athleteId],
          icon: def.icon ?? '🏅',
          title: `${nameMap[athleteId]} is ${left} run${left !== 1 ? 's' : ''} away`,
          subtitle: `${def.icon ?? '🏅'} ${def.label}`,
        })
      }
    }
  }

  // 8. Athletes not seen recently (>14 days)
  const todayStr = todayInTimezone(timezone)
  const todayMs = new Date(todayStr + 'T00:00:00').getTime()

  for (const athleteId of athleteIds) {
    if (!activeAthleteIds.has(athleteId)) continue
    const lastDate = lastDateMap[athleteId]
    if (!lastDate) continue

    const lastDateOnly = lastDate.split('T')[0]
    const lastMs = new Date(lastDateOnly + 'T00:00:00').getTime()
    const daysAgo = Math.floor((todayMs - lastMs) / (1000 * 60 * 60 * 24))

    if (daysAgo >= 14) {
      items.push({
        type: 'not_seen_recently',
        athleteId,
        athleteName: nameMap[athleteId],
        icon: '👋',
        title: `Haven't seen ${nameMap[athleteId]}`,
        subtitle: `Last run ${daysAgo} days ago`,
      })
    }
  }

  // 9. Coaching insights — feel declines, personal bests, best weeks
  //    Group sessions by athlete for insight detection
  const sessionsByAthlete: Record<string, SessionForInsights[]> = {}
  for (const s of latestPerAthlete ?? []) {
    if (!activeAthleteIds.has(s.athlete_id)) continue
    if (!s.date) continue
    if (!sessionsByAthlete[s.athlete_id]) sessionsByAthlete[s.athlete_id] = []
    const row = s as { date: string; distance_km: number | null; feel: number | null; athlete_id: string }
    sessionsByAthlete[s.athlete_id].push({
      date: row.date,
      distance_km: row.distance_km ?? null,
      feel: row.feel ?? null,
      athlete_id: row.athlete_id,
    })
  }

  for (const athleteId of Object.keys(sessionsByAthlete)) {
    const athleteSessions = sessionsByAthlete[athleteId]
    const name = nameMap[athleteId]
    if (!name) continue

    // Feel decline
    const decline = detectFeelDecline(athleteSessions)
    if (decline) {
      items.push({
        type: 'feel_declining',
        athleteId,
        athleteName: name,
        icon: '📉',
        title: `${name}'s mood is dipping`,
        subtitle: `Avg feel ${decline.avgPrior} → ${decline.avgRecent}`,
      })
    }

    // Personal best
    const pb = detectRecentPersonalBest(athleteSessions)
    if (pb) {
      items.push({
        type: 'personal_best',
        athleteId,
        athleteName: name,
        icon: '🏅',
        title: `${name} set a new PB!`,
        subtitle: `${pb.distanceKm} km${pb.previousBestKm ? ` (was ${pb.previousBestKm} km)` : ''}`,
      })
    }

    // Best week ever
    const bestWeek = detectBestWeekEver(athleteSessions)
    if (bestWeek) {
      items.push({
        type: 'best_week_ever',
        athleteId,
        athleteName: name,
        icon: '🌟',
        title: `${name}'s best week ever!`,
        subtitle: `${bestWeek.thisWeekKm} km (previous best: ${bestWeek.previousBestWeekKm} km)`,
      })
    }
  }

  // Sort by priority: warnings first, then milestones, then celebrations, then info
  const priorityOrder: Record<string, number> = {
    feel_declining: 0,
    approaching_milestone: 1,
    personal_best: 2,
    best_week_ever: 3,
    not_seen_recently: 4,
  }
  items.sort((a, b) => (priorityOrder[a.type] ?? 5) - (priorityOrder[b.type] ?? 5))

  return { streak, items: items.slice(0, 5) }
}

/**
 * Fetch next-milestone data for a caregiver's athlete.
 */
export async function getCaregiverFocusData(athleteId: string): Promise<CaregiverFocusData> {
  const [
    { count: sessionCount },
    milestoneDefs,
    { data: earnedMilestones },
    { data: lastSession },
  ] = await Promise.all([
    adminClient.from('sessions').select('*', { count: 'exact', head: true }).eq('athlete_id', athleteId).eq('status', 'completed').is('strava_deleted_at', null),
    // Issue 5: Use cached milestone definitions
    getMilestoneDefinitions(),
    adminClient.from('milestones').select('milestone_definition_id').eq('athlete_id', athleteId),
    adminClient
      .from('sessions')
      .select('date, feel')
      .eq('athlete_id', athleteId)
      .eq('status', 'completed')
      .is('strava_deleted_at', null)
      .order('date', { ascending: false })
      .limit(1),
  ])

  const totalSessions = sessionCount ?? 0
  const earned = new Set((earnedMilestones ?? []).map(m => m.milestone_definition_id).filter(Boolean))
  const latest = (lastSession ?? [])[0] ?? null

  // Find the NEXT unearned session_count milestone (closest threshold above current count)
  let nextMilestone: CaregiverFocusData['nextMilestone'] = null
  let closestThreshold = Infinity

  for (const def of milestoneDefs) {
    if (earned.has(def.id)) continue
    const condition = def.condition as { metric?: string; threshold?: number } | null
    if (!condition || condition.metric !== 'session_count' || !condition.threshold) continue
    if (condition.threshold > totalSessions && condition.threshold < closestThreshold) {
      closestThreshold = condition.threshold
      nextMilestone = {
        label: def.label,
        icon: def.icon ?? '🏅',
        current: totalSessions,
        target: condition.threshold,
      }
    }
  }

  return {
    nextMilestone,
    lastRunDate: latest?.date ?? null,
    lastRunFeel: latest?.feel ?? null,
    totalSessions,
  }
}
