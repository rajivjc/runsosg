/**
 * Unit tests for training session server actions.
 *
 * Tests cover: createSession, publishSession, cancelSession,
 * completeSession, deleteSession, and auth checks.
 */

// ── Mocks (must be before imports) ──────────────────────────────────────────

const mockGetUser = jest.fn()
const mockInsert = jest.fn()
const mockUpdate = jest.fn()
const mockDelete = jest.fn()
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockSingle = jest.fn()
const mockIn = jest.fn()
const mockFrom = jest.fn()

// Track which table is being queried so we can return different mocks
let currentTable = ''

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}))

jest.mock('@/lib/supabase/admin', () => ({
  adminClient: {
    from: (table: string) => {
      currentTable = table
      return mockFrom(table)
    },
  },
}))

jest.mock('@/lib/club', () => ({
  getClub: jest.fn().mockResolvedValue({
    id: 'club-1',
    timezone: 'UTC',
    recurring_session_day: null,
    recurring_session_time: null,
    recurring_session_end: null,
    recurring_session_location: null,
  }),
}))

jest.mock('@/lib/audit', () => ({
  logAudit: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

import {
  createSession,
  publishSession,
  cancelSession,
  completeSession,
  deleteSession,
} from '@/app/admin/sessions/actions'

// ── Helpers ─────────────────────────────────────────────────────────────────

function mockAuth(user: { id: string; email: string } | null) {
  if (!user) {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    return
  }
  mockGetUser.mockResolvedValue({ data: { user } })
}

function mockCallerUser(data: { role: string; can_manage_sessions?: boolean } | null) {
  // When querying 'users' for the caller, return this
  const chain = {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data, error: null }),
      }),
    }),
  }
  return chain
}

function setupFromMock(handlers: Record<string, unknown>) {
  mockFrom.mockImplementation((table: string) => {
    if (handlers[table]) return handlers[table]
    // Default: return chainable mock
    return {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
        in: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }
  })
}

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value)
  }
  return fd
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

// ── createSession ───────────────────────────────────────────────────────────

describe('createSession', () => {
  it('rejects unauthenticated users', async () => {
    mockAuth(null)

    const result = await createSession({}, makeFormData({
      date: '2026-03-29',
      startTime: '08:00',
      location: 'Fort Canning',
    }))

    expect(result.error).toMatch(/session has expired/i)
  })

  it('rejects users without admin or can_manage_sessions', async () => {
    mockAuth({ id: 'user-1', email: 'coach@test.com' })

    setupFromMock({
      users: {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'coach', can_manage_sessions: false },
              error: null,
            }),
          }),
        }),
      },
    })

    const result = await createSession({}, makeFormData({
      date: '2026-03-29',
      startTime: '08:00',
      location: 'Fort Canning',
    }))

    expect(result.error).toMatch(/permission/i)
  })

  it('requires date, startTime, and location', async () => {
    mockAuth({ id: 'user-1', email: 'admin@test.com' })

    setupFromMock({
      users: {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'admin', can_manage_sessions: false },
              error: null,
            }),
          }),
        }),
      },
    })

    const result1 = await createSession({}, makeFormData({
      date: '',
      startTime: '08:00',
      location: 'Fort Canning',
    }))
    expect(result1.error).toMatch(/date/i)

    const result2 = await createSession({}, makeFormData({
      date: '2026-03-29',
      startTime: '',
      location: 'Fort Canning',
    }))
    expect(result2.error).toMatch(/start time/i)

    const result3 = await createSession({}, makeFormData({
      date: '2026-03-29',
      startTime: '08:00',
      location: '',
    }))
    expect(result3.error).toMatch(/location/i)
  })

  it('creates a session with status draft and returns the session ID', async () => {
    mockAuth({ id: 'user-1', email: 'admin@test.com' })

    const mockInsertChain = {
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 'session-new' },
          error: null,
        }),
      }),
    }

    setupFromMock({
      users: {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'admin', can_manage_sessions: false },
              error: null,
            }),
          }),
        }),
      },
      training_sessions: {
        insert: jest.fn().mockReturnValue(mockInsertChain),
      },
    })

    const result = await createSession({}, makeFormData({
      date: '2026-03-29',
      startTime: '08:00',
      location: 'Fort Canning',
    }))

    expect(result.success).toBeTruthy()
    expect(result.sessionId).toBe('session-new')
  })

  it('allows coaches with can_manage_sessions to create sessions', async () => {
    mockAuth({ id: 'user-1', email: 'coach@test.com' })

    const mockInsertChain = {
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 'session-new' },
          error: null,
        }),
      }),
    }

    setupFromMock({
      users: {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'coach', can_manage_sessions: true },
              error: null,
            }),
          }),
        }),
      },
      training_sessions: {
        insert: jest.fn().mockReturnValue(mockInsertChain),
      },
    })

    const result = await createSession({}, makeFormData({
      date: '2026-03-29',
      startTime: '08:00',
      location: 'Fort Canning',
    }))

    expect(result.success).toBeTruthy()
    expect(result.sessionId).toBe('session-new')
  })
})

// ── publishSession ──────────────────────────────────────────────────────────

describe('publishSession', () => {
  it('rejects unauthenticated users', async () => {
    mockAuth(null)
    const result = await publishSession('session-1')
    expect(result.error).toMatch(/session has expired/i)
  })

  it('rejects publishing an already published session', async () => {
    mockAuth({ id: 'user-1', email: 'admin@test.com' })

    setupFromMock({
      users: {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'admin', can_manage_sessions: false },
              error: null,
            }),
          }),
        }),
      },
      training_sessions: {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { status: 'published', club_id: 'club-1' },
              error: null,
            }),
          }),
        }),
      },
    })

    const result = await publishSession('session-1')
    expect(result.error).toMatch(/only draft/i)
  })

  it('changes status from draft to published and creates RSVP rows', async () => {
    mockAuth({ id: 'user-1', email: 'admin@test.com' })

    const mockCoachInsert = jest.fn().mockResolvedValue({ error: null })
    const mockAthleteInsert = jest.fn().mockResolvedValue({ error: null })
    const mockUpdateEq = jest.fn().mockResolvedValue({ error: null })

    let trainingCallCount = 0
    setupFromMock({
      users: {
        select: jest.fn().mockImplementation((fields: string) => {
          if (fields === 'id') {
            // Querying active coaches
            return {
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ id: 'coach-1' }, { id: 'coach-2' }],
                  error: null,
                }),
              }),
            }
          }
          // Querying caller user
          return {
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { role: 'admin', can_manage_sessions: false },
                error: null,
              }),
            }),
          }
        }),
      },
      training_sessions: {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { status: 'draft', club_id: 'club-1' },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: mockUpdateEq,
        }),
      },
      athletes: {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ id: 'athlete-1' }, { id: 'athlete-2' }, { id: 'athlete-3' }],
            error: null,
          }),
        }),
      },
      session_coach_rsvps: {
        insert: mockCoachInsert,
      },
      session_athlete_rsvps: {
        insert: mockAthleteInsert,
      },
    })

    const result = await publishSession('session-1')

    expect(result.success).toBeTruthy()
    expect(mockCoachInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ session_id: 'session-1', coach_id: 'coach-1', status: 'pending' }),
        expect.objectContaining({ session_id: 'session-1', coach_id: 'coach-2', status: 'pending' }),
      ])
    )
    expect(mockAthleteInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ session_id: 'session-1', athlete_id: 'athlete-1', status: 'pending' }),
      ])
    )
  })

  it('rejects if session does not exist', async () => {
    mockAuth({ id: 'user-1', email: 'admin@test.com' })

    setupFromMock({
      users: {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'admin', can_manage_sessions: false },
              error: null,
            }),
          }),
        }),
      },
      training_sessions: {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      },
    })

    const result = await publishSession('nonexistent')
    expect(result.error).toMatch(/not found/i)
  })
})

// ── cancelSession ───────────────────────────────────────────────────────────

describe('cancelSession', () => {
  it('rejects unauthenticated users', async () => {
    mockAuth(null)
    const result = await cancelSession('session-1')
    expect(result.error).toMatch(/session has expired/i)
  })

  it('cancels a draft session', async () => {
    mockAuth({ id: 'user-1', email: 'admin@test.com' })

    const mockUpdateEq = jest.fn().mockResolvedValue({ error: null })

    setupFromMock({
      users: {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'admin', can_manage_sessions: false },
              error: null,
            }),
          }),
        }),
      },
      training_sessions: {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { status: 'draft' },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: mockUpdateEq,
        }),
      },
    })

    const result = await cancelSession('session-1')
    expect(result.success).toBeTruthy()
  })

  it('cancels a published session', async () => {
    mockAuth({ id: 'user-1', email: 'admin@test.com' })

    const mockUpdateEq = jest.fn().mockResolvedValue({ error: null })

    setupFromMock({
      users: {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'admin', can_manage_sessions: false },
              error: null,
            }),
          }),
        }),
      },
      training_sessions: {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { status: 'published' },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: mockUpdateEq,
        }),
      },
    })

    const result = await cancelSession('session-1')
    expect(result.success).toBeTruthy()
  })

  it('rejects cancelling a completed session', async () => {
    mockAuth({ id: 'user-1', email: 'admin@test.com' })

    setupFromMock({
      users: {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'admin', can_manage_sessions: false },
              error: null,
            }),
          }),
        }),
      },
      training_sessions: {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { status: 'completed' },
              error: null,
            }),
          }),
        }),
      },
    })

    const result = await cancelSession('session-1')
    expect(result.error).toMatch(/only draft or published/i)
  })
})

// ── completeSession ─────────────────────────────────────────────────────────

describe('completeSession', () => {
  it('rejects unauthenticated users', async () => {
    mockAuth(null)
    const result = await completeSession('session-1')
    expect(result.error).toMatch(/session has expired/i)
  })

  it('completes a published session and sets completed_at', async () => {
    mockAuth({ id: 'user-1', email: 'admin@test.com' })

    const mockUpdateFn = jest.fn()
    const mockUpdateEq = jest.fn().mockResolvedValue({ error: null })
    mockUpdateFn.mockReturnValue({ eq: mockUpdateEq })

    setupFromMock({
      users: {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'admin', can_manage_sessions: false },
              error: null,
            }),
          }),
        }),
      },
      training_sessions: {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { status: 'published' },
              error: null,
            }),
          }),
        }),
        update: mockUpdateFn,
      },
    })

    const result = await completeSession('session-1')
    expect(result.success).toBeTruthy()
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        completed_at: expect.any(String),
      })
    )
  })

  it('rejects completing a draft session', async () => {
    mockAuth({ id: 'user-1', email: 'admin@test.com' })

    setupFromMock({
      users: {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'admin', can_manage_sessions: false },
              error: null,
            }),
          }),
        }),
      },
      training_sessions: {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { status: 'draft' },
              error: null,
            }),
          }),
        }),
      },
    })

    const result = await completeSession('session-1')
    expect(result.error).toMatch(/only published/i)
  })
})

// ── deleteSession ───────────────────────────────────────────────────────────

describe('deleteSession', () => {
  it('rejects unauthenticated users', async () => {
    mockAuth(null)
    const result = await deleteSession('session-1')
    expect(result.error).toMatch(/session has expired/i)
  })

  it('deletes a draft session', async () => {
    mockAuth({ id: 'user-1', email: 'admin@test.com' })

    const mockDeleteEq = jest.fn().mockResolvedValue({ error: null })

    setupFromMock({
      users: {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'admin', can_manage_sessions: false },
              error: null,
            }),
          }),
        }),
      },
      training_sessions: {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { status: 'draft', location: 'Fort Canning', session_start: '2026-03-29T00:00:00Z' },
              error: null,
            }),
          }),
        }),
        delete: jest.fn().mockReturnValue({
          eq: mockDeleteEq,
        }),
      },
    })

    const result = await deleteSession('session-1')
    expect(result.success).toBeTruthy()
  })

  it('rejects deleting a published session', async () => {
    mockAuth({ id: 'user-1', email: 'admin@test.com' })

    setupFromMock({
      users: {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'admin', can_manage_sessions: false },
              error: null,
            }),
          }),
        }),
      },
      training_sessions: {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { status: 'published', location: 'Fort Canning', session_start: '2026-03-29T00:00:00Z' },
              error: null,
            }),
          }),
        }),
      },
    })

    const result = await deleteSession('session-1')
    expect(result.error).toMatch(/only draft/i)
  })

  it('rejects deleting a completed session', async () => {
    mockAuth({ id: 'user-1', email: 'admin@test.com' })

    setupFromMock({
      users: {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'admin', can_manage_sessions: false },
              error: null,
            }),
          }),
        }),
      },
      training_sessions: {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { status: 'completed', location: 'Fort Canning', session_start: '2026-03-29T00:00:00Z' },
              error: null,
            }),
          }),
        }),
      },
    })

    const result = await deleteSession('session-1')
    expect(result.error).toMatch(/only draft/i)
  })
})
