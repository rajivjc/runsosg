'use server'

import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

/**
 * Verify OTP and determine redirect path in a single server action.
 * This avoids the race condition where the browser client sets auth cookies
 * asynchronously after verifyOtp resolves, but the server action to get the
 * redirect path fires before those cookies are available.
 */
export async function verifyOtpAndRedirect(
  email: string,
  token: string
): Promise<{ error: string | null; redirectPath: string }> {
  const supabase = await createClient()

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })

  if (error) {
    return { error: 'Invalid or expired code. Please try again.', redirectPath: '' }
  }

  // Session is now established on the server client — cookies are set in the response.
  // Determine redirect path using the same authenticated session.
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: null, redirectPath: '/login?error=auth' }

  const { data: userRow } = await adminClient
    .from('users')
    .select('role, name, active')
    .eq('id', user.id)
    .single()

  // Block login for deactivated or unknown users
  if (!userRow || userRow.active === false) {
    await supabase.auth.signOut()
    return { error: null, redirectPath: '/login?error=revoked' }
  }

  const role = userRow?.role

  if (role === 'caregiver') {
    const { data: invitation } = await adminClient
      .from('invitations')
      .select('athlete_id')
      .eq('email', user.email ?? '')
      .not('athlete_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (invitation?.athlete_id) {
      await adminClient
        .from('athletes')
        .update({ caregiver_user_id: user.id })
        .eq('id', invitation.athlete_id)
        .is('caregiver_user_id', null)

      return { error: null, redirectPath: `/athletes/${invitation.athlete_id}` }
    }
  }

  return { error: null, redirectPath: '/feed' }
}
