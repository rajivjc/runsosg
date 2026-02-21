import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { exchangeCodeForTokens } from '@/lib/strava/client'

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL('/athletes?error=strava_denied', request.nextUrl.origin)
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(
      new URL('/login', request.nextUrl.origin)
    )
  }

  const tokens = await exchangeCodeForTokens(code ?? '')

  await adminClient.from('strava_connections').upsert(
    {
      user_id: user.id,
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
    new URL('/account?connected=strava', request.nextUrl.origin)
  )
}
