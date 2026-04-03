import { type NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { adminClient } from '@/lib/supabase/admin'
import { processStravaActivity } from '@/lib/strava/sync'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

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
  // Rate limit: 120 requests per minute per IP
  const ip = getClientIp(request)
  const rl = checkRateLimit(`strava-webhook:${ip}`, 120, 60)
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

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
          const coachId = connection.user_id

          // ── §5.4 Compliance: Delete Strava Personal Data ──────────────

          let photosDeleted = 0
          let photosFailed = 0
          let sessionsAffected = 0

          // 1. Find Strava-sourced media and hard-delete from Storage
          try {
            const { data: stravaMedia } = await adminClient
              .from('media')
              .select('id, storage_path')
              .eq('uploaded_by', coachId)
              .in('source', ['strava', 'strava_archived'])

            if (stravaMedia && stravaMedia.length > 0) {
              // Delete files from Supabase Storage
              const storagePaths = stravaMedia
                .map((m) => m.storage_path)
                .filter((p): p is string => p !== null)

              if (storagePaths.length > 0) {
                const { data: removed, error: storageError } = await adminClient.storage
                  .from('athlete-media')
                  .remove(storagePaths)

                if (storageError) {
                  console.warn('Strava deauth: Storage bulk delete error:', storageError.message)
                  // Count individually — some may have already been deleted
                  photosFailed = storagePaths.length
                } else {
                  photosDeleted = removed?.length ?? 0
                  photosFailed = storagePaths.length - photosDeleted
                }
              }

              // Delete media DB rows
              const mediaIds = stravaMedia.map((m) => m.id)
              await adminClient
                .from('media')
                .delete()
                .in('id', mediaIds)
            }
          } catch (err: unknown) {
            console.error('Strava deauth: media deletion error:', err instanceof Error ? err.message : err)
          }

          // 2. Null out Strava personal data fields on sessions
          try {
            // Count affected rows first (update doesn't return count reliably)
            const { count: matchedCount } = await adminClient
              .from('sessions')
              .select('*', { count: 'exact', head: true })
              .eq('coach_user_id', coachId)
              .eq('sync_source', 'strava_webhook')
              .not('strava_activity_id', 'is', null)

            sessionsAffected = matchedCount ?? 0

            if (sessionsAffected > 0) {
              await adminClient
                .from('sessions')
                .update({
                  map_polyline: null,
                  strava_title: null,
                  avg_heart_rate: null,
                  max_heart_rate: null,
                  strava_activity_id: null,
                })
                .eq('coach_user_id', coachId)
                .eq('sync_source', 'strava_webhook')
                .not('strava_activity_id', 'is', null)
            }
          } catch (err: unknown) {
            console.error('Strava deauth: session nulling error:', err instanceof Error ? err.message : err)
          }

          // 3. Delete the connection (idempotent — no-op if already gone)
          await adminClient
            .from('strava_connections')
            .delete()
            .eq('user_id', coachId)

          // 4. Write deletion audit log
          try {
            await adminClient.from('strava_deletion_audit').insert({
              coach_id: coachId,
              sessions_affected: sessionsAffected,
              photos_deleted: photosDeleted,
              photos_failed: photosFailed,
              triggered_by: 'strava_deauth_webhook',
            })
          } catch (err: unknown) {
            console.error('Strava deauth: audit log error:', err instanceof Error ? err.message : err)
          }

          // 5. Notify the coach
          await adminClient.from('notifications').insert({
            user_id: coachId,
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
