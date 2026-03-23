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
import type { StreakDetails } from '@/lib/streaks'
import type { ClubBestWeek } from '@/lib/analytics/club-records'
import type { ProgressLevel } from '@/lib/supabase/types'
import type { GoalProgress } from '@/lib/goals'

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
  coachName: string | null
  themeColor: string | null
  avatar: string | null
  clubName: string
}

// ─── Cheer shapes ────────────────────────────────────────────────

export interface FeedCheer {
  id: string
  athlete_id: string
  message: string
  created_at: string
  viewed_at: string | null
}

// ─── Athlete message shapes ─────────────────────────────────────

export interface FeedAthleteMessage {
  id: string
  athlete_id: string
  athlete_name: string
  message: string
  created_at: string
}

// ─── Coach feed data ─────────────────────────────────────────────

export interface CoachFeedData {
  user: { role: string; name: string | null }
  sessions: FeedSession[]
  groups: Record<string, FeedSession[]>
  milestonesBySession: Record<string, MilestoneBadge[]>
  celebrationMilestones: CelebrationMilestone[]
  kudosCounts: Record<string, number>
  kudosGivers: Record<string, string[]>
  myKudos: Set<string>
  clubStats: {
    sessions: number
    km: number
    athletes: number
    milestones: number
    coaches: number
    caregivers: number
    thisMonthSessions: number
    thisMonthKm: number
    lastMonthSessions: number
    lastMonthKm: number
    bestWeek: ClubBestWeek | null
    totalDurationSeconds: number
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
  athleteMessages: FeedAthleteMessage[]
  hasStrava: boolean
  onboarding: OnboardingState | null
  weeklyRecap: WeeklyRecap
  weeklyStats: { count: number; km: number; athletes: number }
  digestTeaser: { text: string; weekLabel: string } | null
}

// ─── Caregiver feed data ─────────────────────────────────────────

export interface CaregiverFeedData {
  user: { role: string; name: string | null }
  athlete: { id: string; name: string; avatar: string | null } | null
  recentSessions: { id: string; date: string; distance_km: number | null; feel: number | null }[]
  milestones: { id: string; label: string; icon: string; achieved_at: string }[]
  recentNotes: { content: string; created_at: string; coach_name: string | null }[]
  cheersToday: number
  sentCheers: FeedCheer[]
  caregiverFocus: CaregiverFocusData | null
  // Caregivers also see the global feed
  sessions: FeedSession[]
  groups: Record<string, FeedSession[]>
  kudosCounts: Record<string, number>
  kudosGivers: Record<string, string[]>
  myKudos: Set<string>
  clubStats: {
    sessions: number
    km: number
    athletes: number
    milestones: number
    coaches: number
    caregivers: number
    thisMonthSessions: number
    thisMonthKm: number
    lastMonthSessions: number
    lastMonthKm: number
    bestWeek: ClubBestWeek | null
    totalDurationSeconds: number
  }
  milestonesBySession: Record<string, MilestoneBadge[]>
  celebrationMilestones: CelebrationMilestone[]
  weeklyRecap: WeeklyRecap
  weeklyStats: { count: number; km: number; athletes: number }
  athleteStreak: StreakDetails | null
  // Caregiver sharing control (Feature A)
  allowPublicSharing: boolean
  sharingDisabledByCaregiver: boolean
  // Caregiver onboarding
  onboarding: OnboardingState | null
  // Working on status (coach-written, caregiver-visible)
  workingOn: {
    text: string | null
    recentProgress: string | null
    updatedAt: string | null
    coachName: string | null
  }
  // Plan data (focus areas + goal tracking)
  planData: {
    focusTitle: string | null
    focusProgressNote: string | null
    focusProgressLevel: ProgressLevel | null
    focusUpdatedAt: string | null
    focusCoachName: string | null
    runningGoal: string | null
    goalProgress: GoalProgress | null
    recentAchievement: string | null
  }
  digestTeaser: { text: string; weekLabel: string } | null
  // Auto-generated monthly summary
  monthlySummary: {
    thisMonth: { runs: number; km: number; durationSeconds: number }
    lastMonth: { runs: number; km: number }
  }
}
