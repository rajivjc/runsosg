import { type NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { processStravaActivity } from '@/lib/strava/sync'

// ── GET — Strava webhook subscription verification ────────────────────────────

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = request.nextUrl
  const verifyToken = searchParams.get('hub.verify_token')
  const hubChallenge = searchParams.get('hub.challenge')

  if (verifyToken !== process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return new Response('Forbidden', { status: 403 })
  }

  return NextResponse.json({ 'hub.challenge': hubChallenge })
}

// ── POST — Receive activity events ────────────────────────────────────────────

interface StravaWebhookBody {
  object_type: string
  object_id: number
  owner_id: number
  aspect_type: string
  [key: string]: unknown
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: StravaWebhookBody

  try {
    body = (await request.json()) as StravaWebhookBody
  } catch {
    return NextResponse.json({ ok: true })
  }

  const { object_type, object_id, owner_id, aspect_type } = body

  if (object_type !== 'activity') {
    return NextResponse.json({ ok: true })
  }

  if (!['create', 'update', 'delete'].includes(aspect_type)) {
    return NextResponse.json({ ok: true })
  }

  const { data: connection } = await adminClient
    .from('strava_connections')
    .select('user_id')
    .eq('strava_athlete_id', owner_id)
    .single()

  if (!connection) {
    return NextResponse.json({ ok: true })
  }

  try {
    await processStravaActivity(
      object_id,
      connection.user_id,
      aspect_type as 'create' | 'update' | 'delete',
      body as object
    )
  } catch (err: unknown) {
    console.error('Sync error:', err instanceof Error ? err.message : err)
  }

  return NextResponse.json({ ok: true })
}
