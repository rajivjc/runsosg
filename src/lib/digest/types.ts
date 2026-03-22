export interface AthleteWeekData {
  athleteId: string
  athleteName: string
  avatar: string | null
  sessionsThisWeek: number
  totalKmThisWeek: number
  feelsThisWeek: number[] // array of feel values (1-5)
  personalBest: {
    distanceKm: number
    previousBestKm: number | null
    date: string
  } | null
  milestonesEarned: {
    label: string
    icon: string
  }[]
  feelTrend: 'improving' | 'declining' | 'stable' | 'insufficient'
  goingQuiet: {
    daysSinceLastSession: number
    averageCadenceDays: number
  } | null // null = not going quiet
  approachingMilestone: {
    label: string
    current: number
    target: number
    unit: string // 'sessions' | 'km'
  } | null
  bestWeekEver: boolean
  totalSessionsAllTime: number       // cumulative sessions ever
  totalKmAllTime: number             // cumulative km ever
  lastSessionDate: string | null     // ISO date of most recent session
}

export interface CoachDigestInput {
  coachName: string
  weekLabel: string // "10 Mar – 16 Mar 2026"
  athletes: AthleteWeekData[]
  totalSessionsAllAthletes: number
  totalKmAllAthletes: number
}

export interface CaregiverDigestInput {
  caregiverName: string | null
  weekLabel: string
  athlete: AthleteWeekData
}

// ─── Narrative output ─────────────────────────────────────────

export interface NarrativeParagraph {
  type: 'opening' | 'highlight' | 'heads-up' | 'closing'
  text: string
  athleteId?: string // for linking in the UI
  athleteName?: string
  icon?: string // emoji for visual variety
  avatar?: string | null // athlete avatar emoji
  milestoneProgress?: { current: number; target: number; label: string }
}

export interface DigestNarrative {
  weekLabel: string
  paragraphs: NarrativeParagraph[]
  isEmpty: boolean // true if nothing happened this week
}
