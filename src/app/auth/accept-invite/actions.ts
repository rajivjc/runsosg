'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export async function acceptInvite(token: string) {
  // Look up invitation by token
  const { data: invitation, error: lookupError } = await adminClient
    .from('invitations')
    .select('id, email, role, athlete_id, accepted_at, expires_at')
    .eq('token', token)
    .single()

  if (lookupError || !invitation) {
    redirect('/login?error=invalid-invite')
  }

  if (invitation.accepted_at) {
    redirect(`/login?email=${encodeURIComponent(invitation.email)}`)
  }

  if (new Date(invitation.expires_at) < new Date()) {
    redirect(
      `/login?email=${encodeURIComponent(invitation.email)}&expired=true`
    )
  }

  // Generate a magic link server-side and verify it to create a session
  const { data: linkData, error: linkError } =
    await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: invitation.email,
    })

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error('[accept-invite] Failed to generate magic link:', linkError)
    redirect(`/login?email=${encodeURIComponent(invitation.email)}`)
  }

  // Verify the OTP server-side to establish session cookies
  const supabase = await createClient()
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  })

  if (verifyError) {
    console.error('[accept-invite] Failed to verify OTP:', verifyError)
    redirect(`/login?email=${encodeURIComponent(invitation.email)}`)
  }

  // Mark invitation as accepted
  await adminClient
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  // For caregivers, link them to their athlete
  if (invitation.role === 'caregiver' && invitation.athlete_id) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      await adminClient
        .from('athletes')
        .update({ caregiver_user_id: user.id })
        .eq('id', invitation.athlete_id)
        .is('caregiver_user_id', null)
    }
  }

  redirect('/welcome')
}
