/**
 * Unit tests for auto-completion logic.
 *
 * Tests cover: autoCompleteSessions — finding and completing eligible sessions.
 */

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockFromReturn: Record<string, unknown> = {}

jest.mock('@/lib/supabase/admin', () => ({
  adminClient: {
    from: (table: string) => mockFromReturn[table],
  },
}))

jest.mock('@/lib/audit', () => ({
  logAudit: jest.fn(),
}))

import { autoCompleteSessions } from '@/lib/sessions/completion'
import { logAudit } from '@/lib/audit'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeChain(data: unknown, error?: unknown) {
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnThis(),
      count: data,
      data,
      error: error ?? null,
    }),
  }
}

function mockTrainingSessions(sessions: Array<{ id: string; session_start: string; session_end: string | null }>, error?: unknown) {
  const eqStatus = jest.fn().mockReturnValue({
    data: error ? null : sessions,
    error: error ?? null,
  })

  mockFromReturn['training_sessions'] = {
    select: jest.fn().mockReturnValue({
      eq: eqStatus,
    }),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({ error: null }),
      }),
    }),
  }
}

function mockRunCount(sessionId: string, count: number) {
  // We need to intercept the sessions table query for run count
  // The completion code calls .from('sessions').select('id', { count: 'exact', head: true }).eq('training_session_id', id)
  if (!mockFromReturn['_sessions_counts']) {
    mockFromReturn['_sessions_counts'] = {}
  }
  ;(mockFromReturn['_sessions_counts'] as Record<string, number>)[sessionId] = count
}

beforeEach(() => {
  jest.clearAllMocks()
  // Reset mocks
  for (const key of Object.keys(mockFromReturn)) {
    delete mockFromReturn[key]
  }
})

// ── Tests ────────────────────────────────────────────────────────────────────

describe('autoCompleteSessions', () => {
  const pastSessionEnd = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  const pastSessionStart = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  const futureSessionStart = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()

  it('completes a published session that has ended AND has logged runs', async () => {
    const updateEq2 = jest.fn().mockReturnValue({ error: null })
    const updateEq1 = jest.fn().mockReturnValue({ eq: updateEq2 })
    const updateFn = jest.fn().mockReturnValue({ eq: updateEq1 })

    // training_sessions mock
    const selectEq = jest.fn().mockReturnValue({
      data: [{ id: 'ts-1', session_start: pastSessionStart, session_end: pastSessionEnd }],
      error: null,
    })

    mockFromReturn['training_sessions'] = {
      select: jest.fn().mockReturnValue({ eq: selectEq }),
      update: updateFn,
    }

    // sessions (run log) mock — has runs
    mockFromReturn['sessions'] = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          count: 3,
          error: null,
        }),
      }),
    }

    const result = await autoCompleteSessions()

    expect(result.completed).toContain('ts-1')
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' })
    )
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'training_session.auto_complete' })
    )
  })

  it('does NOT complete a session that has not ended yet', async () => {
    const selectEq = jest.fn().mockReturnValue({
      data: [{ id: 'ts-2', session_start: futureSessionStart, session_end: null }],
      error: null,
    })

    mockFromReturn['training_sessions'] = {
      select: jest.fn().mockReturnValue({ eq: selectEq }),
      update: jest.fn(),
    }

    mockFromReturn['sessions'] = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({ count: 5, error: null }),
      }),
    }

    const result = await autoCompleteSessions()

    expect(result.completed).toHaveLength(0)
    expect((mockFromReturn['training_sessions'] as { update: jest.Mock }).update).not.toHaveBeenCalled()
  })

  it('does NOT complete a session with no logged runs', async () => {
    const updateFn = jest.fn()
    const selectEq = jest.fn().mockReturnValue({
      data: [{ id: 'ts-3', session_start: pastSessionStart, session_end: pastSessionEnd }],
      error: null,
    })

    mockFromReturn['training_sessions'] = {
      select: jest.fn().mockReturnValue({ eq: selectEq }),
      update: updateFn,
    }

    // No runs logged
    mockFromReturn['sessions'] = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({ count: 0, error: null }),
      }),
    }

    const result = await autoCompleteSessions()

    expect(result.completed).toHaveLength(0)
    expect(result.skipped).toBe(1)
    expect(updateFn).not.toHaveBeenCalled()
  })

  it('uses session_end for end detection when available', async () => {
    // Session with session_end in the past
    const recentStart = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1h ago
    const pastEnd = new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30min ago

    const updateEq2 = jest.fn().mockReturnValue({ error: null })
    const updateEq1 = jest.fn().mockReturnValue({ eq: updateEq2 })
    const updateFn = jest.fn().mockReturnValue({ eq: updateEq1 })

    const selectEq = jest.fn().mockReturnValue({
      data: [{ id: 'ts-4', session_start: recentStart, session_end: pastEnd }],
      error: null,
    })

    mockFromReturn['training_sessions'] = {
      select: jest.fn().mockReturnValue({ eq: selectEq }),
      update: updateFn,
    }

    mockFromReturn['sessions'] = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({ count: 1, error: null }),
      }),
    }

    const result = await autoCompleteSessions()

    // session_start was only 1h ago (< 4h), but session_end is past, so it should complete
    expect(result.completed).toContain('ts-4')
  })

  it('uses session_start + 4h fallback when no end time', async () => {
    // session_start 3h ago, no session_end → not ended yet (need 4h)
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()

    const selectEq = jest.fn().mockReturnValue({
      data: [{ id: 'ts-5', session_start: threeHoursAgo, session_end: null }],
      error: null,
    })

    mockFromReturn['training_sessions'] = {
      select: jest.fn().mockReturnValue({ eq: selectEq }),
      update: jest.fn(),
    }

    const result = await autoCompleteSessions()

    expect(result.completed).toHaveLength(0)
  })

  it('sets completed_at to now()', async () => {
    const updateEq2 = jest.fn().mockReturnValue({ error: null })
    const updateEq1 = jest.fn().mockReturnValue({ eq: updateEq2 })
    const updateFn = jest.fn().mockReturnValue({ eq: updateEq1 })

    const selectEq = jest.fn().mockReturnValue({
      data: [{ id: 'ts-6', session_start: pastSessionStart, session_end: pastSessionEnd }],
      error: null,
    })

    mockFromReturn['training_sessions'] = {
      select: jest.fn().mockReturnValue({ eq: selectEq }),
      update: updateFn,
    }

    mockFromReturn['sessions'] = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({ count: 2, error: null }),
      }),
    }

    const before = new Date()
    await autoCompleteSessions()
    const after = new Date()

    const updateArg = updateFn.mock.calls[0][0]
    expect(updateArg.completed_at).toBeDefined()
    const completedAt = new Date(updateArg.completed_at)
    expect(completedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(completedAt.getTime()).toBeLessThanOrEqual(after.getTime())
  })

  it('handles fetch errors gracefully', async () => {
    const selectEq = jest.fn().mockReturnValue({
      data: null,
      error: { message: 'DB error' },
    })

    mockFromReturn['training_sessions'] = {
      select: jest.fn().mockReturnValue({ eq: selectEq }),
    }

    const result = await autoCompleteSessions()

    expect(result.errors).toContain('DB error')
    expect(result.completed).toHaveLength(0)
  })
})
