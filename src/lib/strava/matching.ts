import { adminClient } from '@/lib/supabase/admin'
import { getClub } from '@/lib/club'
import type { StravaActivity } from './client'

export interface AthleteMatch {
  athleteId: string
  athleteName: string
  method: 'hashtag' | 'manual_review'
  confidence: 'high' | 'manual'
  identifier: string
}

export interface MatchResult {
  matched: boolean
  athletes: AthleteMatch[]
  ambiguousIdentifiers: string[]
}

/**
 * Extract athlete identifiers from activity text.
 *
 * Supports two patterns:
 *   1. #<prefix> <name>  — captures everything after the prefix until the next # or end of string
 *   2. #<name>           — any plain hashtag that isn't the prefix itself
 *
 * @param text    Activity title/description to parse
 * @param prefix  Club hashtag prefix, e.g. '#SOSG' or '#SUNBEAM'
 *
 * Examples:
 *   "Morning run #sosg Alex Tan"          → ["Alex Tan"]
 *   "Run with #Daniel #Ben"               → ["Daniel", "Ben"]
 *   "#sosg Daniel #sosg Ben"              → ["Daniel", "Ben"]
 *   "#sosg Alex Tan #Ben"                 → ["Alex Tan", "Ben"]
 */
export function extractIdentifiers(text: string, prefix: string): string[] {
  // Escape special regex characters in the prefix, strip leading # if present
  const cleanPrefix = prefix.replace(/^#/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  const identifiers: string[] = []

  // Pattern 1: #<prefix> <name> — greedy capture until next # or end of string
  const prefixPattern = new RegExp(`(?:#${cleanPrefix}|${cleanPrefix})\\s+([^#]+)`, 'gi')
  let match: RegExpExecArray | null
  while ((match = prefixPattern.exec(text)) !== null) {
    const name = match[1].trim()
    if (name.length > 0) {
      identifiers.push(name)
    }
  }

  // Pattern 2: plain #<name> — any hashtag that isn't the prefix
  // Supports hyphens, apostrophes, and Unicode letters (e.g. #Wei-Lin, #O'Brien, #José)
  // Remove all #<prefix>... segments first so we don't double-match
  const removePrefixPattern = new RegExp(`(?:#${cleanPrefix}|${cleanPrefix})\\s*[^#]*`, 'gi')
  const withoutPrefix = text.replace(removePrefixPattern, '')
  const plainPattern = /#([\p{L}][\p{L}\p{N}'\u2019-]*)/gu
  while ((match = plainPattern.exec(withoutPrefix)) !== null) {
    // Skip if the captured word is the prefix itself (standalone #prefix with no name)
    if (match[1].toLowerCase() === cleanPrefix.toLowerCase()) continue
    // Strip trailing hyphens/apostrophes from the match
    const cleaned = match[1].replace(/[-'\u2019]+$/, '')
    if (cleaned.length > 0) identifiers.push(cleaned)
  }

  return identifiers
}

/**
 * Match a single identifier string against active athletes.
 * For multi-word identifiers (e.g. "Alex Tan"), every word must appear in the name.
 * Returns the matched athletes array (0, 1, or many).
 */
async function findAthletesByIdentifier(
  identifier: string
): Promise<Array<{ id: string; name: string }>> {
  const words = identifier
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}'-]/gu, ''))
    .filter((w) => w.length > 0)

  if (words.length === 0) return []

  // Start with a query filtering on the first word, then narrow in code
  let query = adminClient.from('athletes').select('id, name').eq('active', true)
  for (const word of words) {
    query = query.ilike('name', `%${word}%`)
  }

  const { data: athletes } = await query
  return athletes ?? []
}

export async function matchActivityToAthlete(
  activity: StravaActivity,
  _coachUserId: string
): Promise<MatchResult> {
  const club = await getClub()
  const prefix = club.strava_hashtag_prefix ?? '#SOSG'
  const combined = [activity.name, activity.description ?? ''].join(' ')
  const identifiers = extractIdentifiers(combined, prefix)

  if (identifiers.length === 0) {
    return { matched: false, athletes: [], ambiguousIdentifiers: [] }
  }

  // Look up all identifiers in parallel instead of sequentially
  const lookupResults = await Promise.all(
    identifiers.map(async (identifier) => ({
      identifier,
      found: await findAthletesByIdentifier(identifier),
    }))
  )

  const athletes: AthleteMatch[] = []
  const ambiguousIdentifiers: string[] = []
  const seenAthleteIds = new Set<string>()

  for (const { identifier, found } of lookupResults) {
    if (found.length === 1 && !seenAthleteIds.has(found[0].id)) {
      seenAthleteIds.add(found[0].id)
      athletes.push({
        athleteId: found[0].id,
        athleteName: found[0].name,
        method: 'hashtag',
        confidence: 'high',
        identifier,
      })
    } else if (found.length > 1) {
      ambiguousIdentifiers.push(identifier)
    }
    // found.length === 0 → silently skip (no athlete with that name)
  }

  return {
    matched: athletes.length > 0,
    athletes,
    ambiguousIdentifiers,
  }
}
