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
