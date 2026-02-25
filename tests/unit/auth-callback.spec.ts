/**
 * Unit tests for the /auth/callback route handler.
 *
 * Tests that the email magic-link callback:
 * 1. Blocks deactivated users (signs out + redirects to /login?error=revoked)
 * 2. Blocks unknown users (no users table row)
 * 3. Redirects coaches/admins to /feed
 * 4. Redirects caregivers to their linked athlete
 * 5. Redirects to /login?error=auth on failure
 */

// ── Mocks (must be before imports) ───────────────────────────────────────────

const mockFrom = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  adminClient: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

const mockExchangeCode = jest.fn()
const mockGetUser = jest.fn()
const mockSignOut = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: {
      exchangeCodeForSession: (...args: unknown[]) => mockExchangeCode(...args),
      getUser: () => mockGetUser(),
      signOut: () => mockSignOut(),
    },
  }),
}))

// Mock next/server — NextResponse.redirect
const mockRedirect = jest.fn().mockImplementation((url: string) => ({
  url,
  status: 307,
}))

jest.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: string) => mockRedirect(url),
  },
}))

import { GET } from '@/app/auth/callback/route'

// ── Helpers ───────────────────────────────────────────────────────────────────

function createQueueMock() {
  const queues: Record<string, Array<{ data: unknown; error: unknown }>> = {}

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
        return (..._args: unknown[]) => new Proxy(obj, handler)
      },
    }
    return new Proxy(obj, handler)
  }

  return { enqueue, impl }
}

function makeRequest(url: string) {
  return {
    url,
    headers: {
      get(name: string) {
        if (name === 'host') return 'app.example.com'
        if (name === 'x-forwarded-host') return null
        if (name === 'x-forwarded-proto') return 'https'
        return null
      },
    },
  } as unknown as Parameters<typeof GET>[0]
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('/auth/callback GET', () => {
  const baseUrl = 'https://app.example.com'

  it('redirects to /login?error=auth when no code param', async () => {
    const request = makeRequest(`${baseUrl}/auth/callback`)

    await GET(request)

    expect(mockRedirect).toHaveBeenCalledWith(`${baseUrl}/login?error=auth`)
    expect(mockExchangeCode).not.toHaveBeenCalled()
  })

  it('redirects to /login?error=auth when code exchange fails', async () => {
    const request = makeRequest(`${baseUrl}/auth/callback?code=bad-code`)
    mockExchangeCode.mockResolvedValue({ error: { message: 'Invalid code' } })

    await GET(request)

    expect(mockRedirect).toHaveBeenCalledWith(`${baseUrl}/login?error=auth`)
  })

  it('redirects to /login?error=auth when getUser returns null', async () => {
    const request = makeRequest(`${baseUrl}/auth/callback?code=good-code`)
    mockExchangeCode.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({ data: { user: null } })

    await GET(request)

    expect(mockRedirect).toHaveBeenCalledWith(`${baseUrl}/login?error=auth`)
  })

  it('signs out and redirects to revoked when user is deactivated', async () => {
    const request = makeRequest(`${baseUrl}/auth/callback?code=good-code`)
    mockExchangeCode.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'deactivated@email.com' } },
    })

    const mock = createQueueMock()
    mock.enqueue('users', { data: { role: 'coach', name: 'Test', active: false } })
    mockFrom.mockImplementation(mock.impl)

    await GET(request)

    expect(mockSignOut).toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith(`${baseUrl}/login?error=revoked`)
  })

  it('signs out and redirects to revoked when no users table row', async () => {
    const request = makeRequest(`${baseUrl}/auth/callback?code=good-code`)
    mockExchangeCode.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'ghost-1', email: 'ghost@email.com' } },
    })

    const mock = createQueueMock()
    mock.enqueue('users', { data: null })
    mockFrom.mockImplementation(mock.impl)

    await GET(request)

    expect(mockSignOut).toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith(`${baseUrl}/login?error=revoked`)
  })

  it('redirects coach to /feed', async () => {
    const request = makeRequest(`${baseUrl}/auth/callback?code=good-code`)
    mockExchangeCode.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'coach-1', email: 'coach@email.com' } },
    })

    const mock = createQueueMock()
    mock.enqueue('users', { data: { role: 'coach', name: 'Coach', active: true } })
    mockFrom.mockImplementation(mock.impl)

    await GET(request)

    expect(mockSignOut).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith(`${baseUrl}/feed`)
  })

  it('redirects admin to /feed', async () => {
    const request = makeRequest(`${baseUrl}/auth/callback?code=good-code`)
    mockExchangeCode.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'admin-1', email: 'admin@email.com' } },
    })

    const mock = createQueueMock()
    mock.enqueue('users', { data: { role: 'admin', name: 'Admin', active: true } })
    mockFrom.mockImplementation(mock.impl)

    await GET(request)

    expect(mockRedirect).toHaveBeenCalledWith(`${baseUrl}/feed`)
  })

  it('redirects caregiver to linked athlete page', async () => {
    const request = makeRequest(`${baseUrl}/auth/callback?code=good-code`)
    mockExchangeCode.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'cg-1', email: 'caregiver@email.com' } },
    })

    const mock = createQueueMock()
    mock.enqueue('users', { data: { role: 'caregiver', name: 'Caregiver', active: true } })
    mock.enqueue('invitations', { data: { athlete_id: 'athlete-42' } })
    mock.enqueue('athletes', { data: null })
    mockFrom.mockImplementation(mock.impl)

    await GET(request)

    expect(mockRedirect).toHaveBeenCalledWith(`${baseUrl}/athletes/athlete-42`)
  })

  it('redirects caregiver to /feed when no invitation found', async () => {
    const request = makeRequest(`${baseUrl}/auth/callback?code=good-code`)
    mockExchangeCode.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'cg-1', email: 'caregiver@email.com' } },
    })

    const mock = createQueueMock()
    mock.enqueue('users', { data: { role: 'caregiver', name: 'Caregiver', active: true } })
    mock.enqueue('invitations', { data: null })
    mockFrom.mockImplementation(mock.impl)

    await GET(request)

    expect(mockRedirect).toHaveBeenCalledWith(`${baseUrl}/feed`)
  })
})
