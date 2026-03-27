import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push'
import { getClub } from '@/lib/club'
import { autoCompleteSessions } from '@/lib/sessions/completion'
import { formatSessionDate, formatSessionTime } from '@/lib/sessions/datetime'

// #todo Upgrade to Vercel Pro to run this cron hourly (`0 * * * *`) instead of
// daily. Hourly gives tighter RSVP deadline and morning-of reminder windows.
// Currently daily at 6 AM UTC — reminders use wider time windows to compensate.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, unknown> = {}

  // 1. Auto-complete ended sessions with logged runs
  try {
    const completionResult = await autoCompleteSessions()
    results.autoCompletion = completionResult
  } catch (err) {
    results.autoCompletion = { error: String(err) }
  }

  // 2. RSVP deadline reminders (24h before deadline)
  try {
    results.rsvpReminders = await sendRsvpDeadlineReminders()
  } catch (err) {
    results.rsvpReminders = { error: String(err) }
  }

  // 3. Morning-of reminders (2h before session)
  try {
    results.morningReminders = await sendMorningReminders()
  } catch (err) {
    results.morningReminders = { error: String(err) }
  }

  return NextResponse.json({ ok: true, ...results })
}

// ── RSVP Deadline Reminders ──────────────────────────────────────────────────

async function sendRsvpDeadlineReminders() {
  const now = new Date()
  const club = await getClub()
  const coachReminders: string[] = []
  const caregiverReminders: string[] = []
  const errors: string[] = []

  // Find sessions with upcoming RSVP deadline within the next 24h.
  // #todo When running hourly, narrow this to a 23-25h window for tighter idempotency.
  const windowStart = now.toISOString()
  const windowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()

  // Coach RSVP deadline reminders
  try {
    const { data: coachDeadlineSessions } = await adminClient
      .from('training_sessions')
      .select('id, title, session_start, location, coach_rsvp_deadline')
      .eq('status', 'published')
      .not('coach_rsvp_deadline', 'is', null)
      .gte('coach_rsvp_deadline', windowStart)
      .lte('coach_rsvp_deadline', windowEnd)

    for (const session of coachDeadlineSessions ?? []) {
      // Find coaches with pending RSVPs
      const { data: pendingRsvps } = await adminClient
        .from('session_coach_rsvps')
        .select('coach_id')
        .eq('session_id', session.id)
        .eq('status', 'pending')

      if (!pendingRsvps || pendingRsvps.length === 0) continue

      // Filter to notifiable coaches
      const coachIds = pendingRsvps.map(r => r.coach_id)
      const { data: notifiable } = await adminClient
        .from('users')
        .select('id')
        .in('id', coachIds)
        .eq('session_notifications', true)
        .eq('active', true)

      const notifiableIds = new Set((notifiable ?? []).map(u => u.id))
      const label = formatSessionDate(session.session_start, club.timezone)

      for (const coachId of coachIds) {
        if (!notifiableIds.has(coachId)) continue
        try {
          await sendPushToUser(coachId, {
            title: `RSVP reminder: ${session.title ?? 'Training'} on ${label}`,
            body: `Are you available for ${label} at ${session.location}? Please respond before the deadline.`,
            url: `/sessions/${session.id}`,
            tag: `rsvp-reminder-coach-${session.id}`,
          }, club.timezone)
          coachReminders.push(coachId)
        } catch (err) {
          errors.push(`Coach ${coachId}: ${String(err)}`)
        }
      }
    }
  } catch (err) {
    errors.push(`Coach RSVP reminders failed: ${String(err)}`)
  }

  // Athlete/Caregiver RSVP deadline reminders
  try {
    const { data: athleteDeadlineSessions } = await adminClient
      .from('training_sessions')
      .select('id, title, session_start, location, athlete_rsvp_deadline')
      .eq('status', 'published')
      .not('athlete_rsvp_deadline', 'is', null)
      .gte('athlete_rsvp_deadline', windowStart)
      .lte('athlete_rsvp_deadline', windowEnd)

    for (const session of athleteDeadlineSessions ?? []) {
      // Find athletes with pending RSVPs
      const { data: pendingRsvps } = await adminClient
        .from('session_athlete_rsvps')
        .select('athlete_id')
        .eq('session_id', session.id)
        .eq('status', 'pending')

      if (!pendingRsvps || pendingRsvps.length === 0) continue

      const athleteIds = pendingRsvps.map(r => r.athlete_id)

      // Get athletes with their caregivers
      const { data: athletes } = await adminClient
        .from('athletes')
        .select('id, name, caregiver_user_id')
        .in('id', athleteIds)
        .eq('active', true)
        .not('caregiver_user_id', 'is', null)

      if (!athletes || athletes.length === 0) continue

      // Group athletes by caregiver
      const byCaregiverId: Record<string, string[]> = {}
      for (const a of athletes) {
        if (!a.caregiver_user_id) continue
        if (!byCaregiverId[a.caregiver_user_id]) byCaregiverId[a.caregiver_user_id] = []
        byCaregiverId[a.caregiver_user_id].push(a.name)
      }

      // Filter to notifiable caregivers
      const caregiverIds = Object.keys(byCaregiverId)
      const { data: notifiable } = await adminClient
        .from('users')
        .select('id')
        .in('id', caregiverIds)
        .eq('session_notifications', true)
        .eq('active', true)

      const notifiableIds = new Set((notifiable ?? []).map(u => u.id))
      const label = formatSessionDate(session.session_start, club.timezone)

      for (const [cgId, names] of Object.entries(byCaregiverId)) {
        if (!notifiableIds.has(cgId)) continue
        try {
          await sendPushToUser(cgId, {
            title: `RSVP reminder: ${session.title ?? 'Training'} on ${label}`,
            body: `Will ${names.join(', ')} be attending on ${label} at ${session.location}?`,
            url: `/sessions/${session.id}`,
            tag: `rsvp-reminder-caregiver-${session.id}`,
          }, club.timezone)
          caregiverReminders.push(cgId)
        } catch (err) {
          errors.push(`Caregiver ${cgId}: ${String(err)}`)
        }
      }
    }
  } catch (err) {
    errors.push(`Caregiver RSVP reminders failed: ${String(err)}`)
  }

  return {
    coachRemindersSent: coachReminders.length,
    caregiverRemindersSent: caregiverReminders.length,
    errors: errors.length > 0 ? errors : undefined,
  }
}

// ── Morning-Of Reminders ─────────────────────────────────────────────────────

async function sendMorningReminders() {
  const now = new Date()
  const club = await getClub()
  const sent: string[] = []
  const errors: string[] = []

  // Find sessions starting within the next 24h (runs daily at 6 AM UTC).
  // #todo When running hourly, narrow to a 1-3h window for tighter timing.
  const windowStart = now.toISOString()
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()

  const { data: upcomingSessions } = await adminClient
    .from('training_sessions')
    .select('id, title, session_start, location, pairings_published_at')
    .eq('status', 'published')
    .not('pairings_published_at', 'is', null)
    .gte('session_start', windowStart)
    .lte('session_start', windowEnd)

  for (const session of upcomingSessions ?? []) {
    // Get coach assignments with athlete names
    const { data: assignments } = await adminClient
      .from('session_assignments')
      .select('coach_id, athlete_id, athletes(name)')
      .eq('session_id', session.id)

    if (!assignments || assignments.length === 0) continue

    // Group athletes by coach
    const athletesByCoach: Record<string, string[]> = {}
    for (const a of assignments) {
      if (!athletesByCoach[a.coach_id]) athletesByCoach[a.coach_id] = []
      const name = (a as unknown as { athletes?: { name?: string } }).athletes?.name ?? 'an athlete'
      athletesByCoach[a.coach_id].push(name)
    }

    // Filter to notifiable coaches
    const coachIds = Object.keys(athletesByCoach)
    const { data: notifiable } = await adminClient
      .from('users')
      .select('id')
      .in('id', coachIds)
      .eq('session_notifications', true)
      .eq('active', true)

    const notifiableIds = new Set((notifiable ?? []).map(u => u.id))
    const time = formatSessionTime(session.session_start, club.timezone)

    for (const [coachId, names] of Object.entries(athletesByCoach)) {
      if (!notifiableIds.has(coachId)) continue
      try {
        await sendPushToUser(coachId, {
          title: `Training at ${time}`,
          body: `You're with ${names.join(', ')} at ${session.location}`,
          url: `/sessions/${session.id}`,
          tag: `session-morning-${session.id}`,
        }, club.timezone)
        sent.push(coachId)
      } catch (err) {
        errors.push(`Coach ${coachId}: ${String(err)}`)
      }
    }
  }

  return {
    sent: sent.length,
    errors: errors.length > 0 ? errors : undefined,
  }
}
