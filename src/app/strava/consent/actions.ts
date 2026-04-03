'use server'

import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function logStravaConsent() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  await adminClient.from('strava_consent_log').insert({
    coach_id: user.id,
    consent_version: '2025-10-09',
  })

  redirect('/api/strava/connect')
}
