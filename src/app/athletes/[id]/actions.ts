'use server'

import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { checkAndAwardMilestones } from '@/lib/milestones'
import { syncBadges } from '@/lib/badges'
import { parseValidDate } from '@/lib/utils/dates'
import { getAthletePhotosPaginated, withSignedUrls } from '@/lib/media'

export async function addCoachNote(athleteId: string, content: string): Promise<{ error?: string }> {
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
  const communication_notes = (formData.get('communication_notes') as string ?? '').trim() || null
  const medical_notes = (formData.get('medical_notes') as string ?? '').trim() || null
  const emergency_contact = (formData.get('emergency_contact') as string ?? '').trim() || null

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
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', athleteId)

  if (error) return { error: 'Could not update athlete profile. Please try again.' }

  revalidatePath(`/athletes/${athleteId}`)
  return {}
}

export async function createManualSession(
  athleteId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  const date = parseValidDate(formData.get('date') as string)
  if (!date) return { error: 'A valid date is required (YYYY-MM-DD)' }

  const title = (formData.get('title') as string ?? '').trim() || null
  const distanceKm = parseFloat(formData.get('distance_km') as string ?? '')
  if (isNaN(distanceKm) || distanceKm <= 0) return { error: 'Distance is required' }
  const durationMinutes = parseInt(formData.get('duration_minutes') as string ?? '')
  if (isNaN(durationMinutes) || durationMinutes <= 0) return { error: 'Duration is required' }
  const feel = parseInt(formData.get('feel') as string ?? '') || null
  const note = (formData.get('note') as string ?? '').trim() || null
  const avgHr = parseInt(formData.get('avg_heart_rate') as string ?? '')
  const maxHr = parseInt(formData.get('max_heart_rate') as string ?? '')

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
    }
  }

  // Sync coach badges
  await syncBadges(user.id)

  revalidatePath(`/athletes/${athleteId}`)
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
  revalidatePath(`/athletes/${noteRow?.athlete_id ?? ''}`)
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
        await adminClient.from('notifications').insert({
          user_id: user.id,
          type: 'low_feel_alert',
          channel: 'in_app',
          payload: {
            session_id: sessionId,
            athlete_id: session.athlete_id,
            feel: session.feel,
            athlete_name: (session as any).athlete?.name ?? 'An athlete',
            message: `${(session as any).athlete?.name ?? 'An athlete'} had a tough session. Check in before next run.`,
          },
          read: false,
        })
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
        await adminClient.from('notifications').insert({
          user_id: user.id,
          type: 'low_feel_alert',
          channel: 'in_app',
          payload: {
            session_id: sessionId,
            athlete_id: updatedSession.athlete_id,
            feel: updatedSession.feel,
            athlete_name: (updatedSession as any).athlete?.name ?? 'An athlete',
            message: `${(updatedSession as any).athlete?.name ?? 'An athlete'} had a tough session. Check in before next run.`,
          },
          read: false,
        })
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

  // Delete related milestones for this session
  await adminClient.from('milestones').delete().eq('session_id', sessionId)

  // Delete related notifications referencing this session
  await adminClient
    .from('notifications')
    .delete()
    .contains('payload', { session_id: sessionId })

  // Delete the session
  const { error } = await adminClient.from('sessions').delete().eq('id', sessionId)
  if (error) return { error: 'Could not delete the session. Please try again.' }

  // Re-evaluate badges for the session's coach (not the admin performing the delete)
  if (session.coach_user_id) {
    await syncBadges(session.coach_user_id)
  }

  revalidatePath(`/athletes/${athleteId}`)
  revalidatePath('/feed')
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
