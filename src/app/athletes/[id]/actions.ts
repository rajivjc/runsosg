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
