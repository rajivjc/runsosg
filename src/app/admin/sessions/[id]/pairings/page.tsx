import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { getClub } from '@/lib/club'
import { formatSessionDate } from '@/lib/sessions/datetime'
import { suggestPairings } from '@/lib/sessions/suggestions'
import PairingBoard from '@/components/sessions/PairingBoard'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const club = await getClub()
  const { data: session } = await adminClient
    .from('training_sessions')
    .select('title, session_start')
    .eq('id', id)
    .single()

  if (!session) return { title: `Assign Pairings — ${club.name}` }

  const date = formatSessionDate(session.session_start, club.timezone)
  return { title: `Assign Pairings ${date} — ${club.name}` }
}

export default async function PairingsPage({ params }: Props) {
  const { id: sessionId } = await params

  // Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
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

  const isAdmin = userRow.role === 'admin'
  const canManage =
    isAdmin || (userRow.role === 'coach' && userRow.can_manage_sessions === true)
  if (!canManage) redirect('/sessions')

  // Fetch session
  const { data: session } = await adminClient
    .from('training_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (!session) notFound()

  // Only published/completed sessions can have pairings
  if (session.status !== 'published' && session.status !== 'completed') {
    redirect(`/sessions/${sessionId}`)
  }

  const formattedDate = formatSessionDate(session.session_start, club.timezone)

  // Fetch RSVPs and existing assignments in parallel
  const [coachRsvpsResult, athleteRsvpsResult, assignmentsResult] =
    await Promise.all([
      adminClient
        .from('session_coach_rsvps')
        .select(
          'coach_id, status, users!session_coach_rsvps_coach_id_fkey(name)'
        )
        .eq('session_id', sessionId)
        .eq('status', 'available'),
      adminClient
        .from('session_athlete_rsvps')
        .select(
          'athlete_id, status, athletes!session_athlete_rsvps_athlete_id_fkey(name)'
        )
        .eq('session_id', sessionId)
        .eq('status', 'attending'),
      adminClient
        .from('session_assignments')
        .select(
          'coach_id, athlete_id, users!session_assignments_coach_id_fkey(name), athletes!session_assignments_athlete_id_fkey(name)'
        )
        .eq('session_id', sessionId),
    ])

  const availableCoaches = (coachRsvpsResult.data ?? []).map((r) => ({
    id: r.coach_id,
    name:
      (r.users as unknown as { name: string | null })?.name ?? 'Coach',
  }))

  const attendingAthletes = (athleteRsvpsResult.data ?? []).map((r) => ({
    id: r.athlete_id,
    name:
      (r.athletes as unknown as { name: string | null })?.name ?? 'Athlete',
  }))

  const existingAssignments = (assignmentsResult.data ?? []).map((a) => ({
    coachId: a.coach_id,
    athleteId: a.athlete_id,
    coachName:
      (a.users as unknown as { name: string | null })?.name ?? 'Coach',
    athleteName:
      (a.athletes as unknown as { name: string | null })?.name ?? 'Athlete',
  }))

  // Build coach states
  let initialCoaches: {
    id: string
    name: string
    athletes: { id: string; name: string; tag: 'regular' | 'suggested' | null }[]
  }[]
  let initialUnassigned: { id: string; name: string }[]
  let hasSuggestions = false

  if (existingAssignments.length > 0) {
    // Existing assignments — load them
    const coachMap = new Map<
      string,
      { id: string; name: string; athletes: { id: string; name: string; tag: 'regular' | 'suggested' | null }[] }
    >()

    for (const coach of availableCoaches) {
      coachMap.set(coach.id, { id: coach.id, name: coach.name, athletes: [] })
    }

    const assignedAthleteIds = new Set<string>()
    for (const a of existingAssignments) {
      const coach = coachMap.get(a.coachId)
      if (coach) {
        coach.athletes.push({
          id: a.athleteId,
          name: a.athleteName,
          tag: null, // Existing assignments don't have suggestion tags
        })
        assignedAthleteIds.add(a.athleteId)
      }
    }

    initialCoaches = [...coachMap.values()]
    initialUnassigned = attendingAthletes.filter(
      (a) => !assignedAthleteIds.has(a.id)
    )
  } else {
    // No assignments yet — auto-suggest
    const suggestions = await suggestPairings({
      availableCoaches,
      attendingAthletes,
      clubId: club.id,
      maxAthletesPerCoach: club.max_athletes_per_coach,
    })

    hasSuggestions = suggestions.length > 0

    const coachMap = new Map<
      string,
      { id: string; name: string; athletes: { id: string; name: string; tag: 'regular' | 'suggested' | null }[] }
    >()

    for (const coach of availableCoaches) {
      coachMap.set(coach.id, { id: coach.id, name: coach.name, athletes: [] })
    }

    const assignedAthleteIds = new Set<string>()
    const athleteNameMap = new Map(attendingAthletes.map((a) => [a.id, a.name]))

    for (const s of suggestions) {
      const coach = coachMap.get(s.coachId)
      if (coach) {
        coach.athletes.push({
          id: s.athleteId,
          name: athleteNameMap.get(s.athleteId) ?? 'Athlete',
          tag: s.confidence,
        })
        assignedAthleteIds.add(s.athleteId)
      }
    }

    initialCoaches = [...coachMap.values()]
    initialUnassigned = attendingAthletes.filter(
      (a) => !assignedAthleteIds.has(a.id)
    )
  }

  // Build stale message if applicable
  let staleMessage: string | null = null
  if (session.pairings_stale) {
    // Find coaches who were assigned but are now unavailable
    const assignedCoachIds = new Set(existingAssignments.map((a) => a.coachId))
    const availableCoachIds = new Set(availableCoaches.map((c) => c.id))
    const unavailableAssigned = [...assignedCoachIds].filter(
      (id) => !availableCoachIds.has(id)
    )
    if (unavailableAssigned.length > 0) {
      staleMessage = `RSVP changes detected — some assignments may need updating`
    } else {
      staleMessage = `Attendance changed since pairings were published`
    }
  }

  return (
    <main className="mx-auto max-w-[390px]">
      <PairingBoard
        sessionId={sessionId}
        formattedDate={formattedDate}
        location={session.location}
        maxAthletesPerCoach={club.max_athletes_per_coach}
        initialCoaches={initialCoaches}
        initialUnassigned={initialUnassigned}
        pairingsPublishedAt={session.pairings_published_at}
        pairingsStale={session.pairings_stale}
        staleMessage={staleMessage}
        hasSuggestions={hasSuggestions}
      />
    </main>
  )
}
