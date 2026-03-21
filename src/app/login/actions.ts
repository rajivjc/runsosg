'use server'

import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

export async function sendMagicLink(
  email: string,
  origin: string
): Promise<{ error: string | null; rateLimited?: boolean; notFound?: boolean }> {
  // Rate limit: 5 attempts per email per minute
  const rl = checkRateLimit(`login:${email.toLowerCase()}`, 5, 60)
  if (!rl.success) {
    return {
      error: 'Too many requests. Please wait a few minutes before trying again.',
      rateLimited: true,
    }
  }

  // Check if user exists and is active before sending OTP
  const { data: authUsers } = await adminClient.auth.admin.listUsers()
  const authUser = authUsers?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  )

  if (!authUser) {
    return {
      error: 'No account found for this email. Please contact your administrator to get an invitation.',
      notFound: true,
    }
  }

  // Check active flag in our users table
  const { data: userRow } = await adminClient
    .from('users')
    .select('active')
    .eq('id', authUser.id)
    .single()

  if (!userRow || userRow.active === false) {
    return {
      error: 'No account found for this email. Please contact your administrator to get an invitation.',
      notFound: true,
    }
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

  // signInWithOtp with shouldCreateUser:false returns an error if user doesn't exist
  // in Supabase auth. Show the same not-found message for consistency.
  if (error.message?.toLowerCase().includes('signups not allowed') ||
      error.message?.toLowerCase().includes('user not found')) {
    return {
      error: 'No account found for this email. Please contact your administrator to get an invitation.',
      notFound: true,
    }
  }

  return { error: 'Something went wrong. Please try again.' }
}
