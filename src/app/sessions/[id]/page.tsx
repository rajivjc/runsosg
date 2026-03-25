import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { getClub } from '@/lib/club'
import {
  formatSessionDate,
  formatSessionTimeRange,
} from '@/lib/sessions/datetime'
import SessionDetail from '@/components/sessions/SessionDetail'
import type { SessionDetailData } from '@/components/sessions/SessionDetail'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const club = await getClub()
  const { data: session } = await adminClient
    .from('training_sessions')
    .select('title, session_start, location')
    .eq('id', id)
    .single()

  if (!session) return { title: `Session — ${club.name}` }

  const date = formatSessionDate(session.session_start, club.timezone)
  return {
    title: `${session.title || 'Training'} ${date} — ${club.name}`,
  }
}

export default async function SessionDetailPage({ params }: Props) {
  const { id: sessionId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [club, userRowResult] = await Promise.all([
    getClub(),
    adminClient
      .from('users')
      .select('role, can_manage_sessions, name')
      .eq('id', user.id)
      .single(),
  ])

  const userRow = userRowResult.data
  if (!userRow) redirect('/login')

  const role = userRow.role as 'admin' | 'coach' | 'caregiver'
  const isAdmin = role === 'admin'
  const canManageSessions = isAdmin || (role === 'coach' && userRow.can_manage_sessions === true)

  // Fetch session
  const { data: session } = await adminClient
    .from('training_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (!session) notFound()

  // Draft sessions: only visible to admin/permitted coaches
  if (session.status === 'draft' && !canManageSessions) {
    redirect('/sessions')
  }

  const formattedDate = formatSessionDate(session.session_start, club.timezone)
  const formattedTimeRange = formatSessionTimeRange(
    session.session_start,
    session.session_end,
    club.timezone
  )

  const pairingsPublished = !!session.pairings_published_at

  // For draft/cancelled, minimal data
  if (session.status === 'draft' || session.status === 'cancelled') {
    const data: SessionDetailData = {
      session: {
        id: session.id,
        title: session.title,
        session_start: session.session_start,
        session_end: session.session_end,
        location: session.location,
        notes: session.notes,
        status: session.status as SessionDetailData['session']['status'],
        pairings_published_at: session.pairings_published_at,
        pairings_stale: session.pairings_stale,
      },
      formattedDate,
      formattedTimeRange,
      coachRsvps: [],
      athleteRsvps: [],
      currentUserRole: role,
      currentUserId: user.id,
      currentUserCanManage: canManageSessions,
      currentCoachRsvp: null,
      currentCaregiverAthletes: [],
      assignments: [],
      athleteCues: {},
      pairingsPublished: false,
      pairingsStale: false,
      sessionDate: new Intl.DateTimeFormat('en-CA', { timeZone: club.timezone }).format(new Date(session.session_start)),
      loggedRuns: {},
      allAthletes: [],
    }

    return (
      <main className="max-w-2xl mx-auto">
        <SessionDetail data={data} />
      </main>
    )
  }

  // Published/completed — fetch all data in parallel
  const [
    coachRsvpsResult,
    athleteRsvpsResult,
    assignmentsResult,
  ] = await Promise.all([
    adminClient
      .from('session_coach_rsvps')
      .select('coach_id, status, users!session_coach_rsvps_coach_id_fkey(name)')
      .eq('session_id', sessionId),
    adminClient
      .from('session_athlete_rsvps')
      .select('athlete_id, status, athletes!session_athlete_rsvps_athlete_id_fkey(name)')
      .eq('session_id', sessionId),
    adminClient
      .from('session_assignments')
      .select('coach_id, athlete_id, users!session_assignments_coach_id_fkey(name), athletes!session_assignments_athlete_id_fkey(name)')
      .eq('session_id', sessionId),
  ])

  const coachRsvps = (coachRsvpsResult.data ?? []).map(r => ({
    id: r.coach_id,
    name: (r.users as any)?.name ?? 'Coach',
    status: r.status,
  }))

  const athleteRsvps = (athleteRsvpsResult.data ?? []).map(r => ({
    id: r.athlete_id,
    name: (r.athletes as any)?.name ?? 'Athlete',
    status: r.status,
  }))

  const assignments = (assignmentsResult.data ?? []).map(a => ({
    coach_id: a.coach_id,
    coach_name: (a.users as any)?.name ?? 'Coach',
    athlete_id: a.athlete_id,
    athlete_name: (a.athletes as any)?.name ?? 'Athlete',
  }))

  // Current user's coach RSVP
  let currentCoachRsvp: 'pending' | 'available' | 'unavailable' | null = null
  if (role !== 'caregiver') {
    const found = coachRsvps.find(r => r.id === user.id)
    currentCoachRsvp = found ? (found.status as 'pending' | 'available' | 'unavailable') : null
  }

  // Caregiver: fetch linked athletes
  let currentCaregiverAthletes: { athlete_id: string; name: string; status: string }[] = []
  if (role === 'caregiver') {
    const { data: linkedAthletes } = await adminClient
      .from('athletes')
      .select('id, name')
      .eq('caregiver_user_id', user.id)

    if (linkedAthletes && linkedAthletes.length > 0) {
      currentCaregiverAthletes = linkedAthletes.map(la => {
        const rsvp = athleteRsvps.find(r => r.id === la.id)
        return {
          athlete_id: la.id,
          name: la.name,
          status: rsvp?.status ?? 'pending',
        }
      })
    }
  }

  // Fetch cues for assigned athletes (for coach view)
  let athleteCues: Record<string, string> = {}
  if (role !== 'caregiver' && assignments.length > 0) {
    const myAssignedAthleteIds = assignments
      .filter(a => a.coach_id === user.id)
      .map(a => a.athlete_id)

    if (myAssignedAthleteIds.length > 0) {
      const { data: cues } = await adminClient
        .from('cues')
        .select('athlete_id, best_cues')
        .in('athlete_id', myAssignedAthleteIds)

      if (cues) {
        for (const cue of cues) {
          const bestCues = cue.best_cues as string[] | null
          if (bestCues && bestCues.length > 0) {
            athleteCues[cue.athlete_id] = bestCues[0]
          }
        }
      }
    }
  }

  // Fetch logged runs and all athletes for assignment section
  const [loggedRunsResult, allAthletesResult] = await Promise.all([
    adminClient
      .from('sessions')
      .select('athlete_id, distance_km, note')
      .eq('training_session_id', sessionId)
      .eq('status', 'completed'),
    adminClient
      .from('athletes')
      .select('id, name, avatar')
      .eq('active', true)
      .order('name'),
  ])

  const loggedRuns: Record<string, { distance_km: number | null; note: string | null }> = {}
  for (const r of loggedRunsResult.data ?? []) {
    loggedRuns[r.athlete_id] = { distance_km: r.distance_km, note: r.note }
  }

  const allAthletes = (allAthletesResult.data ?? []).map(a => ({
    id: a.id,
    name: a.name,
    avatar: a.avatar,
  }))

  // Session date in YYYY-MM-DD format using club timezone
  const sessionDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: club.timezone }).format(new Date(session.session_start))

  const data: SessionDetailData = {
    session: {
      id: session.id,
      title: session.title,
      session_start: session.session_start,
      session_end: session.session_end,
      location: session.location,
      notes: session.notes,
      status: session.status as SessionDetailData['session']['status'],
      pairings_published_at: session.pairings_published_at,
      pairings_stale: session.pairings_stale,
    },
    formattedDate,
    formattedTimeRange,
    coachRsvps,
    athleteRsvps,
    currentUserRole: role,
    currentUserId: user.id,
    currentUserCanManage: canManageSessions,
    currentCoachRsvp,
    currentCaregiverAthletes,
    assignments,
    athleteCues,
    pairingsPublished,
    pairingsStale: session.pairings_stale,
    sessionDate: sessionDateStr,
    loggedRuns,
    allAthletes,
  }

  return (
    <main className="max-w-2xl mx-auto">
      <SessionDetail data={data} />
    </main>
  )
}
