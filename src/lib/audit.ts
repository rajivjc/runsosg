/**
 * Audit logging utility for admin and sensitive coach actions.
 *
 * Action naming convention:
 *
 *   user.invite          — Admin invited a new user
 *   user.delete          — Admin deleted a user account
 *   user.deactivate      — Admin deactivated a user
 *   user.reactivate      — Admin reactivated a user
 *   user.role_change     — Admin changed a user's role
 *   invitation.cancel    — Admin cancelled a pending invitation
 *   athlete.create       — Admin created a new athlete profile
 *   athlete.delete       — Admin deleted an athlete profile
 *   athlete.update       — Coach/admin updated an athlete profile
 *   athlete.pin_set      — Coach set/changed an athlete's PIN
 *   session.delete       — Coach/admin deleted a session
 *   session.create       — Coach logged a manual session
 *   cues.update          — Coach updated coaching cues
 *   note.delete          — Coach deleted a coach note
 *   photo.delete         — Coach/admin deleted a photo
 *   sharing.enable       — Coach enabled public sharing for an athlete
 *   sharing.disable      — Caregiver disabled public sharing
 *   settings.update      — Admin updated club settings
 *   milestone_def.create — Admin created a milestone definition
 *   milestone_def.update — Admin updated a milestone definition
 *   milestone_def.toggle — Admin enabled/disabled a milestone definition
 *   strava.disconnect    — Coach disconnected Strava
 *   unmatched.resolve    — Coach linked an unmatched Strava run
 *   unmatched.dismiss    — Coach dismissed an unmatched Strava run
 */

import { adminClient } from '@/lib/supabase/admin'
import type { Json } from '@/lib/supabase/types'

type AuditEntry = {
  actorId: string
  actorEmail?: string
  actorRole?: string
  action: string
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
}

/**
 * Log an action to the audit trail. Fire-and-forget — never throws,
 * never blocks the calling action. If logging fails, it logs to
 * console.error and moves on.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await adminClient.from('audit_log').insert({
      actor_id: entry.actorId,
      actor_email: entry.actorEmail ?? null,
      actor_role: entry.actorRole ?? null,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      metadata: (entry.metadata ?? {}) as Json,
    })
  } catch (err) {
    // Audit logging must never fail the parent operation
    console.error('[audit] Failed to write audit log:', err)
  }
}
