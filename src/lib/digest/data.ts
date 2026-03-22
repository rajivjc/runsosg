/**
 * Digest data fetcher — server-side only.
 *
 * Assembles all inputs needed by the narrative generator, using
 * existing query patterns from the codebase.
 */

import { adminClient } from '@/lib/supabase/admin'
import { getPreviousWeekRange } from '@/lib/email/weekly-digest'
import {
  detectFeelDecline,
  detectRecentPersonalBest,
  detectBestWeekEver,
  type SessionForInsights,
} from '@/lib/analytics/coaching-insights'
import type { CoachDigestInput, CaregiverDigestInput, AthleteWeekData } from './types'

/**
 * Fetch digest data for a coach. Returns null if the user is not a coach/admin.
 */
export async function getCoachDigestData(userId: string): Promise<CoachDigestInput | null> {
  const { weekStart, weekEnd, label: weekLabel } = getPreviousWeekRange()

  // Verify user is a coach/admin and get name
  const { data: userRow } = await adminClient
    .from('users')
    .select('id, name, role')
    .eq('id', userId)
    .single()

  if (!userRow || (userRow.role !== 'coach' && userRow.role !== 'admin')) return null

  // Batch 1: Parallel independent queries
  const [
    { data: athletes },
    { data: weekSessions },
    { data: weekMilestones },
    { data: milestoneDefs },
  ] = await Promise.all([
    adminClient
      .from('athletes')
      .select('id, name, avatar')
      .eq('active', true),
    adminClient
      .from('sessions')
      .select('id, athlete_id, distance_km, feel, date')
      .eq('status', 'completed')
      .is('strava_deleted_at', null)
      .gte('date', weekStart)
      .lte('date', weekEnd),
    adminClient
      .from('milestones')
      .select('athlete_id, label, milestone_definition_id')
      .gte('achieved_at', weekStart)
      .lte('achieved_at', weekEnd),
    adminClient
      .from('milestone_definitions')
      .select('id, label, icon, condition')
      .eq('active', true)
      .eq('type', 'automatic'),
  ])

  if (!athletes || athletes.length === 0) {
    return {
      coachName: userRow.name ?? 'Coach',
      weekLabel,
      athletes: [],
      totalSessionsAllAthletes: 0,
      totalKmAllAthletes: 0,
    }
  }

  const athleteIds = athletes.map(a => a.id)

  // Batch 2: Queries that need athlete IDs
  const [
    { data: allSessions },
    { data: allEarnedMilestones },
    { data: allCompletedSessions },
  ] = await Promise.all([
    // All sessions for insight detection (PBs, feel trends, best week)
    adminClient
      .from('sessions')
      .select('id, athlete_id, distance_km, feel, date')
      .eq('status', 'completed')
      .is('strava_deleted_at', null)
      .in('athlete_id', athleteIds)
      .order('date', { ascending: true }),
    // All earned milestones (for next-milestone calculation)
    adminClient
      .from('milestones')
      .select('athlete_id, milestone_definition_id')
      .in('athlete_id', athleteIds),
    // Total session counts (for next-milestone calculation)
    adminClient
      .from('sessions')
      .select('athlete_id')
      .eq('status', 'completed')
      .is('strava_deleted_at', null)
      .in('athlete_id', athleteIds),
  ])

  // Build lookup maps
  const sessionsByAthlete = groupBy(allSessions ?? [], s => s.athlete_id)
  const weekSessionsByAthlete = groupBy(weekSessions ?? [], s => s.athlete_id)
  const milestoneDefMap = new Map((milestoneDefs ?? []).map(d => [d.id, d]))

  // Session count per athlete
  const sessionCountMap = new Map<string, number>()
  for (const s of allCompletedSessions ?? []) {
    sessionCountMap.set(s.athlete_id, (sessionCountMap.get(s.athlete_id) ?? 0) + 1)
  }

  // Earned milestone defs per athlete
  const earnedByAthlete = new Map<string, Set<string>>()
  for (const m of allEarnedMilestones ?? []) {
    if (!m.milestone_definition_id) continue
    const set = earnedByAthlete.get(m.athlete_id) ?? new Set()
    set.add(m.milestone_definition_id)
    earnedByAthlete.set(m.athlete_id, set)
  }

  // Build AthleteWeekData for each athlete
  const athleteWeekDataList: AthleteWeekData[] = []

  for (const athlete of athletes) {
    const ws = weekSessionsByAthlete.get(athlete.id) ?? []
    const allAthleteSessions = sessionsByAthlete.get(athlete.id) ?? []
    const insightSessions: SessionForInsights[] = allAthleteSessions.map(s => ({
      date: s.date,
      distance_km: s.distance_km != null ? Number(s.distance_km) : null,
      feel: s.feel != null ? Number(s.feel) : null,
      athlete_id: s.athlete_id,
    }))

    const sessionsThisWeek = ws.length
    const totalKmThisWeek = ws.reduce((sum, s) => sum + (Number(s.distance_km) || 0), 0)
    const feelsThisWeek = ws.filter(s => s.feel != null).map(s => Number(s.feel))

    // Personal best detection
    const pbInsight = detectRecentPersonalBest(insightSessions)
    let personalBest: AthleteWeekData['personalBest'] = null
    if (pbInsight && ws.some(s => s.date === pbInsight.date)) {
      personalBest = {
        distanceKm: pbInsight.distanceKm,
        previousBestKm: pbInsight.previousBestKm,
        date: pbInsight.date,
      }
    }

    // Best week ever detection
    const bestWeekInsight = detectBestWeekEver(insightSessions)
    const bestWeekEver = bestWeekInsight !== null

    // Feel trend
    const feelDecline = detectFeelDecline(insightSessions)
    let feelTrend: AthleteWeekData['feelTrend'] = 'insufficient'
    if (insightSessions.filter(s => s.feel != null).length >= 4) {
      if (feelDecline) {
        feelTrend = 'declining'
      } else {
        // Check for improvement: compare recent vs prior average feels
        const recentFeels = insightSessions
          .filter(s => s.feel != null)
          .slice(-4)
          .map(s => s.feel!)
        const priorFeels = insightSessions
          .filter(s => s.feel != null)
          .slice(0, -4)
          .map(s => s.feel!)
        if (priorFeels.length >= 2) {
          const recentAvg = recentFeels.reduce((a, b) => a + b, 0) / recentFeels.length
          const priorAvg = priorFeels.reduce((a, b) => a + b, 0) / priorFeels.length
          feelTrend = recentAvg - priorAvg > 0.5 ? 'improving' : 'stable'
        } else {
          feelTrend = 'stable'
        }
      }
    }

    // Going quiet detection
    let goingQuiet: AthleteWeekData['goingQuiet'] = null
    if (sessionsThisWeek === 0 && allAthleteSessions.length > 0) {
      const sortedDates = allAthleteSessions
        .map(s => s.date)
        .filter(Boolean)
        .sort()
      const lastDate = sortedDates[sortedDates.length - 1]
      if (lastDate) {
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' })
        const todayMs = new Date(todayStr + 'T00:00:00').getTime()
        const lastDateOnly = lastDate.split('T')[0]
        const lastMs = new Date(lastDateOnly + 'T00:00:00').getTime()
        const daysSince = Math.floor((todayMs - lastMs) / (1000 * 60 * 60 * 24))

        // Calculate average cadence
        let avgCadence = 7
        if (sortedDates.length >= 2) {
          const gaps: number[] = []
          for (let i = 1; i < sortedDates.length; i++) {
            const prev = new Date(sortedDates[i - 1].split('T')[0] + 'T00:00:00').getTime()
            const curr = new Date(sortedDates[i].split('T')[0] + 'T00:00:00').getTime()
            const gap = Math.floor((curr - prev) / (1000 * 60 * 60 * 24))
            if (gap > 0) gaps.push(gap)
          }
          if (gaps.length > 0) {
            avgCadence = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)
          }
        }

        // Flag if daysSince > 2 * averageCadence and daysSince >= 10
        if (daysSince > 2 * avgCadence && daysSince >= 10) {
          goingQuiet = {
            daysSinceLastSession: daysSince,
            averageCadenceDays: avgCadence,
          }
        }
      }
    }

    // Milestones earned this week
    const athleteWeekMilestones = (weekMilestones ?? [])
      .filter(m => m.athlete_id === athlete.id)
      .map(m => {
        const def = m.milestone_definition_id ? milestoneDefMap.get(m.milestone_definition_id) : null
        return {
          label: m.label,
          icon: def?.icon ?? '🏆',
        }
      })

    // Approaching milestone
    const totalSessionCount = sessionCountMap.get(athlete.id) ?? 0
    const earned = earnedByAthlete.get(athlete.id) ?? new Set()
    let approachingMilestone: AthleteWeekData['approachingMilestone'] = null
    let closestThreshold = Infinity

    for (const def of milestoneDefs ?? []) {
      if (earned.has(def.id)) continue
      const condition = def.condition as { metric?: string; threshold?: number } | null
      if (!condition || condition.metric !== 'session_count' || !condition.threshold) continue
      if (condition.threshold > totalSessionCount && condition.threshold < closestThreshold) {
        closestThreshold = condition.threshold
        approachingMilestone = {
          label: def.label,
          current: totalSessionCount,
          target: condition.threshold,
          unit: 'sessions',
        }
      }
    }

    // Cumulative totals
    const totalSessionsAllTime = (allCompletedSessions ?? []).filter(s => s.athlete_id === athlete.id).length
    const totalKmAllTime = Math.round(
      (allSessions ?? [])
        .filter(s => s.athlete_id === athlete.id)
        .reduce((sum, s) => sum + (Number(s.distance_km) || 0), 0) * 10
    ) / 10

    // Last session date
    const sortedDates = allAthleteSessions.map(s => s.date).filter(Boolean).sort()
    const lastSessionDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null

    athleteWeekDataList.push({
      athleteId: athlete.id,
      athleteName: athlete.name,
      avatar: athlete.avatar ?? null,
      sessionsThisWeek,
      totalKmThisWeek: Math.round(totalKmThisWeek * 10) / 10,
      feelsThisWeek,
      personalBest,
      milestonesEarned: athleteWeekMilestones,
      feelTrend,
      goingQuiet,
      approachingMilestone,
      bestWeekEver,
      totalSessionsAllTime,
      totalKmAllTime,
      lastSessionDate,
    })
  }

  const totalSessions = (weekSessions ?? []).length
  const totalKm = Math.round(
    (weekSessions ?? []).reduce((sum, s) => sum + (Number(s.distance_km) || 0), 0) * 10
  ) / 10

  return {
    coachName: userRow.name ?? 'Coach',
    weekLabel,
    athletes: athleteWeekDataList,
    totalSessionsAllAthletes: totalSessions,
    totalKmAllAthletes: totalKm,
  }
}

/**
 * Fetch digest data for a caregiver. Returns null if the user is not a caregiver
 * or has no linked athlete.
 */
export async function getCaregiverDigestData(userId: string): Promise<CaregiverDigestInput | null> {
  const { weekStart, weekEnd, label: weekLabel } = getPreviousWeekRange()

  // Verify user is a caregiver and get name
  const { data: userRow } = await adminClient
    .from('users')
    .select('id, name, role')
    .eq('id', userId)
    .single()

  if (!userRow || userRow.role !== 'caregiver') return null

  // Find linked athlete
  const { data: athlete } = await adminClient
    .from('athletes')
    .select('id, name, avatar')
    .eq('caregiver_user_id', userId)
    .eq('active', true)
    .single()

  if (!athlete) return null

  // Batch: Parallel queries for this athlete
  const [
    { data: weekSessions },
    { data: allSessions },
    { data: weekMilestones },
    { data: milestoneDefs },
    { data: allEarnedMilestones },
    { data: allCompletedSessions },
  ] = await Promise.all([
    adminClient
      .from('sessions')
      .select('id, athlete_id, distance_km, feel, date')
      .eq('status', 'completed')
      .is('strava_deleted_at', null)
      .eq('athlete_id', athlete.id)
      .gte('date', weekStart)
      .lte('date', weekEnd),
    adminClient
      .from('sessions')
      .select('id, athlete_id, distance_km, feel, date')
      .eq('status', 'completed')
      .is('strava_deleted_at', null)
      .eq('athlete_id', athlete.id)
      .order('date', { ascending: true }),
    adminClient
      .from('milestones')
      .select('athlete_id, label, milestone_definition_id')
      .eq('athlete_id', athlete.id)
      .gte('achieved_at', weekStart)
      .lte('achieved_at', weekEnd),
    adminClient
      .from('milestone_definitions')
      .select('id, label, icon, condition')
      .eq('active', true)
      .eq('type', 'automatic'),
    adminClient
      .from('milestones')
      .select('athlete_id, milestone_definition_id')
      .eq('athlete_id', athlete.id),
    adminClient
      .from('sessions')
      .select('athlete_id')
      .eq('status', 'completed')
      .is('strava_deleted_at', null)
      .eq('athlete_id', athlete.id),
  ])

  const ws = weekSessions ?? []
  const insightSessions: SessionForInsights[] = (allSessions ?? []).map(s => ({
    date: s.date,
    distance_km: s.distance_km != null ? Number(s.distance_km) : null,
    feel: s.feel != null ? Number(s.feel) : null,
    athlete_id: s.athlete_id,
  }))

  const sessionsThisWeek = ws.length
  const totalKmThisWeek = ws.reduce((sum, s) => sum + (Number(s.distance_km) || 0), 0)
  const feelsThisWeek = ws.filter(s => s.feel != null).map(s => Number(s.feel))

  // Personal best
  const pbInsight = detectRecentPersonalBest(insightSessions)
  let personalBest: AthleteWeekData['personalBest'] = null
  if (pbInsight && ws.some(s => s.date === pbInsight.date)) {
    personalBest = {
      distanceKm: pbInsight.distanceKm,
      previousBestKm: pbInsight.previousBestKm,
      date: pbInsight.date,
    }
  }

  // Best week ever
  const bestWeekInsight = detectBestWeekEver(insightSessions)
  const bestWeekEver = bestWeekInsight !== null

  // Milestones earned this week
  const milestoneDefMap = new Map((milestoneDefs ?? []).map(d => [d.id, d]))
  const athleteWeekMilestones = (weekMilestones ?? []).map(m => {
    const def = m.milestone_definition_id ? milestoneDefMap.get(m.milestone_definition_id) : null
    return { label: m.label, icon: def?.icon ?? '🏆' }
  })

  // Approaching milestone
  const totalSessionCount = (allCompletedSessions ?? []).length
  const earned = new Set(
    (allEarnedMilestones ?? [])
      .map(m => m.milestone_definition_id)
      .filter((id): id is string => id !== null)
  )
  let approachingMilestone: AthleteWeekData['approachingMilestone'] = null
  let closestThreshold = Infinity

  for (const def of milestoneDefs ?? []) {
    if (earned.has(def.id)) continue
    const condition = def.condition as { metric?: string; threshold?: number } | null
    if (!condition || condition.metric !== 'session_count' || !condition.threshold) continue
    if (condition.threshold > totalSessionCount && condition.threshold < closestThreshold) {
      closestThreshold = condition.threshold
      approachingMilestone = {
        label: def.label,
        current: totalSessionCount,
        target: condition.threshold,
        unit: 'sessions',
      }
    }
  }

  // Cumulative totals
  const cgTotalSessionsAllTime = (allCompletedSessions ?? []).length
  const cgTotalKmAllTime = Math.round(
    (allSessions ?? []).reduce((sum, s) => sum + (Number(s.distance_km) || 0), 0) * 10
  ) / 10
  const cgSortedDates = (allSessions ?? []).map(s => s.date).filter(Boolean).sort()
  const cgLastSessionDate = cgSortedDates.length > 0 ? cgSortedDates[cgSortedDates.length - 1] : null

  // Caregiver doesn't see feel data, but we still populate the field for the type
  // The narrative generator will not use feel data for caregiver output
  const athleteData: AthleteWeekData = {
    athleteId: athlete.id,
    athleteName: athlete.name,
    avatar: athlete.avatar ?? null,
    sessionsThisWeek,
    totalKmThisWeek: Math.round(totalKmThisWeek * 10) / 10,
    feelsThisWeek,
    personalBest,
    milestonesEarned: athleteWeekMilestones,
    feelTrend: 'insufficient', // Not used for caregiver narrative
    goingQuiet: null, // Not shown to caregivers
    approachingMilestone,
    bestWeekEver,
    totalSessionsAllTime: cgTotalSessionsAllTime,
    totalKmAllTime: cgTotalKmAllTime,
    lastSessionDate: cgLastSessionDate,
  }

  return {
    caregiverName: userRow.name ?? null,
    weekLabel,
    athlete: athleteData,
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const key = keyFn(item)
    const arr = map.get(key) ?? []
    arr.push(item)
    map.set(key, arr)
  }
  return map
}
