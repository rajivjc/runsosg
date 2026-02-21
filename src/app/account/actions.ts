'use server'

import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function disconnectStrava() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await adminClient
    .from('strava_connections')
    .delete()
    .eq('user_id', user.id)

  redirect('/account')
}

export async function updateDisplayName(
  _prevState: { error?: string; success?: string },
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = (formData.get('name') as string ?? '').trim()
  if (!name) return { error: 'Name is required' }

  const { error } = await adminClient
    .from('users')
    .update({ name })
    .eq('id', user.id)

  if (error) return { error: `Failed to update name: ${error.message}` }

  revalidatePath('/account')
  return { success: 'Name updated' }
}
