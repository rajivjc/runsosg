/**
 * Feed utilities — grouping and formatting helpers.
 */

import type { FeedSession } from '@/lib/feed/types'

/**
 * Group sessions into date buckets: Today, Yesterday, This week, Earlier.
 * Uses Asia/Singapore timezone for consistency with the rest of the app.
 */
export function groupByDate(sessions: FeedSession[]): Record<string, FeedSession[]> {
  const sgNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' }))
  const today = new Date(sgNow)
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(today.getDate() - 7)

  const groups: Record<string, FeedSession[]> = {
    'Today': [], 'Yesterday': [], 'This week': [], 'Earlier': [],
  }

  for (const s of sessions) {
    if (!s.date) continue
    const d = new Date(s.date)
    if (isNaN(d.getTime())) continue
    d.setHours(0, 0, 0, 0)
    if (d.getTime() === today.getTime()) groups['Today'].push(s)
    else if (d.getTime() === yesterday.getTime()) groups['Yesterday'].push(s)
    else if (d >= weekAgo) groups['This week'].push(s)
    else groups['Earlier'].push(s)
  }
  return groups
}

/** Build a map of athlete IDs → names from a query result. */
export function buildLookupMap(rows: { id: string; name?: string | null; email?: string | null }[]): Record<string, string> {
  return Object.fromEntries(
    rows.map(r => [r.id, r.name ?? r.email?.split('@')[0] ?? 'Unknown'])
  )
}

// ─── Distance equivalent helpers ────────────────────────────────

export const SINGAPORE_PERIMETER_KM = 140
export const EARTH_CIRCUMFERENCE_KM = 40075
export const SINGAPORE_LAPS_THRESHOLD = 4

export function getDistanceEquivalent(km: number) {
  if (km < SINGAPORE_PERIMETER_KM * SINGAPORE_LAPS_THRESHOLD) {
    const laps = km / SINGAPORE_PERIMETER_KM
    const progressInCurrentLap = (km % SINGAPORE_PERIMETER_KM) / SINGAPORE_PERIMETER_KM
    if (laps < 1) {
      return {
        label: `${Math.round(progressInCurrentLap * 100)}% of a lap around Singapore`,
        progress: progressInCurrentLap,
      }
    }
    return {
      label: `${laps.toFixed(1)} laps around Singapore`,
      progress: progressInCurrentLap,
    }
  }
  const progress = km / EARTH_CIRCUMFERENCE_KM
  return {
    label: `${(progress * 100).toFixed(1)}% of the way around Earth`,
    progress: Math.min(progress, 1),
  }
}
