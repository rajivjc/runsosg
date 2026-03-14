/**
 * Unit tests for the toggleKudos server action.
 *
 * Tests that kudos toggle:
 * 1. Requires authentication
 * 2. Gives kudos when not previously given
 * 3. Removes kudos when already given
 * 4. Handles duplicate insert (race condition) gracefully
 * 5. Returns error on insert failure
 * 6. Revalidates both /feed and /athletes/[id] paths
 * 7. Calls syncBadges after toggling
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

const mockRevalidatePath = jest.fn()

jest.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

const mockSyncBadges = jest.fn().mockResolvedValue({ awarded: [], revoked: [] })

jest.mock('@/lib/badges', () => ({
  syncBadges: (...args: unknown[]) => mockSyncBadges(...args),
}))

import { toggleKudos } from '@/app/feed/actions'

// ── Helpers ───────────────────────────────────────────────────────────────────

function createQueueMock() {
  const queues: Record<string, Array<{ data: unknown; error: unknown; count?: number | null }>> = {}
  const inserts: Record<string, unknown[]> = {}
  const deletes: Record<string, number> = {}

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

describe('toggleKudos', () => {
  const sessionId = 'session-1'
  const userId = 'user-1'
  const athleteId = 'athlete-1'

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await toggleKudos(sessionId)
    expect(result.error).toBe('Not authenticated')
    expect(result.given).toBe(false)
    expect(result.count).toBe(0)
  })

  it('gives kudos when not previously given', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } } })

    const mock = createQueueMock()
    // Check existing — not found
    mock.enqueue('kudos', { data: null })
    // Insert — success
    mock.enqueue('kudos', { data: null })
    // Count query
    mock.enqueue('kudos', { data: null, count: 1 })
    // Session lookup for athlete_id
    mock.enqueue('sessions', { data: { athlete_id: athleteId } })
    mockFrom.mockImplementation(mock.impl)

    const result = await toggleKudos(sessionId)
    expect(result.given).toBe(true)
    expect(result.count).toBe(1)
    expect(result.error).toBeUndefined()
    // Should insert a kudos row
    expect(mock.inserts['kudos']).toHaveLength(1)
    expect(mock.inserts['kudos']![0]).toEqual({ session_id: sessionId, user_id: userId })
  })

  it('removes kudos when already given', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } } })

    const mock = createQueueMock()
    // Check existing — found
    mock.enqueue('kudos', { data: { id: 'kudos-1' } })
    // Delete — success
    mock.enqueue('kudos', { data: null })
    // Count query
    mock.enqueue('kudos', { data: null, count: 0 })
    // Session lookup for athlete_id
    mock.enqueue('sessions', { data: { athlete_id: athleteId } })
    mockFrom.mockImplementation(mock.impl)

    const result = await toggleKudos(sessionId)
    expect(result.given).toBe(false)
    expect(result.count).toBe(0)
    expect(result.error).toBeUndefined()
    expect(mock.deletes['kudos']).toBe(1)
  })

  it('handles duplicate insert gracefully (race condition)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } } })

    const mock = createQueueMock()
    // Check existing — not found (race: another request inserted between check and insert)
    mock.enqueue('kudos', { data: null })
    // Insert — duplicate error (23505)
    mock.enqueue('kudos', { data: null, error: { code: '23505', message: 'duplicate key' } })
    // Count query
    mock.enqueue('kudos', { data: null, count: 1 })
    // Session lookup
    mock.enqueue('sessions', { data: { athlete_id: athleteId } })
    mockFrom.mockImplementation(mock.impl)

    const result = await toggleKudos(sessionId)
    // Duplicate is treated as success
    expect(result.given).toBe(true)
    expect(result.count).toBe(1)
    expect(result.error).toBeUndefined()
  })

  it('returns error on non-duplicate insert failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } } })

    const mock = createQueueMock()
    // Check existing — not found
    mock.enqueue('kudos', { data: null })
    // Insert — general error
    mock.enqueue('kudos', { data: null, error: { code: '42501', message: 'permission denied' } })
    mockFrom.mockImplementation(mock.impl)

    const result = await toggleKudos(sessionId)
    expect(result.error).toBe('Could not give kudos')
    expect(result.given).toBe(false)
    expect(result.count).toBe(0)
  })

  it('revalidates /feed and /athletes/[id] after giving kudos', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } } })

    const mock = createQueueMock()
    mock.enqueue('kudos', { data: null })
    mock.enqueue('kudos', { data: null })
    mock.enqueue('kudos', { data: null, count: 1 })
    mock.enqueue('sessions', { data: { athlete_id: athleteId } })
    mockFrom.mockImplementation(mock.impl)

    await toggleKudos(sessionId)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/feed')
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/athletes/${athleteId}`)
  })

  it('only revalidates /feed when session has no athlete_id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } } })

    const mock = createQueueMock()
    mock.enqueue('kudos', { data: null })
    mock.enqueue('kudos', { data: null })
    mock.enqueue('kudos', { data: null, count: 1 })
    // Session lookup returns null
    mock.enqueue('sessions', { data: null })
    mockFrom.mockImplementation(mock.impl)

    await toggleKudos(sessionId)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/feed')
    expect(mockRevalidatePath).toHaveBeenCalledTimes(1)
  })

  it('calls syncBadges after toggling kudos', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } } })

    const mock = createQueueMock()
    mock.enqueue('kudos', { data: null })
    mock.enqueue('kudos', { data: null })
    mock.enqueue('kudos', { data: null, count: 1 })
    mock.enqueue('sessions', { data: { athlete_id: athleteId } })
    mockFrom.mockImplementation(mock.impl)

    await toggleKudos(sessionId)
    expect(mockSyncBadges).toHaveBeenCalledWith(userId)
  })
})
