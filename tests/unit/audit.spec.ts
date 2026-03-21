/**
 * Unit tests for the audit logging utility.
 *
 * Tests that audit logging:
 * 1. Inserts correct fields into the audit_log table
 * 2. Never throws — failures are swallowed and logged to console
 * 3. Handles optional fields correctly (defaults to null / {})
 * 4. Does not block the calling action when the insert fails
 * 5. Works with all documented action types
 */

// ── Mocks (must be before imports) ───────────────────────────────────────────

const mockInsert = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  adminClient: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { logAudit } from '@/lib/audit'

// ── Helpers ──────────────────────────────────────────────────────────────────

function setupMockInsert(response: { data: unknown; error: unknown }) {
  mockInsert.mockReturnValue(Promise.resolve(response))
  mockFrom.mockReturnValue({ insert: mockInsert })
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

// ── Tests ────────────────────────────────────────────────────────────────────

describe('logAudit', () => {
  it('inserts a full audit entry with all fields', async () => {
    setupMockInsert({ data: null, error: null })

    await logAudit({
      actorId: 'user-123',
      actorEmail: 'coach@example.com',
      actorRole: 'coach',
      action: 'session.delete',
      targetType: 'session',
      targetId: 'session-456',
      metadata: { athleteId: 'athlete-789', syncSource: 'manual' },
    })

    expect(mockFrom).toHaveBeenCalledWith('audit_log')
    expect(mockInsert).toHaveBeenCalledWith({
      actor_id: 'user-123',
      actor_email: 'coach@example.com',
      actor_role: 'coach',
      action: 'session.delete',
      target_type: 'session',
      target_id: 'session-456',
      metadata: { athleteId: 'athlete-789', syncSource: 'manual' },
    })
  })

  it('defaults optional fields to null and empty metadata', async () => {
    setupMockInsert({ data: null, error: null })

    await logAudit({
      actorId: 'user-123',
      action: 'settings.update',
    })

    expect(mockInsert).toHaveBeenCalledWith({
      actor_id: 'user-123',
      actor_email: null,
      actor_role: null,
      action: 'settings.update',
      target_type: null,
      target_id: null,
      metadata: {},
    })
  })

  it('never throws when the database insert fails', async () => {
    setupMockInsert({ data: null, error: { message: 'connection refused' } })

    // Should not throw
    await expect(
      logAudit({
        actorId: 'user-123',
        action: 'user.invite',
      })
    ).resolves.toBeUndefined()
  })

  it('logs to console.error when the insert throws an exception', async () => {
    mockFrom.mockReturnValue({
      insert: jest.fn().mockRejectedValue(new Error('network timeout')),
    })

    await logAudit({
      actorId: 'user-123',
      action: 'user.delete',
    })

    expect(console.error).toHaveBeenCalledWith(
      '[audit] Failed to write audit log:',
      expect.any(Error)
    )
  })

  it('does not log to console when the insert succeeds', async () => {
    setupMockInsert({ data: { id: 'log-1' }, error: null })

    await logAudit({
      actorId: 'user-123',
      action: 'athlete.create',
      targetType: 'athlete',
      targetId: 'athlete-1',
    })

    expect(console.error).not.toHaveBeenCalled()
  })

  it('handles actorEmail being explicitly undefined', async () => {
    setupMockInsert({ data: null, error: null })

    await logAudit({
      actorId: 'user-123',
      actorEmail: undefined,
      action: 'athlete.pin_set',
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ actor_email: null })
    )
  })

  it('handles actorRole being explicitly undefined', async () => {
    setupMockInsert({ data: null, error: null })

    await logAudit({
      actorId: 'user-123',
      actorRole: undefined,
      action: 'cues.update',
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ actor_role: null })
    )
  })

  it('passes metadata as-is without transformation', async () => {
    setupMockInsert({ data: null, error: null })

    const metadata = { email: 'test@test.com', newRole: 'coach', athleteId: 'a-1' }

    await logAudit({
      actorId: 'user-123',
      action: 'user.role_change',
      metadata,
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ metadata })
    )
  })

  it('handles empty metadata object', async () => {
    setupMockInsert({ data: null, error: null })

    await logAudit({
      actorId: 'user-123',
      action: 'sharing.enable',
      metadata: {},
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: {} })
    )
  })

  it('resolves quickly even when the insert is slow', async () => {
    // Simulate a slow insert (but still resolving)
    mockFrom.mockReturnValue({
      insert: jest.fn().mockReturnValue(
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: null, error: null }), 50)
        )
      ),
    })

    const start = Date.now()
    await logAudit({
      actorId: 'user-123',
      action: 'photo.delete',
    })
    const elapsed = Date.now() - start

    // Should complete (it awaits), but the point is it doesn't hang
    expect(elapsed).toBeLessThan(5000)
  })

  describe('action type coverage', () => {
    // All documented action types from audit.ts
    const actionTypes = [
      { action: 'user.invite', targetType: 'user', targetId: 'email@test.com' },
      { action: 'user.delete', targetType: 'user', targetId: 'user-1' },
      { action: 'user.deactivate', targetType: 'user', targetId: 'user-1' },
      { action: 'user.reactivate', targetType: 'user', targetId: 'user-1' },
      { action: 'user.role_change', targetType: 'user', targetId: 'user-1' },
      { action: 'invitation.cancel', targetType: 'invitation', targetId: 'inv-1' },
      { action: 'athlete.create', targetType: 'athlete', targetId: 'athlete-1' },
      { action: 'athlete.delete', targetType: 'athlete', targetId: 'athlete-1' },
      { action: 'athlete.update', targetType: 'athlete', targetId: 'athlete-1' },
      { action: 'athlete.pin_set', targetType: 'athlete', targetId: 'athlete-1' },
      { action: 'session.delete', targetType: 'session', targetId: 'session-1' },
      { action: 'session.create', targetType: 'session', targetId: 'session-1' },
      { action: 'cues.update', targetType: 'athlete', targetId: 'athlete-1' },
      { action: 'note.delete', targetType: 'note', targetId: 'note-1' },
      { action: 'photo.delete', targetType: 'media', targetId: 'media-1' },
      { action: 'sharing.enable', targetType: 'athlete', targetId: 'athlete-1' },
      { action: 'sharing.disable', targetType: 'athlete', targetId: 'athlete-1' },
      { action: 'settings.update', targetType: 'club_settings' },
      { action: 'milestone_def.create', targetType: 'milestone_definition' },
      { action: 'milestone_def.update', targetType: 'milestone_definition', targetId: 'md-1' },
      { action: 'milestone_def.toggle', targetType: 'milestone_definition', targetId: 'md-1' },
      { action: 'strava.disconnect', targetType: 'strava_connection', targetId: 'user-1' },
      { action: 'unmatched.resolve', targetType: 'strava_unmatched', targetId: 'um-1' },
      { action: 'unmatched.dismiss', targetType: 'strava_unmatched', targetId: 'um-1' },
    ]

    it.each(actionTypes)(
      'handles action "$action" without error',
      async ({ action, targetType, targetId }) => {
        setupMockInsert({ data: null, error: null })

        await logAudit({
          actorId: 'user-123',
          actorEmail: 'admin@example.com',
          actorRole: 'admin',
          action,
          targetType,
          targetId,
        })

        expect(mockFrom).toHaveBeenCalledWith('audit_log')
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            action,
            target_type: targetType,
            target_id: targetId ?? null,
          })
        )
      }
    )
  })

  describe('fire-and-forget safety', () => {
    it('does not propagate synchronous errors from adminClient.from', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('Supabase client not initialized')
      })

      await expect(
        logAudit({ actorId: 'user-123', action: 'user.invite' })
      ).resolves.toBeUndefined()

      expect(console.error).toHaveBeenCalledWith(
        '[audit] Failed to write audit log:',
        expect.any(Error)
      )
    })

    it('does not propagate errors when insert returns a rejected promise', async () => {
      mockFrom.mockReturnValue({
        insert: jest.fn().mockRejectedValue(new Error('RLS violation')),
      })

      await expect(
        logAudit({ actorId: 'user-123', action: 'athlete.delete' })
      ).resolves.toBeUndefined()
    })

    it('returns void (undefined) on success', async () => {
      setupMockInsert({ data: { id: 'log-1' }, error: null })

      const result = await logAudit({
        actorId: 'user-123',
        action: 'settings.update',
      })

      expect(result).toBeUndefined()
    })

    it('returns void (undefined) on failure', async () => {
      setupMockInsert({ data: null, error: { message: 'db error' } })

      const result = await logAudit({
        actorId: 'user-123',
        action: 'settings.update',
      })

      expect(result).toBeUndefined()
    })
  })

  describe('field mapping', () => {
    it('maps camelCase entry fields to snake_case database columns', async () => {
      setupMockInsert({ data: null, error: null })

      await logAudit({
        actorId: 'actor-1',
        actorEmail: 'e@mail.com',
        actorRole: 'admin',
        action: 'user.invite',
        targetType: 'user',
        targetId: 'target-1',
        metadata: { key: 'value' },
      })

      const insertedRow = mockInsert.mock.calls[0][0]
      // Verify snake_case column names
      expect(insertedRow).toHaveProperty('actor_id', 'actor-1')
      expect(insertedRow).toHaveProperty('actor_email', 'e@mail.com')
      expect(insertedRow).toHaveProperty('actor_role', 'admin')
      expect(insertedRow).toHaveProperty('action', 'user.invite')
      expect(insertedRow).toHaveProperty('target_type', 'user')
      expect(insertedRow).toHaveProperty('target_id', 'target-1')
      expect(insertedRow).toHaveProperty('metadata', { key: 'value' })

      // Verify no camelCase keys leaked through
      expect(insertedRow).not.toHaveProperty('actorId')
      expect(insertedRow).not.toHaveProperty('actorEmail')
      expect(insertedRow).not.toHaveProperty('actorRole')
      expect(insertedRow).not.toHaveProperty('targetType')
      expect(insertedRow).not.toHaveProperty('targetId')
    })
  })

  describe('concurrent audit logging', () => {
    it('handles multiple concurrent logAudit calls independently', async () => {
      setupMockInsert({ data: null, error: null })

      await Promise.all([
        logAudit({ actorId: 'user-1', action: 'user.invite' }),
        logAudit({ actorId: 'user-2', action: 'athlete.create' }),
        logAudit({ actorId: 'user-3', action: 'session.delete' }),
      ])

      expect(mockInsert).toHaveBeenCalledTimes(3)
    })

    it('one failing call does not affect other concurrent calls', async () => {
      let callCount = 0
      mockFrom.mockReturnValue({
        insert: jest.fn().mockImplementation(() => {
          callCount++
          if (callCount === 2) {
            return Promise.reject(new Error('second call fails'))
          }
          return Promise.resolve({ data: null, error: null })
        }),
      })

      // All three should resolve without throwing
      await Promise.all([
        logAudit({ actorId: 'user-1', action: 'user.invite' }),
        logAudit({ actorId: 'user-2', action: 'athlete.create' }),
        logAudit({ actorId: 'user-3', action: 'session.delete' }),
      ])

      // Only the second call should have triggered console.error
      expect(console.error).toHaveBeenCalledTimes(1)
    })
  })

  describe('special actorId values', () => {
    it('handles system actor ID (used for automated actions)', async () => {
      setupMockInsert({ data: null, error: null })

      await logAudit({
        actorId: 'system',
        action: 'athlete.pin_set',
        targetType: 'athlete',
        targetId: 'athlete-1',
      })

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ actor_id: 'system' })
      )
    })
  })
})
