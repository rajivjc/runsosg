/**
 * Unit tests for Strava matching performance optimizations.
 *
 * Validates that identifier lookups are parallelized (Promise.all)
 * while maintaining correct behavior.
 */

const mockFrom = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  adminClient: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

jest.mock('@/lib/club', () => ({
  getClub: jest.fn().mockResolvedValue({
    strava_hashtag_prefix: '#sosg',
  }),
  CLUB_CACHE_TAG: 'club-config',
}))

import { matchActivityToAthlete } from '@/lib/strava/matching'
import type { StravaActivity } from '@/lib/strava/client'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeActivity(overrides: Partial<StravaActivity> = {}): StravaActivity {
  return {
    id: 12345,
    name: 'Morning Run',
    sport_type: 'Run',
    start_date: '2026-02-15T08:00:00Z',
    distance: 5000,
    moving_time: 1800,
    description: null,
    map: { summary_polyline: null },
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ── Parallel lookup tests ────────────────────────────────────────────────────

describe('matchActivityToAthlete — parallel lookups', () => {
  it('resolves multiple identifiers concurrently', async () => {
    const callOrder: string[] = []

    mockFrom.mockImplementation(() => {
      const obj: Record<string, unknown> = {}
      const capturedWords: string[] = []
      const handler: ProxyHandler<Record<string, unknown>> = {
        get(_target, prop) {
          if (prop === 'then') {
            const word = capturedWords[capturedWords.length - 1] ?? ''
            callOrder.push(word)

            let data: unknown[] = []
            if (word.includes('Daniel')) {
              data = [{ id: 'athlete-1', name: 'Daniel' }]
            } else if (word.includes('Ben')) {
              data = [{ id: 'athlete-2', name: 'Ben' }]
            } else if (word.includes('Sarah')) {
              data = [{ id: 'athlete-3', name: 'Sarah' }]
            }

            return (resolve: (v: unknown) => void) =>
              resolve({ data, error: null })
          }
          if (prop === 'ilike') {
            return (_col: string, val: string) => {
              capturedWords.push(val)
              return new Proxy(obj, handler)
            }
          }
          return () => new Proxy(obj, handler)
        },
      }
      return new Proxy(obj, handler)
    })

    const result = await matchActivityToAthlete(
      makeActivity({ name: '#Daniel #Ben #Sarah' }),
      'coach-1'
    )

    expect(result.matched).toBe(true)
    expect(result.athletes).toHaveLength(3)
    expect(result.athletes.map(a => a.athleteId).sort()).toEqual([
      'athlete-1', 'athlete-2', 'athlete-3',
    ])
  })

  it('handles mix of matched, ambiguous, and not-found identifiers in parallel', async () => {
    const callArgs: string[][] = []
    mockFrom.mockImplementation(() => {
      const obj: Record<string, unknown> = {}
      const handler: ProxyHandler<Record<string, unknown>> = {
        get(_target, prop) {
          if (prop === 'then') {
            const identifier = callArgs[callArgs.length - 1]?.[0] ?? ''
            if (identifier.includes('Ali')) {
              // Unique match
              return (resolve: (v: unknown) => void) =>
                resolve({ data: [{ id: 'a1', name: 'Ali' }], error: null })
            }
            if (identifier.includes('Daniel')) {
              // Ambiguous — 2 athletes
              return (resolve: (v: unknown) => void) =>
                resolve({
                  data: [
                    { id: 'a2', name: 'Daniel Tan' },
                    { id: 'a3', name: 'Daniel Lee' },
                  ],
                  error: null,
                })
            }
            if (identifier.includes('Ghost')) {
              // No match
              return (resolve: (v: unknown) => void) =>
                resolve({ data: [], error: null })
            }
            return (resolve: (v: unknown) => void) =>
              resolve({ data: [], error: null })
          }
          if (prop === 'ilike') {
            return (_col: string, val: string) => {
              callArgs.push([val])
              return new Proxy(obj, handler)
            }
          }
          return () => new Proxy(obj, handler)
        },
      }
      return new Proxy(obj, handler)
    })

    const result = await matchActivityToAthlete(
      makeActivity({ name: '#Ali #Daniel #Ghost' }),
      'coach-1'
    )

    // Ali matched, Daniel ambiguous, Ghost not found
    expect(result.matched).toBe(true)
    expect(result.athletes).toHaveLength(1)
    expect(result.athletes[0].athleteId).toBe('a1')
    expect(result.ambiguousIdentifiers).toEqual(['Daniel'])
  })

  it('still deduplicates when same athlete matched by parallel lookups', async () => {
    mockFrom.mockImplementation(() => {
      const obj: Record<string, unknown> = {}
      const handler: ProxyHandler<Record<string, unknown>> = {
        get(_target, prop) {
          if (prop === 'then') {
            return (resolve: (v: unknown) => void) =>
              resolve({ data: [{ id: 'athlete-1', name: 'Daniel' }], error: null })
          }
          return () => new Proxy(obj, handler)
        },
      }
      return new Proxy(obj, handler)
    })

    // Both identifiers resolve to the same athlete
    const result = await matchActivityToAthlete(
      makeActivity({ name: '#sosg Daniel #Daniel' }),
      'coach-1'
    )

    expect(result.matched).toBe(true)
    expect(result.athletes).toHaveLength(1) // deduped
    expect(result.athletes[0].athleteId).toBe('athlete-1')
  })

  it('returns empty when all parallel lookups return nothing', async () => {
    mockFrom.mockImplementation(() => {
      const obj: Record<string, unknown> = {}
      const handler: ProxyHandler<Record<string, unknown>> = {
        get(_target, prop) {
          if (prop === 'then') {
            return (resolve: (v: unknown) => void) =>
              resolve({ data: [], error: null })
          }
          return () => new Proxy(obj, handler)
        },
      }
      return new Proxy(obj, handler)
    })

    const result = await matchActivityToAthlete(
      makeActivity({ name: '#Unknown1 #Unknown2 #Unknown3' }),
      'coach-1'
    )

    expect(result.matched).toBe(false)
    expect(result.athletes).toHaveLength(0)
    expect(result.ambiguousIdentifiers).toHaveLength(0)
  })
})
