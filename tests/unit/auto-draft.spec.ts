/**
 * Unit tests for auto-draft cron logic.
 *
 * Tests cover: draft-sessions cron route — creating weekly drafts from recurring template.
 */

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockClub = {
  id: 'club-1',
  name: 'Test Club',
  timezone: 'UTC',
  home_location: 'Test Park',
  recurring_session_day: 6, // Saturday
  recurring_session_time: '08:00',
  recurring_session_end: '10:00',
  recurring_session_location: 'Fort Canning',
  recurring_auto_draft: true,
  max_athletes_per_coach: 3,
}

jest.mock('@/lib/club', () => ({
  getClub: jest.fn().mockResolvedValue(mockClub),
}))

const mockInsertReturn = jest.fn()
const mockSelectReturn = jest.fn()
const mockMaybeSingle = jest.fn()
const mockLimit = jest.fn()
const mockIn = jest.fn()
const mockGte = jest.fn()
const mockLte = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  adminClient: {
    from: jest.fn().mockImplementation((table: string) => {
      if (table === 'training_sessions') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lte: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                      maybeSingle: mockMaybeSingle,
                    }),
                  }),
                }),
              }),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: mockInsertReturn,
            }),
          }),
        }
      }
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'admin-1' }, error: null }),
                }),
                eq: jest.fn().mockResolvedValue({ data: [{ id: 'admin-1' }], error: null }),
              }),
            }),
          }),
        }
      }
      return { select: jest.fn() }
    }),
  },
}))

jest.mock('@/lib/audit', () => ({
  logAudit: jest.fn(),
}))

jest.mock('@/lib/push', () => ({
  sendPushToUser: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/sessions/datetime', () => ({
  getUpcomingSessionDate: jest.fn().mockReturnValue('2026-04-04'),
  combineDateTime: jest.fn().mockImplementation((date: string, time: string) => `${date}T${time}:00.000Z`),
}))

import { getClub } from '@/lib/club'
import { logAudit } from '@/lib/audit'

// ── Tests ────────────────────────────────────────────────────────────────────

describe('auto-draft cron logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Object.assign(mockClub, {
      recurring_auto_draft: true,
      recurring_session_day: 6,
      recurring_session_time: '08:00',
      recurring_session_end: '10:00',
      recurring_session_location: 'Fort Canning',
    })
  })

  it('creates a draft when no session exists for the upcoming date', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockInsertReturn.mockResolvedValue({ data: { id: 'new-session-1' }, error: null })

    // Import the route handler dynamically to use fresh mocks
    const { GET } = await import('@/app/api/cron/draft-sessions/route')
    const request = new Request('http://test/api/cron/draft-sessions', {
      headers: { authorization: 'Bearer test-secret' },
    })

    // Temporarily set CRON_SECRET
    const origSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'test-secret'

    const response = await GET(request as never)
    const json = await response.json()

    process.env.CRON_SECRET = origSecret

    expect(json.ok).toBe(true)
    expect(json.created).toBe(true)
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'training_session.auto_draft' })
    )
  })

  it('does NOT create a draft when a published session exists', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: 'existing-1' }, error: null })

    const { GET } = await import('@/app/api/cron/draft-sessions/route')
    const request = new Request('http://test/api/cron/draft-sessions', {
      headers: { authorization: 'Bearer test-secret' },
    })

    const origSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'test-secret'

    const response = await GET(request as never)
    const json = await response.json()

    process.env.CRON_SECRET = origSecret

    expect(json.skipped).toBe('session already exists')
  })

  it('does NOT create a draft when recurring_auto_draft = false', async () => {
    mockClub.recurring_auto_draft = false
    ;(getClub as jest.Mock).mockResolvedValue(mockClub)

    const { GET } = await import('@/app/api/cron/draft-sessions/route')
    const request = new Request('http://test/api/cron/draft-sessions', {
      headers: { authorization: 'Bearer test-secret' },
    })

    const origSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'test-secret'

    const response = await GET(request as never)
    const json = await response.json()

    process.env.CRON_SECRET = origSecret

    expect(json.skipped).toBe('recurring_auto_draft is disabled')
  })

  it('returns 401 without valid CRON_SECRET', async () => {
    const { GET } = await import('@/app/api/cron/draft-sessions/route')
    const request = new Request('http://test/api/cron/draft-sessions', {
      headers: { authorization: 'Bearer wrong-secret' },
    })

    const origSecret = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'test-secret'

    const response = await GET(request as never)

    process.env.CRON_SECRET = origSecret

    expect(response.status).toBe(401)
  })
})
