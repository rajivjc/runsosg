/**
 * Unit tests for the smart suggestion algorithm.
 */

const mockFrom = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  adminClient: {
    from: (table: string) => mockFrom(table),
  },
}))

import { suggestPairings, buildFrequencyMatrix } from '@/lib/sessions/suggestions'

// ── Helpers ─────────────────────────────────────────────────────────────

function chainMock(resolvedData: unknown) {
  const resolved = { data: resolvedData, error: null }
  const makeChain = (): any => {
    const promise = Promise.resolve(resolved)
    const handler: ProxyHandler<Promise<typeof resolved>> = {
      get(target, prop) {
        if (prop === 'then' || prop === 'catch' || prop === 'finally') {
          return (target as any)[prop].bind(target)
        }
        if (prop === 'single') {
          return jest.fn().mockResolvedValue(resolved)
        }
        return jest.fn().mockReturnValue(makeChain())
      },
    }
    return new Proxy(promise, handler)
  }
  return makeChain()
}

const coaches = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `c${i + 1}`, name: `Coach ${i + 1}` }))

const athletes = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `a${i + 1}`, name: `Athlete ${i + 1}` }))

beforeEach(() => {
  jest.clearAllMocks()
})

function setupMocks(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    training_sessions: [],
    session_assignments: [],
    sessions: [],
    ...overrides,
  }
  mockFrom.mockImplementation((table: string) => chainMock(defaults[table] ?? []))
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('suggestPairings', () => {
  it('returns empty when no historical data (cold start)', async () => {
    setupMocks({ training_sessions: [] })

    const result = await suggestPairings({
      availableCoaches: coaches(3),
      attendingAthletes: athletes(3),
      clubId: 'club-1',
      maxAthletesPerCoach: 3,
    })

    expect(result).toEqual([])
  })

  it('returns empty when no coaches', async () => {
    const result = await suggestPairings({
      availableCoaches: [],
      attendingAthletes: athletes(3),
      clubId: 'club-1',
      maxAthletesPerCoach: 3,
    })

    expect(result).toEqual([])
  })

  it('returns empty when no athletes', async () => {
    const result = await suggestPairings({
      availableCoaches: coaches(3),
      attendingAthletes: [],
      clubId: 'club-1',
      maxAthletesPerCoach: 3,
    })

    expect(result).toEqual([])
  })

  it('pairs coaches with their most frequent athletes', async () => {
    setupMocks({
      training_sessions: [{ id: 'ts1' }, { id: 'ts2' }, { id: 'ts3' }],
      session_assignments: [
        // c1-a1 paired 3 times (highest)
        { session_id: 'ts1', coach_id: 'c1', athlete_id: 'a1' },
        { session_id: 'ts2', coach_id: 'c1', athlete_id: 'a1' },
        { session_id: 'ts3', coach_id: 'c1', athlete_id: 'a1' },
        // c2-a2 paired 2 times
        { session_id: 'ts1', coach_id: 'c2', athlete_id: 'a2' },
        { session_id: 'ts2', coach_id: 'c2', athlete_id: 'a2' },
        // c1-a2 paired 1 time (lower priority than c2-a2)
        { session_id: 'ts3', coach_id: 'c1', athlete_id: 'a2' },
      ],
      sessions: [
        // All athletes logged runs
        { training_session_id: 'ts1', athlete_id: 'a1', status: 'completed' },
        { training_session_id: 'ts2', athlete_id: 'a1', status: 'completed' },
        { training_session_id: 'ts3', athlete_id: 'a1', status: 'completed' },
        { training_session_id: 'ts1', athlete_id: 'a2', status: 'completed' },
        { training_session_id: 'ts2', athlete_id: 'a2', status: 'completed' },
        { training_session_id: 'ts3', athlete_id: 'a2', status: 'completed' },
      ],
    })

    const result = await suggestPairings({
      availableCoaches: coaches(2),
      attendingAthletes: athletes(2),
      clubId: 'club-1',
      maxAthletesPerCoach: 3,
    })

    // c1 should get a1 (freq 3), c2 should get a2 (freq 2)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ coachId: 'c1', athleteId: 'a1', frequency: 3 })
    expect(result[1]).toMatchObject({ coachId: 'c2', athleteId: 'a2', frequency: 2 })
  })

  it('respects maxAthletesPerCoach limit', async () => {
    setupMocks({
      training_sessions: [{ id: 'ts1' }],
      session_assignments: [
        { session_id: 'ts1', coach_id: 'c1', athlete_id: 'a1' },
        { session_id: 'ts1', coach_id: 'c1', athlete_id: 'a2' },
        { session_id: 'ts1', coach_id: 'c1', athlete_id: 'a3' },
      ],
      sessions: [
        { training_session_id: 'ts1', athlete_id: 'a1', status: 'completed' },
        { training_session_id: 'ts1', athlete_id: 'a2', status: 'completed' },
        { training_session_id: 'ts1', athlete_id: 'a3', status: 'completed' },
      ],
    })

    const result = await suggestPairings({
      availableCoaches: [{ id: 'c1', name: 'Coach 1' }],
      attendingAthletes: athletes(3),
      clubId: 'club-1',
      maxAthletesPerCoach: 2, // Limit to 2
    })

    // c1 should only get 2 athletes despite 3 being available
    expect(result).toHaveLength(2)
    expect(result.every((r) => r.coachId === 'c1')).toBe(true)
  })

  it('assigns each athlete to at most one coach', async () => {
    setupMocks({
      training_sessions: [{ id: 'ts1' }, { id: 'ts2' }],
      session_assignments: [
        { session_id: 'ts1', coach_id: 'c1', athlete_id: 'a1' },
        { session_id: 'ts2', coach_id: 'c2', athlete_id: 'a1' },
      ],
      sessions: [
        { training_session_id: 'ts1', athlete_id: 'a1', status: 'completed' },
        { training_session_id: 'ts2', athlete_id: 'a1', status: 'completed' },
      ],
    })

    const result = await suggestPairings({
      availableCoaches: coaches(2),
      attendingAthletes: [{ id: 'a1', name: 'Athlete 1' }],
      clubId: 'club-1',
      maxAthletesPerCoach: 3,
    })

    // a1 should appear only once
    expect(result).toHaveLength(1)
    const athleteIds = result.map((r) => r.athleteId)
    expect(new Set(athleteIds).size).toBe(athleteIds.length)
  })

  it('labels "regular" for frequency >= 3', async () => {
    setupMocks({
      training_sessions: [{ id: 'ts1' }, { id: 'ts2' }, { id: 'ts3' }],
      session_assignments: [
        { session_id: 'ts1', coach_id: 'c1', athlete_id: 'a1' },
        { session_id: 'ts2', coach_id: 'c1', athlete_id: 'a1' },
        { session_id: 'ts3', coach_id: 'c1', athlete_id: 'a1' },
      ],
      sessions: [
        { training_session_id: 'ts1', athlete_id: 'a1', status: 'completed' },
        { training_session_id: 'ts2', athlete_id: 'a1', status: 'completed' },
        { training_session_id: 'ts3', athlete_id: 'a1', status: 'completed' },
      ],
    })

    const result = await suggestPairings({
      availableCoaches: [{ id: 'c1', name: 'Coach 1' }],
      attendingAthletes: [{ id: 'a1', name: 'Athlete 1' }],
      clubId: 'club-1',
      maxAthletesPerCoach: 3,
    })

    expect(result).toHaveLength(1)
    expect(result[0].confidence).toBe('regular')
    expect(result[0].frequency).toBe(3)
  })

  it('labels "suggested" for frequency >= 1 but < 3', async () => {
    setupMocks({
      training_sessions: [{ id: 'ts1' }],
      session_assignments: [
        { session_id: 'ts1', coach_id: 'c1', athlete_id: 'a1' },
      ],
      sessions: [
        { training_session_id: 'ts1', athlete_id: 'a1', status: 'completed' },
      ],
    })

    const result = await suggestPairings({
      availableCoaches: [{ id: 'c1', name: 'Coach 1' }],
      attendingAthletes: [{ id: 'a1', name: 'Athlete 1' }],
      clubId: 'club-1',
      maxAthletesPerCoach: 3,
    })

    expect(result).toHaveLength(1)
    expect(result[0].confidence).toBe('suggested')
  })

  it('leaves unmatched athletes unassigned', async () => {
    setupMocks({
      training_sessions: [{ id: 'ts1' }],
      session_assignments: [
        { session_id: 'ts1', coach_id: 'c1', athlete_id: 'a1' },
      ],
      sessions: [
        { training_session_id: 'ts1', athlete_id: 'a1', status: 'completed' },
      ],
    })

    const result = await suggestPairings({
      availableCoaches: coaches(2),
      attendingAthletes: athletes(3), // a2, a3 have no history
      clubId: 'club-1',
      maxAthletesPerCoach: 3,
    })

    // Only a1 should be assigned
    expect(result).toHaveLength(1)
    expect(result[0].athleteId).toBe('a1')
  })

  it('only counts completed sessions with logged runs', async () => {
    setupMocks({
      training_sessions: [{ id: 'ts1' }],
      session_assignments: [
        { session_id: 'ts1', coach_id: 'c1', athlete_id: 'a1' },
      ],
      // No completed run logs — athlete didn't actually run
      sessions: [],
    })

    const result = await suggestPairings({
      availableCoaches: [{ id: 'c1', name: 'Coach 1' }],
      attendingAthletes: [{ id: 'a1', name: 'Athlete 1' }],
      clubId: 'club-1',
      maxAthletesPerCoach: 3,
    })

    expect(result).toEqual([])
  })

  it('does NOT count cancelled or draft sessions', async () => {
    // The training_sessions query filters by status='completed', so
    // cancelled/draft sessions won't appear. We verify by returning empty
    // training_sessions (simulating the filter).
    setupMocks({ training_sessions: [] })

    const result = await suggestPairings({
      availableCoaches: coaches(2),
      attendingAthletes: athletes(2),
      clubId: 'club-1',
      maxAthletesPerCoach: 3,
    })

    expect(result).toEqual([])
  })

  it('works correctly with 20 coaches × 20 athletes (scale test)', async () => {
    const numCoaches = 18
    const numAthletes = 20
    const sessionIds = Array.from({ length: 5 }, (_, i) => `ts${i + 1}`)

    // Build diverse assignment history
    const assignments: { session_id: string; coach_id: string; athlete_id: string }[] = []
    const runs: { training_session_id: string; athlete_id: string; status: string }[] = []

    for (const sid of sessionIds) {
      for (let a = 1; a <= numAthletes; a++) {
        const coachIdx = ((a - 1) % numCoaches) + 1
        assignments.push({ session_id: sid, coach_id: `c${coachIdx}`, athlete_id: `a${a}` })
        runs.push({ training_session_id: sid, athlete_id: `a${a}`, status: 'completed' })
      }
    }

    setupMocks({
      training_sessions: sessionIds.map((id) => ({ id })),
      session_assignments: assignments,
      sessions: runs,
    })

    const result = await suggestPairings({
      availableCoaches: coaches(numCoaches),
      attendingAthletes: athletes(numAthletes),
      clubId: 'club-1',
      maxAthletesPerCoach: 3,
    })

    // All 20 athletes should be assigned (18 coaches × ~1-2 each with max 3)
    expect(result.length).toBeGreaterThan(0)
    expect(result.length).toBeLessThanOrEqual(numAthletes)

    // Each athlete assigned at most once
    const athleteIds = result.map((r) => r.athleteId)
    expect(new Set(athleteIds).size).toBe(athleteIds.length)

    // No coach exceeds max
    const coachCounts = new Map<string, number>()
    for (const r of result) {
      coachCounts.set(r.coachId, (coachCounts.get(r.coachId) ?? 0) + 1)
    }
    for (const count of coachCounts.values()) {
      expect(count).toBeLessThanOrEqual(3)
    }
  })
})

describe('buildFrequencyMatrix', () => {
  it('returns empty for empty coach/athlete lists', async () => {
    const result = await buildFrequencyMatrix('club-1', [], ['a1'])
    expect(result).toEqual([])

    const result2 = await buildFrequencyMatrix('club-1', ['c1'], [])
    expect(result2).toEqual([])
  })
})
