import { adminClient } from '@/lib/supabase/admin'
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
 *   1. #sosg <name>  — captures everything after #sosg until the next # or end of string
 *   2. #<name>       — any plain hashtag that isn't #sosg itself
 *
 * Examples:
 *   "Morning run #sosg Alex Tan"          → ["Alex Tan"]
 *   "Run with #Daniel #Ben"               → ["Daniel", "Ben"]
 *   "#sosg Daniel #sosg Ben"              → ["Daniel", "Ben"]
 *   "#sosg Alex Tan #Ben"                 → ["Alex Tan", "Ben"]
 */
export function extractIdentifiers(text: string): string[] {
  const identifiers: string[] = []

  // Pattern 1: #sosg <name> — greedy capture until next # or end of string
  const sosgPattern = /(?:#sosg|sosg)\s+([^#]+)/gi
  let match: RegExpExecArray | null
  while ((match = sosgPattern.exec(text)) !== null) {
    const name = match[1].trim()
    if (name.length > 0) {
      identifiers.push(name)
    }
  }

  // Pattern 2: plain #<name> — any hashtag that isn't #sosg
  // Supports hyphens, apostrophes, and Unicode letters (e.g. #Wei-Lin, #O'Brien, #José)
  // Remove all #sosg... segments first so we don't double-match
  const withoutSosg = text.replace(/(?:#sosg|sosg)\s*[^#]*/gi, '')
  const plainPattern = /#([\p{L}][\p{L}\p{N}'\u2019-]*)/gu
  while ((match = plainPattern.exec(withoutSosg)) !== null) {
    // Skip if the captured word is "sosg" (standalone #sosg with no name)
    if (match[1].toLowerCase() === 'sosg') continue
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
  const combined = [activity.name, activity.description ?? ''].join(' ')
  const identifiers = extractIdentifiers(combined)

  if (identifiers.length === 0) {
    return { matched: false, athletes: [], ambiguousIdentifiers: [] }
  }

  const athletes: AthleteMatch[] = []
  const ambiguousIdentifiers: string[] = []
  const seenAthleteIds = new Set<string>()

  for (const identifier of identifiers) {
    const found = await findAthletesByIdentifier(identifier)

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
