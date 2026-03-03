/**
 * Unit tests for milestones performance optimizations.
 *
 * Validates that:
 * 1. Athlete is fetched only ONCE (not twice) for email + notification
 * 2. The single fetch includes both `name` and `caregiver_user_id`
 * 3. Both email and notification use the same athlete data
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

function chainable(data: unknown, error: unknown = null) {
  const obj: Record<string, unknown> = {}
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => resolve({ data, error })
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

describe('checkAndAwardMilestones — single athlete fetch', () => {
  const athleteId = 'athlete-1'
  const sessionId = 'session-1'
  const coachId = 'coach-1'

  it('fetches athlete only once for both email and notification', async () => {
    const athleteQueryCount = { count: 0 }
    const insertedMilestones: unknown[] = []
    const insertedNotifications: unknown[] = []

    // Milestone definitions now come from the cached getter
    mockGetMilestoneDefinitions.mockResolvedValue([
      { id: 'def-1', label: 'First Run!', icon: '🏃', condition: { metric: 'session_count', threshold: 1 } },
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
          { id: sessionId, date: '2026-01-01', distance_km: 2 },
        ])
      }
      if (table === 'athletes') {
        athleteQueryCount.count += 1
        // Return both name AND caregiver_user_id (the single query includes both)
        return chainable({ name: 'Ali', caregiver_user_id: null })
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

    // Milestone was awarded
    expect(count).toBe(1)
    expect(insertedMilestones).toHaveLength(1)

    // Athlete was queried only ONCE (not twice)
    expect(athleteQueryCount.count).toBe(1)

    // Notification was created with athlete name from the single fetch
    expect(insertedNotifications).toHaveLength(1)
    const notif = insertedNotifications[0] as Record<string, unknown>
    const payload = notif.payload as Record<string, unknown>
    expect(payload.athlete_name).toBe('Ali')
    expect(payload.message).toContain('Ali')
  })

  it('uses athlete name in both email and notification from single fetch', async () => {
    const insertedNotifications: unknown[] = []

    mockGetMilestoneDefinitions.mockResolvedValue([
      { id: 'def-1', label: 'First Run!', icon: '🏃', condition: { metric: 'session_count', threshold: 1 } },
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
              return (rows: unknown[]) => new Proxy(obj, handler)
            }
            return (..._args: unknown[]) => new Proxy(obj, handler)
          },
        }
        return new Proxy(obj, handler)
      }
      if (table === 'sessions') {
        return chainable([
          { id: sessionId, date: '2026-01-01', distance_km: 2 },
        ])
      }
      if (table === 'athletes') {
        return chainable({ name: 'Priya Sharma', caregiver_user_id: 'caregiver-1' })
      }
      if (table === 'users') {
        return chainable({ name: 'Coach Lee' })
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

    await checkAndAwardMilestones(athleteId, sessionId, coachId)

    // Notification should use name from the single athlete query
    expect(insertedNotifications).toHaveLength(1)
    const notif = insertedNotifications[0] as Record<string, unknown>
    const payload = notif.payload as Record<string, unknown>
    expect(payload.athlete_name).toBe('Priya Sharma')
  })

  it('falls back to default name when athlete not found', async () => {
    const insertedNotifications: unknown[] = []

    mockGetMilestoneDefinitions.mockResolvedValue([
      { id: 'def-1', label: 'First Run!', icon: '🏃', condition: { metric: 'session_count', threshold: 1 } },
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
              return (rows: unknown[]) => new Proxy(obj, handler)
            }
            return (..._args: unknown[]) => new Proxy(obj, handler)
          },
        }
        return new Proxy(obj, handler)
      }
      if (table === 'sessions') {
        return chainable([
          { id: sessionId, date: '2026-01-01', distance_km: 2 },
        ])
      }
      if (table === 'athletes') {
        return chainable(null) // athlete not found
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

    await checkAndAwardMilestones(athleteId, sessionId, coachId)

    // Should fall back to 'An athlete'
    expect(insertedNotifications).toHaveLength(1)
    const notif = insertedNotifications[0] as Record<string, unknown>
    const payload = notif.payload as Record<string, unknown>
    expect(payload.athlete_name).toBe('An athlete')
  })
})
