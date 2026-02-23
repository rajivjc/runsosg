'use server'

import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function toggleKudos(sessionId: string): Promise<{ given: boolean; count: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { given: false, count: 0, error: 'Not authenticated' }

  // Check if already given
  const { data: existing } = await adminClient
    .from('kudos')
    .select('id')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    // Remove kudos
    await adminClient
      .from('kudos')
      .delete()
      .eq('id', existing.id)
  } else {
    // Give kudos
    await adminClient
      .from('kudos')
      .insert({ session_id: sessionId, user_id: user.id })
  }

  // Get updated count
  const { count } = await adminClient
    .from('kudos')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)

  revalidatePath('/feed')
  return { given: !existing, count: count ?? 0 }
}
