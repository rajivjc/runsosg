/**
 * Unit tests for Strava token refresh logic and notification dedup.
 *
 * Tests the critical path: token refresh failure should create a
 * strava_disconnected notification only once, not spam the coach.
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockFrom = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  adminClient: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

const mockRefreshAccessToken = jest.fn()

jest.mock('@/lib/strava/client', () => ({
  refreshAccessToken: (...args: unknown[]) =>
    mockRefreshAccessToken(...args),
}))

import { getValidAccessToken } from '@/lib/strava/tokens'

// ── Helpers ──────────────────────────────────────────────────────────────────

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
        return (..._args: unknown[]) => new Proxy(obj, handler)
      },
    }
    return new Proxy(obj, handler)
  }

  return { enqueue, impl, inserts, updates }
}

const COACH_ID = 'coach-user-1'

beforeEach(() => {
  jest.clearAllMocks()
})

// ── Tests ────────────────────────────────────────────────────────────────────

describe('getValidAccessToken', () => {
  it('returns existing token when not expired', async () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const mock = createQueueMock()

    mock.enqueue('strava_connections', {
      data: {
        access_token: 'valid-token',
        refresh_token: 'rt-1',
        token_expires_at: futureDate,
      },
    })

    mockFrom.mockImplementation(mock.impl)

    const token = await getValidAccessToken(COACH_ID)
    expect(token).toBe('valid-token')
    expect(mockRefreshAccessToken).not.toHaveBeenCalled()
  })

  it('refreshes token when expired and returns new token', async () => {
    const pastDate = new Date(Date.now() - 60 * 1000).toISOString()
    const mock = createQueueMock()

    // Select connection with expired token
    mock.enqueue('strava_connections', {
      data: {
        access_token: 'old-token',
        refresh_token: 'old-rt',
        token_expires_at: pastDate,
      },
    })
    // Update with new tokens
    mock.enqueue('strava_connections', { data: null })

    mockRefreshAccessToken.mockResolvedValue({
      access_token: 'new-token',
      refresh_token: 'new-rt',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    })

    mockFrom.mockImplementation(mock.impl)

    const token = await getValidAccessToken(COACH_ID)
    expect(token).toBe('new-token')
    expect(mockRefreshAccessToken).toHaveBeenCalledWith('old-rt')

    // Verify DB was updated with new tokens
    expect(mock.updates['strava_connections']).toBeDefined()
    expect(mock.updates['strava_connections'][0]).toHaveProperty(
      'access_token',
      'new-token'
    )
    expect(mock.updates['strava_connections'][0]).toHaveProperty(
      'refresh_token',
      'new-rt'
    )
  })

  it('creates strava_disconnected notification on refresh failure', async () => {
    const pastDate = new Date(Date.now() - 60 * 1000).toISOString()
    const mock = createQueueMock()

    // Select connection with expired token
    mock.enqueue('strava_connections', {
      data: {
        access_token: 'old-token',
        refresh_token: 'bad-rt',
        token_expires_at: pastDate,
      },
    })
    // Update connection status to token_expired
    mock.enqueue('strava_connections', { data: null })
    // Check for existing notification — none
    mock.enqueue('notifications', { data: [] })
    // Insert notification
    mock.enqueue('notifications', { data: null })

    mockRefreshAccessToken.mockRejectedValue(
      new Error('Strava token refresh failed: 401')
    )

    mockFrom.mockImplementation(mock.impl)

    await expect(getValidAccessToken(COACH_ID)).rejects.toThrow(
      'Strava token refresh failed: 401'
    )

    // Verify strava_disconnected notification was created
    expect(mock.inserts['notifications']).toBeDefined()
    expect(mock.inserts['notifications']).toHaveLength(1)
    const notif = mock.inserts['notifications'][0] as Record<string, unknown>
    expect(notif.type).toBe('strava_disconnected')
    expect(notif.user_id).toBe(COACH_ID)
  })

  it('does NOT create duplicate strava_disconnected notification', async () => {
    const pastDate = new Date(Date.now() - 60 * 1000).toISOString()
    const mock = createQueueMock()

    // Select connection with expired token
    mock.enqueue('strava_connections', {
      data: {
        access_token: 'old-token',
        refresh_token: 'bad-rt',
        token_expires_at: pastDate,
      },
    })
    // Update connection status to token_expired
    mock.enqueue('strava_connections', { data: null })
    // Check for existing notification — found one
    mock.enqueue('notifications', { data: [{ id: 'existing-notif' }] })

    mockRefreshAccessToken.mockRejectedValue(
      new Error('Strava token refresh failed: 401')
    )

    mockFrom.mockImplementation(mock.impl)

    await expect(getValidAccessToken(COACH_ID)).rejects.toThrow(
      'Strava token refresh failed: 401'
    )

    // NO notification inserts (dedup)
    expect(mock.inserts['notifications']).toBeUndefined()
  })

  it('throws when no Strava connection found', async () => {
    const mock = createQueueMock()

    mock.enqueue('strava_connections', {
      data: null,
      error: { message: 'not found' },
    })

    mockFrom.mockImplementation(mock.impl)

    await expect(getValidAccessToken(COACH_ID)).rejects.toThrow(
      'No Strava connection found'
    )
  })
})
