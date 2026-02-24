/**
 * Unit tests for notification server actions.
 *
 * Tests markNotificationRead and markAllNotificationsRead
 * with proper auth verification and error handling.
 */

// ── Mocks (must be before imports) ───────────────────────────────────────────

const mockFrom = jest.fn()
const mockUpdate = jest.fn()

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

import { markNotificationRead, markAllNotificationsRead } from '@/app/notifications/actions'

// ── Helpers ───────────────────────────────────────────────────────────────────

function chainable(data: unknown, error: unknown = null) {
  const obj: Record<string, unknown> = {}
  const updates: unknown[] = []
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => resolve({ data, error })
      }
      if (prop === 'update') {
        return (data: unknown) => {
          updates.push(data)
          mockUpdate(data)
          return new Proxy(obj, handler)
        }
      }
      return () => new Proxy(obj, handler)
    },
  }
  return new Proxy(obj, handler)
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('markNotificationRead', () => {
  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await markNotificationRead('notif-1')
    expect(result).toHaveProperty('error')
    expect(result.error).toMatch(/session has expired/i)
  })

  it('marks a notification as read for the authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockImplementation(() => chainable(null))

    const result = await markNotificationRead('notif-1')
    expect(result.error).toBeUndefined()
    // Verify update was called
    expect(mockUpdate).toHaveBeenCalledWith({ read: true })
  })

  it('returns error when database update fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockImplementation(() => chainable(null, 'db error'))

    const result = await markNotificationRead('notif-1')
    expect(result).toHaveProperty('error')
    expect(result.error).toMatch(/could not dismiss/i)
  })
})

describe('markAllNotificationsRead', () => {
  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await markAllNotificationsRead()
    expect(result).toHaveProperty('error')
    expect(result.error).toMatch(/session has expired/i)
  })

  it('marks all unread notifications as read', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockImplementation(() => chainable(null))

    const result = await markAllNotificationsRead()
    expect(result.error).toBeUndefined()
    expect(mockUpdate).toHaveBeenCalledWith({ read: true })
  })

  it('returns error when database update fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockImplementation(() => chainable(null, 'update failed'))

    const result = await markAllNotificationsRead()
    expect(result).toHaveProperty('error')
    expect(result.error).toMatch(/could not mark/i)
  })
})
