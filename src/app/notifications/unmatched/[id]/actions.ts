'use server'

import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { checkAndAwardMilestones } from '@/lib/milestones'

export async function resolveUnmatchedRun(
  unmatchedId: string,
  athleteId: string
): Promise<{ error?: string; sessionId?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!callerUser || callerUser.role === 'caregiver') {
    return { error: 'Not authorised' }
  }

  // Fetch the unmatched row
  const { data: unmatched } = await adminClient
    .from('strava_unmatched')
    .select('*')
    .eq('id', unmatchedId)
    .is('resolved_at', null)
    .single()

  if (!unmatched) {
    return { error: 'Unmatched run not found or already resolved' }
  }

  const activity = unmatched.activity_data as Record<string, any>

  // Create the session
  const { data: session, error: insertError } = await adminClient
    .from('sessions')
    .insert({
      athlete_id: athleteId,
      coach_user_id: unmatched.coach_user_id,
      strava_activity_id: unmatched.strava_activity_id,
      status: 'completed' as const,
      date: activity.start_date,
      distance_km: activity.distance ? activity.distance / 1000 : null,
      duration_seconds: activity.moving_time ?? null,
      map_polyline: activity.map?.summary_polyline ?? null,
      strava_title: activity.name || null,
      avg_heart_rate: activity.average_heartrate
        ? Math.round(activity.average_heartrate)
        : null,
      max_heart_rate: activity.max_heartrate
        ? Math.round(activity.max_heartrate)
        : null,
      sync_source: 'strava_webhook' as const,
      match_method: 'manual_review' as const,
      match_confidence: 'manual' as const,
      feel: null,
      note: null,
    })
    .select('id')
    .single()

  if (insertError || !session) {
    return { error: insertError?.message ?? 'Failed to create session' }
  }

  // Resolve the unmatched row
  await adminClient
    .from('strava_unmatched')
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
      resolved_session_id: session.id,
    })
    .eq('id', unmatchedId)

  // Update the sync log
  await adminClient
    .from('strava_sync_log')
    .update({
      status: 'matched' as const,
      result_session_id: session.id,
      processed_at: new Date().toISOString(),
    })
    .eq('strava_activity_id', unmatched.strava_activity_id)
    .eq('status', 'unmatched')

  // Award milestones
  await checkAndAwardMilestones(athleteId, session.id, unmatched.coach_user_id ?? user.id)

  revalidatePath('/notifications')
  revalidatePath('/feed')

  return { sessionId: session.id }
}
