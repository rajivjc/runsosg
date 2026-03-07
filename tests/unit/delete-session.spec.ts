/**
 * Unit tests for the deleteSession server action.
 *
 * Tests that session deletion:
 * 1. Works for both manual and Strava-synced sessions
 * 2. Enforces ownership (coach or admin only)
 * 3. Cleans up related milestones and notifications
 * 4. Syncs badges after deletion (revokes stale badges)
 * 5. Handles errors properly
 */

// ── Mocks (must be before imports) ───────────────────────────────────────────

const mockFrom = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  adminClient: {
    from: (...args: unknown[]) => mockFrom(...args),
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

jest.mock('@/lib/milestones', () => ({
  checkAndAwardMilestones: jest.fn().mockResolvedValue(0),
}))

jest.mock('@/lib/media', () => ({
  getAthletePhotosPaginated: jest.fn().mockResolvedValue({ photos: [], nextCursor: null }),
  withSignedUrls: jest.fn().mockResolvedValue([]),
  deleteMediaForSession: jest.fn().mockResolvedValue(undefined),
  deleteMediaById: jest.fn().mockResolvedValue({}),
}))

const mockSyncBadges = jest.fn().mockResolvedValue({ awarded: [], revoked: [] })

jest.mock('@/lib/badges', () => ({
  syncBadges: (...args: unknown[]) => mockSyncBadges(...args),
}))

import { deleteSession } from '@/app/athletes/[id]/actions'

// ── Helpers ───────────────────────────────────────────────────────────────────

function createQueueMock() {
  const queues: Record<string, Array<{ data: unknown; error: unknown }>> = {}
  const deletes: Record<string, number> = {}

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

  return { enqueue, impl, deletes }
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('deleteSession', () => {
  const sessionId = 'session-1'
  const athleteId = 'athlete-1'
  const coachId = 'coach-1'

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await deleteSession(sessionId, athleteId)
    expect(result).toHaveProperty('error')
    expect(result.error).toMatch(/session has expired/i)
  })

  it('returns error when session is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: coachId } } })

    const mock = createQueueMock()
    mock.enqueue('sessions', { data: null })
    mockFrom.mockImplementation(mock.impl)

    const result = await deleteSession(sessionId, athleteId)
    expect(result).toHaveProperty('error')
    expect(result.error).toMatch(/not found/i)
  })

  it('deletes a manual session owned by the coach', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: coachId } } })

    const mock = createQueueMock()
    // Session lookup
    mock.enqueue('sessions', { data: { id: sessionId, sync_source: 'manual', coach_user_id: coachId } })
    // Delete milestones
    mock.enqueue('milestones', { data: null })
    // Delete notifications
    mock.enqueue('notifications', { data: null })
    // Delete session
    mock.enqueue('sessions', { data: null })
    mockFrom.mockImplementation(mock.impl)

    const result = await deleteSession(sessionId, athleteId)
    expect(result.error).toBeUndefined()
    // Milestones, notifications, and sessions should all have delete calls
    expect(mock.deletes['milestones']).toBe(1)
    expect(mock.deletes['notifications']).toBe(1)
    expect(mock.deletes['sessions']).toBe(1)
  })

  it('soft-deletes a Strava-synced session owned by the coach', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: coachId } } })

    const mock = createQueueMock()
    // Strava session — soft-deleted (update, not delete)
    mock.enqueue('sessions', { data: { id: sessionId, sync_source: 'strava_webhook', coach_user_id: coachId } })
    mock.enqueue('milestones', { data: null })
    mock.enqueue('notifications', { data: null })
    // Soft-delete via update (not hard delete)
    mock.enqueue('sessions', { data: null })
    mockFrom.mockImplementation(mock.impl)

    const result = await deleteSession(sessionId, athleteId)
    expect(result.error).toBeUndefined()
    // Strava sessions are soft-deleted (update strava_deleted_at), not hard-deleted
    expect(mock.deletes['sessions']).toBeUndefined()
  })

  it('returns error when coach tries to delete another coach session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'other-coach' } } })

    const mock = createQueueMock()
    // Session owned by a different coach
    mock.enqueue('sessions', { data: { id: sessionId, sync_source: 'manual', coach_user_id: coachId } })
    // Role check — not admin
    mock.enqueue('users', { data: { role: 'coach' } })
    mockFrom.mockImplementation(mock.impl)

    const result = await deleteSession(sessionId, athleteId)
    expect(result).toHaveProperty('error')
    expect(result.error).toMatch(/only delete sessions you logged/i)
  })

  it('allows admin to delete any session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })

    const mock = createQueueMock()
    // Session owned by another coach (manual — hard-delete)
    mock.enqueue('sessions', { data: { id: sessionId, sync_source: 'manual', coach_user_id: coachId } })
    // Admin role check
    mock.enqueue('users', { data: { role: 'admin' } })
    // Cleanup
    mock.enqueue('milestones', { data: null })
    mock.enqueue('notifications', { data: null })
    mock.enqueue('sessions', { data: null })
    mockFrom.mockImplementation(mock.impl)

    const result = await deleteSession(sessionId, athleteId)
    expect(result.error).toBeUndefined()
  })

  it('returns error when session delete query fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: coachId } } })

    const mock = createQueueMock()
    mock.enqueue('sessions', { data: { id: sessionId, sync_source: 'manual', coach_user_id: coachId } })
    mock.enqueue('milestones', { data: null })
    mock.enqueue('notifications', { data: null })
    // Delete fails
    mock.enqueue('sessions', { data: null, error: 'foreign key constraint' })
    mockFrom.mockImplementation(mock.impl)

    const result = await deleteSession(sessionId, athleteId)
    expect(result).toHaveProperty('error')
    expect(result.error).toMatch(/could not delete/i)
  })

  it('calls syncBadges with the session coach ID after successful deletion', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: coachId } } })

    const mock = createQueueMock()
    mock.enqueue('sessions', { data: { id: sessionId, sync_source: 'manual', coach_user_id: coachId } })
    mock.enqueue('milestones', { data: null })
    mock.enqueue('notifications', { data: null })
    mock.enqueue('sessions', { data: null })
    mockFrom.mockImplementation(mock.impl)

    await deleteSession(sessionId, athleteId)
    expect(mockSyncBadges).toHaveBeenCalledWith(coachId)
  })

  it('syncs badges for the session owner when admin deletes another coach session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })

    const mock = createQueueMock()
    // Session owned by coachId, deleted by admin (manual session — hard-delete)
    mock.enqueue('sessions', { data: { id: sessionId, sync_source: 'manual', coach_user_id: coachId } })
    mock.enqueue('users', { data: { role: 'admin' } })
    mock.enqueue('milestones', { data: null })
    mock.enqueue('notifications', { data: null })
    mock.enqueue('sessions', { data: null })
    mockFrom.mockImplementation(mock.impl)

    await deleteSession(sessionId, athleteId)
    // Should sync badges for the session owner (coachId), NOT the admin
    expect(mockSyncBadges).toHaveBeenCalledWith(coachId)
    expect(mockSyncBadges).not.toHaveBeenCalledWith('admin-1')
  })

  it('does not call syncBadges when session delete fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: coachId } } })

    const mock = createQueueMock()
    mock.enqueue('sessions', { data: { id: sessionId, sync_source: 'manual', coach_user_id: coachId } })
    mock.enqueue('milestones', { data: null })
    mock.enqueue('notifications', { data: null })
    mock.enqueue('sessions', { data: null, error: 'foreign key constraint' })
    mockFrom.mockImplementation(mock.impl)

    await deleteSession(sessionId, athleteId)
    expect(mockSyncBadges).not.toHaveBeenCalled()
  })
})
