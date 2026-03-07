/**
 * Unit tests for cheer server actions.
 *
 * Verifies caregiver-only access, message validation,
 * rate limiting, and athlete-link checks.
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetUser = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve({
    auth: { getUser: mockGetUser },
  }),
}))

const mockFrom = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  adminClient: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

import { sendCheer, markCheersViewed } from '@/app/feed/cheer-actions'

// ── Helpers ──────────────────────────────────────────────────────────────────

function setupMocks(overrides: {
  user?: { id: string } | null
  role?: string
  athlete?: { id: string; caregiver_user_id: string } | null
  cheerCount?: number
  insertError?: unknown
} = {}) {
  const {
    user = { id: 'u1' },
    role = 'caregiver',
    athlete = { id: 'a1', caregiver_user_id: 'u1' },
    cheerCount = 0,
    insertError = null,
  } = overrides

  mockGetUser.mockResolvedValue({ data: { user } })

  const callIndex: Record<string, number> = {}

  mockFrom.mockImplementation((table: string) => {
    callIndex[table] = (callIndex[table] ?? -1) + 1
    const obj: Record<string, unknown> = {}
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop) {
        if (prop === 'then') {
          if (table === 'users') {
            return (resolve: (v: unknown) => void) => resolve({ data: { role }, error: null })
          }
          if (table === 'athletes') {
            return (resolve: (v: unknown) => void) => resolve({ data: athlete, error: null })
          }
          if (table === 'cheers' && callIndex[table] === 0) {
            // Rate limit check
            return (resolve: (v: unknown) => void) => resolve({ data: null, error: null, count: cheerCount })
          }
          if (table === 'cheers') {
            // Insert
            return (resolve: (v: unknown) => void) => resolve({ data: null, error: insertError })
          }
          return (resolve: (v: unknown) => void) => resolve({ data: null, error: null })
        }
        return (..._args: unknown[]) => new Proxy(obj, handler)
      },
    }
    return new Proxy(obj, handler)
  })
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('sendCheer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rejects unauthenticated users', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await sendCheer('a1', 'Go Ali!')
    expect(result.error).toBe('Not authenticated')
  })

  it('rejects non-caregiver roles', async () => {
    setupMocks({ role: 'coach' })
    const result = await sendCheer('a1', 'Go Ali!')
    expect(result.error).toBe('Only caregivers can send cheers')
  })

  it('rejects empty message', async () => {
    setupMocks()
    const result = await sendCheer('a1', '   ')
    expect(result.error).toBe('Message must be 1–100 characters')
  })

  it('rejects message over 100 characters', async () => {
    setupMocks()
    const result = await sendCheer('a1', 'x'.repeat(101))
    expect(result.error).toBe('Message must be 1–100 characters')
  })

  it('rejects cheer for unlinked athlete', async () => {
    setupMocks({ athlete: { id: 'a1', caregiver_user_id: 'other-user' } })
    const result = await sendCheer('a1', 'Go Ali!')
    expect(result.error).toBe('You can only send cheers for your linked athlete')
  })

  it('enforces rate limit of 3 cheers per day', async () => {
    setupMocks({ cheerCount: 3 })
    const result = await sendCheer('a1', 'Go Ali!')
    expect(result.error).toContain('3 cheers today')
  })

  it('succeeds with valid input', async () => {
    setupMocks({ cheerCount: 0 })
    const result = await sendCheer('a1', 'Go Ali! 🎉')
    expect(result.success).toBe('Cheer sent!')
  })
})

// ── markCheersViewed Tests ──────────────────────────────────────────────────

function setupViewedMocks(overrides: {
  user?: { id: string } | null
  role?: string
  updateError?: unknown
} = {}) {
  const {
    user = { id: 'coach1' },
    role = 'coach',
    updateError = null,
  } = overrides

  mockGetUser.mockResolvedValue({ data: { user } })

  mockFrom.mockImplementation((table: string) => {
    const obj: Record<string, unknown> = {}
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop) {
        if (prop === 'then') {
          if (table === 'users') {
            return (resolve: (v: unknown) => void) => resolve({ data: { role }, error: null })
          }
          if (table === 'cheers') {
            return (resolve: (v: unknown) => void) => resolve({ data: null, error: updateError })
          }
          return (resolve: (v: unknown) => void) => resolve({ data: null, error: null })
        }
        return (..._args: unknown[]) => new Proxy(obj, handler)
      },
    }
    return new Proxy(obj, handler)
  })
}

describe('markCheersViewed', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns empty result for empty array', async () => {
    const result = await markCheersViewed([])
    expect(result).toEqual({})
  })

  it('rejects unauthenticated users', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const result = await markCheersViewed(['c1'])
    expect(result.error).toBe('Not authenticated')
  })

  it('rejects caregiver role', async () => {
    setupViewedMocks({ role: 'caregiver' })
    const result = await markCheersViewed(['c1'])
    expect(result.error).toBe('Only coaches can mark cheers as viewed')
  })

  it('succeeds for coach role', async () => {
    setupViewedMocks({ role: 'coach' })
    const result = await markCheersViewed(['c1', 'c2'])
    expect(result).toEqual({})
  })

  it('succeeds for admin role', async () => {
    setupViewedMocks({ role: 'admin' })
    const result = await markCheersViewed(['c1'])
    expect(result).toEqual({})
  })

  it('returns error when update fails', async () => {
    setupViewedMocks({ updateError: { message: 'db error' } })
    const result = await markCheersViewed(['c1'])
    expect(result.error).toBe('Could not mark cheers as viewed')
  })
})
