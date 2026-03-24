// Re-export the generated database types
export type { Database, Json } from './database.types'
import type { Database, Json } from './database.types'

// ─── Row types (convenience aliases) ─────────────────────────────────────────

export type Club = Database['public']['Tables']['clubs']['Row']
/** @deprecated Use Club instead */
export type ClubSettings = Club

export type User = Database['public']['Tables']['users']['Row'] & {
  role: 'admin' | 'coach' | 'caregiver'
}

export type Athlete = Database['public']['Tables']['athletes']['Row'] & {
  goal_type: 'distance_total' | 'distance_single' | 'session_count' | null
  athlete_goal_choice: 'run_further' | 'run_more' | 'feel_stronger' | null
}

export type Session = Database['public']['Tables']['sessions']['Row'] & {
  status: 'planned' | 'completed' | 'cancelled'
  feel: 1 | 2 | 3 | 4 | 5 | null
  sync_source: 'strava_webhook' | 'manual' | 'backfill' | null
  match_method: 'hashtag' | 'schedule' | 'manual_review' | null
  match_confidence: 'high' | 'medium' | 'manual' | null
}

export type Cue = Database['public']['Tables']['cues']['Row'] & {
  helps: string[]
  avoid: string[]
  best_cues: string[]
  kit: string[]
  previous_cues: Json | null
}

export type CoachNote = Database['public']['Tables']['coach_notes']['Row'] & {
  note_type: 'general' | 'milestone' | 'observation'
  visibility: 'all' | 'coaches_only'
}

export type StoryUpdate = Database['public']['Tables']['story_updates']['Row']

export type MilestoneDefinition = Database['public']['Tables']['milestone_definitions']['Row'] & {
  type: 'automatic' | 'manual'
}

export type Milestone = Database['public']['Tables']['milestones']['Row']

export type Media = Database['public']['Tables']['media']['Row'] & {
  source: 'strava' | 'upload' | 'strava_archived' | null
}

export type StravaConnection = Database['public']['Tables']['strava_connections']['Row'] & {
  last_sync_status: 'ok' | 'token_expired' | 'error' | null
}

export type StravaSyncLog = Database['public']['Tables']['strava_sync_log']['Row'] & {
  event_type: 'create' | 'update' | 'delete'
  status: 'pending' | 'matched' | 'unmatched' | 'skipped' | 'error'
}

export type StravaUnmatched = Database['public']['Tables']['strava_unmatched']['Row'] & {
  resolution_type: 'linked' | 'dismissed' | null
}

export type SessionRsvp = Database['public']['Tables']['session_rsvp']['Row'] & {
  status: 'confirmed' | 'absent'
}

export type Notification = Database['public']['Tables']['notifications']['Row'] & {
  type: 'milestone' | 'feel_prompt' | 'low_feel_alert' | 'unmatched_run' | 'strava_disconnected' | 'general'
  channel: 'in_app' | 'email' | 'push'
}

export type Invitation = Database['public']['Tables']['invitations']['Row'] & {
  role: 'admin' | 'coach' | 'caregiver'
}

export type Kudos = Database['public']['Tables']['kudos']['Row']

export type CoachBadge = Database['public']['Tables']['coach_badges']['Row']

export type Cheer = Database['public']['Tables']['cheers']['Row']

export type PushSubscriptionRow = Database['public']['Tables']['push_subscriptions']['Row']

export type AthleteMessage = Database['public']['Tables']['athlete_messages']['Row']

export type AthleteMood = Database['public']['Tables']['athlete_moods']['Row'] & {
  mood: 1 | 2 | 3 | 4 | 5
}

export type AthleteFavorite = Database['public']['Tables']['athlete_favorites']['Row']

export type FocusArea = Database['public']['Tables']['focus_areas']['Row'] & {
  progress_level: 'just_started' | 'making_progress' | 'almost_there' | 'achieved'
  status: 'active' | 'achieved' | 'paused'
}

export type ProgressLevel = FocusArea['progress_level']

export type AuditLog = Database['public']['Tables']['audit_log']['Row']

export type TrainingSession = Database['public']['Tables']['training_sessions']['Row'] & {
  status: 'draft' | 'published' | 'completed' | 'cancelled'
}

export type SessionCoachRsvp = Database['public']['Tables']['session_coach_rsvps']['Row'] & {
  status: 'pending' | 'available' | 'unavailable'
}

export type SessionAthleteRsvp = Database['public']['Tables']['session_athlete_rsvps']['Row'] & {
  status: 'pending' | 'attending' | 'not_attending'
}

export type SessionAssignment = Database['public']['Tables']['session_assignments']['Row']
