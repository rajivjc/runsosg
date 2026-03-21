'use server'

import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { checkAndAwardMilestones } from '@/lib/milestones'
import { syncBadges } from '@/lib/badges'
import { parseValidDate } from '@/lib/utils/dates'
import { getAthletePhotosPaginated, withSignedUrls, deleteMediaForSession, deleteMediaById } from '@/lib/media'
import { sendPushToRole } from '@/lib/push'
import { logAudit } from '@/lib/audit'

export async function addCoachNote(athleteId: string, content: string, includeInStory = false): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role === 'caregiver') return { error: 'Caregivers cannot add notes' }

  const { error } = await adminClient.from('coach_notes').insert({
    athlete_id: athleteId,
    coach_user_id: user.id,
    content,
    note_type: 'general',
    visibility: 'all',
    include_in_story: includeInStory,
  })

  if (error) return { error: 'Could not save the note. Please try again.' }
  revalidatePath(`/athletes/${athleteId}`)
  return {}
}

export async function updateAthlete(
  athleteId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role !== 'admin' && callerUser?.role !== 'coach') {
    return { error: 'Only coaches and admins can edit athlete profiles.' }
  }

  const name = (formData.get('name') as string ?? '').trim()
  if (!name) return { error: 'Name is required' }

  const dobRaw = (formData.get('date_of_birth') as string ?? '').trim()
  const date_of_birth = dobRaw ? parseValidDate(dobRaw) : null
  if (dobRaw && !date_of_birth) return { error: 'Date of birth must be a valid date (YYYY-MM-DD)' }
  const running_goal = (formData.get('running_goal') as string ?? '').trim() || null
  const goal_type = (formData.get('goal_type') as string ?? '').trim() || null
  const goal_target_raw = (formData.get('goal_target') as string ?? '').trim()
  const goal_target = goal_target_raw ? parseFloat(goal_target_raw) : null
  if (goal_target !== null && (!isFinite(goal_target) || goal_target < 0 || goal_target > 10000)) {
    return { error: 'Goal target must be between 0 and 10,000' }
  }
  const communication_notes = (formData.get('communication_notes') as string ?? '').trim() || null
  const medical_notes = (formData.get('medical_notes') as string ?? '').trim() || null
  const emergency_contact = (formData.get('emergency_contact') as string ?? '').trim() || null
  const allow_public_sharing = formData.get('allow_public_sharing') === 'true'

  // Check current state to detect sharing toggle changes
  const { data: currentAthlete } = await adminClient
    .from('athletes')
    .select('allow_public_sharing, sharing_disabled_by_caregiver, caregiver_user_id')
    .eq('id', athleteId)
    .single()

  // If caregiver disabled sharing, coaches cannot re-enable
  const sharingUpdate = currentAthlete?.sharing_disabled_by_caregiver
    ? {} // Don't change sharing columns
    : {
        allow_public_sharing,
        // If coach is disabling, clear the caregiver override flag
        ...((!allow_public_sharing && currentAthlete?.allow_public_sharing)
          ? { sharing_disabled_by_caregiver: false }
          : {}),
      }

  const { error } = await adminClient
    .from('athletes')
    .update({
      name,
      date_of_birth,
      running_goal,
      goal_type: goal_type as 'distance_total' | 'distance_single' | 'session_count' | null,
      goal_target: goal_target !== null && !isNaN(goal_target) ? goal_target : null,
      communication_notes,
      medical_notes,
      emergency_contact,
      ...sharingUpdate,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', athleteId)

  if (error) return { error: 'Could not update athlete profile. Please try again.' }

  logAudit({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: callerUser?.role,
    action: 'athlete.update',
    targetType: 'athlete',
    targetId: athleteId,
    metadata: { name },
  })

  // Notify caregiver when sharing is enabled
  const justEnabled = allow_public_sharing && !currentAthlete?.allow_public_sharing && !currentAthlete?.sharing_disabled_by_caregiver
  if (justEnabled && currentAthlete?.caregiver_user_id) {
    const { data: coachRow } = await adminClient
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single()

    await adminClient.from('notifications').insert({
      user_id: currentAthlete.caregiver_user_id,
      type: 'general' as const,
      channel: 'in_app' as const,
      payload: {
        message: `Coach ${coachRow?.name ?? 'A coach'} enabled a shareable link for ${name}'s running achievements. The link shows ${name}'s name, run count, distance, and milestones — nothing else. You can turn this off anytime from your home screen.`,
        athlete_id: athleteId,
      },
      read: false,
    })
  }

  revalidatePath(`/athletes/${athleteId}`)
  revalidatePath('/feed')
  return {}
}

export async function createManualSession(
  athleteId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role === 'caregiver') return { error: 'Caregivers cannot log sessions' }

  const date = parseValidDate(formData.get('date') as string)
  if (!date) return { error: 'A valid date is required (YYYY-MM-DD)' }

  const title = (formData.get('title') as string ?? '').trim() || null
  const distanceKm = parseFloat(formData.get('distance_km') as string ?? '')
  if (isNaN(distanceKm) || distanceKm <= 0) return { error: 'Distance is required' }
  if (distanceKm > 100) return { error: 'Distance cannot exceed 100 km' }
  const durationMinutes = parseInt(formData.get('duration_minutes') as string ?? '')
  if (isNaN(durationMinutes) || durationMinutes <= 0) return { error: 'Duration is required' }
  if (durationMinutes > 1440) return { error: 'Duration cannot exceed 24 hours' }
  const feel = parseInt(formData.get('feel') as string ?? '') || null
  const note = (formData.get('note') as string ?? '').trim() || null
  const avgHr = parseInt(formData.get('avg_heart_rate') as string ?? '')
  const maxHr = parseInt(formData.get('max_heart_rate') as string ?? '')
  if (!isNaN(avgHr) && (avgHr < 30 || avgHr > 300)) return { error: 'Average heart rate must be between 30 and 300 bpm' }
  if (!isNaN(maxHr) && (maxHr < 30 || maxHr > 300)) return { error: 'Max heart rate must be between 30 and 300 bpm' }

  const { error } = await supabase
    .from('sessions')
    .insert({
      athlete_id: athleteId,
      coach_user_id: user.id,
      date,
      distance_km: distanceKm,
      duration_seconds: durationMinutes * 60,
      feel: (feel !== null && feel >= 1 && feel <= 5) ? (feel as 1 | 2 | 3 | 4 | 5) : null,
      note,
      strava_title: title,
      avg_heart_rate: isNaN(avgHr) ? null : avgHr,
      max_heart_rate: isNaN(maxHr) ? null : maxHr,
      sync_source: 'manual',
      status: 'completed',
    })

  if (error) return { error: 'Could not log the session. Please try again.' }

  const { data: newSession } = await adminClient
    .from('sessions')
    .select('id')
    .eq('athlete_id', athleteId)
    .eq('coach_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (newSession?.id) {
    // Handle photo upload if provided
    const photoFile = formData.get('photo') as File | null
    if (photoFile && photoFile.size > 0) {
      try {
        const dateStr = date
        const ext = photoFile.type?.includes('png') ? 'png' : photoFile.type?.includes('webp') ? 'webp' : 'jpg'
        const storagePath = `${athleteId}/${dateStr}_${newSession.id}.${ext}`
        const buffer = Buffer.from(await photoFile.arrayBuffer())

        const { error: uploadError } = await adminClient.storage
          .from('athlete-media')
          .upload(storagePath, buffer, {
            contentType: photoFile.type || 'image/webp',
            upsert: false,
          })

        if (!uploadError) {
          await adminClient.from('media').insert({
            athlete_id: athleteId,
            session_id: newSession.id,
            milestone_id: null,
            url: storagePath,
            caption: null,
            uploaded_by: user.id,
            source: 'upload',
            storage_path: storagePath,
          })
        }
      } catch (photoErr) {
        // Photo failure should not fail the session creation
        console.error('Photo upload failed (non-fatal):', photoErr)
      }
    }

    await checkAndAwardMilestones(athleteId, newSession.id, user.id)

    const { data: athleteRow } = await adminClient
      .from('athletes')
      .select('name')
      .eq('id', athleteId)
      .single()

    if (feel === null) {
      await adminClient.from('notifications').insert({
        user_id: user.id,
        type: 'feel_prompt',
        channel: 'in_app',
        payload: {
          session_id: newSession.id,
          athlete_id: athleteId,
          athlete_name: athleteRow?.name ?? 'An athlete',
          message: `How did ${athleteRow?.name ?? 'the athlete'}'s run go? Add a feel score.`,
        },
        read: false,
      })
    }

    if (feel !== null && (feel === 1 || feel === 2)) {
      await adminClient.from('notifications').insert({
        user_id: user.id,
        type: 'low_feel_alert',
        channel: 'in_app',
        payload: {
          session_id: newSession.id,
          athlete_id: athleteId,
          feel: feel,
          athlete_name: athleteRow?.name ?? 'An athlete',
          message: `${athleteRow?.name ?? 'An athlete'} had a tough session. Check in before next run.`,
        },
        read: false,
      })

      // Push to all coaches and admins
      const pushPayload = {
        title: 'Low feel alert',
        body: `${athleteRow?.name ?? 'An athlete'} had a tough session. Check in before next run.`,
        url: `/athletes/${athleteId}`,
        tag: `low-feel-${newSession.id}`,
      }
      sendPushToRole('coach', pushPayload).catch(() => {})
      sendPushToRole('admin', pushPayload).catch(() => {})
    }
  }

  // Sync coach badges
  await syncBadges(user.id)

  // Invalidate caches BEFORE sending push notifications so that when the
  // recipient taps the notification and router.refresh() re-fetches data,
  // the Next.js cache already has the fresh version.
  revalidatePath(`/athletes/${athleteId}`)
  revalidatePath('/feed')
  return {}
}

export async function saveCues(
  athleteId: string,
  cuesData: {
    id?: string
    helps: string[]
    avoid: string[]
    best_cues: string[]
    kit: string[]
    version: number
  }
): Promise<{ error?: string; data?: any }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role === 'caregiver') return { error: 'Caregivers cannot edit coaching cues' }

  const payload = {
    athlete_id: athleteId,
    helps: cuesData.helps,
    avoid: cuesData.avoid,
    best_cues: cuesData.best_cues,
    kit: cuesData.kit,
    version: cuesData.version + 1,
    previous_cues: null,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
    ...(cuesData.id ? { id: cuesData.id } : {}),
  }

  const { data, error } = await adminClient
    .from('cues')
    .upsert(payload, { onConflict: 'athlete_id' })
    .select()
    .single()

  if (error) return { error: 'Could not save cues. Please try again.' }

  logAudit({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: callerUser?.role,
    action: 'cues.update',
    targetType: 'athlete',
    targetId: athleteId,
  })

  revalidatePath(`/athletes/${athleteId}`)
  return { data }
}

export async function updateCoachNote(
  noteId: string,
  content: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  const { error } = await adminClient
    .from('coach_notes')
    .update({ content })
    .eq('id', noteId)
    .eq('coach_user_id', user.id)

  if (error) return { error: 'Could not update the note. Please try again.' }

  // Fetch the athlete ID so we revalidate the correct athlete detail page
  const { data: noteRow } = await adminClient
    .from('coach_notes')
    .select('athlete_id')
    .eq('id', noteId)
    .single()
  if (noteRow?.athlete_id) {
    revalidatePath(`/athletes/${noteRow.athlete_id}`)
  }
  return {}
}

export async function deleteCoachNote(
  noteId: string,
  athleteId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  const { error } = await adminClient
    .from('coach_notes')
    .delete()
    .eq('id', noteId)
    .eq('coach_user_id', user.id)

  if (error) return { error: 'Could not delete the note. Please try again.' }
  revalidatePath(`/athletes/${athleteId}`)
  return {}
}

export async function updateSessionFeel(
  sessionId: string,
  data: { feel: number | null; note: string | null }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  // Verify ownership or admin role
  const { data: session } = await adminClient
    .from('sessions')
    .select('coach_user_id')
    .eq('id', sessionId)
    .single()

  if (!session) return { error: 'Session not found' }

  if (session.coach_user_id !== user.id) {
    const { data: callerUser } = await adminClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    if (callerUser?.role !== 'admin') {
      return { error: 'You can only update sessions you logged' }
    }
  }

  const { error } = await adminClient
    .from('sessions')
    .update({
      feel: data.feel as 1 | 2 | 3 | 4 | 5 | null,
      note: data.note,
    })
    .eq('id', sessionId)

  if (error) return { error: 'Could not update the session. Please try again.' }

  if (data.feel !== null && (data.feel === 1 || data.feel === 2)) {
    const { data: existing } = await adminClient
      .from('notifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'low_feel_alert')
      .contains('payload', { session_id: sessionId })
      .limit(1)

    if (!existing || existing.length === 0) {
      const { data: session } = await adminClient
        .from('sessions')
        .select('athlete_id, feel, athlete:athletes(name)')
        .eq('id', sessionId)
        .single()
      if (session) {
        const athleteName = (session.athlete as unknown as { name: string } | null)?.name ?? 'An athlete'
        await adminClient.from('notifications').insert({
          user_id: user.id,
          type: 'low_feel_alert',
          channel: 'in_app',
          payload: {
            session_id: sessionId,
            athlete_id: session.athlete_id,
            feel: session.feel,
            athlete_name: athleteName,
            message: `${athleteName} had a tough session. Check in before next run.`,
          },
          read: false,
        })

        const feelPush = {
          title: 'Low feel alert',
          body: `${athleteName} had a tough session. Check in before next run.`,
          url: `/athletes/${session.athlete_id}`,
          tag: `low-feel-${sessionId}`,
        }
        sendPushToRole('coach', feelPush).catch(() => {})
        sendPushToRole('admin', feelPush).catch(() => {})
      }
    }
  }

  // Sync coach badges (feel rating + notes)
  await syncBadges(user.id)

  revalidatePath('/athletes')
  return {}
}

export async function updateManualSession(
  sessionId: string,
  data: {
    date: string
    distance_km: number | null
    duration_seconds: number | null
    feel: number | null
    note: string | null
  }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  const validDate = parseValidDate(data.date)
  if (!validDate) return { error: 'A valid date is required (YYYY-MM-DD)' }

  const { error } = await adminClient
    .from('sessions')
    .update({
      date: validDate,
      distance_km: data.distance_km,
      duration_seconds: data.duration_seconds,
      feel: data.feel as 1 | 2 | 3 | 4 | 5 | null,
      note: data.note,
    })
    .eq('id', sessionId)
    .eq('coach_user_id', user.id)

  if (error) return { error: 'Could not update the session. Please try again.' }

  // Fetch the session to get athlete_id for revalidation
  const { data: updatedSession } = await adminClient
    .from('sessions')
    .select('athlete_id, feel, athlete:athletes(name)')
    .eq('id', sessionId)
    .single()

  if (data.feel !== null && (data.feel === 1 || data.feel === 2)) {
    const { data: existing } = await adminClient
      .from('notifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'low_feel_alert')
      .contains('payload', { session_id: sessionId })
      .limit(1)

    if (!existing || existing.length === 0) {
      if (updatedSession) {
        const athleteName = (updatedSession.athlete as unknown as { name: string } | null)?.name ?? 'An athlete'
        await adminClient.from('notifications').insert({
          user_id: user.id,
          type: 'low_feel_alert',
          channel: 'in_app',
          payload: {
            session_id: sessionId,
            athlete_id: updatedSession.athlete_id,
            feel: updatedSession.feel,
            athlete_name: athleteName,
            message: `${athleteName} had a tough session. Check in before next run.`,
          },
          read: false,
        })

        const feelPush = {
          title: 'Low feel alert',
          body: `${athleteName} had a tough session. Check in before next run.`,
          url: `/athletes/${updatedSession.athlete_id}`,
          tag: `low-feel-${sessionId}`,
        }
        sendPushToRole('coach', feelPush).catch(() => {})
        sendPushToRole('admin', feelPush).catch(() => {})
      }
    }
  }

  // Sync coach badges (feel/note changes affect heart_reader/storyteller)
  await syncBadges(user.id)

  revalidatePath(`/athletes/${updatedSession?.athlete_id ?? ''}`)
  return {}
}

export async function deleteSession(
  sessionId: string,
  athleteId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  // Verify the session exists and check ownership
  const { data: session } = await adminClient
    .from('sessions')
    .select('id, sync_source, coach_user_id')
    .eq('id', sessionId)
    .single()

  if (!session) return { error: 'Session not found' }
  if (session.coach_user_id !== user.id) {
    // Allow admins to delete any session
    const { data: callerUser } = await adminClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    if (callerUser?.role !== 'admin') {
      return { error: 'You can only delete sessions you logged' }
    }
  }

  // Delete media (storage files + DB rows) before removing session
  await deleteMediaForSession(sessionId)

  // Delete related milestones for this session (best-effort)
  const { error: milestoneErr } = await adminClient.from('milestones').delete().eq('session_id', sessionId)
  if (milestoneErr) console.error('Failed to delete milestones for session', sessionId, milestoneErr.message)

  // Delete related notifications referencing this session (best-effort)
  const { error: notifErr } = await adminClient
    .from('notifications')
    .delete()
    .contains('payload', { session_id: sessionId })
  if (notifErr) console.error('Failed to delete notifications for session', sessionId, notifErr.message)

  // Strava-synced sessions: soft-delete to prevent re-sync
  // Manual sessions: hard-delete
  if (session.sync_source === 'strava_webhook') {
    const { error } = await adminClient
      .from('sessions')
      .update({ strava_deleted_at: new Date().toISOString() })
      .eq('id', sessionId)
    if (error) return { error: 'Could not delete the session. Please try again.' }
  } else {
    const { error } = await adminClient.from('sessions').delete().eq('id', sessionId)
    if (error) return { error: 'Could not delete the session. Please try again.' }
  }

  logAudit({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: 'coach',
    action: 'session.delete',
    targetType: 'session',
    targetId: sessionId,
    metadata: { athleteId, syncSource: session.sync_source },
  })

  // Re-evaluate badges for the session's coach (not the admin performing the delete)
  if (session.coach_user_id) {
    await syncBadges(session.coach_user_id)
  }

  revalidatePath(`/athletes/${athleteId}`)
  revalidatePath('/feed')
  return {}
}

export async function deletePhoto(
  mediaId: string,
  athleteId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role === 'caregiver') return { error: 'Caregivers cannot delete photos' }

  // Verify the photo belongs to this athlete
  const { data: media } = await adminClient
    .from('media')
    .select('id, athlete_id')
    .eq('id', mediaId)
    .single()
  if (!media) return { error: 'Photo not found' }
  if (media.athlete_id !== athleteId) return { error: 'Photo does not belong to this athlete' }

  const result = await deleteMediaById(mediaId)
  if (result.error) return result

  logAudit({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: callerUser?.role,
    action: 'photo.delete',
    targetType: 'media',
    targetId: mediaId,
    metadata: { athleteId },
  })

  revalidatePath(`/athletes/${athleteId}`)
  return {}
}

/**
 * Load more photos for infinite scroll in the Photos tab.
 */
export async function loadMorePhotos(
  athleteId: string,
  cursor: string
): Promise<{
  photos: { id: string; session_id: string | null; signed_url: string; caption: string | null; created_at: string }[]
  nextCursor: string | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { photos: [], nextCursor: null }

  // Caregivers can only view their linked athlete's photos
  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerUser?.role === 'caregiver') {
    const { data: linked } = await adminClient
      .from('athletes')
      .select('id')
      .eq('caregiver_user_id', user.id)
      .single()
    if (!linked || linked.id !== athleteId) {
      return { photos: [], nextCursor: null }
    }
  }

  const { photos: rawPhotos, nextCursor } = await getAthletePhotosPaginated(athleteId, 24, cursor)
  const enriched = await withSignedUrls(rawPhotos)

  return {
    photos: enriched.map(p => ({
      id: p.id,
      session_id: p.session_id,
      signed_url: p.signed_url,
      caption: p.caption,
      created_at: p.created_at,
    })),
    nextCursor,
  }
}

export async function toggleNoteStoryInclusion(
  noteId: string,
  includeInStory: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role !== 'admin' && callerUser?.role !== 'coach') {
    return { error: 'Only coaches and admins can manage story content.' }
  }

  const { data: note } = await adminClient
    .from('coach_notes')
    .select('athlete_id, coach_user_id')
    .eq('id', noteId)
    .single()

  if (!note) return { error: 'Note not found.' }

  // Only the note author or an admin can toggle
  if (callerUser.role !== 'admin' && note.coach_user_id !== user.id) {
    return { error: 'You can only manage your own notes.' }
  }

  const { error } = await adminClient
    .from('coach_notes')
    .update({ include_in_story: includeInStory })
    .eq('id', noteId)

  if (error) return { error: 'Could not update note. Please try again.' }

  revalidatePath(`/athletes/${note.athlete_id}`)
  revalidatePath(`/story/${note.athlete_id}`)
  return {}
}

export async function addStoryUpdate(
  athleteId: string,
  content: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role !== 'admin' && callerUser?.role !== 'coach') {
    return { error: 'Only coaches and admins can add story updates.' }
  }

  const trimmed = content.trim()
  if (!trimmed) return { error: 'Content cannot be empty.' }
  if (trimmed.length > 500) return { error: 'Content cannot exceed 500 characters.' }

  const { error } = await adminClient.from('story_updates').insert({
    athlete_id: athleteId,
    coach_user_id: user.id,
    content: trimmed,
  })

  if (error) return { error: 'Could not save story update. Please try again.' }

  revalidatePath(`/athletes/${athleteId}`)
  revalidatePath(`/story/${athleteId}`)
  return {}
}

export async function updateWorkingOn(
  athleteId: string,
  workingOn: string | null,
  recentProgress: string | null
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role !== 'admin' && callerUser?.role !== 'coach') {
    return { error: 'Only coaches and admins can update this.' }
  }

  const { error } = await adminClient
    .from('athletes')
    .update({
      working_on: workingOn?.trim() || null,
      recent_progress: recentProgress?.trim() || null,
      working_on_updated_at: new Date().toISOString(),
      working_on_updated_by: user.id,
    })
    .eq('id', athleteId)

  if (error) return { error: 'Could not save. Please try again.' }
  revalidatePath(`/athletes/${athleteId}`)
  revalidatePath('/feed')
  return {}
}

export async function deleteStoryUpdate(
  updateId: string,
  athleteId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role !== 'admin' && callerUser?.role !== 'coach') {
    return { error: 'Only coaches and admins can delete story updates.' }
  }

  // Admins can delete any, coaches can only delete their own
  let query = adminClient.from('story_updates').delete().eq('id', updateId)
  if (callerUser.role !== 'admin') {
    query = query.eq('coach_user_id', user.id)
  }

  const { error } = await query
  if (error) return { error: 'Could not delete story update. Please try again.' }

  revalidatePath(`/athletes/${athleteId}`)
  revalidatePath(`/story/${athleteId}`)
  return {}
}
