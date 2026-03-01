import { adminClient } from '@/lib/supabase/admin'

const SIGNED_URL_EXPIRY = 3600 // 1 hour

export type MediaRow = {
  id: string
  athlete_id: string
  session_id: string | null
  url: string
  caption: string | null
  created_at: string
  source: string | null
  storage_path: string | null
  signed_url?: string
}

/**
 * Generate a signed URL for a private storage object.
 * Returns the original url if storage_path is null (external URL like Strava CDN).
 */
export async function getSignedUrl(storagePath: string | null, fallbackUrl: string): Promise<string> {
  if (!storagePath) return fallbackUrl

  const { data, error } = await adminClient.storage
    .from('athlete-media')
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY)

  if (error || !data?.signedUrl) return fallbackUrl
  return data.signedUrl
}

/**
 * Generate signed URLs for multiple storage objects in batch.
 */
export async function getSignedUrls(
  items: { storagePath: string | null; fallbackUrl: string }[]
): Promise<string[]> {
  const pathsToSign = items
    .map((item, idx) => ({ path: item.storagePath, idx }))
    .filter((p): p is { path: string; idx: number } => p.path !== null)

  if (pathsToSign.length === 0) {
    return items.map(item => item.fallbackUrl)
  }

  const { data: signedData } = await adminClient.storage
    .from('athlete-media')
    .createSignedUrls(
      pathsToSign.map(p => p.path),
      SIGNED_URL_EXPIRY
    )

  const results = items.map(item => item.fallbackUrl)
  if (signedData) {
    for (let i = 0; i < signedData.length; i++) {
      const signed = signedData[i]
      if (signed?.signedUrl) {
        results[pathsToSign[i].idx] = signed.signedUrl
      }
    }
  }

  return results
}

/**
 * Get all photos for a session.
 */
export async function getSessionPhotos(sessionId: string): Promise<MediaRow[]> {
  const { data } = await adminClient
    .from('media')
    .select('id, athlete_id, session_id, url, caption, created_at, source, storage_path')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  return (data ?? []) as MediaRow[]
}

/**
 * Get all photos for an athlete (album view).
 */
export async function getAthletePhotos(athleteId: string, limit = 50): Promise<MediaRow[]> {
  const { data } = await adminClient
    .from('media')
    .select('id, athlete_id, session_id, url, caption, created_at, source, storage_path')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []) as MediaRow[]
}

/**
 * Get paginated photos for an athlete (cursor-based, for infinite scroll).
 * Returns photos older than the cursor (created_at).
 */
export async function getAthletePhotosPaginated(
  athleteId: string,
  pageSize = 24,
  cursor?: string
): Promise<{ photos: MediaRow[]; nextCursor: string | null }> {
  let query = adminClient
    .from('media')
    .select('id, athlete_id, session_id, url, caption, created_at, source, storage_path')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false })
    .limit(pageSize + 1) // fetch one extra to know if there are more

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data } = await query
  const rows = (data ?? []) as MediaRow[]

  const hasMore = rows.length > pageSize
  const photos = hasMore ? rows.slice(0, pageSize) : rows
  const nextCursor = hasMore ? photos[photos.length - 1].created_at : null

  return { photos, nextCursor }
}

/**
 * Get total photo count for an athlete (for display purposes).
 */
export async function getAthletePhotoCount(athleteId: string): Promise<number> {
  const { count } = await adminClient
    .from('media')
    .select('id', { count: 'exact', head: true })
    .eq('athlete_id', athleteId)

  return count ?? 0
}

/**
 * Get the best hero photo for an athlete (most recent session with feel >= 4, or just most recent).
 */
export async function getHeroPhoto(athleteId: string): Promise<MediaRow | null> {
  // Try to find a photo from a high-feel session first
  const { data: highFeel } = await adminClient
    .from('media')
    .select('id, athlete_id, session_id, url, caption, created_at, source, storage_path, sessions!inner(feel)')
    .eq('athlete_id', athleteId)
    .gte('sessions.feel', 4)
    .order('created_at', { ascending: false })
    .limit(1)

  if (highFeel && highFeel.length > 0) {
    return highFeel[0] as unknown as MediaRow
  }

  // Fall back to most recent photo
  const { data: recent } = await adminClient
    .from('media')
    .select('id, athlete_id, session_id, url, caption, created_at, source, storage_path')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false })
    .limit(1)

  return (recent?.[0] as MediaRow) ?? null
}

/**
 * Enrich media rows with signed URLs.
 */
export async function withSignedUrls(photos: MediaRow[]): Promise<(MediaRow & { signed_url: string })[]> {
  if (photos.length === 0) return []

  const urls = await getSignedUrls(
    photos.map(p => ({ storagePath: p.storage_path, fallbackUrl: p.url }))
  )

  return photos.map((p, i) => ({ ...p, signed_url: urls[i] }))
}
