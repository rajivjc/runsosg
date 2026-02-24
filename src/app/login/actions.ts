'use client'

import { createClient } from '@/lib/supabase/client'

export async function sendMagicLink(email: string): Promise<{ error: string | null }> {
  const supabase = createClient()

  const redirectTo = `${window.location.origin}/auth/callback`

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  })

  return { error: error ? 'Something went wrong. Please try again.' : null }
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
