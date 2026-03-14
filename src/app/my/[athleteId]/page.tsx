import { adminClient } from '@/lib/supabase/admin'
import { calculateGoalProgress } from '@/lib/goals'
import { calculateWeeklyStreak } from '@/lib/streaks'
import { verifyAthleteCookie } from './actions'
import PinEntry from '@/components/athlete/PinEntry'
import MyJourneyDashboard from '@/components/athlete/MyJourneyDashboard'
import type { GoalType } from '@/lib/goals'

interface PageProps {
  params: Promise<{ athleteId: string }>
}

export default async function MyJourneyPage({ params }: PageProps) {
  const { athleteId } = await params

  // Check if athlete exists and has a PIN set
  const { data: athlete } = await adminClient
    .from('athletes')
    .select('id, name, photo_url, goal_type, goal_target, allow_public_sharing, athlete_goal_choice, theme_color')
    .eq('id', athleteId)
    .eq('active', true)
    .single()

  if (!athlete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-900 mb-2">Page not found</p>
          <p className="text-base text-gray-600">
            This link may not be correct. Please check with your coach.
          </p>
        </div>
      </div>
    )
  }

  // Verify PIN cookie
  const isVerified = await verifyAthleteCookie(athleteId)

  if (!isVerified) {
    return <PinEntry athleteId={athleteId} athleteName={athlete.name} />
  }

  // ── Fetch dashboard data ──────────────────────────────────

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [
    { data: sessions },
    { data: milestones },
    { data: cheers },
    { count: totalRuns },
    { data: allSessionDates },
    { data: todayMood },
    { data: favorites },
  ] = await Promise.all([
    adminClient
      .from('sessions')
      .select('id, date, distance_km, feel')
      .eq('athlete_id', athleteId)
      .eq('status', 'completed')
      .order('date', { ascending: false })
      .limit(5),
    adminClient
      .from('milestones')
      .select('id, label, achieved_at, milestone_definitions(icon)')
      .eq('athlete_id', athleteId)
      .order('achieved_at', { ascending: false }),
    adminClient
      .from('cheers')
      .select('id, message, created_at')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: false })
      .limit(5),
    adminClient
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('athlete_id', athleteId)
      .eq('status', 'completed')
      .is('strava_deleted_at', null),
    adminClient
      .from('sessions')
      .select('date, distance_km')
      .eq('athlete_id', athleteId)
      .eq('status', 'completed')
      .is('strava_deleted_at', null),
    adminClient
      .from('athlete_moods')
      .select('mood')
      .eq('athlete_id', athleteId)
      .gte('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(1),
    adminClient
      .from('athlete_favorites')
      .select('session_id')
      .eq('athlete_id', athleteId),
  ])

  const allSessions = allSessionDates ?? []

  // Compute total distance
  const totalKm = allSessions.reduce(
    (sum, s) => sum + (s.distance_km ?? 0),
    0
  )

  // Compute goal progress
  let goalProgress = null
  if (athlete.goal_type && athlete.goal_target) {
    goalProgress = calculateGoalProgress(
      athlete.goal_type as GoalType,
      athlete.goal_target,
      allSessions
    )
  }

  // Compute streak using the shared streaks module
  const streak = calculateWeeklyStreak(allSessions.map(s => s.date))

  // Compute personal best (longest run)
  let personalBest: { distance_km: number; date: string } | null = null
  for (const s of allSessions) {
    if ((s.distance_km ?? 0) > (personalBest?.distance_km ?? 0)) {
      personalBest = { distance_km: s.distance_km as number, date: s.date }
    }
  }
  if (personalBest && personalBest.distance_km <= 0) personalBest = null

  // Process milestones
  const processedMilestones = (milestones ?? []).map(m => ({
    id: m.id,
    label: m.label,
    icon: (m as unknown as { milestone_definitions?: { icon?: string } }).milestone_definitions?.icon ?? '🏆',
    achieved_at: m.achieved_at,
  }))

  const storyUrl = athlete.allow_public_sharing ? `/story/${athlete.id}` : null
  const currentMood = todayMood?.[0]?.mood ?? null
  const favoriteSessionIds = new Set((favorites ?? []).map(f => f.session_id))

  return (
    <MyJourneyDashboard
      athlete={{
        id: athlete.id,
        name: athlete.name,
        photo_url: athlete.photo_url,
      }}
      athleteGoalChoice={athlete.athlete_goal_choice ?? null}
      themeColor={athlete.theme_color ?? 'teal'}
      currentMood={currentMood}
      favoriteSessionIds={Array.from(favoriteSessionIds)}
      stats={{
        totalRuns: totalRuns ?? 0,
        totalKm: Math.round(totalKm * 10) / 10,
        currentStreak: streak.current,
      }}
      milestones={processedMilestones}
      goal={goalProgress}
      personalBest={personalBest}
      recentRuns={(sessions ?? []).map(s => ({
        id: s.id,
        date: s.date,
        distance_km: s.distance_km,
        feel: s.feel,
      }))}
      cheers={(cheers ?? []).map(c => ({
        id: c.id,
        message: c.message,
        created_at: c.created_at,
      }))}
      storyUrl={storyUrl}
    />
  )
}
