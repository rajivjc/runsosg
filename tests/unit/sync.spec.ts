/**
 * Unit tests for the Strava sync pipeline (processStravaActivity).
 *
 * This is the most critical path in the application — it handles
 * webhook events from Strava and orchestrates session creation,
 * athlete matching, notifications, and milestone awards.
 */

// ── Mocks (must be before imports) ───────────────────────────────────────────

const mockFrom = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  adminClient: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

const mockGetValidAccessToken = jest.fn()
jest.mock('@/lib/strava/tokens', () => ({
  getValidAccessToken: (...args: unknown[]) => mockGetValidAccessToken(...args),
}))

const mockGetActivity = jest.fn()
jest.mock('@/lib/strava/client', () => ({
  getActivity: (...args: unknown[]) => mockGetActivity(...args),
}))

const mockMatchActivityToAthlete = jest.fn()
jest.mock('@/lib/strava/matching', () => ({
  matchActivityToAthlete: (...args: unknown[]) =>
    mockMatchActivityToAthlete(...args),
}))

const mockCheckAndAwardMilestones = jest.fn()
jest.mock('@/lib/milestones', () => ({
  checkAndAwardMilestones: (...args: unknown[]) =>
    mockCheckAndAwardMilestones(...args),
}))

import { processStravaActivity } from '@/lib/strava/sync'
import type { StravaActivity } from '@/lib/strava/client'

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Queue-based mock for adminClient.from().
 *
 * Each call to from(table) consumes the next response from that table's queue.
 * Inserts and updates are captured for assertions.
 */
function createQueueMock() {
  const queues: Record<string, Array<{ data: unknown; error: unknown }>> = {}
  const inserts: Record<string, unknown[]> = {}
  const updates: Record<string, unknown[]> = {}

  function enqueue(
    table: string,
    ...responses: Array<{ data: unknown; error?: unknown }>
  ) {
    if (!queues[table]) queues[table] = []
    for (const r of responses) {
      queues[table].push({ data: r.data, error: r.error ?? null })
    }
  }

  function impl(table: string) {
    const obj: Record<string, unknown> = {}
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop: string) {
        if (prop === 'then') {
          const queue = queues[table]
          const response = queue?.shift() ?? { data: null, error: null }
          return (resolve: (v: unknown) => void) => resolve(response)
        }
        if (prop === 'insert') {
          return (data: unknown) => {
            if (!inserts[table]) inserts[table] = []
            inserts[table].push(data)
            return new Proxy(obj, handler)
          }
        }
        if (prop === 'update') {
          return (data: unknown) => {
            if (!updates[table]) updates[table] = []
            updates[table].push(data)
            return new Proxy(obj, handler)
          }
        }
        // All other chain methods (select, eq, neq, in, is, contains, etc.)
        return (..._args: unknown[]) => new Proxy(obj, handler)
      },
    }
    return new Proxy(obj, handler)
  }

  return { enqueue, impl, inserts, updates }
}

function makeActivity(overrides: Partial<StravaActivity> = {}): StravaActivity {
  return {
    id: 99999,
    name: 'Evening Run #sosg Ali',
    sport_type: 'Run',
    start_date: '2026-02-20T18:00:00Z',
    distance: 5000,
    moving_time: 1800,
    description: null,
    map: { summary_polyline: 'abc123' },
    average_heartrate: 145,
    max_heartrate: 172,
    ...overrides,
  }
}

const COACH_ID = 'coach-user-1'
const ACTIVITY_ID = 99999

beforeEach(() => {
  jest.clearAllMocks()
  mockGetValidAccessToken.mockResolvedValue('valid-access-token')
  mockGetActivity.mockResolvedValue(makeActivity())
  mockCheckAndAwardMilestones.mockResolvedValue(0)
})

// ── Delete event ─────────────────────────────────────────────────────────────

describe('processStravaActivity — delete event', () => {
  it('soft-deletes sessions and updates sync log', async () => {
    const mock = createQueueMock()

    // Step 1: sync log insert
    mock.enqueue('strava_sync_log', { data: { id: 'log-1' } })
    // Step 2a: sessions update (soft delete)
    mock.enqueue('sessions', { data: null })
    // Step 2b: strava_unmatched update (resolve)
    mock.enqueue('strava_unmatched', { data: null })
    // Step 2c: notifications select (unmatched_run check) — none found
    mock.enqueue('notifications', { data: [] })
    // Step 2d: sessions select (deleted sessions for feel_prompt cleanup)
    mock.enqueue('sessions', { data: [] })
    // Step 2e: sync log update (mark matched)
    mock.enqueue('strava_sync_log', { data: null })

    mockFrom.mockImplementation(mock.impl)

    await processStravaActivity(ACTIVITY_ID, COACH_ID, 'delete', {})

    // Verify sessions were soft-deleted
    expect(mock.updates['sessions']).toBeDefined()
    expect(mock.updates['sessions'][0]).toHaveProperty('strava_deleted_at')
  })

  it('resolves unmatched rows and marks notifications as read', async () => {
    const mock = createQueueMock()

    // Step 1: sync log insert
    mock.enqueue('strava_sync_log', { data: { id: 'log-1' } })
    // Step 2a: sessions update (soft delete)
    mock.enqueue('sessions', { data: null })
    // Step 2b: strava_unmatched update (resolve)
    mock.enqueue('strava_unmatched', { data: null })
    // Step 2c: notifications select — find unmatched_run notifications
    mock.enqueue('notifications', { data: [{ id: 'notif-um-1' }] })
    // Step 2c: notifications update (mark read)
    mock.enqueue('notifications', { data: null })
    // Step 2d: sessions select (find sessions for feel_prompt cleanup)
    mock.enqueue('sessions', { data: [{ id: 'sess-1' }] })
    // Step 2e: notifications select (feel_prompt for sess-1)
    mock.enqueue('notifications', { data: [{ id: 'notif-fp-1' }] })
    // Step 2e: notifications update (mark feel_prompt read)
    mock.enqueue('notifications', { data: null })
    // Step 2f: sync log update
    mock.enqueue('strava_sync_log', { data: null })

    mockFrom.mockImplementation(mock.impl)

    await processStravaActivity(ACTIVITY_ID, COACH_ID, 'delete', {})

    // Verify unmatched row was resolved
    expect(mock.updates['strava_unmatched']).toBeDefined()
    expect(mock.updates['strava_unmatched'][0]).toHaveProperty('resolved_at')

    // Verify notifications were marked as read (2 update calls)
    const notifUpdates = mock.updates['notifications'] ?? []
    expect(notifUpdates).toHaveLength(2)
    expect(notifUpdates[0]).toEqual({ read: true })
    expect(notifUpdates[1]).toEqual({ read: true })
  })
})

// ── Create event — matched ──────────────────────────────────────────────────

describe('processStravaActivity — create event, matched', () => {
  function setupMatchedMock(opts?: { existingFeelPrompt?: boolean }) {
    const mock = createQueueMock()

    mockMatchActivityToAthlete.mockResolvedValue({
      matched: true,
      athletes: [
        {
          athleteId: 'athlete-ali',
          athleteName: 'Ali',
          method: 'hashtag',
          confidence: 'high',
          identifier: 'Ali',
        },
      ],
      ambiguousIdentifiers: [],
    })

    // Step 1: sync log insert
    mock.enqueue('strava_sync_log', { data: { id: 'log-1' } })
    // Step 3: duplicate check — no previous logs
    mock.enqueue('strava_sync_log', { data: [] })
    // Step 7/upsert: sessions select (existing check) → none
    mock.enqueue('sessions', { data: null })
    // Step 7/upsert: sessions insert → new session
    mock.enqueue('sessions', { data: { id: 'sess-new-1' } })
    // Step 8a: sessions select feel → null
    mock.enqueue('sessions', { data: { feel: null } })

    if (opts?.existingFeelPrompt) {
      // feel_prompt already exists
      mock.enqueue('notifications', {
        data: [{ id: 'existing-fp' }],
      })
    } else {
      // No existing feel_prompt → will insert
      mock.enqueue('notifications', { data: [] })
      // feel_prompt insert
      mock.enqueue('notifications', { data: null })
    }

    // Step 8a: sync log update (matched)
    mock.enqueue('strava_sync_log', { data: null })
    // Step 8a: strava_connections update
    mock.enqueue('strava_connections', { data: null })

    mockFrom.mockImplementation(mock.impl)
    return mock
  }

  it('creates session and feel_prompt notification', async () => {
    const mock = setupMatchedMock()

    await processStravaActivity(ACTIVITY_ID, COACH_ID, 'create', {})

    // Verify session was created
    expect(mock.inserts['sessions']).toBeDefined()
    expect(mock.inserts['sessions']).toHaveLength(1)
    const sessionInsert = mock.inserts['sessions'][0] as Record<string, unknown>
    expect(sessionInsert.athlete_id).toBe('athlete-ali')
    expect(sessionInsert.strava_activity_id).toBe(ACTIVITY_ID)
    expect(sessionInsert.distance_km).toBe(5)
    expect(sessionInsert.avg_heart_rate).toBe(145)
    expect(sessionInsert.max_heart_rate).toBe(172)

    // Verify feel_prompt notification was created
    expect(mock.inserts['notifications']).toBeDefined()
    const notifInsert = mock.inserts['notifications'][0] as Record<string, unknown>
    expect(notifInsert.type).toBe('feel_prompt')
    expect(notifInsert.user_id).toBe(COACH_ID)
    const payload = notifInsert.payload as Record<string, unknown>
    expect(payload.session_id).toBe('sess-new-1')
    expect(payload.athlete_id).toBe('athlete-ali')

    // Verify milestones were checked
    expect(mockCheckAndAwardMilestones).toHaveBeenCalledWith(
      'athlete-ali',
      'sess-new-1',
      COACH_ID
    )

    // Verify sync log was updated to matched
    const syncLogUpdates = mock.updates['strava_sync_log'] ?? []
    expect(syncLogUpdates).toHaveLength(1)
    expect(syncLogUpdates[0]).toHaveProperty('status', 'matched')
  })

  it('does NOT create duplicate feel_prompt if one already exists', async () => {
    const mock = setupMatchedMock({ existingFeelPrompt: true })

    await processStravaActivity(ACTIVITY_ID, COACH_ID, 'create', {})

    // No notification inserts (feel_prompt dedup)
    expect(mock.inserts['notifications']).toBeUndefined()
  })
})

// ── Create event — multi-athlete ────────────────────────────────────────────

describe('processStravaActivity — create event, multi-athlete', () => {
  it('creates sessions for each matched athlete', async () => {
    const mock = createQueueMock()

    mockMatchActivityToAthlete.mockResolvedValue({
      matched: true,
      athletes: [
        {
          athleteId: 'athlete-ali',
          athleteName: 'Ali',
          method: 'hashtag',
          confidence: 'high',
          identifier: 'Ali',
        },
        {
          athleteId: 'athlete-priya',
          athleteName: 'Priya',
          method: 'hashtag',
          confidence: 'high',
          identifier: 'Priya',
        },
      ],
      ambiguousIdentifiers: [],
    })

    // Step 1: sync log insert
    mock.enqueue('strava_sync_log', { data: { id: 'log-1' } })
    // Step 3: duplicate check
    mock.enqueue('strava_sync_log', { data: [] })

    // Athlete 1 (Ali): upsert session
    mock.enqueue('sessions', { data: null }) // no existing
    mock.enqueue('sessions', { data: { id: 'sess-ali' } }) // insert
    mock.enqueue('sessions', { data: { feel: null } }) // feel check
    mock.enqueue('notifications', { data: [] }) // no existing feel_prompt
    mock.enqueue('notifications', { data: null }) // insert feel_prompt

    // Athlete 2 (Priya): upsert session
    mock.enqueue('sessions', { data: null }) // no existing
    mock.enqueue('sessions', { data: { id: 'sess-priya' } }) // insert
    mock.enqueue('sessions', { data: { feel: null } }) // feel check
    mock.enqueue('notifications', { data: [] }) // no existing feel_prompt
    mock.enqueue('notifications', { data: null }) // insert feel_prompt

    // Finalize
    mock.enqueue('strava_sync_log', { data: null }) // update matched
    mock.enqueue('strava_connections', { data: null }) // update last_sync

    mockFrom.mockImplementation(mock.impl)

    await processStravaActivity(ACTIVITY_ID, COACH_ID, 'create', {})

    // Two session inserts
    expect(mock.inserts['sessions']).toHaveLength(2)
    const ids = (mock.inserts['sessions'] as Array<Record<string, unknown>>).map(
      (s) => s.athlete_id
    )
    expect(ids).toEqual(['athlete-ali', 'athlete-priya'])

    // Two feel_prompt notifications
    expect(mock.inserts['notifications']).toHaveLength(2)

    // Milestones checked for both
    expect(mockCheckAndAwardMilestones).toHaveBeenCalledTimes(2)
    expect(mockCheckAndAwardMilestones).toHaveBeenCalledWith(
      'athlete-ali',
      'sess-ali',
      COACH_ID
    )
    expect(mockCheckAndAwardMilestones).toHaveBeenCalledWith(
      'athlete-priya',
      'sess-priya',
      COACH_ID
    )
  })
})

// ── Update event — previously unmatched ─────────────────────────────────────

describe('processStravaActivity — update event, previously unmatched', () => {
  it('resolves unmatched row and marks old notifications as read', async () => {
    const mock = createQueueMock()

    mockMatchActivityToAthlete.mockResolvedValue({
      matched: true,
      athletes: [
        {
          athleteId: 'athlete-ali',
          athleteName: 'Ali',
          method: 'hashtag',
          confidence: 'high',
          identifier: 'Ali',
        },
      ],
      ambiguousIdentifiers: [],
    })

    // Step 1: sync log insert
    mock.enqueue('strava_sync_log', { data: { id: 'log-2' } })
    // Step 3: duplicate check — has previous unmatched log
    mock.enqueue('strava_sync_log', {
      data: [{ id: 'log-1', status: 'unmatched' }],
    })
    // eventType is 'update' so it continues processing

    // Upsert session (no existing)
    mock.enqueue('sessions', { data: null })
    mock.enqueue('sessions', { data: { id: 'sess-ali' } })
    mock.enqueue('sessions', { data: { feel: null } })
    mock.enqueue('notifications', { data: [] }) // no existing feel_prompt
    mock.enqueue('notifications', { data: null }) // insert feel_prompt

    // sync log + connection update
    mock.enqueue('strava_sync_log', { data: null })
    mock.enqueue('strava_connections', { data: null })

    // Update event → resolve unmatched
    mock.enqueue('strava_unmatched', { data: null })

    // Mark old unmatched_run notifications as read
    mock.enqueue('notifications', { data: [{ id: 'old-notif-1' }] })
    mock.enqueue('notifications', { data: null })

    mockFrom.mockImplementation(mock.impl)

    await processStravaActivity(ACTIVITY_ID, COACH_ID, 'update', {})

    // Verify unmatched row was resolved
    expect(mock.updates['strava_unmatched']).toBeDefined()
    expect(mock.updates['strava_unmatched'][0]).toHaveProperty('resolved_at')

    // Verify old notification was marked as read
    const notifUpdates = mock.updates['notifications'] ?? []
    expect(notifUpdates.some((u) => (u as Record<string, unknown>).read === true)).toBe(true)
  })
})

// ── Create event — unmatched ────────────────────────────────────────────────

describe('processStravaActivity — create event, unmatched', () => {
  function setupUnmatchedMock(opts?: {
    existingUnmatchedRow?: boolean
    existingNotification?: boolean
  }) {
    const mock = createQueueMock()

    mockMatchActivityToAthlete.mockResolvedValue({
      matched: false,
      athletes: [],
      ambiguousIdentifiers: [],
    })

    // Step 1: sync log insert
    mock.enqueue('strava_sync_log', { data: { id: 'log-1' } })
    // Step 3: duplicate check
    mock.enqueue('strava_sync_log', { data: [] })

    // Step 8b: check existing unmatched row
    if (opts?.existingUnmatchedRow) {
      mock.enqueue('strava_unmatched', { data: { id: 'existing-um' } })
      // Update existing row with fresh activity data
      mock.enqueue('strava_unmatched', { data: null })
    } else {
      mock.enqueue('strava_unmatched', { data: null })
      // Insert new unmatched row
      mock.enqueue('strava_unmatched', { data: { id: 'new-um-1' } })
    }

    // sync log update (unmatched)
    mock.enqueue('strava_sync_log', { data: null })

    // Check existing notification
    if (opts?.existingNotification) {
      mock.enqueue('notifications', {
        data: [{ id: 'existing-notif' }],
      })
    } else {
      mock.enqueue('notifications', { data: [] })
      // Insert notification
      mock.enqueue('notifications', { data: null })
    }

    mockFrom.mockImplementation(mock.impl)
    return mock
  }

  it('creates unmatched row and notification', async () => {
    const mock = setupUnmatchedMock()

    await processStravaActivity(ACTIVITY_ID, COACH_ID, 'create', {})

    // Verify unmatched row was created
    expect(mock.inserts['strava_unmatched']).toBeDefined()
    expect(mock.inserts['strava_unmatched']).toHaveLength(1)

    // Verify unmatched_run notification was created
    expect(mock.inserts['notifications']).toBeDefined()
    const notif = mock.inserts['notifications'][0] as Record<string, unknown>
    expect(notif.type).toBe('unmatched_run')
    expect(notif.user_id).toBe(COACH_ID)
    const payload = notif.payload as Record<string, unknown>
    expect(payload.strava_activity_id).toBe(ACTIVITY_ID)
  })

  it('does NOT create duplicate unmatched row — updates existing instead', async () => {
    const mock = setupUnmatchedMock({ existingUnmatchedRow: true })

    await processStravaActivity(ACTIVITY_ID, COACH_ID, 'create', {})

    // No new inserts to strava_unmatched
    expect(mock.inserts['strava_unmatched']).toBeUndefined()

    // Existing row was updated with fresh activity data
    expect(mock.updates['strava_unmatched']).toBeDefined()
    expect(mock.updates['strava_unmatched'][0]).toHaveProperty('activity_data')
  })

  it('does NOT create duplicate unmatched_run notification', async () => {
    const mock = setupUnmatchedMock({ existingNotification: true })

    await processStravaActivity(ACTIVITY_ID, COACH_ID, 'create', {})

    // No notification inserts
    expect(mock.inserts['notifications']).toBeUndefined()
  })
})

// ── Non-run sport type ──────────────────────────────────────────────────────

describe('processStravaActivity — non-run sport', () => {
  it('skips non-running activities', async () => {
    const mock = createQueueMock()

    mockGetActivity.mockResolvedValue(
      makeActivity({ sport_type: 'Ride' })
    )

    // Step 1: sync log insert
    mock.enqueue('strava_sync_log', { data: { id: 'log-1' } })
    // Step 3: duplicate check
    mock.enqueue('strava_sync_log', { data: [] })
    // Step 6: sync log update (skipped)
    mock.enqueue('strava_sync_log', { data: null })

    mockFrom.mockImplementation(mock.impl)

    await processStravaActivity(ACTIVITY_ID, COACH_ID, 'create', {})

    // Verify sync log was updated to skipped
    const syncUpdates = mock.updates['strava_sync_log'] ?? []
    expect(syncUpdates).toHaveLength(1)
    expect(syncUpdates[0]).toHaveProperty('status', 'skipped')

    // No sessions created
    expect(mock.inserts['sessions']).toBeUndefined()
  })
})

// ── Duplicate create event ──────────────────────────────────────────────────

describe('processStravaActivity — duplicate create', () => {
  it('skips when a previous matched log already exists', async () => {
    const mock = createQueueMock()

    // Step 1: sync log insert
    mock.enqueue('strava_sync_log', { data: { id: 'log-2' } })
    // Step 3: duplicate check — previous matched log exists
    mock.enqueue('strava_sync_log', {
      data: [{ id: 'log-1', status: 'matched' }],
    })
    // Step 3: sync log update (skipped)
    mock.enqueue('strava_sync_log', { data: null })

    mockFrom.mockImplementation(mock.impl)

    await processStravaActivity(ACTIVITY_ID, COACH_ID, 'create', {})

    // Verify it was skipped (no token fetch, no activity fetch)
    expect(mockGetValidAccessToken).not.toHaveBeenCalled()
    expect(mockGetActivity).not.toHaveBeenCalled()
  })
})

// ── Token error ─────────────────────────────────────────────────────────────

describe('processStravaActivity — token error', () => {
  it('logs error when token refresh fails', async () => {
    const mock = createQueueMock()

    mockGetValidAccessToken.mockRejectedValue(
      new Error('Strava token expired')
    )

    // Step 1: sync log insert
    mock.enqueue('strava_sync_log', { data: { id: 'log-1' } })
    // Step 3: duplicate check
    mock.enqueue('strava_sync_log', { data: [] })
    // Step 4: sync log update (error)
    mock.enqueue('strava_sync_log', { data: null })

    mockFrom.mockImplementation(mock.impl)

    await processStravaActivity(ACTIVITY_ID, COACH_ID, 'create', {})

    // Sync log updated with error
    const syncUpdates = mock.updates['strava_sync_log'] ?? []
    expect(syncUpdates).toHaveLength(1)
    expect(syncUpdates[0]).toHaveProperty('status', 'error')
    expect(syncUpdates[0]).toHaveProperty(
      'error_message',
      'Strava token expired'
    )
  })
})

// ── Session upsert (update existing) ────────────────────────────────────────

describe('processStravaActivity — session upsert on update', () => {
  it('updates existing session instead of creating new one', async () => {
    const mock = createQueueMock()

    mockMatchActivityToAthlete.mockResolvedValue({
      matched: true,
      athletes: [
        {
          athleteId: 'athlete-ali',
          athleteName: 'Ali',
          method: 'hashtag',
          confidence: 'high',
          identifier: 'Ali',
        },
      ],
      ambiguousIdentifiers: [],
    })

    // Step 1: sync log insert
    mock.enqueue('strava_sync_log', { data: { id: 'log-1' } })
    // Step 3: duplicate check — has previous
    mock.enqueue('strava_sync_log', {
      data: [{ id: 'log-prev', status: 'matched' }],
    })

    // Upsert: existing session found
    mock.enqueue('sessions', {
      data: { id: 'existing-sess', feel: 3, note: 'good' },
    })
    // Upsert: update existing session
    mock.enqueue('sessions', { data: { id: 'existing-sess' } })
    // Feel check — feel already set, so no notification
    mock.enqueue('sessions', { data: { feel: 3 } })

    // Finalize
    mock.enqueue('strava_sync_log', { data: null })
    mock.enqueue('strava_connections', { data: null })
    // Update event resolves unmatched
    mock.enqueue('strava_unmatched', { data: null })
    // Check for old unmatched notifications
    mock.enqueue('notifications', { data: [] })

    mockFrom.mockImplementation(mock.impl)

    await processStravaActivity(ACTIVITY_ID, COACH_ID, 'update', {})

    // Session was updated, not inserted
    expect(mock.updates['sessions']).toBeDefined()
    expect(mock.inserts['sessions']).toBeUndefined()

    // No feel_prompt notification (feel already set)
    expect(mock.inserts['notifications']).toBeUndefined()
  })
})
