import { adminClient } from '@/lib/supabase/admin'
import { refreshAccessToken } from './client'

export async function getValidAccessToken(coachUserId: string): Promise<string> {
  const { data: connection, error } = await adminClient
    .from('strava_connections')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', coachUserId)
    .single()

  if (error || !connection) {
    throw new Error(`No Strava connection found for user ${coachUserId}`)
  }

  const expiresAt = new Date(connection.token_expires_at).getTime()
  const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000

  if (expiresAt > fiveMinutesFromNow) {
    return connection.access_token
  }

  // Token needs refresh
  try {
    const tokens = await refreshAccessToken(connection.refresh_token)

    await adminClient
      .from('strava_connections')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(tokens.expires_at * 1000).toISOString(),
        last_sync_status: 'ok' as const,
        last_error: null,
      })
      .eq('user_id', coachUserId)

    return tokens.access_token
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    await adminClient
      .from('strava_connections')
      .update({
        last_sync_status: 'token_expired' as const,
        last_error: message,
      })
      .eq('user_id', coachUserId)

    await adminClient.from('notifications').insert({
      user_id: coachUserId,
      type: 'strava_disconnected' as const,
      channel: 'in_app' as const,
      payload: {
        message: 'Strava connection expired, please reconnect',
      },
      read: false,
    })

    throw err
  }
}
