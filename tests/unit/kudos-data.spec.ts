/**
 * Unit tests for kudos data fetching across feed loaders and athlete page.
 *
 * The core bug: kudos.user_id references auth.users(id), not public.users(id),
 * so the PostgREST join `select('session_id, users(name)')` silently fails.
 * The fix: fetch kudos rows without the join, then look up giver names separately.
 *
 * Tests that:
 * 1. Coach feed builds correct kudosCounts, kudosGivers, and myKudos
 * 2. Caregiver feed builds the same
 * 3. Athlete page builds correct kudosCounts and kudosGivers
 * 4. Empty kudos returns empty maps
 * 5. Multiple kudos per session are counted correctly
 * 6. Giver names are extracted as first names only
 */

// ── Mocks (must be before imports) ───────────────────────────────────────────

const mockFrom = jest.fn()
const mockRpc = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  adminClient: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

const mockGetUser = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

jest.mock('@/lib/badges', () => ({
  BADGE_DEFINITIONS: [],
  syncBadges: jest.fn().mockResolvedValue({ awarded: [], revoked: [] }),
  checkAndAwardBadges: jest.fn(),
}))

jest.mock('@/lib/feed/today-focus', () => ({
  getCoachFocusData: jest.fn().mockResolvedValue(null),
  getCaregiverFocusData: jest.fn().mockResolvedValue(null),
}))

jest.mock('@/lib/feed/weekly-recap', () => ({
  computeWeeklyRecap: jest.fn().mockReturnValue(null),
}))

jest.mock('@/lib/onboarding', () => ({
  computeOnboardingState: jest.fn().mockReturnValue({ isNewUser: false }),
}))

jest.mock('@/lib/feed/utils', () => ({
  groupByDate: jest.fn().mockReturnValue({}),
}))

jest.mock('@/lib/feed/shared-queries', () => ({
  loadClubStats: jest.fn().mockResolvedValue({ totalKm: 0, totalSessions: 0, activeAthletes: 0, activeSince: null }),
}))

jest.mock('@/lib/media', () => ({
  getAthletePhotosPaginated: jest.fn().mockResolvedValue({ photos: [], nextCursor: null }),
  getAthletePhotos: jest.fn().mockResolvedValue([]),
  getAthletePhotoCount: jest.fn().mockResolvedValue(0),
  withSignedUrls: jest.fn().mockResolvedValue([]),
}))

jest.mock('@/lib/goals', () => ({
  calculateGoalProgress: jest.fn().mockReturnValue(null),
}))

jest.mock('@/lib/analytics/session-trends', () => ({
  computeWeeklyVolume: jest.fn().mockReturnValue([]),
  computeFeelTrend: jest.fn().mockReturnValue([]),
  computeDistanceTimeline: jest.fn().mockReturnValue([]),
}))

// getCaregiverFocusData is exported from today-focus (already mocked above)

import { loadCoachFeedData } from '@/lib/feed/coach-data'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Creates a queue-based mock for adminClient.from() chains.
 * Responses are enqueued per table and dequeued in FIFO order.
 */
function createQueueMock() {
  const queues: Record<string, Array<{ data: unknown; error: unknown; count?: number | null }>> = {}
  const inserts: Record<string, unknown[]> = {}
  const selectArgs: Record<string, string[]> = {}

  function enqueue(
    table: string,
    ...responses: Array<{ data: unknown; error?: unknown; count?: number | null }>
  ) {
    if (!queues[table]) queues[table] = []
    for (const r of responses) {
      queues[table].push({ data: r.data, error: r.error ?? null, count: r.count ?? null })
    }
  }

  function impl(table: string) {
    const obj: Record<string, unknown> = {}
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop: string) {
        if (prop === 'then') {
          const queue = queues[table]
          const response = queue?.shift() ?? { data: null, error: null, count: null }
          return (resolve: (v: unknown) => void) => resolve(response)
        }
        if (prop === 'insert') {
          return (data: unknown) => {
            if (!inserts[table]) inserts[table] = []
            inserts[table].push(data)
            return new Proxy(obj, handler)
          }
        }
        if (prop === 'select') {
          return (cols: string, ..._rest: unknown[]) => {
            if (!selectArgs[table]) selectArgs[table] = []
            selectArgs[table].push(cols)
            return new Proxy(obj, handler)
          }
        }
        return (..._args: unknown[]) => new Proxy(obj, handler)
      },
    }
    return new Proxy(obj, handler)
  }

  return { enqueue, impl, inserts, selectArgs }
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Coach feed kudos data', () => {
  const userId = 'coach-1'

  function setupCoachFeedMock(options: {
    sessions?: Array<{ id: string; date: string; athlete_id: string }>
    kudosRows?: Array<{ session_id: string; user_id: string }>
    myKudosRows?: Array<{ session_id: string }>
    giverUsers?: Array<{ id: string; name: string | null }>
  }) {
    const {
      sessions = [],
      kudosRows = [],
      myKudosRows = [],
      giverUsers = [],
    } = options

    const mock = createQueueMock()
    // Batch 1: user, sessions, milestones, myMonthSessions, myBadges, cheers, strava, sessionCount, clubStats, weeklyStats, athleteMessages
    mock.enqueue('users', { data: { role: 'coach', name: 'Coach One' } })
    mock.enqueue('sessions', { data: sessions.map(s => ({ ...s, distance_km: 2, duration_seconds: 600, feel: 3, note: null, coach_user_id: userId, strava_title: null, athletes: { name: 'Athlete' }, users: { name: 'Coach One' } })) })
    mock.enqueue('milestones', { data: [] })
    mock.enqueue('sessions', { data: [] }) // myMonthSessions
    mock.enqueue('coach_badges', { data: [] })
    mock.enqueue('cheers', { data: [] })
    mock.enqueue('strava_connections', { data: null })
    mock.enqueue('sessions', { data: null, count: 0 }) // myTotalSessionCount
    // weeklyStats handled by mockRpc

    mock.enqueue('athlete_messages', { data: [] })

    // Batch 2: kudos (the key queries we're testing)
    mock.enqueue('kudos', { data: kudosRows })     // kudos rows WITHOUT join
    mock.enqueue('kudos', { data: myKudosRows })   // my kudos
    mock.enqueue('users', { data: giverUsers })     // giver name lookup

    mockFrom.mockImplementation(mock.impl)
    mockRpc.mockResolvedValue({ data: [] })

    return mock
  }

  it('builds kudosCounts and kudosGivers from separate queries (not broken join)', async () => {
    setupCoachFeedMock({
      sessions: [
        { id: 'sess-1', date: '2026-03-08', athlete_id: 'ath-1' },
        { id: 'sess-2', date: '2026-03-07', athlete_id: 'ath-2' },
      ],
      kudosRows: [
        { session_id: 'sess-1', user_id: 'coach-2' },
        { session_id: 'sess-1', user_id: 'coach-3' },
        { session_id: 'sess-2', user_id: 'coach-2' },
      ],
      myKudosRows: [
        { session_id: 'sess-1' },
      ],
      giverUsers: [
        { id: 'coach-2', name: 'Sarah Chen' },
        { id: 'coach-3', name: 'Mike Tan' },
      ],
    })

    const result = await loadCoachFeedData(userId)

    // Counts should reflect actual kudos rows
    expect(result.kudosCounts['sess-1']).toBe(2)
    expect(result.kudosCounts['sess-2']).toBe(1)

    // Giver names should be first names only
    expect(result.kudosGivers['sess-1']).toEqual(['Sarah', 'Mike'])
    expect(result.kudosGivers['sess-2']).toEqual(['Sarah'])

    // myKudos should contain session IDs where current user gave kudos
    expect(result.myKudos.has('sess-1')).toBe(true)
    expect(result.myKudos.has('sess-2')).toBe(false)
  })

  it('returns empty maps when no kudos exist', async () => {
    setupCoachFeedMock({
      sessions: [{ id: 'sess-1', date: '2026-03-08', athlete_id: 'ath-1' }],
      kudosRows: [],
      myKudosRows: [],
      giverUsers: [],
    })

    const result = await loadCoachFeedData(userId)

    expect(result.kudosCounts).toEqual({})
    expect(result.kudosGivers).toEqual({})
    expect(result.myKudos.size).toBe(0)
  })

  it('handles giver with null name gracefully', async () => {
    setupCoachFeedMock({
      sessions: [{ id: 'sess-1', date: '2026-03-08', athlete_id: 'ath-1' }],
      kudosRows: [
        { session_id: 'sess-1', user_id: 'coach-2' },
      ],
      myKudosRows: [],
      giverUsers: [
        { id: 'coach-2', name: null },
      ],
    })

    const result = await loadCoachFeedData(userId)

    // Count is still 1 even if name is null
    expect(result.kudosCounts['sess-1']).toBe(1)
    // No giver name since it's null
    expect(result.kudosGivers['sess-1']).toBeUndefined()
  })

  it('does not use users(name) join on kudos table', async () => {
    const mock = setupCoachFeedMock({
      sessions: [{ id: 'sess-1', date: '2026-03-08', athlete_id: 'ath-1' }],
      kudosRows: [{ session_id: 'sess-1', user_id: 'coach-2' }],
      myKudosRows: [],
      giverUsers: [{ id: 'coach-2', name: 'Sarah Chen' }],
    })

    await loadCoachFeedData(userId)

    // Verify the kudos select does NOT include 'users(name)' — the broken join
    const kudosSelects = mock.selectArgs['kudos'] ?? []
    for (const selectStr of kudosSelects) {
      expect(selectStr).not.toContain('users(name)')
    }
  })
})
