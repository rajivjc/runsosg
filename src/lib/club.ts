import { adminClient } from '@/lib/supabase/admin'
import type { Club } from '@/lib/supabase/types'

let cachedClub: Club | null = null

/**
 * Fetch the club configuration. Single source of truth for club name,
 * timezone, locale, tagline, and all club-level settings.
 *
 * Uses a module-level cache that resets per serverless invocation
 * (Next.js Server Components run in fresh module scope per request in production).
 *
 * For multi-tenancy (future): accept an optional clubId parameter.
 */
export async function getClub(): Promise<Club> {
  if (cachedClub) return cachedClub

  const { data, error } = await adminClient
    .from('clubs')
    .select('*')
    .limit(1)
    .single()

  if (error || !data) {
    throw new Error('Failed to load club settings')
  }

  cachedClub = data
  return data
}

/**
 * Reset the cache. Call this after updating club settings
 * so the next getClub() call fetches fresh data.
 */
export function resetClubCache(): void {
  cachedClub = null
}
