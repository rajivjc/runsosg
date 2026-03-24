'use server'

import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'
import { getClub } from '@/lib/club'
import { combineDateTime } from '@/lib/sessions/datetime'

export type SessionActionState = {
  error?: string
  success?: string
  sessionId?: string
}

// ── Auth helper ──────────────────────────────────────────────────────────────

async function verifySessionManager(): Promise<{
  userId: string
  email: string | undefined
  role: string
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { userId: '', email: undefined, role: '', error: 'Your session has expired. Please sign in again.' }

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role, can_manage_sessions')
    .eq('id', user.id)
    .single()

  if (!callerUser) return { userId: '', email: undefined, role: '', error: 'User not found.' }

  const isAdmin = callerUser.role === 'admin'
  const canManage = callerUser.role === 'coach' && callerUser.can_manage_sessions

  if (!isAdmin && !canManage) {
    return { userId: '', email: undefined, role: '', error: 'You do not have permission to manage sessions.' }
  }

  return { userId: user.id, email: user.email, role: callerUser.role }
}

// ── createSession ────────────────────────────────────────────────────────────

export async function createSession(
  _prev: SessionActionState,
  formData: FormData
): Promise<SessionActionState> {
  const auth = await verifySessionManager()
  if (auth.error) return { error: auth.error }

  const club = await getClub()

  const date = (formData.get('date') as string ?? '').trim()
  const startTime = (formData.get('startTime') as string ?? '').trim()
  const endTime = (formData.get('endTime') as string ?? '').trim()
  const location = (formData.get('location') as string ?? '').trim()
  const title = (formData.get('title') as string ?? '').trim() || null
  const notes = (formData.get('notes') as string ?? '').trim() || null
  const coachDeadline = (formData.get('coachDeadline') as string ?? '').trim()
  const athleteDeadline = (formData.get('athleteDeadline') as string ?? '').trim()

  if (!date) return { error: 'Date is required' }
  if (!startTime) return { error: 'Start time is required' }
  if (!location) return { error: 'Location is required' }

  const sessionStart = combineDateTime(date, startTime, club.timezone)
  const sessionEnd = endTime ? combineDateTime(date, endTime, club.timezone) : null

  // Parse RSVP deadlines (datetime-local gives "YYYY-MM-DDTHH:mm")
  let coachRsvpDeadline: string | null = null
  if (coachDeadline) {
    const [dlDate, dlTime] = coachDeadline.split('T')
    if (dlDate && dlTime) coachRsvpDeadline = combineDateTime(dlDate, dlTime, club.timezone)
  }
  let athleteRsvpDeadline: string | null = null
  if (athleteDeadline) {
    const [dlDate, dlTime] = athleteDeadline.split('T')
    if (dlDate && dlTime) athleteRsvpDeadline = combineDateTime(dlDate, dlTime, club.timezone)
  }

  const { data, error } = await adminClient
    .from('training_sessions')
    .insert({
      club_id: club.id,
      session_start: sessionStart,
      session_end: sessionEnd,
      location,
      title,
      notes,
      status: 'draft',
      coach_rsvp_deadline: coachRsvpDeadline,
      athlete_rsvp_deadline: athleteRsvpDeadline,
      created_by: auth.userId,
    })
    .select('id')
    .single()

  if (error) return { error: 'Could not create the session. Please try again.' }

  logAudit({
    actorId: auth.userId,
    actorEmail: auth.email,
    actorRole: auth.role,
    action: 'training_session.create',
    targetType: 'training_session',
    targetId: data.id,
    metadata: { location, date, startTime },
  })

  revalidatePath('/admin/sessions')
  return { success: 'Session created', sessionId: data.id }
}

// ── updateSession ────────────────────────────────────────────────────────────

export async function updateSession(
  sessionId: string,
  _prev: SessionActionState,
  formData: FormData
): Promise<SessionActionState> {
  const auth = await verifySessionManager()
  if (auth.error) return { error: auth.error }

  // Verify session exists and is editable
  const { data: existing } = await adminClient
    .from('training_sessions')
    .select('status')
    .eq('id', sessionId)
    .single()

  if (!existing) return { error: 'Session not found.' }
  if (existing.status !== 'draft' && existing.status !== 'published') {
    return { error: 'Only draft or published sessions can be edited.' }
  }

  const club = await getClub()

  const date = (formData.get('date') as string ?? '').trim()
  const startTime = (formData.get('startTime') as string ?? '').trim()
  const endTime = (formData.get('endTime') as string ?? '').trim()
  const location = (formData.get('location') as string ?? '').trim()
  const title = (formData.get('title') as string ?? '').trim() || null
  const notes = (formData.get('notes') as string ?? '').trim() || null
  const coachDeadline = (formData.get('coachDeadline') as string ?? '').trim()
  const athleteDeadline = (formData.get('athleteDeadline') as string ?? '').trim()

  if (!date) return { error: 'Date is required' }
  if (!startTime) return { error: 'Start time is required' }
  if (!location) return { error: 'Location is required' }

  const sessionStart = combineDateTime(date, startTime, club.timezone)
  const sessionEnd = endTime ? combineDateTime(date, endTime, club.timezone) : null

  let coachRsvpDeadline: string | null = null
  if (coachDeadline) {
    const [dlDate, dlTime] = coachDeadline.split('T')
    if (dlDate && dlTime) coachRsvpDeadline = combineDateTime(dlDate, dlTime, club.timezone)
  }
  let athleteRsvpDeadline: string | null = null
  if (athleteDeadline) {
    const [dlDate, dlTime] = athleteDeadline.split('T')
    if (dlDate && dlTime) athleteRsvpDeadline = combineDateTime(dlDate, dlTime, club.timezone)
  }

  const { error } = await adminClient
    .from('training_sessions')
    .update({
      session_start: sessionStart,
      session_end: sessionEnd,
      location,
      title,
      notes,
      coach_rsvp_deadline: coachRsvpDeadline,
      athlete_rsvp_deadline: athleteRsvpDeadline,
    })
    .eq('id', sessionId)

  if (error) return { error: 'Could not update the session. Please try again.' }

  logAudit({
    actorId: auth.userId,
    actorEmail: auth.email,
    actorRole: auth.role,
    action: 'training_session.update',
    targetType: 'training_session',
    targetId: sessionId,
    metadata: { location, date, startTime },
  })

  revalidatePath('/admin/sessions')
  revalidatePath(`/sessions/${sessionId}`)
  return { success: 'Session updated', sessionId }
}

// ── publishSession ───────────────────────────────────────────────────────────

export async function publishSession(sessionId: string): Promise<SessionActionState> {
  const auth = await verifySessionManager()
  if (auth.error) return { error: auth.error }

  const { data: session } = await adminClient
    .from('training_sessions')
    .select('status, club_id')
    .eq('id', sessionId)
    .single()

  if (!session) return { error: 'Session not found.' }
  if (session.status !== 'draft') return { error: 'Only draft sessions can be published.' }

  // Update status to published
  const { error: updateError } = await adminClient
    .from('training_sessions')
    .update({ status: 'published' })
    .eq('id', sessionId)

  if (updateError) return { error: 'Could not publish the session. Please try again.' }

  // Create pending RSVP rows for all active coaches
  const { data: coaches } = await adminClient
    .from('users')
    .select('id')
    .eq('role', 'coach')
    .eq('active', true)

  if (coaches && coaches.length > 0) {
    const coachRsvps = coaches.map((c) => ({
      session_id: sessionId,
      coach_id: c.id,
      status: 'pending',
    }))
    await adminClient.from('session_coach_rsvps').insert(coachRsvps)
  } else {
    console.warn('[publishSession] No active coaches found — no coach RSVP rows created')
  }

  // Create pending RSVP rows for all active athletes
  const { data: athletes } = await adminClient
    .from('athletes')
    .select('id')
    .eq('active', true)

  if (athletes && athletes.length > 0) {
    const athleteRsvps = athletes.map((a) => ({
      session_id: sessionId,
      athlete_id: a.id,
      status: 'pending',
    }))
    await adminClient.from('session_athlete_rsvps').insert(athleteRsvps)
  } else {
    console.warn('[publishSession] No active athletes found — no athlete RSVP rows created')
  }

  // TODO: Phase 5 — send notifications to coaches and athletes

  logAudit({
    actorId: auth.userId,
    actorEmail: auth.email,
    actorRole: auth.role,
    action: 'training_session.publish',
    targetType: 'training_session',
    targetId: sessionId,
    metadata: {
      coachCount: coaches?.length ?? 0,
      athleteCount: athletes?.length ?? 0,
    },
  })

  revalidatePath('/admin/sessions')
  revalidatePath('/sessions')
  return { success: 'Session published' }
}

// ── cancelSession ────────────────────────────────────────────────────────────

export async function cancelSession(sessionId: string): Promise<SessionActionState> {
  const auth = await verifySessionManager()
  if (auth.error) return { error: auth.error }

  const { data: session } = await adminClient
    .from('training_sessions')
    .select('status')
    .eq('id', sessionId)
    .single()

  if (!session) return { error: 'Session not found.' }
  if (session.status !== 'draft' && session.status !== 'published') {
    return { error: 'Only draft or published sessions can be cancelled.' }
  }

  const { error } = await adminClient
    .from('training_sessions')
    .update({ status: 'cancelled' })
    .eq('id', sessionId)

  if (error) return { error: 'Could not cancel the session. Please try again.' }

  // TODO: Phase 5 — notify affected coaches and athletes if session was published

  logAudit({
    actorId: auth.userId,
    actorEmail: auth.email,
    actorRole: auth.role,
    action: 'training_session.cancel',
    targetType: 'training_session',
    targetId: sessionId,
    metadata: { previousStatus: session.status },
  })

  revalidatePath('/admin/sessions')
  revalidatePath('/sessions')
  revalidatePath(`/sessions/${sessionId}`)
  return { success: 'Session cancelled' }
}

// ── completeSession ──────────────────────────────────────────────────────────

export async function completeSession(sessionId: string): Promise<SessionActionState> {
  const auth = await verifySessionManager()
  if (auth.error) return { error: auth.error }

  const { data: session } = await adminClient
    .from('training_sessions')
    .select('status')
    .eq('id', sessionId)
    .single()

  if (!session) return { error: 'Session not found.' }
  if (session.status !== 'published') {
    return { error: 'Only published sessions can be completed.' }
  }

  const { error } = await adminClient
    .from('training_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (error) return { error: 'Could not complete the session. Please try again.' }

  logAudit({
    actorId: auth.userId,
    actorEmail: auth.email,
    actorRole: auth.role,
    action: 'training_session.complete',
    targetType: 'training_session',
    targetId: sessionId,
  })

  revalidatePath('/admin/sessions')
  revalidatePath('/sessions')
  revalidatePath(`/sessions/${sessionId}`)
  return { success: 'Session completed' }
}

// ── deleteSession ────────────────────────────────────────────────────────────

export async function deleteSession(sessionId: string): Promise<SessionActionState> {
  const auth = await verifySessionManager()
  if (auth.error) return { error: auth.error }

  const { data: session } = await adminClient
    .from('training_sessions')
    .select('status, location, session_start')
    .eq('id', sessionId)
    .single()

  if (!session) return { error: 'Session not found.' }
  if (session.status !== 'draft') {
    return { error: 'Only draft sessions can be deleted. Cancel the session instead.' }
  }

  const { error } = await adminClient
    .from('training_sessions')
    .delete()
    .eq('id', sessionId)

  if (error) return { error: 'Could not delete the session. Please try again.' }

  logAudit({
    actorId: auth.userId,
    actorEmail: auth.email,
    actorRole: auth.role,
    action: 'training_session.delete',
    targetType: 'training_session',
    targetId: sessionId,
    metadata: { location: session.location },
  })

  revalidatePath('/admin/sessions')
  return { success: 'Session deleted' }
}

// ── toggleCanManageSessions ──────────────────────────────────────────────────

export async function toggleCanManageSessions(
  userId: string,
  canManage: boolean
): Promise<SessionActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role !== 'admin') return { error: 'Only admins can perform this action.' }

  // Verify target user is a coach
  const { data: targetUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()
  if (!targetUser) return { error: 'User not found.' }
  if (targetUser.role !== 'coach') return { error: 'This setting only applies to coaches.' }

  const { error } = await adminClient
    .from('users')
    .update({ can_manage_sessions: canManage })
    .eq('id', userId)

  if (error) return { error: 'Could not update the setting. Please try again.' }

  logAudit({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: 'admin',
    action: 'user.toggle_session_management',
    targetType: 'user',
    targetId: userId,
    metadata: { can_manage_sessions: canManage },
  })

  revalidatePath('/admin')
  return { success: canManage ? 'Session management enabled' : 'Session management disabled' }
}
