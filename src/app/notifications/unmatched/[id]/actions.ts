'use server'

import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { checkAndAwardMilestones } from '@/lib/milestones'
import { syncBadges } from '@/lib/badges'
import { processStravaActivity } from '@/lib/strava/sync'

export async function resolveUnmatchedRun(
  unmatchedId: string,
  athleteId: string
): Promise<{ error?: string; sessionId?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!callerUser || callerUser.role === 'caregiver') {
    return { error: 'Only coaches and admins can link runs.' }
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
      resolution_type: 'linked',
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

  // Mark any unmatched_run notifications for this activity as read
  const { data: unmatchedNotifs } = await adminClient
    .from('notifications')
    .select('id')
    .eq('user_id', user.id)
    .eq('type', 'unmatched_run')
    .eq('read', false)
    .contains('payload', { strava_activity_id: unmatched.strava_activity_id })

  if (unmatchedNotifs && unmatchedNotifs.length > 0) {
    await adminClient
      .from('notifications')
      .update({ read: true })
      .in('id', unmatchedNotifs.map((n) => n.id))
  }

  // Award milestones and sync badges
  const { getClub } = await import('@/lib/club')
  const club = await getClub()
  await checkAndAwardMilestones(athleteId, session.id, unmatched.coach_user_id ?? user.id, club.locale)
  await syncBadges(unmatched.coach_user_id ?? user.id)

  revalidatePath('/notifications')
  revalidatePath('/feed')

  return { sessionId: session.id }
}

export async function resyncFromStrava(
  unmatchedId: string
): Promise<{ error?: string; matched?: boolean }> {
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

  const coachUserId = unmatched.coach_user_id ?? user.id

  // Re-run the full sync pipeline as an 'update' event.
  // This fetches the latest activity data from Strava (including any
  // description edits), runs matching, creates sessions, and handles
  // notifications.
  try {
    await processStravaActivity(
      unmatched.strava_activity_id,
      coachUserId,
      'update',
      { source: 'manual_resync', unmatched_id: unmatchedId }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: `Sync failed: ${message}` }
  }

  // Check if it was resolved by the sync
  const { data: refreshed } = await adminClient
    .from('strava_unmatched')
    .select('resolved_at')
    .eq('id', unmatchedId)
    .single()

  revalidatePath('/notifications')
  revalidatePath('/feed')

  if (refreshed?.resolved_at) {
    return { matched: true }
  }

  const { getClub } = await import('@/lib/club')
  const club = await getClub()
  return { matched: false, error: `No athlete match found. Add hashtags like ${club.strava_hashtag_prefix ?? '#club'} #athletename to the Strava activity title or description, then try again.` }
}

export async function dismissAsNotCoaching(
  unmatchedId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!callerUser || callerUser.role === 'caregiver') {
    return { error: 'Not authorised' }
  }

  // Resolve the unmatched row as dismissed (not a coaching run)
  const { error: resolveErr } = await adminClient
    .from('strava_unmatched')
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
      resolution_type: 'dismissed',
    })
    .eq('id', unmatchedId)
    .is('resolved_at', null)

  if (resolveErr) return { error: 'Could not dismiss run.' }

  // Mark any unmatched_run notifications for this unmatched row as read
  const { data: notifs } = await adminClient
    .from('notifications')
    .select('id')
    .eq('user_id', user.id)
    .eq('type', 'unmatched_run')
    .eq('read', false)
    .contains('payload', { unmatched_id: unmatchedId })

  if (notifs && notifs.length > 0) {
    await adminClient
      .from('notifications')
      .update({ read: true })
      .in('id', notifs.map((n) => n.id))
  }

  revalidatePath('/notifications')
  return {}
}
