/**
 * Unit tests for Strava activity → athlete matching logic.
 *
 * Matching strategies:
 * 1. #sosg <name> (multi-word supported)
 * 2. #<name> plain hashtag
 * 3. Multiple hashtags → multiple athlete matches
 */

const mockFrom = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  adminClient: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { matchActivityToAthlete, extractIdentifiers } from '@/lib/strava/matching'
import type { StravaActivity } from '@/lib/strava/client'

// ── Helpers ───────────────────────────────────────────────────────────────────

function chainable(data: unknown, error: unknown = null) {
  const obj: Record<string, unknown> = {}
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => resolve({ data, error })
      }
      return () => new Proxy(obj, handler)
    },
  }
  return new Proxy(obj, handler)
}

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

// ── extractIdentifiers (pure function) ───────────────────────────────────────

describe('extractIdentifiers', () => {
  it('extracts single #sosg name', () => {
    expect(extractIdentifiers('Run with #sosg Daniel')).toEqual(['Daniel'])
  })

  it('extracts multi-word #sosg name (captures until next # or end)', () => {
    expect(extractIdentifiers('Run #sosg Alex Tan')).toEqual(['Alex Tan'])
  })

  it('extracts plain hashtag', () => {
    expect(extractIdentifiers('Morning run #Daniel')).toEqual(['Daniel'])
  })

  it('extracts multiple plain hashtags', () => {
    expect(extractIdentifiers('Group run #Daniel #Ben')).toEqual([
      'Daniel',
      'Ben',
    ])
  })

  it('extracts mixed #sosg and plain hashtags', () => {
    expect(extractIdentifiers('#sosg Alex Tan #Ben')).toEqual([
      'Alex Tan',
      'Ben',
    ])
  })

  it('extracts multiple #sosg tags', () => {
    expect(extractIdentifiers('#sosg Daniel #sosg Ben')).toEqual([
      'Daniel',
      'Ben',
    ])
  })

  it('is case-insensitive for #sosg / SOSG', () => {
    expect(extractIdentifiers('Run SOSG Daniel')).toEqual(['Daniel'])
    expect(extractIdentifiers('Run #SOSG Daniel')).toEqual(['Daniel'])
  })

  it('returns empty array when no hashtags', () => {
    expect(extractIdentifiers('Just a morning run')).toEqual([])
  })

  it('returns empty when #sosg has no name after it', () => {
    expect(extractIdentifiers('#sosg')).toEqual([])
    expect(extractIdentifiers('#sosg   ')).toEqual([])
  })

  it('does not treat #sosg itself as a plain hashtag', () => {
    // #sosg without a name should not produce "sosg" as a plain hashtag match
    const result = extractIdentifiers('#sosg')
    expect(result).not.toContain('sosg')
  })

  it('extracts hyphenated names (#Wei-Lin)', () => {
    expect(extractIdentifiers('Run with #Wei-Lin')).toEqual(['Wei-Lin'])
  })

  it('extracts names with apostrophes (#O\'Brien)', () => {
    expect(extractIdentifiers("Run with #O'Brien")).toEqual(["O'Brien"])
  })

  it('extracts Unicode names (#José)', () => {
    expect(extractIdentifiers('Run with #José')).toEqual(['José'])
  })

  it('extracts names with smart quotes (#O\u2019Brien)', () => {
    expect(extractIdentifiers('Run with #O\u2019Brien')).toEqual([
      'O\u2019Brien',
    ])
  })

  it('strips trailing hyphens from match', () => {
    expect(extractIdentifiers('#Daniel- next run')).toEqual(['Daniel'])
  })

  it('handles #sosg with hyphenated multi-word name', () => {
    expect(extractIdentifiers('#sosg Wei-Lin Tan')).toEqual(['Wei-Lin Tan'])
  })
})

// ── Hashtag matching (single athlete) ────────────────────────────────────────

describe('hashtag matching — single athlete', () => {
  it('matches #sosg <name> when one athlete found', async () => {
    mockFrom.mockImplementation(() =>
      chainable([{ id: 'athlete-1', name: 'Daniel' }])
    )

    const result = await matchActivityToAthlete(
      makeActivity({ name: 'Run with #sosg Daniel' }),
      'coach-1'
    )

    expect(result.matched).toBe(true)
    expect(result.athletes).toHaveLength(1)
    expect(result.athletes[0].athleteId).toBe('athlete-1')
    expect(result.athletes[0].method).toBe('hashtag')
    expect(result.athletes[0].confidence).toBe('high')
  })

  it('matches #sosg in description', async () => {
    mockFrom.mockImplementation(() =>
      chainable([{ id: 'athlete-2', name: 'Sarah' }])
    )

    const result = await matchActivityToAthlete(
      makeActivity({
        name: 'Morning Run',
        description: '#sosg Sarah great session',
      }),
      'coach-1'
    )

    expect(result.matched).toBe(true)
    expect(result.athletes[0].athleteId).toBe('athlete-2')
  })

  it('matches plain hashtag #<name>', async () => {
    mockFrom.mockImplementation(() =>
      chainable([{ id: 'athlete-1', name: 'Daniel' }])
    )

    const result = await matchActivityToAthlete(
      makeActivity({ name: 'Morning run #Daniel' }),
      'coach-1'
    )

    expect(result.matched).toBe(true)
    expect(result.athletes).toHaveLength(1)
    expect(result.athletes[0].athleteId).toBe('athlete-1')
    expect(result.athletes[0].identifier).toBe('Daniel')
  })

  it('matches multi-word #sosg name', async () => {
    mockFrom.mockImplementation(() =>
      chainable([{ id: 'athlete-3', name: 'Alex Tan' }])
    )

    const result = await matchActivityToAthlete(
      makeActivity({ name: 'Run #sosg Alex Tan' }),
      'coach-1'
    )

    expect(result.matched).toBe(true)
    expect(result.athletes[0].athleteId).toBe('athlete-3')
    expect(result.athletes[0].identifier).toBe('Alex Tan')
  })

  it('is case-insensitive for SOSG tag', async () => {
    mockFrom.mockImplementation(() =>
      chainable([{ id: 'athlete-1', name: 'Daniel' }])
    )

    const result = await matchActivityToAthlete(
      makeActivity({ name: 'Run with SOSG Daniel' }),
      'coach-1'
    )

    expect(result.matched).toBe(true)
  })

  it('matches hyphenated hashtag #Wei-Lin', async () => {
    mockFrom.mockImplementation(() =>
      chainable([{ id: 'athlete-wl', name: 'Wei-Lin' }])
    )

    const result = await matchActivityToAthlete(
      makeActivity({ name: 'Morning run #Wei-Lin' }),
      'coach-1'
    )

    expect(result.matched).toBe(true)
    expect(result.athletes).toHaveLength(1)
    expect(result.athletes[0].athleteId).toBe('athlete-wl')
    expect(result.athletes[0].identifier).toBe('Wei-Lin')
  })

  it('matches Unicode hashtag #José', async () => {
    mockFrom.mockImplementation(() =>
      chainable([{ id: 'athlete-j', name: 'José' }])
    )

    const result = await matchActivityToAthlete(
      makeActivity({ name: 'Group run #José' }),
      'coach-1'
    )

    expect(result.matched).toBe(true)
    expect(result.athletes[0].athleteId).toBe('athlete-j')
  })
})

// ── Multi-athlete matching ───────────────────────────────────────────────────

describe('multi-athlete matching', () => {
  it('matches multiple plain hashtags to different athletes', async () => {
    const callArgs: string[][] = []
    mockFrom.mockImplementation(() => {
      const obj: Record<string, unknown> = {}
      const handler: ProxyHandler<Record<string, unknown>> = {
        get(_target, prop) {
          if (prop === 'then') {
            // Return different athletes based on the ilike calls
            const identifier = callArgs[callArgs.length - 1]?.[0] ?? ''
            if (identifier.includes('Daniel')) {
              return (resolve: (v: unknown) => void) =>
                resolve({
                  data: [{ id: 'athlete-1', name: 'Daniel' }],
                  error: null,
                })
            }
            if (identifier.includes('Ben')) {
              return (resolve: (v: unknown) => void) =>
                resolve({
                  data: [{ id: 'athlete-2', name: 'Ben' }],
                  error: null,
                })
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
      makeActivity({ name: 'Group run #Daniel #Ben' }),
      'coach-1'
    )

    expect(result.matched).toBe(true)
    expect(result.athletes).toHaveLength(2)
    expect(result.athletes.map((a) => a.athleteId).sort()).toEqual([
      'athlete-1',
      'athlete-2',
    ])
  })

  it('deduplicates when same athlete matched by multiple identifiers', async () => {
    mockFrom.mockImplementation(() =>
      chainable([{ id: 'athlete-1', name: 'Daniel' }])
    )

    const result = await matchActivityToAthlete(
      makeActivity({ name: '#sosg Daniel #Daniel' }),
      'coach-1'
    )

    expect(result.matched).toBe(true)
    expect(result.athletes).toHaveLength(1)
  })
})

// ── Ambiguous matches ────────────────────────────────────────────────────────

describe('ambiguous matches', () => {
  it('marks identifier as ambiguous when multiple athletes match', async () => {
    mockFrom.mockImplementation(() =>
      chainable([
        { id: 'a1', name: 'Daniel Tan' },
        { id: 'a2', name: 'Daniel Lee' },
      ])
    )

    const result = await matchActivityToAthlete(
      makeActivity({ name: '#sosg Daniel' }),
      'coach-1'
    )

    expect(result.matched).toBe(false)
    expect(result.athletes).toHaveLength(0)
    expect(result.ambiguousIdentifiers).toEqual(['Daniel'])
  })

  it('matches unambiguous identifiers even when others are ambiguous', async () => {
    const callArgs: string[][] = []
    mockFrom.mockImplementation(() => {
      const obj: Record<string, unknown> = {}
      const handler: ProxyHandler<Record<string, unknown>> = {
        get(_target, prop) {
          if (prop === 'then') {
            const identifier = callArgs[callArgs.length - 1]?.[0] ?? ''
            if (identifier.includes('Daniel')) {
              return (resolve: (v: unknown) => void) =>
                resolve({
                  data: [
                    { id: 'a1', name: 'Daniel Tan' },
                    { id: 'a2', name: 'Daniel Lee' },
                  ],
                  error: null,
                })
            }
            if (identifier.includes('Sarah')) {
              return (resolve: (v: unknown) => void) =>
                resolve({
                  data: [{ id: 'a3', name: 'Sarah' }],
                  error: null,
                })
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
      makeActivity({ name: '#Daniel #Sarah' }),
      'coach-1'
    )

    expect(result.matched).toBe(true)
    expect(result.athletes).toHaveLength(1)
    expect(result.athletes[0].athleteId).toBe('a3')
    expect(result.ambiguousIdentifiers).toEqual(['Daniel'])
  })
})

// ── No match ─────────────────────────────────────────────────────────────────

describe('no match', () => {
  it('returns unmatched when no hashtags present', async () => {
    const result = await matchActivityToAthlete(
      makeActivity({ name: 'Solo run' }),
      'coach-1'
    )

    expect(result.matched).toBe(false)
    expect(result.athletes).toHaveLength(0)
    expect(result.ambiguousIdentifiers).toHaveLength(0)
  })

  it('returns unmatched when hashtag name matches no athletes', async () => {
    mockFrom.mockImplementation(() => chainable([]))

    const result = await matchActivityToAthlete(
      makeActivity({ name: '#sosg UnknownPerson' }),
      'coach-1'
    )

    expect(result.matched).toBe(false)
    expect(result.athletes).toHaveLength(0)
  })
})
