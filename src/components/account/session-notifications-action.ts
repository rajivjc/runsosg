'use server'

import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function toggleSessionNotifications(
  enabled: boolean
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await adminClient
    .from('users')
    .update({ session_notifications: enabled })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/account')
  return { success: true }
}
