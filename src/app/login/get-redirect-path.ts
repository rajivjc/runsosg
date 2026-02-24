'use server'

import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

/**
 * After OTP verification, determine where to redirect the user based on role.
 * Mirrors the logic in /auth/callback/route.ts.
 */
export async function getRedirectPath(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return '/login?error=auth'

  const { data: userRow } = await adminClient
    .from('users')
    .select('role, name')
    .eq('id', user.id)
    .single()

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

      return `/athletes/${invitation.athlete_id}`
    }
  }

  return '/feed'
}
