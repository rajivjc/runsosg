/**
 * Unit tests for the coach badges system.
 *
 * Tests badge definitions, the syncBadges logic (award + revoke),
 * the checkAndAwardBadges backward-compat wrapper, and the getBadgeDefinition helper.
 */

// ── Mocks (must be before imports) ───────────────────────────────────────────

const mockFrom = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  adminClient: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { syncBadges, checkAndAwardBadges, getBadgeDefinition, BADGE_DEFINITIONS } from '@/lib/badges'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a chainable Supabase query mock that resolves to `data`. */
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

/**
 * Queue-based mock for adminClient.from().
 * Supports insert capture, delete tracking, and count queries.
 */
function createQueueMock() {
  const queues: Record<string, Array<{ data: unknown; count?: number; error: unknown }>> = {}
  const inserts: Record<string, unknown[]> = {}
  const deletes: Record<string, number> = {}

  function enqueue(
    table: string,
    ...responses: Array<{ data: unknown; count?: number; error?: unknown }>
  ) {
    if (!queues[table]) queues[table] = []
    for (const r of responses) {
      queues[table].push({ data: r.data, count: r.count, error: r.error ?? null })
    }
  }

  function impl(table: string) {
    const obj: Record<string, unknown> = {}
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop: string) {
        if (prop === 'then') {
          const queue = queues[table]
          const response = queue?.shift() ?? { data: null, count: null, error: null }
          return (resolve: (v: unknown) => void) => resolve(response)
        }
        if (prop === 'insert') {
          return (data: unknown) => {
            if (!inserts[table]) inserts[table] = []
            inserts[table].push(data)
            return new Proxy(obj, handler)
          }
        }
        if (prop === 'delete') {
          return () => {
            deletes[table] = (deletes[table] ?? 0) + 1
            return new Proxy(obj, handler)
          }
        }
        return (..._args: unknown[]) => new Proxy(obj, handler)
      },
    }
    return new Proxy(obj, handler)
  }

  return { enqueue, impl, inserts, deletes }
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BADGE_DEFINITIONS', () => {
  it('has 14 badge definitions', () => {
    expect(BADGE_DEFINITIONS).toHaveLength(14)
  })

  it('each badge has required fields', () => {
    for (const badge of BADGE_DEFINITIONS) {
      expect(badge.key).toBeDefined()
      expect(badge.label).toBeDefined()
      expect(badge.icon).toBeDefined()
      expect(badge.description).toBeDefined()
      expect(typeof badge.check).toBe('function')
    }
  })

  it('has unique keys', () => {
    const keys = BADGE_DEFINITIONS.map((b) => b.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('getBadgeDefinition', () => {
  it('returns the badge for a valid key', () => {
    const badge = getBadgeDefinition('first_steps')
    expect(badge).toBeDefined()
    expect(badge!.label).toBe('First Steps')
    expect(badge!.icon).toBe('👟')
  })

  it('returns undefined for an unknown key', () => {
    expect(getBadgeDefinition('nonexistent')).toBeUndefined()
  })
})

describe('badge check functions', () => {
  const stats = (overrides: Partial<{
    sessionCount: number
    athleteCount: number
    noteCount: number
    kudosGivenCount: number
    feelRatedCount: number
    sessionDates: string[]
    sessionsPerAthlete: number[]
  }> = {}) => ({
    sessionCount: 0,
    athleteCount: 0,
    noteCount: 0,
    kudosGivenCount: 0,
    feelRatedCount: 0,
    sessionDates: [] as string[],
    sessionsPerAthlete: [] as number[],
    ...overrides,
  })

  it('first_steps triggers at 1 session', () => {
    const badge = getBadgeDefinition('first_steps')!
    expect(badge.check(stats({ sessionCount: 0 }))).toBe(false)
    expect(badge.check(stats({ sessionCount: 1 }))).toBe(true)
  })

  it('high_five triggers at 5 sessions', () => {
    const badge = getBadgeDefinition('high_five')!
    expect(badge.check(stats({ sessionCount: 4 }))).toBe(false)
    expect(badge.check(stats({ sessionCount: 5 }))).toBe(true)
  })

  it('double_digits triggers at 10 sessions', () => {
    const badge = getBadgeDefinition('double_digits')!
    expect(badge.check(stats({ sessionCount: 9 }))).toBe(false)
    expect(badge.check(stats({ sessionCount: 10 }))).toBe(true)
  })

  it('quarter_century triggers at 25 sessions', () => {
    const badge = getBadgeDefinition('quarter_century')!
    expect(badge.check(stats({ sessionCount: 24 }))).toBe(false)
    expect(badge.check(stats({ sessionCount: 25 }))).toBe(true)
  })

  it('half_century triggers at 50 sessions', () => {
    const badge = getBadgeDefinition('half_century')!
    expect(badge.check(stats({ sessionCount: 49 }))).toBe(false)
    expect(badge.check(stats({ sessionCount: 50 }))).toBe(true)
  })

  it('century_club triggers at 100 sessions', () => {
    const badge = getBadgeDefinition('century_club')!
    expect(badge.check(stats({ sessionCount: 99 }))).toBe(false)
    expect(badge.check(stats({ sessionCount: 100 }))).toBe(true)
  })

  it('team_player triggers at 3 athletes', () => {
    const badge = getBadgeDefinition('team_player')!
    expect(badge.check(stats({ athleteCount: 2 }))).toBe(false)
    expect(badge.check(stats({ athleteCount: 3 }))).toBe(true)
  })

  it('all_star_coach triggers at 5 athletes', () => {
    const badge = getBadgeDefinition('all_star_coach')!
    expect(badge.check(stats({ athleteCount: 4 }))).toBe(false)
    expect(badge.check(stats({ athleteCount: 5 }))).toBe(true)
  })

  it('storyteller triggers at 10 notes', () => {
    const badge = getBadgeDefinition('storyteller')!
    expect(badge.check(stats({ noteCount: 9 }))).toBe(false)
    expect(badge.check(stats({ noteCount: 10 }))).toBe(true)
  })

  it('heart_reader triggers at 10 feel ratings', () => {
    const badge = getBadgeDefinition('heart_reader')!
    expect(badge.check(stats({ feelRatedCount: 9 }))).toBe(false)
    expect(badge.check(stats({ feelRatedCount: 10 }))).toBe(true)
  })

  it('cheerleader triggers at 10 kudos', () => {
    const badge = getBadgeDefinition('cheerleader')!
    expect(badge.check(stats({ kudosGivenCount: 9 }))).toBe(false)
    expect(badge.check(stats({ kudosGivenCount: 10 }))).toBe(true)
  })
})

describe('syncBadges', () => {
  const userId = 'coach-1'

  it('returns no awards or revocations when nothing changes', async () => {
    const mock = createQueueMock()

    // Already has first_steps badge
    mock.enqueue('coach_badges', { data: [{ badge_key: 'first_steps' }] })
    // Stats: 1 session, 1 athlete — only qualifies for first_steps which is already earned
    mock.enqueue('sessions', { data: null, count: 1 })
    mock.enqueue('sessions', { data: [{ athlete_id: 'a1', date: '2026-01-01' }] })
    mock.enqueue('sessions', { data: null, count: 0 }) // notes
    mock.enqueue('kudos', { data: null, count: 0 })
    mock.enqueue('sessions', { data: null, count: 0 }) // feels

    mockFrom.mockImplementation(mock.impl)

    const result = await syncBadges(userId)
    expect(result.awarded).toHaveLength(0)
    expect(result.revoked).toHaveLength(0)
  })

  it('awards first_steps badge on first session', async () => {
    const mock = createQueueMock()

    // No existing badges
    mock.enqueue('coach_badges', { data: [] })
    // Stats: 1 session
    mock.enqueue('sessions', { data: null, count: 1 })
    mock.enqueue('sessions', { data: [{ athlete_id: 'a1', date: '2026-01-01' }] })
    mock.enqueue('sessions', { data: null, count: 0 })
    mock.enqueue('kudos', { data: null, count: 0 })
    mock.enqueue('sessions', { data: null, count: 0 })
    // Insert response
    mock.enqueue('coach_badges', { data: null })

    mockFrom.mockImplementation(mock.impl)

    const result = await syncBadges(userId)
    expect(result.awarded).toContain('first_steps')
    expect(result.revoked).toHaveLength(0)
    expect(mock.inserts['coach_badges']).toBeDefined()
    expect(mock.inserts['coach_badges'][0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ user_id: userId, badge_key: 'first_steps' }),
      ])
    )
  })

  it('awards multiple badges when thresholds are met simultaneously', async () => {
    const mock = createQueueMock()

    // No existing badges
    mock.enqueue('coach_badges', { data: [] })
    // Stats: 5 sessions with 3 athletes
    mock.enqueue('sessions', { data: null, count: 5 })
    mock.enqueue('sessions', { data: [
      { athlete_id: 'a1', date: '2026-01-01' }, { athlete_id: 'a2', date: '2026-01-02' }, { athlete_id: 'a3', date: '2026-01-03' },
      { athlete_id: 'a1', date: '2026-01-04' }, { athlete_id: 'a2', date: '2026-01-05' },
    ] })
    mock.enqueue('sessions', { data: null, count: 0 })
    mock.enqueue('kudos', { data: null, count: 0 })
    mock.enqueue('sessions', { data: null, count: 0 })
    // Insert response
    mock.enqueue('coach_badges', { data: null })

    mockFrom.mockImplementation(mock.impl)

    const result = await syncBadges(userId)
    // Should earn: first_steps (1+), high_five (5+), team_player (3+ athletes)
    expect(result.awarded).toContain('first_steps')
    expect(result.awarded).toContain('high_five')
    expect(result.awarded).toContain('team_player')
    expect(result.awarded).toHaveLength(3)
    expect(result.revoked).toHaveLength(0)
  })

  it('does not re-award existing badges', async () => {
    const mock = createQueueMock()

    // Already has first_steps and high_five
    mock.enqueue('coach_badges', { data: [
      { badge_key: 'first_steps' },
      { badge_key: 'high_five' },
    ] })
    // Stats: 10 sessions with 3 athletes
    mock.enqueue('sessions', { data: null, count: 10 })
    mock.enqueue('sessions', { data: [
      { athlete_id: 'a1', date: '2026-01-01' }, { athlete_id: 'a2', date: '2026-01-02' }, { athlete_id: 'a3', date: '2026-01-03' },
      { athlete_id: 'a1', date: '2026-01-04' }, { athlete_id: 'a2', date: '2026-01-05' },
      { athlete_id: 'a1', date: '2026-01-06' }, { athlete_id: 'a2', date: '2026-01-07' }, { athlete_id: 'a3', date: '2026-01-08' },
      { athlete_id: 'a1', date: '2026-01-09' }, { athlete_id: 'a2', date: '2026-01-10' },
    ] })
    mock.enqueue('sessions', { data: null, count: 0 })
    mock.enqueue('kudos', { data: null, count: 0 })
    mock.enqueue('sessions', { data: null, count: 0 })
    // Insert for new badges
    mock.enqueue('coach_badges', { data: null })

    mockFrom.mockImplementation(mock.impl)

    const result = await syncBadges(userId)
    // Should earn double_digits and team_player, NOT first_steps or high_five
    expect(result.awarded).toContain('double_digits')
    expect(result.awarded).toContain('team_player')
    expect(result.awarded).not.toContain('first_steps')
    expect(result.awarded).not.toContain('high_five')
  })

  it('revokes badges when conditions are no longer met', async () => {
    const mock = createQueueMock()

    // Coach has first_steps badge but now has 0 sessions (session was deleted)
    mock.enqueue('coach_badges', { data: [{ badge_key: 'first_steps' }] })
    // Stats: 0 sessions
    mock.enqueue('sessions', { data: null, count: 0 })
    mock.enqueue('sessions', { data: [] })
    mock.enqueue('sessions', { data: null, count: 0 })
    mock.enqueue('kudos', { data: null, count: 0 })
    mock.enqueue('sessions', { data: null, count: 0 })
    // Delete response for revoked badges
    mock.enqueue('coach_badges', { data: null })

    mockFrom.mockImplementation(mock.impl)

    const result = await syncBadges(userId)
    expect(result.awarded).toHaveLength(0)
    expect(result.revoked).toContain('first_steps')
    expect(mock.deletes['coach_badges']).toBe(1)
  })

  it('awards and revokes in the same sync', async () => {
    const mock = createQueueMock()

    // Coach has high_five (5 sessions) but now only has 1 session + 10 kudos
    mock.enqueue('coach_badges', { data: [
      { badge_key: 'first_steps' },
      { badge_key: 'high_five' },
    ] })
    // Stats: 1 session, 10 kudos
    mock.enqueue('sessions', { data: null, count: 1 })
    mock.enqueue('sessions', { data: [{ athlete_id: 'a1', date: '2026-01-01' }] })
    mock.enqueue('sessions', { data: null, count: 0 })
    mock.enqueue('kudos', { data: null, count: 10 })
    mock.enqueue('sessions', { data: null, count: 0 })
    // Insert for cheerleader badge
    mock.enqueue('coach_badges', { data: null })
    // Delete for revoked high_five badge
    mock.enqueue('coach_badges', { data: null })

    mockFrom.mockImplementation(mock.impl)

    const result = await syncBadges(userId)
    expect(result.awarded).toContain('cheerleader')
    expect(result.revoked).toContain('high_five')
    // first_steps should be retained (1 session still meets threshold)
    expect(result.revoked).not.toContain('first_steps')
  })

  it('does not revoke badges that are still valid', async () => {
    const mock = createQueueMock()

    // Coach has first_steps and stats still show 1 session
    mock.enqueue('coach_badges', { data: [{ badge_key: 'first_steps' }] })
    mock.enqueue('sessions', { data: null, count: 1 })
    mock.enqueue('sessions', { data: [{ athlete_id: 'a1', date: '2026-01-01' }] })
    mock.enqueue('sessions', { data: null, count: 0 })
    mock.enqueue('kudos', { data: null, count: 0 })
    mock.enqueue('sessions', { data: null, count: 0 })

    mockFrom.mockImplementation(mock.impl)

    const result = await syncBadges(userId)
    expect(result.revoked).toHaveLength(0)
    expect(result.awarded).toHaveLength(0)
    // No delete should have been called
    expect(mock.deletes['coach_badges']).toBeUndefined()
  })

  it('revokes multiple badges at once', async () => {
    const mock = createQueueMock()

    // Coach had 5 sessions with 3 athletes, now has 0
    mock.enqueue('coach_badges', { data: [
      { badge_key: 'first_steps' },
      { badge_key: 'high_five' },
      { badge_key: 'team_player' },
    ] })
    // Stats: 0 sessions, 0 athletes
    mock.enqueue('sessions', { data: null, count: 0 })
    mock.enqueue('sessions', { data: [] })
    mock.enqueue('sessions', { data: null, count: 0 })
    mock.enqueue('kudos', { data: null, count: 0 })
    mock.enqueue('sessions', { data: null, count: 0 })
    // Delete response
    mock.enqueue('coach_badges', { data: null })

    mockFrom.mockImplementation(mock.impl)

    const result = await syncBadges(userId)
    expect(result.revoked).toContain('first_steps')
    expect(result.revoked).toContain('high_five')
    expect(result.revoked).toContain('team_player')
    expect(result.revoked).toHaveLength(3)
    expect(result.awarded).toHaveLength(0)
  })

  it('returns empty results on error and does not throw', async () => {
    mockFrom.mockImplementation(() => chainable(null, 'db error'))

    const result = await syncBadges(userId)
    expect(result.awarded).toHaveLength(0)
    expect(result.revoked).toHaveLength(0)
  })

  it('awards cheerleader badge when kudos count meets threshold', async () => {
    const mock = createQueueMock()

    mock.enqueue('coach_badges', { data: [] })
    mock.enqueue('sessions', { data: null, count: 1 })
    mock.enqueue('sessions', { data: [{ athlete_id: 'a1', date: '2026-01-01' }] })
    mock.enqueue('sessions', { data: null, count: 0 })
    mock.enqueue('kudos', { data: null, count: 10 })
    mock.enqueue('sessions', { data: null, count: 0 })
    mock.enqueue('coach_badges', { data: null })

    mockFrom.mockImplementation(mock.impl)

    const result = await syncBadges(userId)
    expect(result.awarded).toContain('cheerleader')
    expect(result.awarded).toContain('first_steps')
  })

  it('awards storyteller and heart_reader badges', async () => {
    const mock = createQueueMock()

    mock.enqueue('coach_badges', { data: [{ badge_key: 'first_steps' }] })
    mock.enqueue('sessions', { data: null, count: 1 })
    mock.enqueue('sessions', { data: [{ athlete_id: 'a1', date: '2026-01-01' }] })
    mock.enqueue('sessions', { data: null, count: 10 }) // notes
    mock.enqueue('kudos', { data: null, count: 0 })
    mock.enqueue('sessions', { data: null, count: 10 }) // feels
    mock.enqueue('coach_badges', { data: null })

    mockFrom.mockImplementation(mock.impl)

    const result = await syncBadges(userId)
    expect(result.awarded).toContain('storyteller')
    expect(result.awarded).toContain('heart_reader')
  })
})

describe('checkAndAwardBadges (backward compat)', () => {
  const userId = 'coach-1'

  it('returns only the awarded badges as a string array', async () => {
    const mock = createQueueMock()

    mock.enqueue('coach_badges', { data: [] })
    mock.enqueue('sessions', { data: null, count: 1 })
    mock.enqueue('sessions', { data: [{ athlete_id: 'a1', date: '2026-01-01' }] })
    mock.enqueue('sessions', { data: null, count: 0 })
    mock.enqueue('kudos', { data: null, count: 0 })
    mock.enqueue('sessions', { data: null, count: 0 })
    mock.enqueue('coach_badges', { data: null })

    mockFrom.mockImplementation(mock.impl)

    const newBadges = await checkAndAwardBadges(userId)
    expect(newBadges).toContain('first_steps')
    expect(Array.isArray(newBadges)).toBe(true)
  })

  it('returns empty array on error', async () => {
    mockFrom.mockImplementation(() => chainable(null, 'db error'))

    const newBadges = await checkAndAwardBadges(userId)
    expect(newBadges).toHaveLength(0)
  })
})
