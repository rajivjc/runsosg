/**
 * Unit tests for the verifyOtpAndRedirect server action.
 *
 * Tests that OTP verification:
 * 1. Blocks deactivated users (signs out + redirects to /login?error=revoked)
 * 2. Blocks unknown users (no users table row)
 * 3. Returns proper error on invalid OTP
 * 4. Redirects coaches/admins to /feed
 * 5. Redirects caregivers to their linked athlete
 */

// ── Mocks (must be before imports) ───────────────────────────────────────────

const mockFrom = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  adminClient: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

const mockVerifyOtp = jest.fn()
const mockGetUser = jest.fn()
const mockSignOut = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: {
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
      getUser: () => mockGetUser(),
      signOut: () => mockSignOut(),
    },
  }),
}))

import { verifyOtpAndRedirect } from '@/app/login/get-redirect-path'

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

beforeEach(() => {
  jest.clearAllMocks()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('verifyOtpAndRedirect', () => {
  const email = 'user@email.com'
  const token = '123456'

  it('returns error on invalid OTP', async () => {
    mockVerifyOtp.mockResolvedValue({
      error: { message: 'Token has expired or is invalid' },
    })

    const result = await verifyOtpAndRedirect(email, token)

    expect(result.error).toMatch(/invalid or expired/i)
    expect(result.redirectPath).toBe('')
  })

  it('redirects to login error when getUser returns null', async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await verifyOtpAndRedirect(email, token)

    expect(result.redirectPath).toBe('/login?error=auth')
  })

  it('signs out and redirects to revoked when user is deactivated', async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email } } })

    const mock = createQueueMock()
    mock.enqueue('users', { data: { role: 'coach', name: 'Test', active: false } })
    mockFrom.mockImplementation(mock.impl)

    const result = await verifyOtpAndRedirect(email, token)

    expect(mockSignOut).toHaveBeenCalled()
    expect(result.redirectPath).toBe('/login?error=revoked')
    expect(result.error).toBeNull()
  })

  it('signs out and redirects to revoked when no users table row exists', async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({ data: { user: { id: 'ghost-1', email } } })

    const mock = createQueueMock()
    // No user row (user was fully deleted but somehow has auth session)
    mock.enqueue('users', { data: null })
    mockFrom.mockImplementation(mock.impl)

    const result = await verifyOtpAndRedirect(email, token)

    expect(mockSignOut).toHaveBeenCalled()
    expect(result.redirectPath).toBe('/login?error=revoked')
  })

  it('redirects coach to /feed', async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({ data: { user: { id: 'coach-1', email } } })

    const mock = createQueueMock()
    mock.enqueue('users', { data: { role: 'coach', name: 'Coach', active: true } })
    mockFrom.mockImplementation(mock.impl)

    const result = await verifyOtpAndRedirect(email, token)

    expect(result.error).toBeNull()
    expect(result.redirectPath).toBe('/feed')
    expect(mockSignOut).not.toHaveBeenCalled()
  })

  it('redirects admin to /feed', async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1', email } } })

    const mock = createQueueMock()
    mock.enqueue('users', { data: { role: 'admin', name: 'Admin', active: true } })
    mockFrom.mockImplementation(mock.impl)

    const result = await verifyOtpAndRedirect(email, token)

    expect(result.error).toBeNull()
    expect(result.redirectPath).toBe('/feed')
  })

  it('redirects caregiver to linked athlete page', async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({ data: { user: { id: 'cg-1', email } } })

    const mock = createQueueMock()
    // User row — caregiver role
    mock.enqueue('users', { data: { role: 'caregiver', name: 'Caregiver', active: true } })
    // Invitation with athlete link
    mock.enqueue('invitations', { data: { athlete_id: 'athlete-42' } })
    // Athletes update (caregiver_user_id)
    mock.enqueue('athletes', { data: null })
    mockFrom.mockImplementation(mock.impl)

    const result = await verifyOtpAndRedirect(email, token)

    expect(result.error).toBeNull()
    expect(result.redirectPath).toBe('/athletes/athlete-42')
  })

  it('redirects caregiver to /feed when no invitation found', async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({ data: { user: { id: 'cg-1', email } } })

    const mock = createQueueMock()
    mock.enqueue('users', { data: { role: 'caregiver', name: 'Caregiver', active: true } })
    // No invitation found
    mock.enqueue('invitations', { data: null })
    mockFrom.mockImplementation(mock.impl)

    const result = await verifyOtpAndRedirect(email, token)

    expect(result.error).toBeNull()
    expect(result.redirectPath).toBe('/feed')
  })
})
