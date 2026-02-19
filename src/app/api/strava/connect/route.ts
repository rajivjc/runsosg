import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStravaAuthUrl } from '@/lib/strava/client'

export async function GET(): Promise<Response> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const authUrl = getStravaAuthUrl()
  return NextResponse.redirect(authUrl)
}
