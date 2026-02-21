'use server'

import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type InviteFormState = {
  error?: string
  success?: string
}

export async function inviteUser(
  _prev: InviteFormState,
  formData: FormData
): Promise<InviteFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify caller is admin
  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role !== 'admin') return { error: 'Not authorised' }

  const email = (formData.get('email') as string ?? '').trim().toLowerCase()
  const role = formData.get('role') as 'coach' | 'caregiver' | 'admin'
  const athleteId = (formData.get('athlete_id') as string ?? '').trim() || null

  if (!email) return { error: 'Email is required' }
  if (!['coach', 'caregiver', 'admin'].includes(role)) return { error: 'Invalid role' }
  if (role === 'caregiver' && !athleteId) return { error: 'Caregiver invitations require an athlete' }

  // Insert invitation row
  const { error: inviteRowError } = await adminClient
    .from('invitations')
    .insert({
      email,
      role,
      athlete_id: athleteId,
      invited_by: user.id,
      accepted_at: null,
    })
  if (inviteRowError) return { error: `Failed to create invitation: ${inviteRowError.message}` }

  // Send magic link via Supabase Auth admin
  const { error: emailError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  })
  if (emailError) return { error: `Failed to send invitation email: ${emailError.message}` }

  revalidatePath('/admin')
  return { success: `Invitation sent to ${email}` }
}
