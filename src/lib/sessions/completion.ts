/**
 * Auto-completion logic for training sessions.
 *
 * A published session is auto-completed when:
 * 1. It has ended (session_end < now, or session_start + 4h < now if no end time)
 * 2. At least one run was logged against it (sessions.training_session_id = ts.id)
 *
 * Cancelled, draft, and already-completed sessions are never touched.
 */

import { adminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000'

export interface AutoCompleteResult {
  completed: string[]
  skipped: number
  errors: string[]
}

/**
 * Find and auto-complete all eligible training sessions.
 * Idempotent: already-completed sessions are excluded by the query.
 */
export async function autoCompleteSessions(): Promise<AutoCompleteResult> {
  const now = new Date()
  const nowIso = now.toISOString()

  // Find published sessions that have ended
  // A session has ended when:
  //   - session_end IS NOT NULL AND session_end < now
  //   - OR session_end IS NULL AND session_start + 4h < now
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString()

  const { data: candidates, error: fetchError } = await adminClient
    .from('training_sessions')
    .select('id, session_start, session_end')
    .eq('status', 'published')

  if (fetchError || !candidates) {
    return { completed: [], skipped: 0, errors: [fetchError?.message ?? 'Failed to fetch sessions'] }
  }

  // Filter to sessions that have ended
  const ended = candidates.filter(s => {
    if (s.session_end) {
      return new Date(s.session_end) < now
    }
    // No end time: use session_start + 4 hours
    return new Date(s.session_start).getTime() + 4 * 60 * 60 * 1000 < now.getTime()
  })

  if (ended.length === 0) {
    return { completed: [], skipped: 0, errors: [] }
  }

  const result: AutoCompleteResult = { completed: [], skipped: 0, errors: [] }

  for (const session of ended) {
    // Check if at least one run was logged for this training session
    const { count, error: countError } = await adminClient
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('training_session_id', session.id)

    if (countError) {
      result.errors.push(`Session ${session.id}: ${countError.message}`)
      continue
    }

    if (!count || count === 0) {
      result.skipped++
      continue
    }

    // Complete the session
    const { error: updateError } = await adminClient
      .from('training_sessions')
      .update({
        status: 'completed',
        completed_at: nowIso,
      })
      .eq('id', session.id)
      .eq('status', 'published') // Double-check to prevent race conditions

    if (updateError) {
      result.errors.push(`Session ${session.id}: ${updateError.message}`)
      continue
    }

    result.completed.push(session.id)

    logAudit({
      actorId: SYSTEM_ACTOR_ID,
      actorRole: 'system',
      action: 'training_session.auto_complete',
      targetType: 'training_session',
      targetId: session.id,
      metadata: { runsLogged: count },
    })
  }

  return result
}
