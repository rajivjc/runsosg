import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStravaAuthUrl } from '@/lib/strava/client'

export async function GET(request: NextRequest): Promise<Response> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Only use the Strava mobile OAuth endpoint (opens Strava app) when
  // explicitly requested by PWA installs. Mobile browsers use regular
  // web OAuth which stays in the same tab.
  const isPwa = request.nextUrl.searchParams.get('pwa') === '1'
  const authUrl = getStravaAuthUrl(user.id, isPwa)

  // Return JSON when requested — allows client-side navigation which
  // lets the OS intercept with app links / universal links (opens Strava app)
  if (request.nextUrl.searchParams.get('json') === '1') {
    return NextResponse.json({ url: authUrl })
  }

  return NextResponse.redirect(authUrl)
}
