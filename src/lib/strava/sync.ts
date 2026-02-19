import { adminClient } from '@/lib/supabase/admin'
import type { Json } from '@/lib/supabase/types'
import { getActivity } from './client'
import { getValidAccessToken } from './tokens'
import { matchActivityToAthlete } from './matching'

const RUN_SPORT_TYPES = ['Run', 'TrailRun', 'VirtualRun'] as const

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

  // ── Step 2: Handle delete ──────────────────────────────────────────────────
  if (eventType === 'delete') {
    await adminClient
      .from('sessions')
      .update({ strava_deleted_at: new Date().toISOString() })
      .eq('strava_activity_id', stravaActivityId)

    await adminClient
      .from('strava_sync_log')
      .update({ status: 'matched' as const, processed_at: new Date().toISOString() })
      .eq('id', logId)

    return
  }

  // ── Step 3: Check for duplicate ────────────────────────────────────────────
  const { data: duplicates } = await adminClient
    .from('strava_sync_log')
    .select('id')
    .eq('strava_activity_id', stravaActivityId)
    .eq('event_type', 'create')
    .in('status', ['matched', 'unmatched'])
    .neq('id', logId)

  if (duplicates && duplicates.length > 0) {
    await adminClient
      .from('strava_sync_log')
      .update({ status: 'skipped' as const })
      .eq('id', logId)

    return
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

  // ── Step 7: Match activity to athlete ──────────────────────────────────────
  const matchResult = await matchActivityToAthlete(activity, coachUserId)

  // ── Step 8a: Matched ───────────────────────────────────────────────────────
  if (matchResult.matched && matchResult.athleteId) {
    const now = new Date().toISOString()

    // Preserve existing feel/note if session already exists
    const { data: existing } = await adminClient
      .from('sessions')
      .select('id, feel, note')
      .eq('strava_activity_id', stravaActivityId)
      .maybeSingle()

    const upsertPayload = {
      athlete_id: matchResult.athleteId,
      coach_user_id: coachUserId,
      strava_activity_id: stravaActivityId,
      status: 'completed' as const,
      date: activity.start_date,
      distance_km: activity.distance / 1000,
      duration_seconds: activity.moving_time,
      map_polyline: activity.map.summary_polyline,
      sync_source: 'strava_webhook' as const,
      match_method: matchResult.method,
      match_confidence: matchResult.confidence,
      feel: existing?.feel ?? null,
      note: existing?.note ?? null,
    }

    let sessionId: string

    if (existing) {
      // Update, preserving feel/note via COALESCE in application logic
      const { data: updated } = await adminClient
        .from('sessions')
        .update({
          athlete_id: upsertPayload.athlete_id,
          coach_user_id: upsertPayload.coach_user_id,
          status: upsertPayload.status,
          date: upsertPayload.date,
          distance_km: upsertPayload.distance_km,
          duration_seconds: upsertPayload.duration_seconds,
          map_polyline: upsertPayload.map_polyline,
          sync_source: upsertPayload.sync_source,
          match_method: upsertPayload.match_method,
          match_confidence: upsertPayload.match_confidence,
          // preserve existing feel/note — do not overwrite
        })
        .eq('id', existing.id)
        .select('id')
        .single()

      sessionId = updated?.id ?? existing.id
    } else {
      const { data: inserted } = await adminClient
        .from('sessions')
        .insert(upsertPayload)
        .select('id')
        .single()

      sessionId = inserted?.id ?? ''
    }

    await adminClient
      .from('strava_sync_log')
      .update({
        status: 'matched' as const,
        result_session_id: sessionId,
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

    await adminClient.from('notifications').insert({
      user_id: coachUserId,
      type: 'feel_prompt' as const,
      channel: 'in_app' as const,
      payload: {
        session_id: sessionId,
        athlete_id: matchResult.athleteId,
        message: 'How did the run go? Add a feel score.',
      },
      read: false,
    })

    return
  }

  // ── Step 8b: Unmatched ─────────────────────────────────────────────────────
  await adminClient.from('strava_unmatched').insert({
    coach_user_id: coachUserId,
    strava_activity_id: stravaActivityId,
    activity_data: activity as unknown as Json,
  })

  await adminClient
    .from('strava_sync_log')
    .update({ status: 'unmatched' as const, processed_at: new Date().toISOString() })
    .eq('id', logId)

  await adminClient.from('notifications').insert({
    user_id: coachUserId,
    type: 'unmatched_run' as const,
    channel: 'in_app' as const,
    payload: {
      strava_activity_id: stravaActivityId,
      message: 'A run could not be linked to an athlete',
    },
    read: false,
  })
}
