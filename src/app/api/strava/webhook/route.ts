import { type NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
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

  // ── Handle athlete deauthorization ───────────────────────────────────────────
  if (object_type === 'athlete' && aspect_type === 'update') {
    const updates = body.updates as Record<string, string> | undefined
    if (updates?.authorized === 'false') {
      try {
        const { data: connection } = await adminClient
          .from('strava_connections')
          .select('user_id')
          .eq('strava_athlete_id', owner_id)
          .single()

        if (connection) {
          // Mark Strava-sourced photos as archived (keep files, they belong to athlete stories)
          await adminClient
            .from('media')
            .update({ source: 'strava_archived' })
            .eq('uploaded_by', connection.user_id)
            .eq('source', 'strava')

          // Delete the connection
          await adminClient
            .from('strava_connections')
            .delete()
            .eq('user_id', connection.user_id)

          // Notify the coach
          await adminClient.from('notifications').insert({
            user_id: connection.user_id,
            type: 'strava_disconnected' as const,
            channel: 'in_app' as const,
            payload: {
              message: 'Your Strava account has been disconnected. Reconnect to resume auto-syncing runs.',
            },
            read: false,
          })

          revalidatePath('/account')
        }
      } catch (err: unknown) {
        console.error('Deauth error:', err instanceof Error ? err.message : err)
      }
    }
    return NextResponse.json({ ok: true })
  }

  // ── Handle activity events ──────────────────────────────────────────────────
  if (object_type !== 'activity') {
    return NextResponse.json({ ok: true })
  }

  if (!['create', 'update', 'delete'].includes(aspect_type)) {
    return NextResponse.json({ ok: true })
  }

  if (typeof object_id !== 'number' || !Number.isFinite(object_id) || !Number.isInteger(object_id) || object_id <= 0) {
    return NextResponse.json({ ok: true })
  }

  if (typeof owner_id !== 'number' || !Number.isFinite(owner_id) || !Number.isInteger(owner_id) || owner_id <= 0) {
    return NextResponse.json({ ok: true })
  }

  const { data: connection } = await adminClient
    .from('strava_connections')
    .select('user_id')
    .eq('strava_athlete_id', owner_id)
    .single()

  if (!connection) {
    console.warn('Strava webhook: no connection found for owner_id=%d, activity=%d', Number(owner_id), Number(object_id))
    return NextResponse.json({ ok: true })
  }

  try {
    await processStravaActivity(
      object_id,
      connection.user_id,
      aspect_type as 'create' | 'update' | 'delete',
      body as object
    )

    // Invalidate cached pages so new sessions, notifications, and
    // badge counts appear without a manual refresh
    revalidatePath('/feed')
    revalidatePath('/notifications')
    revalidatePath('/athletes')
    revalidatePath('/account')
  } catch (err: unknown) {
    console.error('Sync error:', err instanceof Error ? err.message : err)
  }

  return NextResponse.json({ ok: true })
}
