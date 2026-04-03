/**
 * Tests for dynamic Strava hashtag prefix in matching and sync.
 *
 * Covers:
 * - extractIdentifiers with custom prefixes (tested in matching.spec.ts too)
 * - Unmatched notification uses dynamic prefix from getClub()
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockInsertPayloads: Record<string, unknown[]> = {}
const mockFrom = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  adminClient: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

const mockGetClub = jest.fn()
jest.mock('@/lib/club', () => ({
  getClub: (...args: unknown[]) => mockGetClub(...args),
}))

jest.mock('@/lib/strava/tokens', () => ({
  getValidAccessToken: jest.fn().mockResolvedValue('mock-token'),
}))

jest.mock('@/lib/strava/client', () => ({
  getActivity: jest.fn().mockResolvedValue({
    id: 99999,
    name: 'Solo morning jog',
    sport_type: 'Run',
    start_date: '2026-03-20T08:00:00Z',
    distance: 3000,
    moving_time: 1200,
    description: null,
    map: { summary_polyline: null },
    total_photo_count: 0,
    average_heartrate: null,
    max_heartrate: null,
  }),
}))

jest.mock('@/lib/milestones', () => ({
  checkAndAwardMilestones: jest.fn(),
}))

jest.mock('@/lib/badges', () => ({
  syncBadges: jest.fn(),
}))

import { processStravaActivity } from '@/lib/strava/sync'

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a chainable Supabase mock that tracks insert payloads by table name,
 * and returns configurable data for different query patterns.
 */
function setupMockFrom() {
  // Reset insert payloads
  for (const key of Object.keys(mockInsertPayloads)) {
    delete mockInsertPayloads[key]
  }

  mockFrom.mockImplementation((table: string) => {
    const obj: Record<string, unknown> = {}

    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => void) =>
            resolve({ data: null, error: null, count: 0 })
        }
        if (prop === 'insert') {
          return (payload: unknown) => {
            if (!mockInsertPayloads[table]) mockInsertPayloads[table] = []
            mockInsertPayloads[table].push(payload)
            return new Proxy(obj, handler)
          }
        }
        // For strava_sync_log insert → return an id
        if (prop === 'single' || prop === 'maybeSingle') {
          return () => {
            if (table === 'strava_sync_log') {
              return Promise.resolve({ data: { id: 'log-1' }, error: null })
            }
            return Promise.resolve({ data: null, error: null })
          }
        }
        return (..._args: unknown[]) => new Proxy(obj, handler)
      },
    }

    return new Proxy(obj, handler)
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  setupMockFrom()
})

// ── Tests ────────────────────────────────────────────────────────────────────

describe('unmatched notification uses dynamic prefix', () => {
  it('notification message contains custom club prefix, not #sosg', async () => {
    mockGetClub.mockResolvedValue({
      strava_hashtag_prefix: '#MYCLUB',
    })

    await processStravaActivity(99999, 'coach-1', 'create', {})

    // Find the notifications insert payload
    const notifInserts = mockInsertPayloads['notifications'] ?? []
    const unmatchedNotif = notifInserts.find(
      (p: unknown) =>
        typeof p === 'object' &&
        p !== null &&
        (p as Record<string, unknown>).type === 'unmatched_run'
    ) as Record<string, unknown> | undefined

    expect(unmatchedNotif).toBeDefined()
    const payload = unmatchedNotif!.payload as Record<string, string>
    expect(payload.message).toContain('#MYCLUB')
    expect(payload.message).not.toContain('#sosg')
  })

  it('falls back to #club when club has no strava_hashtag_prefix', async () => {
    mockGetClub.mockResolvedValue({
      strava_hashtag_prefix: null,
    })

    await processStravaActivity(99999, 'coach-1', 'create', {})

    const notifInserts = mockInsertPayloads['notifications'] ?? []
    const unmatchedNotif = notifInserts.find(
      (p: unknown) =>
        typeof p === 'object' &&
        p !== null &&
        (p as Record<string, unknown>).type === 'unmatched_run'
    ) as Record<string, unknown> | undefined

    expect(unmatchedNotif).toBeDefined()
    const payload = unmatchedNotif!.payload as Record<string, string>
    expect(payload.message).toContain('#club')
  })
})
