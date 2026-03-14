/**
 * Weekly digest data computation.
 *
 * Computes per-coach and per-caregiver digest data for the previous week,
 * then sends branded emails via the Resend pipeline.
 */

import { adminClient } from '@/lib/supabase/admin'

export interface CoachDigestData {
  coachUserId: string
  coachName: string
  coachEmail: string
  totalSessions: number
  athleteNames: string[]
}

export interface CaregiverDigestData {
  caregiverUserId: string
  caregiverName: string | null
  caregiverEmail: string
  athleteId: string
  athleteName: string
  totalSessions: number
  totalKm: number
  milestonesEarned: { label: string; icon: string }[]
  nextMilestone: { label: string; current: number; target: number } | null
}

/**
 * Compute the previous week's Monday 00:00 and Sunday 23:59:59 in SGT.
 */
export function getPreviousWeekRange(): { weekStart: string; weekEnd: string; label: string } {
  const now = new Date()
  // Get current time in SGT
  const sgt = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Singapore' }))

  // Go to previous Monday: subtract (dayOfWeek - 1 + 7) days
  const day = sgt.getDay() // 0=Sun, 1=Mon
  const daysSinceMonday = day === 0 ? 6 : day - 1
  const prevMonday = new Date(sgt)
  prevMonday.setDate(sgt.getDate() - daysSinceMonday - 7)
  prevMonday.setHours(0, 0, 0, 0)

  const prevSunday = new Date(prevMonday)
  prevSunday.setDate(prevMonday.getDate() + 6)
  prevSunday.setHours(23, 59, 59, 999)

  // Format as ISO strings offset to SGT (UTC+8)
  const toSgtIso = (d: Date) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const dayStr = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const mins = String(d.getMinutes()).padStart(2, '0')
    const secs = String(d.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${dayStr}T${hours}:${mins}:${secs}+08:00`
  }

  const label = `${prevMonday.getDate()} ${prevMonday.toLocaleString('en-SG', { month: 'short' })} – ${prevSunday.getDate()} ${prevSunday.toLocaleString('en-SG', { month: 'short' })} ${prevSunday.getFullYear()}`

  return {
    weekStart: toSgtIso(prevMonday),
    weekEnd: toSgtIso(prevSunday),
    label,
  }
}

/**
 * Fetch digest data for all active coaches who logged sessions in the given week.
 */
export async function getCoachDigests(
  weekStart: string,
  weekEnd: string
): Promise<CoachDigestData[]> {
  // Fetch completed sessions in the date range with coach and athlete info
  const { data: sessions } = await adminClient
    .from('sessions')
    .select('coach_user_id, athletes!inner(name)')
    .eq('status', 'completed')
    .is('strava_deleted_at', null)
    .gte('date', weekStart)
    .lte('date', weekEnd)
    .not('coach_user_id', 'is', null)

  if (!sessions || sessions.length === 0) return []

  // Group sessions by coach
  const coachMap = new Map<string, { athleteNames: Set<string>; count: number }>()
  for (const s of sessions) {
    const coachId = s.coach_user_id as string
    const athleteName = (s.athletes as unknown as { name: string })?.name ?? 'Unknown'
    const entry = coachMap.get(coachId) ?? { athleteNames: new Set(), count: 0 }
    entry.athleteNames.add(athleteName)
    entry.count++
    coachMap.set(coachId, entry)
  }

  // Fetch coach user profiles and emails
  const coachIds = [...coachMap.keys()]
  const { data: coachUsers } = await adminClient
    .from('users')
    .select('id, name')
    .in('id', coachIds)
    .eq('active', true)

  const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const authMap = new Map(authUsers?.map(u => [u.id, u.email]) ?? [])

  const digests: CoachDigestData[] = []
  for (const coachUser of coachUsers ?? []) {
    const entry = coachMap.get(coachUser.id)
    const email = authMap.get(coachUser.id)
    if (!entry || !email) continue

    digests.push({
      coachUserId: coachUser.id,
      coachName: coachUser.name ?? 'Coach',
      coachEmail: email,
      totalSessions: entry.count,
      athleteNames: [...entry.athleteNames].sort(),
    })
  }

  return digests
}

/**
 * Fetch digest data for all caregivers whose linked athlete had sessions in the given week.
 */
export async function getCaregiverDigests(
  weekStart: string,
  weekEnd: string
): Promise<CaregiverDigestData[]> {
  // Find athletes with a linked caregiver
  const { data: athletes } = await adminClient
    .from('athletes')
    .select('id, name, caregiver_user_id')
    .eq('active', true)
    .not('caregiver_user_id', 'is', null)

  if (!athletes || athletes.length === 0) return []

  const athleteIds = athletes.map(a => a.id)

  // Fetch sessions for these athletes in the date range
  const { data: sessions } = await adminClient
    .from('sessions')
    .select('athlete_id, distance_km')
    .eq('status', 'completed')
    .is('strava_deleted_at', null)
    .gte('date', weekStart)
    .lte('date', weekEnd)
    .in('athlete_id', athleteIds)

  // Fetch milestones earned this week for these athletes
  const { data: milestones } = await adminClient
    .from('milestones')
    .select('athlete_id, label')
    .gte('achieved_at', weekStart)
    .lte('achieved_at', weekEnd)
    .in('athlete_id', athleteIds)

  // Fetch all milestone definitions for next-milestone calculation
  const { data: milestoneDefs } = await adminClient
    .from('milestone_definitions')
    .select('id, label, icon, condition')
    .eq('active', true)
    .eq('type', 'automatic')

  // Fetch all earned milestones for these athletes (for next-milestone calculation)
  const { data: allEarnedMilestones } = await adminClient
    .from('milestones')
    .select('athlete_id, milestone_definition_id')
    .in('athlete_id', athleteIds)

  // Fetch total session counts for each athlete (for next-milestone calculation)
  const { data: allCompletedSessions } = await adminClient
    .from('sessions')
    .select('athlete_id')
    .eq('status', 'completed')
    .is('strava_deleted_at', null)
    .in('athlete_id', athleteIds)

  const sessionCountMap = new Map<string, number>()
  for (const s of allCompletedSessions ?? []) {
    sessionCountMap.set(s.athlete_id, (sessionCountMap.get(s.athlete_id) ?? 0) + 1)
  }

  // Fetch caregiver info
  const caregiverIds = [...new Set(athletes.map(a => a.caregiver_user_id as string))]
  const { data: caregiverUsers } = await adminClient
    .from('users')
    .select('id, name')
    .in('id', caregiverIds)
    .eq('active', true)

  const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const authMap = new Map(authUsers?.map(u => [u.id, u.email]) ?? [])
  const caregiverMap = new Map(
    (caregiverUsers ?? []).map(u => [u.id, { name: u.name, email: authMap.get(u.id) }])
  )

  // Build earned milestones lookup per athlete
  const earnedByAthlete = new Map<string, Set<string>>()
  for (const m of allEarnedMilestones ?? []) {
    if (!m.milestone_definition_id) continue
    const set = earnedByAthlete.get(m.athlete_id) ?? new Set()
    set.add(m.milestone_definition_id)
    earnedByAthlete.set(m.athlete_id, set)
  }

  const digests: CaregiverDigestData[] = []
  for (const athlete of athletes) {
    const caregiverInfo = caregiverMap.get(athlete.caregiver_user_id as string)
    if (!caregiverInfo?.email) continue

    const athleteSessions = (sessions ?? []).filter(s => s.athlete_id === athlete.id)
    // Skip athletes with 0 sessions this week
    if (athleteSessions.length === 0) continue

    const totalKm = athleteSessions.reduce(
      (sum, s) => sum + (Number(s.distance_km) || 0),
      0
    )

    const weekMilestones = (milestones ?? [])
      .filter(m => m.athlete_id === athlete.id)
      .map(m => ({ label: m.label, icon: '🏆' }))

    // Calculate next milestone
    const totalSessionCount = sessionCountMap.get(athlete.id) ?? 0
    const earned = earnedByAthlete.get(athlete.id) ?? new Set()
    let nextMilestone: CaregiverDigestData['nextMilestone'] = null
    let closestThreshold = Infinity

    for (const def of milestoneDefs ?? []) {
      if (earned.has(def.id)) continue
      const condition = def.condition as { metric?: string; threshold?: number } | null
      if (!condition || condition.metric !== 'session_count' || !condition.threshold) continue
      if (condition.threshold > totalSessionCount && condition.threshold < closestThreshold) {
        closestThreshold = condition.threshold
        nextMilestone = {
          label: def.label,
          current: totalSessionCount,
          target: condition.threshold,
        }
      }
    }

    digests.push({
      caregiverUserId: athlete.caregiver_user_id as string,
      caregiverName: caregiverInfo.name ?? null,
      caregiverEmail: caregiverInfo.email,
      athleteId: athlete.id,
      athleteName: athlete.name,
      totalSessions: athleteSessions.length,
      totalKm,
      milestonesEarned: weekMilestones,
      nextMilestone,
    })
  }

  return digests
}
