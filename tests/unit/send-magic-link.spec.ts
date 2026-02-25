/**
 * Unit tests for the sendMagicLink server action.
 *
 * Tests that the login OTP flow:
 * 1. Blocks deleted users (no auth user) silently
 * 2. Blocks deactivated users (active=false) silently
 * 3. Uses shouldCreateUser:false to prevent auto-signup
 * 4. Handles rate limiting correctly
 * 5. Swallows "signups not allowed" errors to avoid leaking account existence
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

  it('returns silent success when email has no auth user (deleted user)', async () => {
    mockListUsers.mockResolvedValue({
      data: { users: [] },
    })

    const result = await sendMagicLink('deleted@email.com', origin)

    expect(result.error).toBeNull()
    // Should NOT call signInWithOtp at all
    expect(mockSignInWithOtp).not.toHaveBeenCalled()
  })

  it('returns silent success when user is deactivated (active=false)', async () => {
    mockListUsers.mockResolvedValue({
      data: {
        users: [{ id: 'user-1', email: 'deactivated@email.com' }],
      },
    })

    const mock = createQueueMock()
    mock.enqueue('users', { data: { active: false } })
    mockFrom.mockImplementation(mock.impl)

    const result = await sendMagicLink('deactivated@email.com', origin)

    expect(result.error).toBeNull()
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

  it('swallows "signups not allowed" error silently', async () => {
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

    // Should not reveal that the user doesn't exist
    expect(result.error).toBeNull()
  })

  it('swallows "user not found" error silently', async () => {
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

    expect(result.error).toBeNull()
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

  it('proceeds when user has no users table row (new invited user)', async () => {
    mockListUsers.mockResolvedValue({
      data: {
        users: [{ id: 'user-1', email: 'invited@email.com' }],
      },
    })

    const mock = createQueueMock()
    // No users table row yet (just invited, trigger hasn't run)
    mock.enqueue('users', { data: null })
    mockFrom.mockImplementation(mock.impl)

    mockSignInWithOtp.mockResolvedValue({ error: null })

    const result = await sendMagicLink('invited@email.com', origin)

    // active is not false (it's null/undefined), so OTP should be sent
    expect(result.error).toBeNull()
    expect(mockSignInWithOtp).toHaveBeenCalled()
  })
})
