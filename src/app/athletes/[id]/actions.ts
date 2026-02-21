'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addCoachNote(athleteId: string, content: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('coach_notes').insert({
    athlete_id: athleteId,
    coach_user_id: user?.id ?? null,
    content,
    note_type: 'general',
    visibility: 'all',
  })
  revalidatePath(`/athletes/${athleteId}`)
}

export async function updateAthlete(
  athleteId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = (formData.get('name') as string ?? '').trim()
  if (!name) return { error: 'Name is required' }

  const date_of_birth = (formData.get('date_of_birth') as string ?? '').trim() || null
  const running_goal = (formData.get('running_goal') as string ?? '').trim() || null
  const communication_notes = (formData.get('communication_notes') as string ?? '').trim() || null
  const medical_notes = (formData.get('medical_notes') as string ?? '').trim() || null
  const emergency_contact = (formData.get('emergency_contact') as string ?? '').trim() || null

  const { error } = await supabase
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
