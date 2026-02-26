import { adminClient } from '@/lib/supabase/admin'
import { calculateWeeklyStreak } from '@/lib/streaks'

export interface FocusItem {
  type: 'approaching_milestone' | 'not_seen_recently'
  athleteId: string
  athleteName: string
  icon: string
  title: string
  subtitle: string
}

export interface CoachFocusData {
  streak: { current: number; activeThisWeek: boolean }
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
export async function getCoachFocusData(coachUserId: string): Promise<CoachFocusData> {
  // 1. All sessions by this coach (for streak + discovering their athletes)
  const { data: coachSessions } = await adminClient
    .from('sessions')
    .select('date, athlete_id')
    .eq('coach_user_id', coachUserId)
    .eq('status', 'completed')

  if (!coachSessions || coachSessions.length === 0) {
    return { streak: { current: 0, activeThisWeek: false }, items: [] }
  }

  // 2. Calculate streak
  const streak = calculateWeeklyStreak(coachSessions.map(s => s.date))

  // 3. Unique athlete IDs this coach has worked with
  const athleteIds = [...new Set(coachSessions.map(s => s.athlete_id))]

  // 4. Parallel: athlete names, all sessions for those athletes, milestone defs, earned milestones
  const [
    { data: athleteRows },
    { data: allAthleteSessionData },
    { data: milestoneDefs },
    { data: earnedMilestones },
  ] = await Promise.all([
    adminClient.from('athletes').select('id, name').in('id', athleteIds).eq('active', true),
    adminClient.from('sessions').select('athlete_id, date').in('athlete_id', athleteIds).eq('status', 'completed'),
    adminClient.from('milestone_definitions').select('id, label, icon, condition').eq('active', true).eq('type', 'automatic'),
    adminClient.from('milestones').select('athlete_id, milestone_definition_id').in('athlete_id', athleteIds),
  ])

  const nameMap = Object.fromEntries((athleteRows ?? []).map(a => [a.id, a.name]))
  const activeAthleteIds = new Set((athleteRows ?? []).map(a => a.id))

  // 5. Per-athlete: session count + last session date
  const sessionCountMap: Record<string, number> = {}
  const lastDateMap: Record<string, string> = {}
  for (const s of allAthleteSessionData ?? []) {
    sessionCountMap[s.athlete_id] = (sessionCountMap[s.athlete_id] ?? 0) + 1
    if (!lastDateMap[s.athlete_id] || s.date > lastDateMap[s.athlete_id]) {
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

    for (const def of milestoneDefs ?? []) {
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
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' })
  const todayMs = new Date(todayStr + 'T00:00:00').getTime()

  for (const athleteId of athleteIds) {
    if (!activeAthleteIds.has(athleteId)) continue
    const lastDate = lastDateMap[athleteId]
    if (!lastDate) continue

    const lastMs = new Date(lastDate + 'T00:00:00').getTime()
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

  // Sort: approaching milestones first (fewest left first), then not seen (most days first)
  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'approaching_milestone' ? -1 : 1
    return 0
  })

  return { streak, items: items.slice(0, 3) }
}

/**
 * Fetch next-milestone data for a caregiver's athlete.
 */
export async function getCaregiverFocusData(athleteId: string): Promise<CaregiverFocusData> {
  const [
    { data: sessionData },
    { data: milestoneDefs },
    { data: earnedMilestones },
    { data: lastSession },
  ] = await Promise.all([
    adminClient.from('sessions').select('id').eq('athlete_id', athleteId).eq('status', 'completed'),
    adminClient.from('milestone_definitions').select('id, label, icon, condition').eq('active', true).eq('type', 'automatic'),
    adminClient.from('milestones').select('milestone_definition_id').eq('athlete_id', athleteId),
    adminClient
      .from('sessions')
      .select('date, feel')
      .eq('athlete_id', athleteId)
      .eq('status', 'completed')
      .order('date', { ascending: false })
      .limit(1),
  ])

  const totalSessions = (sessionData ?? []).length
  const earned = new Set((earnedMilestones ?? []).map(m => m.milestone_definition_id).filter(Boolean))
  const latest = (lastSession ?? [])[0] ?? null

  // Find the NEXT unearned session_count milestone (closest threshold above current count)
  let nextMilestone: CaregiverFocusData['nextMilestone'] = null
  let closestThreshold = Infinity

  for (const def of milestoneDefs ?? []) {
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
