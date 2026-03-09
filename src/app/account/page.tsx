import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import SignOutButton from '@/components/account/SignOutButton'

export const metadata: Metadata = { title: 'My Account — SOSG Running Club' }
import StravaStatus from '@/components/account/StravaStatus'
import DisplayNameForm from '@/components/account/DisplayNameForm'
import PushToggle from '@/components/account/PushToggle'
import { formatDate, formatDistance } from '@/lib/utils/dates'
import { BADGE_DEFINITIONS } from '@/lib/badges'
import { calculateGoalProgress } from '@/lib/goals'
import type { GoalType } from '@/lib/goals'
import { calculateStreakDetails } from '@/lib/streaks'
import { getMilestoneDefinitions } from '@/lib/feed/shared-queries'
import StreakCalendar from '@/components/account/StreakCalendar'
import MilestoneTimeline from '@/components/account/MilestoneTimeline'

const FEEL_EMOJI: Record<number, string> = {
  1: '😰', 2: '😐', 3: '🙂', 4: '😊', 5: '🔥',
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: { setup?: string; connected?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRow } = await adminClient
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  const isCaregiver = userRow?.role === 'caregiver'

  const { data: connection } = await adminClient
    .from('strava_connections')
    .select('strava_athlete_id, token_expires_at, last_sync_at, last_sync_status, last_error, created_at')
    .eq('user_id', user.id)
    .maybeSingle()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]

  // Coach stats
  const { data: statsData } = !isCaregiver ? await adminClient
    .from('sessions')
    .select('id, athlete_id, date')
    .eq('coach_user_id', user.id)
    .eq('status', 'completed')
    : { data: [] }

  const totalSessions = (statsData ?? []).length
  const totalAthletes = new Set((statsData ?? []).map((s: any) => s.athlete_id)).size
  const coachThisMonth = (statsData ?? []).filter((s: any) => s.date >= monthStart).length
  const coachStreak = !isCaregiver && totalSessions > 0
    ? calculateStreakDetails((statsData ?? []).map((s: any) => s.date).filter(Boolean))
    : null

  // Coach badges
  const { data: earnedBadges } = !isCaregiver
    ? await adminClient.from('coach_badges').select('badge_key, earned_at').eq('user_id', user.id)
    : { data: [] }
  const earnedBadgeKeys = new Set((earnedBadges ?? []).map((b: any) => b.badge_key))

  // Caregiver data
  let caregiverAthlete: any = null
  let athleteSessions: any[] = []
  let athleteMilestones: any[] = []
  let athleteCoachNames: string[] = []
  let lastMonthRuns = 0
  let athleteAllSessionDates: string[] = []
  let athleteMilestoneDefs: Awaited<ReturnType<typeof getMilestoneDefinitions>> = []

  if (isCaregiver) {
    const { data: athlete } = await adminClient
      .from('athletes')
      .select('id, name, running_goal, goal_type, goal_target, photo_url')
      .eq('caregiver_user_id', user.id)
      .maybeSingle()

    caregiverAthlete = athlete

    if (athlete) {
      const [
        { data: sessions },
        { data: milestones },
        { data: lastMonthSessions },
        { data: allSessionDates },
        milestoneDefs,
      ] = await Promise.all([
        adminClient
          .from('sessions')
          .select('id, date, distance_km, duration_seconds, feel, note, coach_user_id')
          .eq('athlete_id', athlete.id)
          .eq('status', 'completed')
          .order('date', { ascending: false })
          .limit(50),
        adminClient
          .from('milestones')
          .select('id, label, achieved_at, milestone_definitions(icon)')
          .eq('athlete_id', athlete.id)
          .order('achieved_at', { ascending: false }),
        adminClient
          .from('sessions')
          .select('id')
          .eq('athlete_id', athlete.id)
          .eq('status', 'completed')
          .gte('date', lastMonthStart)
          .lt('date', monthStart),
        adminClient
          .from('sessions')
          .select('date')
          .eq('athlete_id', athlete.id)
          .eq('status', 'completed'),
        getMilestoneDefinitions(),
      ])

      athleteSessions = sessions ?? []
      athleteMilestones = milestones ?? []
      lastMonthRuns = (lastMonthSessions ?? []).length
      athleteAllSessionDates = (allSessionDates ?? []).map((s: any) => s.date).filter(Boolean)
      athleteMilestoneDefs = milestoneDefs

      // Fetch unique coach names
      const coachIds = [...new Set(athleteSessions.map((s: any) => s.coach_user_id).filter(Boolean))]
      if (coachIds.length > 0) {
        const { data: coaches } = await adminClient
          .from('users')
          .select('name')
          .in('id', coachIds)
        athleteCoachNames = (coaches ?? []).map((c: any) => c.name).filter(Boolean)
      }
    }
  }

  const thisMonthSessions = athleteSessions.filter((s: any) => s.date >= monthStart)
  const totalAthleteSessions = athleteSessions.length
  const totalAthleteKm = athleteSessions.reduce((sum: number, s: any) => sum + (s.distance_km ?? 0), 0)
  const thisMonthKm = thisMonthSessions.reduce((sum: number, s: any) => sum + (s.distance_km ?? 0), 0)
  const thisMonthRuns = thisMonthSessions.length
  const runsTrend = thisMonthRuns - lastMonthRuns
  const latestSession = athleteSessions[0] ?? null

  // Athlete streak (for caregiver)
  const athleteStreak = isCaregiver && athleteAllSessionDates.length > 0
    ? calculateStreakDetails(athleteAllSessionDates)
    : null

  // Goal progress (no new query — uses already-fetched sessions)
  const goalProgress = caregiverAthlete?.goal_type && caregiverAthlete?.goal_target
    ? calculateGoalProgress(
        caregiverAthlete.goal_type as GoalType,
        Number(caregiverAthlete.goal_target),
        athleteSessions
      )
    : null

  // Motivational message for caregiver
  function getMotivation() {
    if (!caregiverAthlete) return null
    const name = caregiverAthlete.name?.split(' ')[0] ?? 'Your athlete'
    if (thisMonthRuns >= 8) return `${name} is on fire this month! What an incredible effort.`
    if (thisMonthRuns >= 4) return `${name} is building great momentum. Keep cheering them on!`
    if (thisMonthRuns >= 1) return `${name} is putting in the work. Every step counts!`
    if (totalAthleteSessions > 0) return `${name} has been making progress. New runs are coming soon!`
    return `${name}'s journey is just beginning. Exciting times ahead!`
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">My Account</h1>

      {/* Email */}
      <section>
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Signed in as</p>
        <p className="text-sm font-medium text-gray-800">{user.email}</p>
      </section>

      {searchParams?.connected === 'strava' && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 flex items-center gap-2">
          <span>✓</span>
          <span>Strava connected! Your runs will now sync automatically.</span>
        </div>
      )}

      {/* Display name */}
      <section>
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Display name</p>
        {searchParams.setup === 'name' && (
          <div className="mb-3 rounded-lg bg-teal-50 border border-teal-200 px-4 py-3 text-sm text-teal-800">
            👋 Welcome! Please set your display name before getting started.
          </div>
        )}
        <DisplayNameForm currentName={userRow?.name ?? null} />
      </section>

      {/* Push notifications */}
      <section>
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Notifications</p>
        <PushToggle vapidPublicKey={process.env.VAPID_PUBLIC_KEY ?? ''} />
      </section>

      {/* Coaching stats — only for coaches and admins */}
      {!isCaregiver && (
        <section>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Your coaching stats</p>
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border border-teal-100 shadow-sm px-4 py-5 border-t-4 border-t-teal-500">
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center text-center">
                <span className="text-lg mb-1">🏃</span>
                <span className="text-2xl font-bold text-gray-900">{totalSessions}</span>
                <span className="text-[11px] text-teal-700 font-medium mt-0.5">sessions</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-lg mb-1">👥</span>
                <span className="text-2xl font-bold text-gray-900">{totalAthletes}</span>
                <span className="text-[11px] text-teal-700 font-medium mt-0.5">athletes</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-lg mb-1">📅</span>
                <span className="text-2xl font-bold text-teal-600">{coachThisMonth}</span>
                <span className="text-[11px] text-teal-700 font-medium mt-0.5">this month</span>
              </div>
            </div>
            {coachStreak && (
              <div className="mt-4 pt-4 border-t border-teal-200/60">
                <StreakCalendar
                  weeklyActivity={coachStreak.weeklyActivity}
                  current={coachStreak.current}
                  longest={coachStreak.longest}
                  variant="teal"
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Coach badges */}
      {!isCaregiver && (
        <section>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">
            Your badges ({earnedBadgeKeys.size}/{BADGE_DEFINITIONS.length})
          </p>
          <p className="text-[11px] text-gray-400 mb-3">
            Earn badges by coaching sessions and engaging with athletes
          </p>
          <div className="grid grid-cols-3 gap-3">
            {BADGE_DEFINITIONS.map((badge) => {
              const earned = earnedBadgeKeys.has(badge.key)
              return (
                <div
                  key={badge.key}
                  className={`relative rounded-xl border px-3 py-3.5 text-center transition-all ${
                    earned
                      ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 shadow-md ring-1 ring-amber-200/50'
                      : 'bg-gray-50/80 border-gray-100'
                  }`}
                >
                  <span className={`text-3xl block mb-1.5 ${earned ? '' : 'grayscale opacity-30'}`}>{badge.icon}</span>
                  <p className={`text-xs font-semibold ${earned ? 'text-gray-900' : 'text-gray-300'}`}>{badge.label}</p>
                  <p className={`text-[10px] mt-0.5 line-clamp-1 ${earned ? 'text-gray-500' : 'text-gray-300'}`}>{badge.description}</p>
                  {!earned && (
                    <span className="absolute top-1.5 right-1.5 text-[10px] opacity-40">🔒</span>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Caregiver — athlete card */}
      {isCaregiver && caregiverAthlete && (
        <section className="space-y-4">
          {/* Athlete hero card */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl px-5 py-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-2xl flex-shrink-0">
                👟
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{caregiverAthlete.name}</p>
                {caregiverAthlete.running_goal && (
                  <p className="text-xs text-amber-700 italic">&ldquo;{caregiverAthlete.running_goal}&rdquo;</p>
                )}
              </div>
            </div>

            {/* Motivational message */}
            <p className="text-sm text-amber-800 font-medium mb-4">
              {getMotivation()}
            </p>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white/60 rounded-xl px-3 py-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{totalAthleteSessions}</p>
                <p className="text-[10px] text-amber-600 font-medium mt-0.5">total runs</p>
              </div>
              <div className="bg-white/60 rounded-xl px-3 py-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{totalAthleteKm.toFixed(1)}</p>
                <p className="text-[10px] text-amber-600 font-medium mt-0.5">total km</p>
              </div>
              <div className="bg-white/60 rounded-xl px-3 py-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{athleteMilestones.length}</p>
                <p className="text-[10px] text-amber-600 font-medium mt-0.5">milestones</p>
              </div>
            </div>

            {/* This month vs last month */}
            <div className="bg-white/60 rounded-xl px-4 py-3 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">This month</p>
                  <p className="text-xs text-amber-600">{thisMonthRuns} run{thisMonthRuns !== 1 ? 's' : ''} &middot; {thisMonthKm.toFixed(1)} km</p>
                </div>
                <div className="text-right">
                  {runsTrend > 0 && <span className="text-xs font-semibold text-green-600">↑ {runsTrend} more than last month</span>}
                  {runsTrend < 0 && <span className="text-xs font-semibold text-orange-500">↓ {Math.abs(runsTrend)} fewer than last month</span>}
                  {runsTrend === 0 && lastMonthRuns > 0 && <span className="text-xs text-gray-400">Same as last month</span>}
                </div>
              </div>
            </div>

            {/* Goal progress */}
            {goalProgress && (
              <div className="bg-white/60 rounded-xl px-4 py-3 mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-amber-800">🎯 {goalProgress.label}</span>
                  <span className="text-[10px] text-amber-600 font-medium">
                    {goalProgress.current} / {goalProgress.target} {goalProgress.unit}
                  </span>
                </div>
                <div className="w-full bg-amber-100 rounded-full h-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all"
                    style={{ width: `${goalProgress.pct}%` }}
                  />
                </div>
                {goalProgress.pct >= 100 && (
                  <p className="text-[10px] text-amber-600 mt-1 font-medium">Goal achieved! 🎉</p>
                )}
                {goalProgress.pct >= 75 && goalProgress.pct < 100 && (
                  <p className="text-[10px] text-amber-600 mt-1">Almost there!</p>
                )}
              </div>
            )}

            {/* Athlete activity streak */}
            {athleteStreak && (
              <div className="bg-white/60 rounded-xl px-4 py-3 mb-4">
                <StreakCalendar
                  weeklyActivity={athleteStreak.weeklyActivity}
                  current={athleteStreak.current}
                  longest={athleteStreak.longest}
                  variant="amber"
                />
              </div>
            )}

            {/* Coaches */}
            {athleteCoachNames.length > 0 && (
              <p className="text-xs text-amber-600">
                Coached by {athleteCoachNames.join(', ')}
              </p>
            )}
          </div>

          {/* Latest run */}
          {latestSession && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Latest run</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold text-gray-900">
                    {latestSession.distance_km != null ? formatDistance(latestSession.distance_km * 1000) : '—'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(latestSession.date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {latestSession.feel && (
                    <span className="text-2xl">{FEEL_EMOJI[latestSession.feel]}</span>
                  )}
                </div>
              </div>
              {latestSession.note && (
                <p className="text-xs text-gray-500 italic mt-2 line-clamp-2">&ldquo;{latestSession.note}&rdquo;</p>
              )}
            </div>
          )}

          {/* Milestone timeline */}
          {(athleteMilestones.length > 0 || athleteMilestoneDefs.length > 0) && (
            <MilestoneTimeline
              earned={athleteMilestones.map((m: any) => ({
                id: m.id,
                label: m.label,
                icon: m.milestone_definitions?.icon ?? '🏆',
                achieved_at: m.achieved_at,
              }))}
              definitions={athleteMilestoneDefs}
              currentSessionCount={totalAthleteSessions}
            />
          )}
        </section>
      )}

      {/* Caregiver — no athlete linked */}
      {isCaregiver && !caregiverAthlete && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4">
          <p className="text-sm text-amber-800">
            Your athlete hasn&apos;t been linked yet. Please ask a coach or admin to connect your account.
          </p>
        </div>
      )}

      {/* Strava — only for coaches/admins */}
      {!isCaregiver && (
        <section>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Strava</p>
          <StravaStatus connection={connection ?? null} />
        </section>
      )}

      {/* Getting started guide */}
      <section>
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Getting started</p>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4 space-y-2.5">
          {isCaregiver ? (
            <>
              <div className="flex items-center gap-3">
                <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${caregiverAthlete ? 'bg-amber-500 text-white' : 'border-2 border-amber-300'}`}>
                  {caregiverAthlete && <span className="text-[10px]">&#10003;</span>}
                </span>
                <span className={`text-sm ${caregiverAthlete ? 'text-amber-600 line-through' : 'text-gray-900 font-medium'}`}>View your athlete&apos;s progress</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-amber-300 flex items-center justify-center text-xs" />
                <Link href="/feed" className="text-sm text-gray-900 font-medium hover:text-amber-700">Send your first cheer</Link>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${connection ? 'bg-teal-500 text-white' : 'border-2 border-teal-300'}`}>
                  {connection && <span className="text-[10px]">&#10003;</span>}
                </span>
                <span className={`text-sm ${connection ? 'text-teal-600 line-through' : 'text-gray-900 font-medium'}`}>Connect Strava for auto-sync</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${totalSessions > 0 ? 'bg-teal-500 text-white' : 'border-2 border-teal-300'}`}>
                  {totalSessions > 0 && <span className="text-[10px]">&#10003;</span>}
                </span>
                <span className={`text-sm ${totalSessions > 0 ? 'text-teal-600 line-through' : 'text-gray-900 font-medium'}`}>Log your first run</span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* App setup guide */}
      <section>
        <Link
          href="/setup"
          className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4 hover:border-teal-200 transition-colors text-left w-full"
        >
          <span className="text-xl flex-shrink-0">📱</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">Install app on your device</p>
            <p className="text-xs text-gray-500">Setup guide for iPhone, Android &amp; desktop</p>
          </div>
          <span className="text-gray-300 flex-shrink-0">&#x203A;</span>
        </Link>
      </section>

      {/* Sign out */}
      <section>
        <SignOutButton />
      </section>
    </main>
  )
}
