'use server'

import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getClub } from '@/lib/club'
import {
  notifyPairingsPublished,
  notifyPairingsRepublished,
  type PairingChange,
} from '@/lib/sessions/notifications'
import { suggestPairings } from '@/lib/sessions/suggestions'

export type PairingActionState = {
  error?: string
  success?: string
}

// ── Auth helper ──────────────────────────────────────────────────────────────

async function verifySessionManager(): Promise<{
  userId: string
  role: string
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { userId: '', role: '', error: 'Your session has expired. Please sign in again.' }

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role, can_manage_sessions')
    .eq('id', user.id)
    .single()

  if (!callerUser) return { userId: '', role: '', error: 'User not found.' }

  const isAdmin = callerUser.role === 'admin'
  const canManage = callerUser.role === 'coach' && callerUser.can_manage_sessions

  if (!isAdmin && !canManage) {
    return { userId: '', role: '', error: 'You do not have permission to manage sessions.' }
  }

  return { userId: user.id, role: callerUser.role }
}

// ── assignAthleteToCoach ─────────────────────────────────────────────────────

export async function assignAthleteToCoach(
  sessionId: string,
  coachId: string,
  athleteId: string
): Promise<PairingActionState> {
  const auth = await verifySessionManager()
  if (auth.error) return { error: auth.error }

  const club = await getClub()

  // Validate coach is available
  const { data: coachRsvp } = await adminClient
    .from('session_coach_rsvps')
    .select('status')
    .eq('session_id', sessionId)
    .eq('coach_id', coachId)
    .single()

  if (!coachRsvp || coachRsvp.status !== 'available') {
    return { error: 'Coach is not available for this session.' }
  }

  // Validate athlete is attending
  const { data: athleteRsvp } = await adminClient
    .from('session_athlete_rsvps')
    .select('status')
    .eq('session_id', sessionId)
    .eq('athlete_id', athleteId)
    .single()

  if (!athleteRsvp || athleteRsvp.status !== 'attending') {
    return { error: 'Athlete is not attending this session.' }
  }

  // Validate coach not at max
  const { count } = await adminClient
    .from('session_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('coach_id', coachId)

  if ((count ?? 0) >= club.max_athletes_per_coach) {
    return { error: `Coach already has the maximum number of athletes (${club.max_athletes_per_coach}).` }
  }

  // Validate athlete not already assigned
  const { data: existing } = await adminClient
    .from('session_assignments')
    .select('id')
    .eq('session_id', sessionId)
    .eq('athlete_id', athleteId)
    .single()

  if (existing) {
    return { error: 'Athlete is already assigned to a coach.' }
  }

  // Create the assignment
  const { error } = await adminClient
    .from('session_assignments')
    .insert({ session_id: sessionId, coach_id: coachId, athlete_id: athleteId })

  if (error) return { error: 'Failed to create assignment.' }

  revalidatePath(`/sessions/${sessionId}`)
  revalidatePath(`/admin/sessions/${sessionId}/pairings`)
  return { success: 'Assignment created.' }
}

// ── removeAssignment ─────────────────────────────────────────────────────────

export async function removeAssignment(
  sessionId: string,
  coachId: string,
  athleteId: string
): Promise<PairingActionState> {
  const auth = await verifySessionManager()
  if (auth.error) return { error: auth.error }

  const { error } = await adminClient
    .from('session_assignments')
    .delete()
    .eq('session_id', sessionId)
    .eq('coach_id', coachId)
    .eq('athlete_id', athleteId)

  if (error) return { error: 'Failed to remove assignment.' }

  revalidatePath(`/sessions/${sessionId}`)
  revalidatePath(`/admin/sessions/${sessionId}/pairings`)
  return { success: 'Assignment removed.' }
}

// ── savePairings (bulk replace) ──────────────────────────────────────────────

export async function savePairings(
  sessionId: string,
  assignments: { coachId: string; athleteId: string }[]
): Promise<PairingActionState> {
  const auth = await verifySessionManager()
  if (auth.error) return { error: auth.error }

  const club = await getClub()

  // Validate all assignments
  // 1. Get available coaches
  const { data: coachRsvps } = await adminClient
    .from('session_coach_rsvps')
    .select('coach_id')
    .eq('session_id', sessionId)
    .eq('status', 'available')

  const availableCoachIds = new Set((coachRsvps ?? []).map(r => r.coach_id))

  // 2. Get attending athletes
  const { data: athleteRsvps } = await adminClient
    .from('session_athlete_rsvps')
    .select('athlete_id')
    .eq('session_id', sessionId)
    .eq('status', 'attending')

  const attendingAthleteIds = new Set((athleteRsvps ?? []).map(r => r.athlete_id))

  // 3. Validate each assignment
  const coachLoad = new Map<string, number>()
  const assignedAthletes = new Set<string>()

  for (const a of assignments) {
    if (!availableCoachIds.has(a.coachId)) {
      return { error: `Coach ${a.coachId} is not available for this session.` }
    }
    if (!attendingAthleteIds.has(a.athleteId)) {
      return { error: `Athlete ${a.athleteId} is not attending this session.` }
    }
    if (assignedAthletes.has(a.athleteId)) {
      return { error: `Athlete ${a.athleteId} is assigned to multiple coaches.` }
    }

    const load = (coachLoad.get(a.coachId) ?? 0) + 1
    if (load > club.max_athletes_per_coach) {
      return { error: `A coach would exceed the maximum of ${club.max_athletes_per_coach} athletes.` }
    }
    coachLoad.set(a.coachId, load)
    assignedAthletes.add(a.athleteId)
  }

  // Delete all existing assignments for this session
  await adminClient
    .from('session_assignments')
    .delete()
    .eq('session_id', sessionId)

  // Insert new assignments
  if (assignments.length > 0) {
    const rows = assignments.map(a => ({
      session_id: sessionId,
      coach_id: a.coachId,
      athlete_id: a.athleteId,
    }))

    const { error } = await adminClient
      .from('session_assignments')
      .insert(rows)

    if (error) return { error: 'Failed to save assignments.' }
  }

  revalidatePath(`/sessions/${sessionId}`)
  revalidatePath(`/admin/sessions/${sessionId}/pairings`)
  return { success: 'Pairings saved.' }
}

// ── publishPairings ──────────────────────────────────────────────────────────

export async function publishPairings(
  sessionId: string
): Promise<PairingActionState> {
  const auth = await verifySessionManager()
  if (auth.error) return { error: auth.error }

  // Set pairings_published_at and reset stale flag
  const { error } = await adminClient
    .from('training_sessions')
    .update({
      pairings_published_at: new Date().toISOString(),
      pairings_stale: false,
    })
    .eq('id', sessionId)

  if (error) return { error: 'Failed to publish pairings.' }

  // Send notifications (non-blocking)
  notifyPairingsPublished(sessionId).catch(() => {})

  revalidatePath(`/sessions/${sessionId}`)
  revalidatePath(`/admin/sessions/${sessionId}/pairings`)
  return { success: 'Pairings published. Notifications sent.' }
}

// ── republishPairings ────────────────────────────────────────────────────────

export async function republishPairings(
  sessionId: string,
  changes: PairingChange[]
): Promise<PairingActionState> {
  const auth = await verifySessionManager()
  if (auth.error) return { error: auth.error }

  // Update timestamp and reset stale flag
  const { error } = await adminClient
    .from('training_sessions')
    .update({
      pairings_published_at: new Date().toISOString(),
      pairings_stale: false,
    })
    .eq('id', sessionId)

  if (error) return { error: 'Failed to re-publish pairings.' }

  // Send targeted notifications (non-blocking)
  if (changes.length > 0) {
    notifyPairingsRepublished(sessionId, changes).catch(() => {})
  }

  revalidatePath(`/sessions/${sessionId}`)
  revalidatePath(`/admin/sessions/${sessionId}/pairings`)
  return { success: 'Pairings re-published. Affected people notified.' }
}

// ── getSuggestedPairings ─────────────────────────────────────────────────────

export async function getSuggestedPairings(sessionId: string) {
  const auth = await verifySessionManager()
  if (auth.error) return { error: auth.error, suggestions: [] }

  const club = await getClub()

  // Get available coaches
  const { data: coachRsvps } = await adminClient
    .from('session_coach_rsvps')
    .select('coach_id, users!session_coach_rsvps_coach_id_fkey(name)')
    .eq('session_id', sessionId)
    .eq('status', 'available')

  const availableCoaches = (coachRsvps ?? []).map(r => ({
    id: r.coach_id,
    name: (r.users as unknown as { name: string | null })?.name ?? 'Coach',
  }))

  // Get attending athletes
  const { data: athleteRsvps } = await adminClient
    .from('session_athlete_rsvps')
    .select('athlete_id, athletes!session_athlete_rsvps_athlete_id_fkey(name)')
    .eq('session_id', sessionId)
    .eq('status', 'attending')

  const attendingAthletes = (athleteRsvps ?? []).map(r => ({
    id: r.athlete_id,
    name: (r.athletes as unknown as { name: string | null })?.name ?? 'Athlete',
  }))

  const suggestions = await suggestPairings({
    availableCoaches,
    attendingAthletes,
    clubId: club.id,
    maxAthletesPerCoach: club.max_athletes_per_coach,
  })

  return { suggestions, availableCoaches, attendingAthletes }
}

// ── applyAllSuggestions ──────────────────────────────────────────────────────

export async function applyAllSuggestions(
  sessionId: string,
  suggestions: { coachId: string; athleteId: string }[]
): Promise<PairingActionState> {
  const auth = await verifySessionManager()
  if (auth.error) return { error: auth.error }

  if (suggestions.length === 0) return { success: 'No suggestions to apply.' }

  const rows = suggestions.map(s => ({
    session_id: sessionId,
    coach_id: s.coachId,
    athlete_id: s.athleteId,
  }))

  const { error } = await adminClient
    .from('session_assignments')
    .insert(rows)

  if (error) return { error: 'Failed to apply suggestions.' }

  revalidatePath(`/sessions/${sessionId}`)
  revalidatePath(`/admin/sessions/${sessionId}/pairings`)
  return { success: 'Suggestions applied.' }
}
