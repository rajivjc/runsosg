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
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  // Verify caller is admin
  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role !== 'admin') return { error: 'Only admins can perform this action.' }

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
  if (inviteRowError) return { error: 'Could not create the invitation. The email may already be invited.' }

  // Send magic link via Supabase Auth admin
  const { error: emailError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  })
  if (emailError) return { error: 'Could not send the invitation email. Please check the email address and try again.' }

  revalidatePath('/admin')
  return { success: `Invitation sent to ${email}` }
}

export type ToggleActiveState = {
  error?: string
  success?: string
}

export async function toggleUserActive(
  userId: string,
  active: boolean
): Promise<ToggleActiveState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  // Prevent self-deactivation
  if (userId === user.id) return { error: 'You cannot deactivate your own account' }

  // Verify caller is admin
  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role !== 'admin') return { error: 'Only admins can perform this action.' }

  const { error } = await adminClient
    .from('users')
    .update({ active })
    .eq('id', userId)

  if (error) return { error: 'Could not update user status. Please try again.' }

  revalidatePath('/admin')
  return { success: active ? 'User reactivated' : 'User deactivated' }
}

export type CreateAthleteState = {
  error?: string
  success?: string
  athleteId?: string
}

export async function createAthlete(
  _prev: CreateAthleteState,
  formData: FormData
): Promise<CreateAthleteState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role !== 'admin') return { error: 'Only admins can perform this action.' }

  const name = (formData.get('name') as string ?? '').trim()
  if (!name) return { error: 'Name is required' }

  const date_of_birth = (formData.get('date_of_birth') as string ?? '').trim() || null
  const running_goal = (formData.get('running_goal') as string ?? '').trim() || null
  const communication_notes = (formData.get('communication_notes') as string ?? '').trim() || null
  const medical_notes = (formData.get('medical_notes') as string ?? '').trim() || null
  const emergency_contact = (formData.get('emergency_contact') as string ?? '').trim() || null

  const { data, error } = await adminClient
    .from('athletes')
    .insert({
      name,
      active: true,
      date_of_birth,
      running_goal,
      communication_notes,
      medical_notes,
      emergency_contact,
      caregiver_user_id: null,
      photo_url: null,
      joined_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) return { error: 'Could not create the athlete. Please try again.' }

  revalidatePath('/athletes')
  revalidatePath('/admin')
  return { success: 'Athlete created', athleteId: data.id }
}

export type ChangeRoleState = {
  error?: string
  success?: string
}

export async function changeUserRole(
  userId: string,
  newRole: 'coach' | 'caregiver' | 'admin',
  athleteId?: string
): Promise<ChangeRoleState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  // Prevent changing your own role
  if (userId === user.id) return { error: 'You cannot change your own role' }

  // Verify caller is admin
  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role !== 'admin') return { error: 'Only admins can perform this action.' }

  const { error } = await adminClient
    .from('users')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) return { error: 'Could not update the role. Please try again.' }

  // If changing to caregiver and athleteId provided, link them to the athlete
  if (newRole === 'caregiver' && athleteId) {
    await adminClient
      .from('athletes')
      .update({ caregiver_user_id: userId })
      .eq('id', athleteId)
  }

  revalidatePath('/admin')
  return { success: 'Role updated' }
}

export async function cancelInvitation(invitationId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role !== 'admin') return { error: 'Only admins can perform this action.' }

  const { error } = await adminClient
    .from('invitations')
    .delete()
    .eq('id', invitationId)

  if (error) return { error: 'Could not cancel the invitation. Please try again.' }

  revalidatePath('/admin')
  return {}
}

export async function deleteAthlete(athleteId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role !== 'admin') return { error: 'Only admins can perform this action.' }

  const { error } = await adminClient
    .from('athletes')
    .delete()
    .eq('id', athleteId)

  if (error) return { error: 'Could not delete the athlete. They may have linked data — try deactivating instead.' }

  revalidatePath('/athletes')
  revalidatePath('/admin')
  return {}
}
