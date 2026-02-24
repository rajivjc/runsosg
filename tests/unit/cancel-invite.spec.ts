/**
 * Unit tests for the cancelInvitation server action.
 *
 * Tests that canceling an invitation:
 * 1. Deletes the invitation row
 * 2. Deletes the ghost auth user (created by inviteUserByEmail)
 * 3. Requires admin role
 * 4. Handles errors properly
 */

// ── Mocks (must be before imports) ───────────────────────────────────────────

const mockFrom = jest.fn()
const mockListUsers = jest.fn()
const mockDeleteUser = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  adminClient: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      admin: {
        listUsers: () => mockListUsers(),
        deleteUser: (...args: unknown[]) => mockDeleteUser(...args),
      },
    },
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

import { cancelInvitation } from '@/app/admin/actions'

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

describe('cancelInvitation', () => {
  const invitationId = 'inv-1'

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await cancelInvitation(invitationId)
    expect(result).toHaveProperty('error')
    expect(result.error).toMatch(/session has expired/i)
  })

  it('returns error when caller is not admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    const mock = createQueueMock()
    // users table — role check
    mock.enqueue('users', { data: { role: 'coach' } })
    mockFrom.mockImplementation(mock.impl)

    const result = await cancelInvitation(invitationId)
    expect(result).toHaveProperty('error')
    expect(result.error).toMatch(/only admins/i)
  })

  it('returns error when invitation not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })

    const mock = createQueueMock()
    mock.enqueue('users', { data: { role: 'admin' } })
    // Invitation lookup returns null
    mock.enqueue('invitations', { data: null })
    mockFrom.mockImplementation(mock.impl)

    const result = await cancelInvitation(invitationId)
    expect(result).toHaveProperty('error')
    expect(result.error).toMatch(/not found/i)
  })

  it('deletes invitation and ghost auth user successfully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })

    const mock = createQueueMock()
    // Role check
    mock.enqueue('users', { data: { role: 'admin' } })
    // Find invitation
    mock.enqueue('invitations', { data: { email: 'wrong@email.com' } })
    // Delete invitation
    mock.enqueue('invitations', { data: null })
    // Delete users table row (if exists)
    mock.enqueue('users', { data: null })
    mockFrom.mockImplementation(mock.impl)

    // Auth user who never signed in
    mockListUsers.mockResolvedValue({
      data: {
        users: [
          { id: 'ghost-user-1', email: 'wrong@email.com', last_sign_in_at: null },
          { id: 'active-user', email: 'other@email.com', last_sign_in_at: '2026-01-01' },
        ],
      },
    })
    mockDeleteUser.mockResolvedValue({ data: null, error: null })

    const result = await cancelInvitation(invitationId)
    expect(result.error).toBeUndefined()

    // Verify ghost auth user was deleted
    expect(mockDeleteUser).toHaveBeenCalledWith('ghost-user-1')
  })

  it('does not delete auth user who has signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })

    const mock = createQueueMock()
    mock.enqueue('users', { data: { role: 'admin' } })
    mock.enqueue('invitations', { data: { email: 'active@email.com' } })
    mock.enqueue('invitations', { data: null })
    mockFrom.mockImplementation(mock.impl)

    // All users have signed in
    mockListUsers.mockResolvedValue({
      data: {
        users: [
          { id: 'user-1', email: 'active@email.com', last_sign_in_at: '2026-01-01' },
        ],
      },
    })

    const result = await cancelInvitation(invitationId)
    expect(result.error).toBeUndefined()
    // Should NOT delete auth user since they've signed in
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })

  it('succeeds even if auth user cleanup fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })

    const mock = createQueueMock()
    mock.enqueue('users', { data: { role: 'admin' } })
    mock.enqueue('invitations', { data: { email: 'test@email.com' } })
    mock.enqueue('invitations', { data: null })
    mockFrom.mockImplementation(mock.impl)

    // listUsers throws error
    mockListUsers.mockRejectedValue(new Error('network error'))

    const result = await cancelInvitation(invitationId)
    // Should still succeed — auth cleanup is best-effort
    expect(result.error).toBeUndefined()
  })

  it('returns error when invitation deletion fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })

    const mock = createQueueMock()
    mock.enqueue('users', { data: { role: 'admin' } })
    mock.enqueue('invitations', { data: { email: 'test@email.com' } })
    // Delete fails
    mock.enqueue('invitations', { data: null, error: 'constraint violation' })
    mockFrom.mockImplementation(mock.impl)

    const result = await cancelInvitation(invitationId)
    expect(result).toHaveProperty('error')
    expect(result.error).toMatch(/could not cancel/i)
  })
})
