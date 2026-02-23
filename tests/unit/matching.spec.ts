/**
 * Unit tests for Strava activity → athlete matching logic.
 *
 * We test the two matching strategies:
 * 1. Hashtag matching (#sosg <name>)
 * 2. Schedule proximity matching (planned session within ±2h window)
 */

const mockFrom = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  adminClient: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { matchActivityToAthlete } from '@/lib/strava/matching'
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

// ── Hashtag matching ──────────────────────────────────────────────────────────

describe('hashtag matching', () => {
  it('matches when activity name contains #sosg <name> and one athlete found', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'athletes') {
        return chainable([{ id: 'athlete-1', name: 'Daniel' }])
      }
      return chainable([])
    })

    const result = await matchActivityToAthlete(
      makeActivity({ name: 'Run with #sosg Daniel' }),
      'coach-1'
    )

    expect(result.matched).toBe(true)
    expect(result.athleteId).toBe('athlete-1')
    expect(result.method).toBe('hashtag')
    expect(result.confidence).toBe('high')
  })

  it('matches when #sosg tag is in description', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'athletes') {
        return chainable([{ id: 'athlete-2', name: 'Sarah' }])
      }
      return chainable([])
    })

    const result = await matchActivityToAthlete(
      makeActivity({ name: 'Morning Run', description: '#sosg Sarah great session' }),
      'coach-1'
    )

    expect(result.matched).toBe(true)
    expect(result.athleteId).toBe('athlete-2')
    expect(result.method).toBe('hashtag')
  })

  it('is case-insensitive for the #sosg tag', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'athletes') {
        return chainable([{ id: 'athlete-1', name: 'Daniel' }])
      }
      return chainable([])
    })

    const result = await matchActivityToAthlete(
      makeActivity({ name: 'Run with SOSG Daniel' }),
      'coach-1'
    )

    expect(result.matched).toBe(true)
    expect(result.method).toBe('hashtag')
  })

  it('does not match hashtag when multiple athletes match the name', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'athletes') {
        return chainable([
          { id: 'a1', name: 'Daniel Tan' },
          { id: 'a2', name: 'Daniel Lee' },
        ])
      }
      // Falls through to schedule matching — no planned sessions
      if (table === 'sessions') return chainable([])
      return chainable([])
    })

    const result = await matchActivityToAthlete(
      makeActivity({ name: '#sosg Daniel' }),
      'coach-1'
    )

    expect(result.matched).toBe(false)
  })

  it('does not match hashtag when no athletes match the name', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'athletes') return chainable([])
      if (table === 'sessions') return chainable([])
      return chainable([])
    })

    const result = await matchActivityToAthlete(
      makeActivity({ name: '#sosg UnknownPerson' }),
      'coach-1'
    )

    expect(result.matched).toBe(false)
  })
})

// ── Schedule matching ─────────────────────────────────────────────────────────

describe('schedule matching', () => {
  it('matches when exactly one planned session is within the ±2h window', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'athletes') return chainable([])
      if (table === 'sessions') {
        return chainable([{ id: 'session-1', athlete_id: 'athlete-3' }])
      }
      return chainable([])
    })

    const result = await matchActivityToAthlete(
      makeActivity({ name: 'Easy jog' }), // no hashtag
      'coach-1'
    )

    expect(result.matched).toBe(true)
    expect(result.athleteId).toBe('athlete-3')
    expect(result.method).toBe('schedule')
    expect(result.confidence).toBe('medium')
  })

  it('does not match schedule when multiple planned sessions are in the window', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'athletes') return chainable([])
      if (table === 'sessions') {
        return chainable([
          { id: 's1', athlete_id: 'a1' },
          { id: 's2', athlete_id: 'a2' },
        ])
      }
      return chainable([])
    })

    const result = await matchActivityToAthlete(
      makeActivity({ name: 'Easy jog' }),
      'coach-1'
    )

    expect(result.matched).toBe(false)
    expect(result.athleteId).toBeNull()
    expect(result.method).toBeNull()
    expect(result.confidence).toBeNull()
  })

  it('returns unmatched when no hashtag and no planned sessions', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'athletes') return chainable([])
      if (table === 'sessions') return chainable([])
      return chainable([])
    })

    const result = await matchActivityToAthlete(
      makeActivity({ name: 'Solo run' }),
      'coach-1'
    )

    expect(result.matched).toBe(false)
    expect(result.athleteId).toBeNull()
  })
})
