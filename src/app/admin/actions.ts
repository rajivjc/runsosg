'use server'

import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { parseValidDate } from '@/lib/utils/dates'
import { sendEmail } from '@/lib/email/resend'
import { invitationEmail } from '@/lib/email/templates'

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
    .select('role, name')
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
  const { data: inviteRow, error: inviteRowError } = await adminClient
    .from('invitations')
    .insert({
      email,
      role,
      athlete_id: athleteId,
      invited_by: user.id,
      accepted_at: null,
    })
    .select('id')
    .single()
  if (inviteRowError) return { error: 'Could not create the invitation. The email may already be invited.' }

  // Create auth user without sending Supabase's built-in email
  const { error: createError } = await adminClient.auth.admin.createUser({
    email,
    email_confirm: true,
  })

  if (createError) {
    // Roll back the invitation row
    await adminClient.from('invitations').delete().eq('id', inviteRow.id)

    if (
      createError.message?.toLowerCase().includes('already been registered') ||
      createError.message?.toLowerCase().includes('already exists')
    ) {
      return { error: 'This email is already registered. They can sign in from the login page.' }
    }
    return { error: 'Could not create the user account. Please try again.' }
  }

  // Send branded invitation email via Resend
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`
  const emailResult = await sendEmail({
    to: email,
    subject: "You're invited to SOSG Running Club",
    html: invitationEmail({
      role,
      inviterName: callerUser?.name ?? null,
      loginUrl,
    }),
  })

  if (!emailResult.success) {
    console.error('[invite] Email send failed:', emailResult.error)
    revalidatePath('/admin')
    return {
      success: `Account created for ${email}, but the invitation email could not be sent. They can sign in at the login page.`,
    }
  }

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

  const dobRaw = (formData.get('date_of_birth') as string ?? '').trim()
  const date_of_birth = dobRaw ? parseValidDate(dobRaw) : null
  if (dobRaw && !date_of_birth) return { error: 'Date of birth must be a valid date (YYYY-MM-DD)' }
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

  // If changing AWAY from caregiver, clear any existing athlete link
  const { data: currentUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (currentUser?.role === 'caregiver' && newRole !== 'caregiver') {
    await adminClient
      .from('athletes')
      .update({ caregiver_user_id: null })
      .eq('caregiver_user_id', userId)
  }

  const { error } = await adminClient
    .from('users')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) return { error: 'Could not update the role. Please try again.' }

  // If changing to caregiver and athleteId provided, link them to the athlete
  if (newRole === 'caregiver' && athleteId) {
    // Clear any previous link this user had to a different athlete
    await adminClient
      .from('athletes')
      .update({ caregiver_user_id: null })
      .eq('caregiver_user_id', userId)

    const { error: linkError } = await adminClient
      .from('athletes')
      .update({ caregiver_user_id: userId })
      .eq('id', athleteId)

    if (linkError) return { error: 'Role updated but could not link to athlete. Please try again.' }
  }

  revalidatePath('/admin')
  revalidatePath('/feed')
  revalidatePath('/account')
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

  // Fetch the invitation to get the email before deleting
  const { data: invitation } = await adminClient
    .from('invitations')
    .select('email')
    .eq('id', invitationId)
    .single()

  if (!invitation) return { error: 'Invitation not found.' }

  // Delete the invitation row
  const { error } = await adminClient
    .from('invitations')
    .delete()
    .eq('id', invitationId)

  if (error) return { error: 'Could not cancel the invitation. Please try again.' }

  // Also delete the auth user created by createUser (if they never signed in)
  try {
    const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })
    const ghostUser = authUsers?.find(
      (u) => u.email === invitation.email && u.last_sign_in_at == null
    )
    if (ghostUser) {
      // Also clean up any users table row that may exist
      await adminClient.from('users').delete().eq('id', ghostUser.id)
      await adminClient.auth.admin.deleteUser(ghostUser.id)
    }
  } catch {
    // Auth user cleanup is best-effort — the invitation is already deleted
  }

  revalidatePath('/admin')
  return {}
}

export async function deleteUser(userId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  if (userId === user.id) return { error: 'You cannot delete your own account.' }

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role !== 'admin') return { error: 'Only admins can perform this action.' }

  // Look up the user's email so we can clean up invitations
  const { data: { user: targetUser } } = await adminClient.auth.admin.getUserById(userId)
  const targetEmail = targetUser?.email

  // Delete matching invitation rows
  if (targetEmail) {
    await adminClient.from('invitations').delete().eq('email', targetEmail)
  }

  // Delete from auth.users — cascades to users table
  const { error } = await adminClient.auth.admin.deleteUser(userId)
  if (error) return { error: 'Could not delete the user. Please try again.' }

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
