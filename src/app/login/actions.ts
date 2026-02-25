'use client'

import { createClient } from '@/lib/supabase/client'

export async function sendMagicLink(
  email: string
): Promise<{ error: string | null; rateLimited?: boolean }> {
  const supabase = createClient()

  const redirectTo = `${window.location.origin}/auth/callback`

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  })

  if (!error) return { error: null }

  if (error.status === 429 || error.message?.toLowerCase().includes('rate limit')) {
    return {
      error: 'Too many requests. Please wait a few minutes before trying again.',
      rateLimited: true,
    }
  }

  return { error: 'Something went wrong. Please try again.' }
}

export async function verifyOtpCode(
  email: string,
  token: string
): Promise<{ error: string | null }> {
  const supabase = createClient()

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })

  return { error: error ? 'Invalid or expired code. Please try again.' : null }
}
