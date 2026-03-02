/**
 * Typed interfaces for the feed page data.
 *
 * These replace the `any` casts that were scattered throughout the
 * monolithic feed page. Every query result now flows through one of
 * these shapes before reaching components.
 */

import type { CoachFocusData, CaregiverFocusData } from '@/lib/feed/today-focus'
import type { WeeklyRecap } from '@/lib/feed/weekly-recap'
import type { OnboardingState } from '@/lib/onboarding'
import type { BadgeDefinition } from '@/lib/badges'

// ─── Session & Milestone shapes ──────────────────────────────────

export interface FeedSession {
  id: string
  date: string
  distance_km: number | null
  duration_seconds: number | null
  feel: number | null
  note: string | null
  athlete_id: string
  coach_user_id: string | null
  strava_title: string | null
  athlete_name: string
  coach_name: string | null
}

export interface FeedMilestone {
  id: string
  athlete_id: string
  session_id: string | null
  label: string
  achieved_at: string
  athlete_name: string
  icon: string
}

export interface MilestoneBadge {
  id: string
  icon: string
  label: string
}

export interface CelebrationMilestone {
  id: string
  label: string
  icon: string
  athleteName: string
  achievedAt: string
}

// ─── Cheer shapes ────────────────────────────────────────────────

export interface FeedCheer {
  id: string
  athlete_id: string
  message: string
  created_at: string
  viewed_at: string | null
}

// ─── Coach feed data ─────────────────────────────────────────────

export interface CoachFeedData {
  user: { role: string; name: string | null }
  sessions: FeedSession[]
  groups: Record<string, FeedSession[]>
  milestonesBySession: Record<string, MilestoneBadge[]>
  celebrationMilestones: CelebrationMilestone[]
  kudosCounts: Record<string, number>
  myKudos: Set<string>
  clubStats: {
    sessions: number
    km: number
    athletes: number
    milestones: number
    coaches: number
    caregivers: number
  }
  coachStats: {
    monthSessions: number
    monthAthletes: number
    totalSessions: number
  }
  coachFocus: CoachFocusData | null
  badges: { badge_key: string; earned_at: string }[]
  recentBadge: BadgeDefinition | null
  recentCheers: FeedCheer[]
  hasStrava: boolean
  onboarding: OnboardingState | null
  weeklyRecap: WeeklyRecap
  weeklyStats: { count: number; km: number; athletes: number }
}

// ─── Caregiver feed data ─────────────────────────────────────────

export interface CaregiverFeedData {
  user: { role: string; name: string | null }
  athlete: { id: string; name: string } | null
  recentSessions: { id: string; date: string; distance_km: number | null; feel: number | null }[]
  milestones: { id: string; label: string; icon: string; achieved_at: string }[]
  recentNotes: { content: string; created_at: string }[]
  cheerSentToday: boolean
  sentCheers: FeedCheer[]
  caregiverFocus: CaregiverFocusData | null
  // Caregivers also see the global feed
  sessions: FeedSession[]
  groups: Record<string, FeedSession[]>
  kudosCounts: Record<string, number>
  myKudos: Set<string>
  clubStats: {
    sessions: number
    km: number
    athletes: number
    milestones: number
    coaches: number
    caregivers: number
  }
  milestonesBySession: Record<string, MilestoneBadge[]>
  celebrationMilestones: CelebrationMilestone[]
  weeklyRecap: WeeklyRecap
  weeklyStats: { count: number; km: number; athletes: number }
  // Caregiver sharing control (Feature A)
  allowPublicSharing: boolean
  sharingDisabledByCaregiver: boolean
}
