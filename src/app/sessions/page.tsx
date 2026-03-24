import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { getClub } from '@/lib/club'
import {
  formatSessionDate,
  formatSessionTime,
  isSessionPast,
  getSessionWeekLabel,
} from '@/lib/sessions/datetime'
import SessionsListView from '@/components/sessions/SessionsListView'
import type { SessionListItem } from '@/components/sessions/SessionListCard'

export async function generateMetadata(): Promise<Metadata> {
  const club = await getClub()
  return { title: `Sessions — ${club.name}` }
}

export default async function SessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [club, userRowResult] = await Promise.all([
    getClub(),
    adminClient
      .from('users')
      .select('role, can_manage_sessions')
      .eq('id', user.id)
      .single(),
  ])

  const userRow = userRowResult.data
  if (!userRow) redirect('/login')

  const role = userRow.role as 'admin' | 'coach' | 'caregiver'
  const isAdmin = role === 'admin'
  const canManageSessions = isAdmin || (role === 'coach' && userRow.can_manage_sessions === true)
  const viewRole = isAdmin ? 'coach' : role

  // Fetch all non-cancelled sessions
  let sessionsQuery = adminClient
    .from('training_sessions')
    .select('id, title, session_start, session_end, location, status, pairings_published_at')
    .neq('status', 'cancelled')
    .order('session_start', { ascending: false })

  // Non-admin/non-manager users don't see drafts
  if (!canManageSessions) {
    sessionsQuery = sessionsQuery.neq('status', 'draft')
  }

  const { data: sessions } = await sessionsQuery

  if (!sessions || sessions.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-6 pb-28">
        <h1 className="text-xl font-bold text-text-primary mb-3.5">Sessions</h1>
        <SessionsListView
          upcomingGroups={[]}
          pastSessions={[]}
          role={viewRole as 'coach' | 'caregiver'}
          isAdmin={isAdmin}
          canManageSessions={canManageSessions}
        />
      </main>
    )
  }

  const sessionIds = sessions.map((s) => s.id)

  // Fetch RSVP counts and current user's RSVP in parallel
  const [coachRsvpsResult, athleteRsvpsResult, userCoachRsvpResult, assignmentsResult] = await Promise.all([
    adminClient
      .from('session_coach_rsvps')
      .select('session_id, status')
      .in('session_id', sessionIds),
    adminClient
      .from('session_athlete_rsvps')
      .select('session_id, status')
      .in('session_id', sessionIds),
    // Current user's coach RSVP
    role !== 'caregiver'
      ? adminClient
          .from('session_coach_rsvps')
          .select('session_id, status')
          .in('session_id', sessionIds)
          .eq('coach_id', user.id)
      : Promise.resolve({ data: [] }),
    // Session assignments (to check needs_pairings)
    adminClient
      .from('session_assignments')
      .select('session_id')
      .in('session_id', sessionIds),
  ])

  // Caregiver: fetch linked athletes and their RSVPs
  let userAthleteRsvpMap: Record<string, { athlete_name: string; status: string }[]> = {}
  if (role === 'caregiver') {
    const { data: linkedAthletes } = await adminClient
      .from('athletes')
      .select('id, name')
      .eq('caregiver_user_id', user.id)

    if (linkedAthletes && linkedAthletes.length > 0) {
      const athleteIds = linkedAthletes.map((a) => a.id)
      const { data: athleteRsvps } = await adminClient
        .from('session_athlete_rsvps')
        .select('session_id, athlete_id, status')
        .in('session_id', sessionIds)
        .in('athlete_id', athleteIds)

      const athleteNameMap = Object.fromEntries(linkedAthletes.map((a) => [a.id, a.name]))
      for (const rsvp of athleteRsvps ?? []) {
        if (!userAthleteRsvpMap[rsvp.session_id]) userAthleteRsvpMap[rsvp.session_id] = []
        userAthleteRsvpMap[rsvp.session_id].push({
          athlete_name: athleteNameMap[rsvp.athlete_id] ?? 'Athlete',
          status: rsvp.status,
        })
      }
    }
  }

  // Build count maps
  const coachRsvps = coachRsvpsResult.data ?? []
  const athleteRsvps = athleteRsvpsResult.data ?? []
  const userCoachRsvps = (userCoachRsvpResult as any).data ?? []
  const assignments = assignmentsResult.data ?? []

  const coachCountMap: Record<string, { available: number; pending: number; total: number }> = {}
  for (const r of coachRsvps) {
    if (!coachCountMap[r.session_id]) coachCountMap[r.session_id] = { available: 0, pending: 0, total: 0 }
    coachCountMap[r.session_id].total++
    if (r.status === 'available') coachCountMap[r.session_id].available++
    if (r.status === 'pending') coachCountMap[r.session_id].pending++
  }

  const athleteCountMap: Record<string, { attending: number; pending: number; total: number }> = {}
  for (const r of athleteRsvps) {
    if (!athleteCountMap[r.session_id]) athleteCountMap[r.session_id] = { attending: 0, pending: 0, total: 0 }
    athleteCountMap[r.session_id].total++
    if (r.status === 'attending') athleteCountMap[r.session_id].attending++
    if (r.status === 'pending') athleteCountMap[r.session_id].pending++
  }

  const userRsvpMap: Record<string, string> = {}
  for (const r of userCoachRsvps) {
    userRsvpMap[r.session_id] = r.status
  }

  const assignmentSessionIds = new Set(assignments.map((a) => a.session_id))

  // Build session list items
  const sessionItems: (SessionListItem & { formattedDate: string; formattedTime: string })[] = sessions.map((s) => {
    const coachCounts = coachCountMap[s.id] ?? { available: 0, pending: 0, total: 0 }
    const athleteCounts = athleteCountMap[s.id] ?? { attending: 0, pending: 0, total: 0 }
    const hasRsvpResponses = coachCounts.available > 0 || athleteCounts.attending > 0

    return {
      id: s.id,
      title: s.title,
      session_start: s.session_start,
      session_end: s.session_end,
      location: s.location,
      status: s.status as SessionListItem['status'],
      pairings_published_at: s.pairings_published_at,
      coaches_available: coachCounts.available,
      coaches_pending: coachCounts.pending,
      coaches_total: coachCounts.total,
      athletes_attending: athleteCounts.attending,
      athletes_pending: athleteCounts.pending,
      athletes_total: athleteCounts.total,
      user_coach_rsvp: (userRsvpMap[s.id] as SessionListItem['user_coach_rsvp']) ?? null,
      user_athlete_rsvps: userAthleteRsvpMap[s.id] ?? [],
      needs_pairings: s.status === 'published' && hasRsvpResponses && !assignmentSessionIds.has(s.id),
      formattedDate: formatSessionDate(s.session_start, club.timezone),
      formattedTime: formatSessionTime(s.session_start, club.timezone),
    }
  })

  // Split into upcoming and past
  const upcoming = sessionItems
    .filter((s) => s.status !== 'completed' && !isSessionPast(s.session_start, s.session_end, club.timezone))
    .sort((a, b) => new Date(a.session_start).getTime() - new Date(b.session_start).getTime())

  const past = sessionItems
    .filter((s) => s.status === 'completed')
    .sort((a, b) => new Date(b.session_start).getTime() - new Date(a.session_start).getTime())

  // Group upcoming by week
  const upcomingGroups: { label: string; sessions: typeof upcoming }[] = []
  let currentLabel = ''
  for (const session of upcoming) {
    const weekLabel = getSessionWeekLabel(session.session_start, club.timezone)
    if (weekLabel !== currentLabel) {
      currentLabel = weekLabel
      upcomingGroups.push({ label: weekLabel, sessions: [] })
    }
    upcomingGroups[upcomingGroups.length - 1].sessions.push(session)
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 pb-28">
      <h1 className="text-xl font-bold text-text-primary mb-3.5">Sessions</h1>
      <SessionsListView
        upcomingGroups={upcomingGroups}
        pastSessions={past}
        role={viewRole as 'coach' | 'caregiver'}
        isAdmin={isAdmin}
        canManageSessions={canManageSessions}
      />
    </main>
  )
}
