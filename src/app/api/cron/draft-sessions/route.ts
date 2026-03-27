import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { getClub } from '@/lib/club'
import { getUpcomingSessionDate, combineDateTime } from '@/lib/sessions/datetime'
import { sendPushToUser } from '@/lib/push'
import { logAudit } from '@/lib/audit'

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const club = await getClub()

  // Check if auto-draft is enabled
  if (!club.recurring_auto_draft) {
    return NextResponse.json({ ok: true, skipped: 'recurring_auto_draft is disabled' })
  }

  if (club.recurring_session_day == null || !club.recurring_session_time) {
    return NextResponse.json({ ok: true, skipped: 'recurring session day/time not configured' })
  }

  const tz = club.timezone

  // Calculate next session date in club timezone
  const nextDate = getUpcomingSessionDate(club.recurring_session_day, tz)

  // Check if a draft or published session already exists for that date
  // Build start/end of day in UTC for the target date in club timezone
  const dayStartUtc = combineDateTime(nextDate, '00:00', tz)
  const dayEndUtc = combineDateTime(nextDate, '23:59', tz)

  const { data: existing } = await adminClient
    .from('training_sessions')
    .select('id')
    .eq('club_id', club.id)
    .in('status', ['draft', 'published'])
    .gte('session_start', dayStartUtc)
    .lte('session_start', dayEndUtc)
    .limit(1)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ ok: true, skipped: 'session already exists', date: nextDate })
  }

  // Create the draft session
  const sessionStart = combineDateTime(nextDate, club.recurring_session_time, tz)
  const sessionEnd = club.recurring_session_end
    ? combineDateTime(nextDate, club.recurring_session_end, tz)
    : null

  // Get an admin user ID for created_by (prefer first active admin)
  const { data: admin } = await adminClient
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .eq('active', true)
    .limit(1)
    .maybeSingle()

  const createdBy = admin?.id ?? SYSTEM_ACTOR_ID

  const { data: newSession, error } = await adminClient
    .from('training_sessions')
    .insert({
      club_id: club.id,
      session_start: sessionStart,
      session_end: sessionEnd,
      location: club.recurring_session_location ?? club.home_location ?? 'TBD',
      title: null,
      status: 'draft',
      created_by: createdBy,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  logAudit({
    actorId: SYSTEM_ACTOR_ID,
    actorRole: 'system',
    action: 'training_session.auto_draft',
    targetType: 'training_session',
    targetId: newSession.id,
    metadata: { date: nextDate, location: club.recurring_session_location ?? club.home_location },
  })

  // Notify admins
  try {
    const { data: admins } = await adminClient
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .eq('active', true)
      .eq('session_notifications', true)

    for (const a of admins ?? []) {
      await sendPushToUser(a.id, {
        title: 'Draft session created',
        body: `A draft session for ${nextDate} has been auto-created. Review and publish when ready.`,
        url: `/admin/sessions/${newSession.id}`,
        tag: `auto-draft-${newSession.id}`,
      }, tz).catch(() => {})
    }
  } catch {
    // Non-blocking notification
  }

  return NextResponse.json({
    ok: true,
    created: true,
    sessionId: newSession.id,
    date: nextDate,
  })
}
