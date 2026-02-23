'use server'

import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { checkAndAwardMilestones } from '@/lib/milestones'

export async function addCoachNote(athleteId: string, content: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await adminClient.from('coach_notes').insert({
    athlete_id: athleteId,
    coach_user_id: user.id,
    content,
    note_type: 'general',
    visibility: 'all',
  })

  if (error) return { error: error.message }
  revalidatePath(`/athletes/${athleteId}`)
  return {}
}

export async function updateAthlete(
  athleteId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role !== 'admin' && callerUser?.role !== 'coach') {
    return { error: 'Not authorised' }
  }

  const name = (formData.get('name') as string ?? '').trim()
  if (!name) return { error: 'Name is required' }

  const date_of_birth = (formData.get('date_of_birth') as string ?? '').trim() || null
  const running_goal = (formData.get('running_goal') as string ?? '').trim() || null
  const communication_notes = (formData.get('communication_notes') as string ?? '').trim() || null
  const medical_notes = (formData.get('medical_notes') as string ?? '').trim() || null
  const emergency_contact = (formData.get('emergency_contact') as string ?? '').trim() || null

  const { error } = await adminClient
    .from('athletes')
    .update({
      name,
      date_of_birth,
      running_goal,
      communication_notes,
      medical_notes,
      emergency_contact,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', athleteId)

  if (error) return { error: `Failed to update athlete: ${error.message}` }

  revalidatePath(`/athletes/${athleteId}`)
  return {}
}

export async function createManualSession(
  athleteId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const date = (formData.get('date') as string ?? '').trim()
  if (!date) return { error: 'Date is required' }

  const distanceKm = parseFloat(formData.get('distance_km') as string ?? '')
  const durationMinutes = parseInt(formData.get('duration_minutes') as string ?? '')
  const feel = parseInt(formData.get('feel') as string ?? '') || null
  const note = (formData.get('note') as string ?? '').trim() || null

  const { error } = await supabase
    .from('sessions')
    .insert({
      athlete_id: athleteId,
      coach_user_id: user.id,
      date,
      distance_km: isNaN(distanceKm) ? null : distanceKm,
      duration_seconds: isNaN(durationMinutes) ? null : durationMinutes * 60,
      feel: (feel !== null && feel >= 1 && feel <= 5) ? (feel as 1 | 2 | 3 | 4 | 5) : null,
      note,
      sync_source: 'manual',
      status: 'completed',
    })

  if (error) return { error: `Failed to log session: ${error.message}` }

  const { data: newSession } = await adminClient
    .from('sessions')
    .select('id')
    .eq('athlete_id', athleteId)
    .eq('coach_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (newSession?.id) {
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
  if (!user) return { error: 'Not authenticated' }

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

  if (error) return { error: error.message }
  revalidatePath(`/athletes/${athleteId}`)
  return { data }
}

export async function updateCoachNote(
  noteId: string,
  content: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await adminClient
    .from('coach_notes')
    .update({ content })
    .eq('id', noteId)
    .eq('coach_user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/athletes')
  return {}
}

export async function deleteCoachNote(
  noteId: string,
  athleteId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await adminClient
    .from('coach_notes')
    .delete()
    .eq('id', noteId)
    .eq('coach_user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath(`/athletes/${athleteId}`)
  return {}
}

export async function updateSessionFeel(
  sessionId: string,
  data: { feel: number | null; note: string | null }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await adminClient
    .from('sessions')
    .update({
      feel: data.feel as 1 | 2 | 3 | 4 | 5 | null,
      note: data.note,
    })
    .eq('id', sessionId)

  if (error) return { error: error.message }

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
  if (!user) return { error: 'Not authenticated' }

  const { error } = await adminClient
    .from('sessions')
    .update({
      date: data.date,
      distance_km: data.distance_km,
      duration_seconds: data.duration_seconds,
      feel: data.feel as 1 | 2 | 3 | 4 | 5 | null,
      note: data.note,
    })
    .eq('id', sessionId)
    .eq('coach_user_id', user.id)

  if (error) return { error: error.message }

  if (data.feel !== null && (data.feel === 1 || data.feel === 2)) {
    const { data: existing } = await adminClient
      .from('notifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'low_feel_alert')
      .contains('payload', { session_id: sessionId })
      .limit(1)

    if (!existing || existing.length === 0) {
      const { data: updatedSession } = await adminClient
        .from('sessions')
        .select('athlete_id, feel, athlete:athletes(name)')
        .eq('id', sessionId)
        .single()
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

  revalidatePath('/athletes')
  return {}
}
