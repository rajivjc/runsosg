/**
 * Unit tests for the sendMagicLink server action.
 *
 * Tests that the login OTP flow:
 * 1. Returns notFound error for nonexistent users
 * 2. Returns notFound error for deactivated users (active=false)
 * 3. Returns notFound error for ghost users (auth exists, no users row)
 * 4. Uses shouldCreateUser:false to prevent auto-signup
 * 5. Handles rate limiting correctly
 * 6. Returns notFound error for "signups not allowed" / "user not found" OTP errors
 */

// ── Mocks (must be before imports) ───────────────────────────────────────────

const mockFrom = jest.fn()
const mockListUsers = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  adminClient: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      admin: {
        listUsers: () => mockListUsers(),
      },
    },
  },
}))

const mockSignInWithOtp = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: {
      signInWithOtp: (...args: unknown[]) => mockSignInWithOtp(...args),
    },
  }),
}))

import { sendMagicLink } from '@/app/login/actions'

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

describe('sendMagicLink', () => {
  const origin = 'https://app.example.com'

  it('returns notFound error when email has no auth user (nonexistent account)', async () => {
    mockListUsers.mockResolvedValue({
      data: { users: [] },
    })

    const result = await sendMagicLink('nobody@email.com', origin)

    expect(result.error).toMatch(/no account found/i)
    expect(result.notFound).toBe(true)
    // Should NOT call signInWithOtp at all
    expect(mockSignInWithOtp).not.toHaveBeenCalled()
  })

  it('returns notFound error when user is deactivated (active=false)', async () => {
    mockListUsers.mockResolvedValue({
      data: {
        users: [{ id: 'user-1', email: 'deactivated@email.com' }],
      },
    })

    const mock = createQueueMock()
    mock.enqueue('users', { data: { active: false } })
    mockFrom.mockImplementation(mock.impl)

    const result = await sendMagicLink('deactivated@email.com', origin)

    expect(result.error).toMatch(/no account found/i)
    expect(result.notFound).toBe(true)
    // Should NOT call signInWithOtp
    expect(mockSignInWithOtp).not.toHaveBeenCalled()
  })

  it('sends OTP with shouldCreateUser:false for active users', async () => {
    mockListUsers.mockResolvedValue({
      data: {
        users: [{ id: 'user-1', email: 'active@email.com' }],
      },
    })

    const mock = createQueueMock()
    mock.enqueue('users', { data: { active: true } })
    mockFrom.mockImplementation(mock.impl)

    mockSignInWithOtp.mockResolvedValue({ error: null })

    const result = await sendMagicLink('active@email.com', origin)

    expect(result.error).toBeNull()
    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'active@email.com',
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        shouldCreateUser: false,
      },
    })
  })

  it('returns rate limit error on 429 response', async () => {
    mockListUsers.mockResolvedValue({
      data: {
        users: [{ id: 'user-1', email: 'user@email.com' }],
      },
    })

    const mock = createQueueMock()
    mock.enqueue('users', { data: { active: true } })
    mockFrom.mockImplementation(mock.impl)

    mockSignInWithOtp.mockResolvedValue({
      error: { status: 429, message: 'Rate limit exceeded' },
    })

    const result = await sendMagicLink('user@email.com', origin)

    expect(result.error).toMatch(/too many requests/i)
    expect(result.rateLimited).toBe(true)
  })

  it('returns notFound error on "signups not allowed" OTP error', async () => {
    mockListUsers.mockResolvedValue({
      data: {
        users: [{ id: 'user-1', email: 'user@email.com' }],
      },
    })

    const mock = createQueueMock()
    mock.enqueue('users', { data: { active: true } })
    mockFrom.mockImplementation(mock.impl)

    mockSignInWithOtp.mockResolvedValue({
      error: { status: 400, message: 'Signups not allowed for otp' },
    })

    const result = await sendMagicLink('user@email.com', origin)

    expect(result.error).toMatch(/no account found/i)
    expect(result.notFound).toBe(true)
  })

  it('returns notFound error on "user not found" OTP error', async () => {
    mockListUsers.mockResolvedValue({
      data: {
        users: [{ id: 'user-1', email: 'user@email.com' }],
      },
    })

    const mock = createQueueMock()
    mock.enqueue('users', { data: { active: true } })
    mockFrom.mockImplementation(mock.impl)

    mockSignInWithOtp.mockResolvedValue({
      error: { status: 400, message: 'User not found' },
    })

    const result = await sendMagicLink('user@email.com', origin)

    expect(result.error).toMatch(/no account found/i)
    expect(result.notFound).toBe(true)
  })

  it('returns generic error for unexpected failures', async () => {
    mockListUsers.mockResolvedValue({
      data: {
        users: [{ id: 'user-1', email: 'user@email.com' }],
      },
    })

    const mock = createQueueMock()
    mock.enqueue('users', { data: { active: true } })
    mockFrom.mockImplementation(mock.impl)

    mockSignInWithOtp.mockResolvedValue({
      error: { status: 500, message: 'Internal server error' },
    })

    const result = await sendMagicLink('user@email.com', origin)

    expect(result.error).toMatch(/something went wrong/i)
  })

  it('matches email case-insensitively', async () => {
    mockListUsers.mockResolvedValue({
      data: {
        users: [{ id: 'user-1', email: 'User@Email.Com' }],
      },
    })

    const mock = createQueueMock()
    mock.enqueue('users', { data: { active: true } })
    mockFrom.mockImplementation(mock.impl)

    mockSignInWithOtp.mockResolvedValue({ error: null })

    const result = await sendMagicLink('user@email.com', origin)

    expect(result.error).toBeNull()
    expect(mockSignInWithOtp).toHaveBeenCalled()
  })

  it('returns notFound error when auth user exists but no users table row (ghost user)', async () => {
    mockListUsers.mockResolvedValue({
      data: {
        users: [{ id: 'user-1', email: 'ghost@email.com' }],
      },
    })

    const mock = createQueueMock()
    // Auth user exists but users table row was deleted (ghost user)
    mock.enqueue('users', { data: null })
    mockFrom.mockImplementation(mock.impl)

    const result = await sendMagicLink('ghost@email.com', origin)

    expect(result.error).toMatch(/no account found/i)
    expect(result.notFound).toBe(true)
    // Should NOT send OTP — no users row means deleted/ghost user
    expect(mockSignInWithOtp).not.toHaveBeenCalled()
  })

  it('does not transition to OTP page for nonexistent email (notFound flag is set)', async () => {
    // This test ensures the notFound flag is always set for non-existent accounts
    // so the UI can differentiate from a generic error and show the right message
    mockListUsers.mockResolvedValue({
      data: { users: [] },
    })

    const result = await sendMagicLink('stranger@email.com', origin)

    // The UI checks notFound to decide whether to show OTP page or error
    expect(result.notFound).toBe(true)
    expect(result.error).not.toBeNull()
    expect(result.error).toContain('contact your administrator')
    expect(mockSignInWithOtp).not.toHaveBeenCalled()
  })

  it('error message suggests contacting administrator for all not-found scenarios', async () => {
    // Nonexistent user
    mockListUsers.mockResolvedValue({ data: { users: [] } })
    const result1 = await sendMagicLink('no-one@email.com', origin)
    expect(result1.error).toContain('contact your administrator')
    expect(result1.notFound).toBe(true)

    // Deactivated user
    jest.clearAllMocks()
    mockListUsers.mockResolvedValue({
      data: { users: [{ id: 'user-1', email: 'inactive@email.com' }] },
    })
    const mock = createQueueMock()
    mock.enqueue('users', { data: { active: false } })
    mockFrom.mockImplementation(mock.impl)
    const result2 = await sendMagicLink('inactive@email.com', origin)
    expect(result2.error).toContain('contact your administrator')
    expect(result2.notFound).toBe(true)
  })
})
