import { type NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
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

  // The state parameter is always included in our OAuth URLs and contains
  // an HMAC-signed user ID + timestamp. Verify it as the primary auth check.
  // This works regardless of whether the callback lands in the browser
  // (which has cookie auth) or a different context (PWA flow via Strava app).
  if (!state) {
    return NextResponse.redirect(
      new URL('/login', request.nextUrl.origin)
    )
  }

  const userId = verifyStravaState(state)
  if (!userId) {
    return NextResponse.redirect(
      new URL('/login', request.nextUrl.origin)
    )
  }

  // If cookie-based auth is available, cross-check it matches the state.
  // Prevents using a state token intended for a different user.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user && user.id !== userId) {
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

  // Invalidate cached pages that display Strava connection status
  revalidatePath('/account')
  revalidatePath('/athletes')
  revalidatePath('/feed')

  return NextResponse.redirect(
    new URL('/strava/connected', request.nextUrl.origin)
  )
}
