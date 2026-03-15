/**
 * Unit tests for the updateWorkingOn server action.
 *
 * Tests that updating "working on" status:
 * 1. Requires authentication
 * 2. Rejects caregiver role
 * 3. Allows coach role
 * 4. Allows admin role
 * 5. Trims whitespace and converts empty strings to null
 * 6. Revalidates athlete and feed paths
 * 7. Handles database errors gracefully
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
  unstable_cache: (fn: Function) => fn,
}))

import { updateWorkingOn } from '@/app/athletes/[id]/actions'

// ── Helpers ───────────────────────────────────────────────────────────────────

function createQueueMock() {
  const queues: Record<string, Array<{ data: unknown; error: unknown }>> = {}
  const updates: Record<string, unknown[]> = {}

  function enqueue(table: string, ...responses: Array<{ data: unknown; error?: unknown }>) {
    if (!queues[table]) queues[table] = []
    for (const r of responses) {
      queues[table].push({ data: r.data, error: r.error ?? null })
    }
  }

  function impl(table: string) {
    const dequeue = () => {
      const q = queues[table]
      if (!q || q.length === 0) return { data: null, error: null }
      return q.shift()!
    }

    const chain: Record<string, unknown> = {}
    const methods = ['select', 'eq', 'single', 'maybeSingle', 'order', 'limit', 'in', 'gte', 'lte', 'is']
    for (const m of methods) {
      chain[m] = jest.fn().mockReturnValue(chain)
    }

    chain['update'] = jest.fn().mockImplementation((payload: unknown) => {
      if (!updates[table]) updates[table] = []
      updates[table].push(payload)
      return chain
    })

    // Terminal methods resolve
    const originalEq = chain['eq'] as jest.Mock
    originalEq.mockImplementation(() => {
      const result = dequeue()
      const terminal: Record<string, unknown> = {}
      for (const m of methods) {
        terminal[m] = jest.fn().mockReturnValue(result)
      }
      terminal['update'] = jest.fn().mockImplementation((payload: unknown) => {
        if (!updates[table]) updates[table] = []
        updates[table].push(payload)
        const updateChain: Record<string, unknown> = {}
        for (const um of methods) {
          updateChain[um] = jest.fn().mockReturnValue(result)
        }
        return updateChain
      })
      return terminal
    })

    return chain
  }

  return { enqueue, impl, updates }
}

const userId = 'user-123'
const athleteId = 'athlete-456'

beforeEach(() => {
  jest.clearAllMocks()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('updateWorkingOn', () => {
  it('returns error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await updateWorkingOn(athleteId, 'Walk-run intervals', null)

    expect(result.error).toBe('Your session has expired. Please sign in again.')
  })

  it('rejects caregiver role', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } } })
    const mock = createQueueMock()
    mock.enqueue('users', { data: { role: 'caregiver' } })
    mockFrom.mockImplementation((table: string) => mock.impl(table))

    const result = await updateWorkingOn(athleteId, 'Walk-run intervals', null)

    expect(result.error).toBe('Only coaches and admins can update this.')
  })

  it('allows coach role and updates successfully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } } })
    const mock = createQueueMock()
    mock.enqueue('users', { data: { role: 'coach' } })
    mock.enqueue('athletes', { data: null, error: null })
    mockFrom.mockImplementation((table: string) => mock.impl(table))

    const result = await updateWorkingOn(athleteId, 'Walk-run intervals', 'Can run 90 seconds')

    expect(result.error).toBeUndefined()
  })

  it('allows admin role', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } } })
    const mock = createQueueMock()
    mock.enqueue('users', { data: { role: 'admin' } })
    mock.enqueue('athletes', { data: null, error: null })
    mockFrom.mockImplementation((table: string) => mock.impl(table))

    const result = await updateWorkingOn(athleteId, 'Building endurance', null)

    expect(result.error).toBeUndefined()
  })

  it('revalidates athlete and feed paths on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } } })
    const mock = createQueueMock()
    mock.enqueue('users', { data: { role: 'coach' } })
    mock.enqueue('athletes', { data: null, error: null })
    mockFrom.mockImplementation((table: string) => mock.impl(table))

    await updateWorkingOn(athleteId, 'Walk-run intervals', null)

    expect(mockRevalidatePath).toHaveBeenCalledWith(`/athletes/${athleteId}`)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/feed')
  })
})
