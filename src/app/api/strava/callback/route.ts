import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { exchangeCodeForTokens, verifyStravaState } from '@/lib/strava/client'

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')

  if (error) {
    return NextResponse.redirect(
      new URL('/strava/connected?error=denied', request.nextUrl.origin)
    )
  }

  // Resolve user ID: try cookie-based auth first, fall back to signed state.
  // The state fallback is critical for PWA flow where the Strava app redirects
  // back to the browser which may not have the user's auth cookies.
  let userId: string | null = null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    userId = user.id
  }

  if (!userId && state) {
    userId = verifyStravaState(state)
  }

  if (!userId) {
    return NextResponse.redirect(
      new URL('/login', request.nextUrl.origin)
    )
  }

  const tokens = await exchangeCodeForTokens(code ?? '')

  await adminClient.from('strava_connections').upsert(
    {
      user_id: userId,
      strava_athlete_id: tokens.athlete.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(tokens.expires_at * 1000).toISOString(),
      last_sync_at: null,
      last_sync_status: 'ok' as const,
      last_error: null,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  return NextResponse.redirect(
    new URL('/strava/connected', request.nextUrl.origin)
  )
}
