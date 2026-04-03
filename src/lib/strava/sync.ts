import { adminClient } from '@/lib/supabase/admin'
import type { Json } from '@/lib/supabase/types'
import { getActivity } from './client'
import type { StravaActivity } from './client'
import { getValidAccessToken } from './tokens'
import { matchActivityToAthlete } from './matching'
import type { AthleteMatch } from './matching'
import { checkAndAwardMilestones } from '@/lib/milestones'
import { syncBadges } from '@/lib/badges'
import { getClub } from '@/lib/club'

const RUN_SPORT_TYPES = ['Run', 'TrailRun', 'VirtualRun'] as const

/**
 * Find a published training session that overlaps with a Strava activity.
 * Uses a ±2 hour window around session_start to account for timing variance.
 * Returns the training_session_id if found, null otherwise.
 */
async function findMatchingTrainingSession(
  activityStartDate: string,
  athleteId: string
): Promise<string | null> {
  const activityTime = new Date(activityStartDate)
  const windowMs = 2 * 60 * 60 * 1000 // 2 hours
  const rangeStart = new Date(activityTime.getTime() - windowMs).toISOString()
  const rangeEnd = new Date(activityTime.getTime() + windowMs).toISOString()

  const { data: sessions } = await adminClient
    .from('training_sessions')
    .select('id, session_start')
    .eq('status', 'published')
    .gte('session_start', rangeStart)
    .lte('session_start', rangeEnd)
    .order('session_start', { ascending: true })
    .limit(5)

  if (!sessions || sessions.length === 0) return null

  // Pick the closest session by time
  let bestId: string | null = null
  let bestDiff = Infinity
  for (const s of sessions) {
    const diff = Math.abs(new Date(s.session_start).getTime() - activityTime.getTime())
    if (diff < bestDiff) {
      bestDiff = diff
      bestId = s.id
    }
  }

  // Verify the athlete doesn't already have a different run linked to this training session
  if (bestId) {
    const { data: existingRun } = await adminClient
      .from('sessions')
      .select('id')
      .eq('training_session_id', bestId)
      .eq('athlete_id', athleteId)
      .is('strava_deleted_at', null)
      .maybeSingle()

    // If there's already a manually-logged run for this athlete + training session, don't overwrite
    if (existingRun) return null
  }

  return bestId
}

/**
 * Create or update a session for a single matched athlete.
 * Returns the session ID.
 */
async function upsertSessionForAthlete(
  athleteMatch: AthleteMatch,
  activity: StravaActivity,
  stravaActivityId: number,
  coachUserId: string
): Promise<string | null> {
  // Check if a session already exists for this athlete + activity
  const { data: existing } = await adminClient
    .from('sessions')
    .select('id, feel, note, strava_deleted_at')
    .eq('strava_activity_id', stravaActivityId)
    .eq('athlete_id', athleteMatch.athleteId)
    .maybeSingle()

  // If the session was manually deleted by a coach, skip re-creation
  if (existing?.strava_deleted_at) {
    return null
  }

  const payload = {
    athlete_id: athleteMatch.athleteId,
    coach_user_id: coachUserId,
    strava_activity_id: stravaActivityId,
    status: 'completed' as const,
    date: activity.start_date,
    distance_km: activity.distance / 1000,
    duration_seconds: activity.moving_time,
    map_polyline: activity.map.summary_polyline,
    strava_title: activity.name || null,
    avg_heart_rate: activity.average_heartrate
      ? Math.round(activity.average_heartrate)
      : null,
    max_heart_rate: activity.max_heartrate
      ? Math.round(activity.max_heartrate)
      : null,
    sync_source: 'strava_webhook' as const,
    match_method: athleteMatch.method,
    match_confidence: athleteMatch.confidence,
  }

  if (existing) {
    const { data: updated } = await adminClient
      .from('sessions')
      .update(payload)
      .eq('id', existing.id)
      .select('id')
      .single()

    return updated?.id ?? existing.id
  }

  const { data: inserted, error: insertError } = await adminClient
    .from('sessions')
    .insert({ ...payload, feel: null, note: null })
    .select('id')
    .single()

  if (insertError || !inserted?.id) {
    throw new Error(`Failed to insert session for athlete ${athleteMatch.athleteId}: ${insertError?.message ?? 'no ID returned'}`)
  }

  return inserted.id
}

export async function processStravaActivity(
  stravaActivityId: number,
  coachUserId: string,
  eventType: 'create' | 'update' | 'delete',
  rawPayload: object
): Promise<void> {
  // ── Step 1: Insert sync log entry ──────────────────────────────────────────
  const { data: logRow, error: logInsertError } = await adminClient
    .from('strava_sync_log')
    .insert({
      strava_activity_id: stravaActivityId,
      coach_user_id: coachUserId,
      event_type: eventType,
      status: 'pending',
      raw_payload: rawPayload as Json,
    })
    .select('id')
    .single()

  if (logInsertError || !logRow) {
    console.error('Failed to insert strava_sync_log', logInsertError)
    return
  }

  const logId = logRow.id

  try {
  // ── Step 2: Handle delete ──────────────────────────────────────────────────
  if (eventType === 'delete') {
    const now = new Date().toISOString()

    // Soft-delete sessions, resolve unmatched rows, and fetch notifications in parallel
    const [, , { data: unmatchedNotifs }, { data: deletedSessions }] = await Promise.all([
      adminClient
        .from('sessions')
        .update({ strava_deleted_at: now })
        .eq('strava_activity_id', stravaActivityId),
      adminClient
        .from('strava_unmatched')
        .update({ resolved_at: now, resolved_by: coachUserId })
        .eq('strava_activity_id', stravaActivityId)
        .is('resolved_at', null),
      adminClient
        .from('notifications')
        .select('id')
        .eq('user_id', coachUserId)
        .eq('type', 'unmatched_run')
        .eq('read', false)
        .contains('payload', { strava_activity_id: stravaActivityId }),
      adminClient
        .from('sessions')
        .select('id')
        .eq('strava_activity_id', stravaActivityId),
    ])

    // Mark unmatched_run notifications as read
    if (unmatchedNotifs && unmatchedNotifs.length > 0) {
      await adminClient
        .from('notifications')
        .update({ read: true })
        .in('id', unmatchedNotifs.map(n => n.id))
    }

    // Batch feel_prompt notification cleanup — fetch all at once instead of N+1
    if (deletedSessions && deletedSessions.length > 0) {
      const sessionIdList = deletedSessions.map(s => s.id)
      const feelNotifResults = await Promise.all(
        sessionIdList.map(sid =>
          adminClient
            .from('notifications')
            .select('id')
            .eq('user_id', coachUserId)
            .eq('type', 'feel_prompt')
            .eq('read', false)
            .contains('payload', { session_id: sid })
        )
      )

      const allFeelNotifIds = feelNotifResults
        .flatMap(r => r.data ?? [])
        .map(n => n.id)

      if (allFeelNotifIds.length > 0) {
        await adminClient
          .from('notifications')
          .update({ read: true })
          .in('id', allFeelNotifIds)
      }
    }

    // Re-evaluate badges after Strava activity deletion
    await syncBadges(coachUserId)

    await adminClient
      .from('strava_sync_log')
      .update({ status: 'matched' as const, processed_at: now })
      .eq('id', logId)

    return
  }

  // ── Step 3: Check for duplicate / decide if re-processing ────────────────
  const { data: previousLogs } = await adminClient
    .from('strava_sync_log')
    .select('id, status')
    .eq('strava_activity_id', stravaActivityId)
    .in('event_type', ['create', 'update'])
    .in('status', ['matched', 'unmatched'])
    .neq('id', logId)

  if (previousLogs && previousLogs.length > 0) {
    if (eventType === 'create') {
      // True duplicate create — skip
      await adminClient
        .from('strava_sync_log')
        .update({ status: 'skipped' as const })
        .eq('id', logId)
      return
    }

    // eventType === 'update' — re-process (coach may have edited title to add hashtags)
    // Continue processing below
  }

  // ── Step 4: Get valid access token ─────────────────────────────────────────
  let accessToken: string
  try {
    accessToken = await getValidAccessToken(coachUserId)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await adminClient
      .from('strava_sync_log')
      .update({
        status: 'error' as const,
        error_message: message,
        processed_at: new Date().toISOString(),
      })
      .eq('id', logId)
    return
  }

  // ── Step 5: Fetch full activity ────────────────────────────────────────────
  let activity: Awaited<ReturnType<typeof getActivity>>
  try {
    activity = await getActivity(stravaActivityId, accessToken)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await adminClient
      .from('strava_sync_log')
      .update({
        status: 'error' as const,
        error_message: message,
        processed_at: new Date().toISOString(),
      })
      .eq('id', logId)
    return
  }

  // ── Step 6: Check sport type ───────────────────────────────────────────────
  if (!(RUN_SPORT_TYPES as readonly string[]).includes(activity.sport_type)) {
    await adminClient
      .from('strava_sync_log')
      .update({ status: 'skipped' as const, processed_at: new Date().toISOString() })
      .eq('id', logId)
    return
  }

  // ── Step 6b: Fetch club config (once, not per-athlete) ──────────────────
  const club = await getClub()
  const stravaPrefix = club.strava_hashtag_prefix ?? '#club'

  // ── Step 7: Match activity to athlete(s) ─────────────────────────────────
  const matchResult = await matchActivityToAthlete(activity, coachUserId)

  // ── Step 8a: Matched (one or more athletes) ──────────────────────────────
  if (matchResult.matched && matchResult.athletes.length > 0) {
    const now = new Date().toISOString()
    let firstSessionId: string | null = null

    for (const athleteMatch of matchResult.athletes) {
      const sessionId = await upsertSessionForAthlete(
        athleteMatch,
        activity,
        stravaActivityId,
        coachUserId
      )

      // Session was soft-deleted by coach — skip processing
      if (!sessionId) continue

      if (!firstSessionId) firstSessionId = sessionId

      // Link to a nearby published training session (time-window match)
      const trainingSessionId = await findMatchingTrainingSession(
        activity.start_date,
        athleteMatch.athleteId
      )
      if (trainingSessionId) {
        await adminClient
          .from('sessions')
          .update({ training_session_id: trainingSessionId })
          .eq('id', sessionId)
      }

      // Send feel prompt only if this is a new session with no existing feel
      // and no feel_prompt notification already exists for this session
      if (sessionId) {
        const { data: session } = await adminClient
          .from('sessions')
          .select('feel')
          .eq('id', sessionId)
          .single()

        if (session?.feel == null) {
          const { data: existingPrompt } = await adminClient
            .from('notifications')
            .select('id')
            .eq('user_id', coachUserId)
            .eq('type', 'feel_prompt')
            .contains('payload', { session_id: sessionId })
            .limit(1)

          if (!existingPrompt || existingPrompt.length === 0) {
            await adminClient.from('notifications').insert({
              user_id: coachUserId,
              type: 'feel_prompt' as const,
              channel: 'in_app' as const,
              payload: {
                session_id: sessionId,
                athlete_id: athleteMatch.athleteId,
                message: `How did the run go? Add a feel score for ${athleteMatch.athleteName}.`,
              },
              read: false,
            })
          }
        }

        await checkAndAwardMilestones(athleteMatch.athleteId, sessionId, coachUserId)

      }
    }

    // Sync coach badges after matched session creation
    await syncBadges(coachUserId)

    await adminClient
      .from('strava_sync_log')
      .update({
        status: 'matched' as const,
        result_session_id: firstSessionId,
        processed_at: now,
      })
      .eq('id', logId)

    await adminClient
      .from('strava_connections')
      .update({
        last_sync_at: now,
        last_sync_status: 'ok' as const,
      })
      .eq('user_id', coachUserId)

    // If this was a re-process of a previously unmatched activity, resolve it
    // and mark old unmatched_run notifications as read
    if (eventType === 'update') {
      await adminClient
        .from('strava_unmatched')
        .update({
          resolved_at: now,
          resolved_by: coachUserId,
          resolved_session_id: firstSessionId,
        })
        .eq('strava_activity_id', stravaActivityId)
        .is('resolved_at', null)

      // Mark any existing unmatched_run notifications for this activity as read
      const { data: unmatchedNotifications } = await adminClient
        .from('notifications')
        .select('id')
        .eq('user_id', coachUserId)
        .eq('type', 'unmatched_run')
        .eq('read', false)
        .contains('payload', { strava_activity_id: stravaActivityId })

      if (unmatchedNotifications && unmatchedNotifications.length > 0) {
        await adminClient
          .from('notifications')
          .update({ read: true })
          .in('id', unmatchedNotifications.map(n => n.id))
      }
    }

    // If some identifiers were ambiguous, notify the coach
    if (matchResult.ambiguousIdentifiers.length > 0) {
      const names = matchResult.ambiguousIdentifiers.join(', ')
      await adminClient.from('notifications').insert({
        user_id: coachUserId,
        type: 'general' as const,
        channel: 'in_app' as const,
        payload: {
          message: `Could not auto-match: "${names}" matched multiple athletes. Use a more specific name.`,
        },
        read: false,
      })
    }

    return
  }

  // ── Step 8b: Unmatched ─────────────────────────────────────────────────────

  // Check if there's already an unresolved strava_unmatched row for this activity
  const { data: existingUnmatched } = await adminClient
    .from('strava_unmatched')
    .select('id')
    .eq('strava_activity_id', stravaActivityId)
    .is('resolved_at', null)
    .maybeSingle()

  let unmatchedId: string | null = existingUnmatched?.id ?? null

  if (!existingUnmatched) {
    // Only create a new unmatched row if one doesn't already exist
    const { data: unmatchedRow } = await adminClient
      .from('strava_unmatched')
      .insert({
        coach_user_id: coachUserId,
        strava_activity_id: stravaActivityId,
        activity_data: activity as unknown as Json,
      })
      .select('id')
      .single()

    unmatchedId = unmatchedRow?.id ?? null
  } else {
    // Update the existing unmatched row with fresh activity data
    await adminClient
      .from('strava_unmatched')
      .update({ activity_data: activity as unknown as Json })
      .eq('id', existingUnmatched.id)
  }

  await adminClient
    .from('strava_sync_log')
    .update({ status: 'unmatched' as const, processed_at: new Date().toISOString() })
    .eq('id', logId)

  // Only create an unmatched notification if one doesn't already exist for this activity
  const { data: existingNotif } = await adminClient
    .from('notifications')
    .select('id')
    .eq('user_id', coachUserId)
    .eq('type', 'unmatched_run')
    .eq('read', false)
    .contains('payload', { strava_activity_id: stravaActivityId })
    .limit(1)

  if (!existingNotif || existingNotif.length === 0) {
    const activityDesc = activity.name
      ? `"${activity.name}" (${(activity.distance / 1000).toFixed(1)} km)`
      : `your ${(activity.distance / 1000).toFixed(1)} km run`

    const unmatchedMessage =
      matchResult.ambiguousIdentifiers.length > 0
        ? `${activityDesc} matched multiple athletes for "${matchResult.ambiguousIdentifiers.join(', ')}". Tap to pick the right athlete.`
        : `${activityDesc} couldn't be linked. Tap to pick an athlete, or add ${stravaPrefix} <name> to the Strava title and re-sync.`

    await adminClient.from('notifications').insert({
      user_id: coachUserId,
      type: 'unmatched_run' as const,
      channel: 'in_app' as const,
      payload: {
        strava_activity_id: stravaActivityId,
        unmatched_id: unmatchedId,
        message: unmatchedMessage,
      },
      read: false,
    })
  }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('processStravaActivity fatal error:', message)
    await adminClient
      .from('strava_sync_log')
      .update({
        status: 'error' as const,
        error_message: message,
        processed_at: new Date().toISOString(),
      })
      .eq('id', logId)
  }
}
