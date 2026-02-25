'use server'

import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export async function sendMagicLink(
  email: string,
  origin: string
): Promise<{ error: string | null; rateLimited?: boolean }> {
  // Check if user exists and is active before sending OTP
  const { data: authUsers } = await adminClient.auth.admin.listUsers()
  const authUser = authUsers?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  )

  if (!authUser) {
    // Don't reveal whether the email exists — show generic success
    return { error: null }
  }

  // Check active flag in our users table
  const { data: userRow } = await adminClient
    .from('users')
    .select('active')
    .eq('id', authUser.id)
    .single()

  if (userRow?.active === false) {
    // Don't reveal the account is deactivated — show generic success
    return { error: null }
  }

  const supabase = await createClient()

  const redirectTo = `${origin}/auth/callback`

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: false,
    },
  })

  if (!error) return { error: null }

  if (error.status === 429 || error.message?.toLowerCase().includes('rate limit')) {
    return {
      error: 'Too many requests. Please wait a few minutes before trying again.',
      rateLimited: true,
    }
  }

  // signInWithOtp with shouldCreateUser:false returns an error if user doesn't exist.
  // Swallow it silently so we don't reveal account existence.
  if (error.message?.toLowerCase().includes('signups not allowed') ||
      error.message?.toLowerCase().includes('user not found')) {
    return { error: null }
  }

  return { error: 'Something went wrong. Please try again.' }
}
