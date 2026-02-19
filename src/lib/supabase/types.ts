export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      club_settings: {
        Row: ClubSettings
        Insert: Omit<ClubSettings, 'id'> & { id?: string }
        Update: Partial<ClubSettings>
      }
      users: {
        Row: User
        Insert: Omit<User, 'created_at'> & { created_at?: string }
        Update: Partial<User>
      }
      athletes: {
        Row: Athlete
        Insert: Omit<Athlete, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Athlete>
      }
      sessions: {
        Row: Session
        Insert: Omit<Session, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Session>
      }
      cues: {
        Row: Cue
        Insert: Omit<Cue, 'id'> & { id?: string }
        Update: Partial<Cue>
      }
      coach_notes: {
        Row: CoachNote
        Insert: Omit<CoachNote, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<CoachNote>
      }
      milestone_definitions: {
        Row: MilestoneDefinition
        Insert: Omit<MilestoneDefinition, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<MilestoneDefinition>
      }
      milestones: {
        Row: Milestone
        Insert: Omit<Milestone, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Milestone>
      }
      media: {
        Row: Media
        Insert: Omit<Media, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Media>
      }
      strava_connections: {
        Row: StravaConnection
        Insert: StravaConnection
        Update: Partial<StravaConnection>
      }
      strava_sync_log: {
        Row: StravaSyncLog
        Insert: Omit<StravaSyncLog, 'id' | 'received_at'> & { id?: string; received_at?: string }
        Update: Partial<StravaSyncLog>
      }
      strava_unmatched: {
        Row: StravaUnmatched
        Insert: Omit<StravaUnmatched, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<StravaUnmatched>
      }
      session_rsvp: {
        Row: SessionRsvp
        Insert: Omit<SessionRsvp, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<SessionRsvp>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Notification>
      }
      invitations: {
        Row: Invitation
        Insert: Omit<Invitation, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Invitation>
      }
    }
    Views: Record<string, never>
    Functions: {
      get_my_role: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: Record<string, never>
  }
}

// ─── Row types ────────────────────────────────────────────────────────────────

export interface ClubSettings {
  id: string
  name: string
  logo_url: string | null
  home_location: string | null
  session_day: string | null
  session_time: string | null
  strava_club_id: number | null
  timezone: string
  updated_at: string | null
}

export interface User {
  id: string
  email: string
  name: string | null
  role: 'admin' | 'coach' | 'caregiver'
  created_at: string
}

export interface Athlete {
  id: string
  name: string
  caregiver_user_id: string | null
  photo_url: string | null
  active: boolean
  date_of_birth: string | null
  joined_at: string | null
  running_goal: string | null
  communication_notes: string | null
  medical_notes: string | null
  emergency_contact: string | null
  updated_by: string | null
  updated_at: string | null
  created_at: string
}

export interface Session {
  id: string
  athlete_id: string
  coach_user_id: string | null
  planned_coach_user_id: string | null
  strava_activity_id: number | null
  status: 'planned' | 'completed' | 'cancelled'
  date: string
  distance_km: number | null
  duration_seconds: number | null
  feel: 1 | 2 | 3 | 4 | 5 | null
  note: string | null
  route_name: string | null
  map_polyline: string | null
  weather: string | null
  sync_source: 'strava_webhook' | 'manual' | 'backfill' | null
  match_method: 'hashtag' | 'schedule' | 'manual_review' | null
  match_confidence: 'high' | 'medium' | 'manual' | null
  strava_deleted_at: string | null
  created_at: string
}

export interface Cue {
  id: string
  athlete_id: string
  helps: string[]
  avoid: string[]
  best_cues: string[]
  kit: string[]
  version: number
  previous_cues: Json | null
  updated_by: string | null
  updated_at: string
}

export interface CoachNote {
  id: string
  athlete_id: string
  coach_user_id: string | null
  content: string
  note_type: 'general' | 'milestone' | 'observation'
  visibility: 'all' | 'coaches_only'
  created_at: string
}

export interface MilestoneDefinition {
  id: string
  label: string
  type: 'automatic' | 'manual'
  condition: Json | null
  icon: string | null
  display_order: number
  active: boolean
  created_by: string | null
  created_at: string
}

export interface Milestone {
  id: string
  athlete_id: string
  milestone_definition_id: string | null
  label: string
  achieved_at: string
  awarded_by: string | null
  share_image_url: string | null
  created_at: string
}

export interface Media {
  id: string
  athlete_id: string
  session_id: string | null
  milestone_id: string | null
  url: string
  caption: string | null
  uploaded_by: string | null
  created_at: string
}

export interface StravaConnection {
  user_id: string
  strava_athlete_id: number
  access_token: string
  refresh_token: string
  token_expires_at: string
  last_sync_at: string | null
  last_sync_status: 'ok' | 'token_expired' | 'error' | null
  last_error: string | null
  created_at: string
}

export interface StravaSyncLog {
  id: string
  strava_activity_id: number
  coach_user_id: string | null
  event_type: 'create' | 'update' | 'delete'
  event_time: string | null
  received_at: string
  processed_at: string | null
  status: 'pending' | 'matched' | 'unmatched' | 'skipped' | 'error'
  result_session_id: string | null
  error_message: string | null
  raw_payload: Json
}

export interface StravaUnmatched {
  id: string
  coach_user_id: string | null
  strava_activity_id: number
  activity_data: Json
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
  resolved_session_id: string | null
}

export interface SessionRsvp {
  id: string
  session_id: string
  user_id: string
  status: 'confirmed' | 'absent'
  note: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'milestone' | 'feel_prompt' | 'unmatched_run' | 'strava_disconnected' | 'general'
  payload: Json
  read: boolean
  channel: 'in_app' | 'email' | 'push'
  delivered_at: string | null
  created_at: string
}

export interface Invitation {
  id: string
  email: string
  role: 'admin' | 'coach' | 'caregiver'
  athlete_id: string | null
  invited_by: string | null
  accepted_at: string | null
  created_at: string
}
