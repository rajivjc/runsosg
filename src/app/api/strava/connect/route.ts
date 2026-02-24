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

  const isMobile = request.nextUrl.searchParams.get('mobile') === '1'
  const authUrl = getStravaAuthUrl(isMobile)

  // Return JSON when requested — allows client-side navigation which
  // lets the OS intercept the URL with app links / universal links
  if (request.nextUrl.searchParams.get('json') === '1') {
    return NextResponse.json({ url: authUrl })
  }

  return NextResponse.redirect(authUrl)
}
