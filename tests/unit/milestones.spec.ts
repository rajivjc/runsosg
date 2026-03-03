/**
 * Unit tests for checkAndAwardMilestones logic.
 *
 * We mock the adminClient so no real Supabase is needed.
 * The tests verify the evaluation logic: which milestone definitions
 * should be awarded based on session data.
 */

// ── Mock email modules ────────────────────────────────────────────────────────

jest.mock('@/lib/email/resend', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
}))

jest.mock('@/lib/email/templates', () => ({
  milestoneEmail: jest.fn().mockReturnValue('<html>test</html>'),
}))

// ── Mock cached milestone definitions ─────────────────────────────────────────

const mockGetMilestoneDefinitions = jest.fn()

jest.mock('@/lib/feed/shared-queries', () => ({
  getMilestoneDefinitions: (...args: unknown[]) => mockGetMilestoneDefinitions(...args),
}))

// ── Mock adminClient ──────────────────────────────────────────────────────────

const mockFrom = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  adminClient: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { admin: { listUsers: jest.fn().mockResolvedValue({ data: { users: [] } }) } },
  },
}))

import { checkAndAwardMilestones } from '@/lib/milestones'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a chainable Supabase query mock that resolves to `data`. */
function chainable(data: unknown, error: unknown = null) {
  const obj: Record<string, unknown> = {}
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      if (prop === 'then') {
        // Make it thenable so `await` resolves
        return (resolve: (v: unknown) => void) => resolve({ data, error })
      }
      // Every other method returns the proxy again (select, eq, order, etc.)
      return () => new Proxy(obj, handler)
    },
  }
  return new Proxy(obj, handler)
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('checkAndAwardMilestones', () => {
  const athleteId = 'athlete-1'
  const sessionId = 'session-1'
  const coachId = 'coach-1'

  it('returns 0 when there are no active definitions', async () => {
    mockGetMilestoneDefinitions.mockResolvedValue([])
    mockFrom.mockImplementation(() => {
      return chainable([])
    })

    const count = await checkAndAwardMilestones(athleteId, sessionId, coachId)
    expect(count).toBe(0)
  })

  it('awards session_count milestone when count matches exactly', async () => {
    const insertedRows: unknown[] = []

    mockGetMilestoneDefinitions.mockResolvedValue([
      { id: 'def-1', label: 'First Run!', icon: '🏃', condition: { metric: 'session_count', threshold: 3 } },
    ])

    mockFrom.mockImplementation((table: string) => {
      if (table === 'milestones') {
        // On select (existing milestones) → none
        // On insert → capture the data
        const obj: Record<string, unknown> = {}
        const handler: ProxyHandler<Record<string, unknown>> = {
          get(_target, prop) {
            if (prop === 'then') {
              return (resolve: (v: unknown) => void) => resolve({ data: [], error: null })
            }
            if (prop === 'insert') {
              return (rows: unknown[]) => {
                insertedRows.push(...rows)
                return new Proxy(obj, handler)
              }
            }
            return (..._args: unknown[]) => new Proxy(obj, handler)
          },
        }
        return new Proxy(obj, handler)
      }
      if (table === 'sessions') {
        // 3 completed sessions, the current one included
        return chainable([
          { id: 'session-0a', date: '2026-01-01', distance_km: 2 },
          { id: 'session-0b', date: '2026-01-08', distance_km: 3 },
          { id: sessionId, date: '2026-01-15', distance_km: 2.5 },
        ])
      }
      return chainable([])
    })

    const count = await checkAndAwardMilestones(athleteId, sessionId, coachId)
    expect(count).toBe(1)
    expect(insertedRows).toHaveLength(1)
    expect((insertedRows[0] as Record<string, unknown>).milestone_definition_id).toBe('def-1')
    expect((insertedRows[0] as Record<string, unknown>).athlete_id).toBe(athleteId)
    expect((insertedRows[0] as Record<string, unknown>).session_id).toBe(sessionId)
    expect((insertedRows[0] as Record<string, unknown>).awarded_by).toBe(coachId)
  })

  it('awards session_count milestone when count EXCEEDS threshold (>=)', async () => {
    const insertedRows: unknown[] = []

    mockGetMilestoneDefinitions.mockResolvedValue([
      { id: 'def-3', label: '3 Runs', icon: '🏃', condition: { metric: 'session_count', threshold: 3 } },
    ])

    mockFrom.mockImplementation((table: string) => {
      if (table === 'milestones') {
        const obj: Record<string, unknown> = {}
        const handler: ProxyHandler<Record<string, unknown>> = {
          get(_target, prop) {
            if (prop === 'then') {
              return (resolve: (v: unknown) => void) => resolve({ data: [], error: null })
            }
            if (prop === 'insert') {
              return (rows: unknown[]) => {
                insertedRows.push(...rows)
                return new Proxy(obj, handler)
              }
            }
            return (..._args: unknown[]) => new Proxy(obj, handler)
          },
        }
        return new Proxy(obj, handler)
      }
      if (table === 'sessions') {
        // 5 sessions — exceeds threshold of 3 (tests >= instead of ===)
        return chainable([
          { id: 's1', date: '2026-01-01', distance_km: 2 },
          { id: 's2', date: '2026-01-02', distance_km: 3 },
          { id: 's3', date: '2026-01-03', distance_km: 2 },
          { id: 's4', date: '2026-01-04', distance_km: 4 },
          { id: sessionId, date: '2026-01-05', distance_km: 2.5 },
        ])
      }
      return chainable([])
    })

    const count = await checkAndAwardMilestones(athleteId, sessionId, coachId)
    expect(count).toBe(1)
    expect(insertedRows).toHaveLength(1)
    expect((insertedRows[0] as Record<string, unknown>).milestone_definition_id).toBe('def-3')
  })

  it('does NOT award session_count milestone when count does not match', async () => {
    mockGetMilestoneDefinitions.mockResolvedValue([
      { id: 'def-1', label: '5 Runs', icon: '🏃', condition: { metric: 'session_count', threshold: 5 } },
    ])

    mockFrom.mockImplementation((table: string) => {
      if (table === 'milestones') return chainable([])
      if (table === 'sessions') {
        return chainable([
          { id: sessionId, date: '2026-01-01', distance_km: 2 },
          { id: 's2', date: '2026-01-02', distance_km: 3 },
          { id: 's3', date: '2026-01-03', distance_km: 2 },
        ])
      }
      return chainable([])
    })

    const count = await checkAndAwardMilestones(athleteId, sessionId, coachId)
    expect(count).toBe(0)
  })

  it('awards distance_km milestone when current session distance >= threshold', async () => {
    const insertedRows: unknown[] = []

    mockGetMilestoneDefinitions.mockResolvedValue([
      { id: 'def-5k', label: '5K Runner', icon: '🎉', condition: { metric: 'distance_km', threshold: 5 } },
    ])

    mockFrom.mockImplementation((table: string) => {
      if (table === 'milestones') {
        const obj: Record<string, unknown> = {}
        const handler: ProxyHandler<Record<string, unknown>> = {
          get(_target, prop) {
            if (prop === 'then') {
              return (resolve: (v: unknown) => void) => resolve({ data: [], error: null })
            }
            if (prop === 'insert') {
              return (rows: unknown[]) => {
                insertedRows.push(...rows)
                return new Proxy(obj, handler)
              }
            }
            return (..._args: unknown[]) => new Proxy(obj, handler)
          },
        }
        return new Proxy(obj, handler)
      }
      if (table === 'sessions') {
        return chainable([
          { id: sessionId, date: '2026-02-01', distance_km: 5.2 },
        ])
      }
      return chainable([])
    })

    const count = await checkAndAwardMilestones(athleteId, sessionId, coachId)
    expect(count).toBe(1)
    expect(insertedRows).toHaveLength(1)
    expect((insertedRows[0] as Record<string, unknown>).milestone_definition_id).toBe('def-5k')
  })

  it('awards longest_run milestone when current session is the longest', async () => {
    const insertedRows: unknown[] = []

    mockGetMilestoneDefinitions.mockResolvedValue([
      { id: 'def-pb', label: 'Personal Best', icon: '⭐', condition: { metric: 'longest_run' } },
    ])

    mockFrom.mockImplementation((table: string) => {
      if (table === 'milestones') {
        const obj: Record<string, unknown> = {}
        const handler: ProxyHandler<Record<string, unknown>> = {
          get(_target, prop) {
            if (prop === 'then') {
              return (resolve: (v: unknown) => void) => resolve({ data: [], error: null })
            }
            if (prop === 'insert') {
              return (rows: unknown[]) => {
                insertedRows.push(...rows)
                return new Proxy(obj, handler)
              }
            }
            return (..._args: unknown[]) => new Proxy(obj, handler)
          },
        }
        return new Proxy(obj, handler)
      }
      if (table === 'sessions') {
        return chainable([
          { id: 'old-1', date: '2026-01-01', distance_km: 3 },
          { id: 'old-2', date: '2026-01-08', distance_km: 4 },
          { id: sessionId, date: '2026-01-15', distance_km: 5 },
        ])
      }
      return chainable([])
    })

    const count = await checkAndAwardMilestones(athleteId, sessionId, coachId)
    expect(count).toBe(1)
    expect(insertedRows).toHaveLength(1)
  })

  it('does NOT award longest_run when current session is NOT the longest', async () => {
    mockGetMilestoneDefinitions.mockResolvedValue([
      { id: 'def-pb', label: 'Personal Best', icon: '⭐', condition: { metric: 'longest_run' } },
    ])

    mockFrom.mockImplementation((table: string) => {
      if (table === 'milestones') return chainable([])
      if (table === 'sessions') {
        return chainable([
          { id: 'old-1', date: '2026-01-01', distance_km: 10 },
          { id: sessionId, date: '2026-01-15', distance_km: 5 },
        ])
      }
      return chainable([])
    })

    const count = await checkAndAwardMilestones(athleteId, sessionId, coachId)
    expect(count).toBe(0)
  })

  it('skips definitions already awarded to the athlete', async () => {
    mockGetMilestoneDefinitions.mockResolvedValue([
      { id: 'def-1', label: 'First Run!', icon: '🏃', condition: { metric: 'session_count', threshold: 1 } },
    ])

    mockFrom.mockImplementation((table: string) => {
      if (table === 'milestones') {
        // Already awarded def-1
        return chainable([{ milestone_definition_id: 'def-1' }])
      }
      if (table === 'sessions') {
        return chainable([{ id: sessionId, date: '2026-01-01', distance_km: 2 }])
      }
      return chainable([])
    })

    const count = await checkAndAwardMilestones(athleteId, sessionId, coachId)
    expect(count).toBe(0)
  })

  it('creates milestone notifications for the coach', async () => {
    const insertedMilestones: unknown[] = []
    const insertedNotifications: unknown[] = []

    mockGetMilestoneDefinitions.mockResolvedValue([
      { id: 'def-10', label: '10 Sessions', icon: '🔟', condition: { metric: 'session_count', threshold: 2 } },
    ])

    mockFrom.mockImplementation((table: string) => {
      if (table === 'milestones') {
        const obj: Record<string, unknown> = {}
        const handler: ProxyHandler<Record<string, unknown>> = {
          get(_target, prop) {
            if (prop === 'then') {
              return (resolve: (v: unknown) => void) => resolve({ data: [], error: null })
            }
            if (prop === 'insert') {
              return (rows: unknown[]) => {
                insertedMilestones.push(...rows)
                return new Proxy(obj, handler)
              }
            }
            return (..._args: unknown[]) => new Proxy(obj, handler)
          },
        }
        return new Proxy(obj, handler)
      }
      if (table === 'sessions') {
        return chainable([
          { id: 'session-a', date: '2026-01-01', distance_km: 2 },
          { id: sessionId, date: '2026-01-08', distance_km: 3 },
        ])
      }
      if (table === 'athletes') {
        return chainable({ name: 'Ali' })
      }
      if (table === 'notifications') {
        const obj: Record<string, unknown> = {}
        const handler: ProxyHandler<Record<string, unknown>> = {
          get(_target, prop) {
            if (prop === 'then') {
              return (resolve: (v: unknown) => void) => resolve({ data: [], error: null })
            }
            if (prop === 'insert') {
              return (rows: unknown[]) => {
                insertedNotifications.push(...rows)
                return new Proxy(obj, handler)
              }
            }
            return (..._args: unknown[]) => new Proxy(obj, handler)
          },
        }
        return new Proxy(obj, handler)
      }
      return chainable([])
    })

    const count = await checkAndAwardMilestones(athleteId, sessionId, coachId)
    expect(count).toBe(1)
    expect(insertedMilestones).toHaveLength(1)
    expect(insertedNotifications).toHaveLength(1)

    const notif = insertedNotifications[0] as Record<string, unknown>
    expect(notif.user_id).toBe(coachId)
    expect(notif.type).toBe('milestone')
    expect(notif.read).toBe(false)
    const payload = notif.payload as Record<string, unknown>
    expect(payload.athlete_name).toBe('Ali')
    expect(payload.milestone_label).toBe('10 Sessions')
    expect(payload.message).toContain('Ali')
    expect(payload.message).toContain('10 Sessions')
  })

  it('handles errors gracefully and returns 0', async () => {
    mockGetMilestoneDefinitions.mockRejectedValue(new Error('DB connection failed'))
    mockFrom.mockImplementation(() => {
      throw new Error('DB connection failed')
    })

    const count = await checkAndAwardMilestones(athleteId, sessionId, coachId)
    expect(count).toBe(0)
  })
})
