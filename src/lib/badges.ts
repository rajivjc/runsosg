import { adminClient } from '@/lib/supabase/admin'

export interface BadgeDefinition {
  key: string
  label: string
  icon: string
  description: string
  check: (stats: CoachStats) => boolean
}

interface CoachStats {
  sessionCount: number
  athleteCount: number
  noteCount: number
  kudosGivenCount: number
  feelRatedCount: number
  sessionDates: string[]
  sessionsPerAthlete: number[]
}

export interface BadgeSyncResult {
  awarded: string[]
  revoked: string[]
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    key: 'first_steps',
    label: 'First Steps',
    icon: '👟',
    description: 'Log your first session',
    check: (s) => s.sessionCount >= 1,
  },
  {
    key: 'high_five',
    label: 'High Five',
    icon: '🖐️',
    description: 'Coach 5 sessions',
    check: (s) => s.sessionCount >= 5,
  },
  {
    key: 'double_digits',
    label: 'Double Digits',
    icon: '🔟',
    description: 'Coach 10 sessions',
    check: (s) => s.sessionCount >= 10,
  },
  {
    key: 'quarter_century',
    label: 'Quarter Century',
    icon: '🏅',
    description: 'Coach 25 sessions',
    check: (s) => s.sessionCount >= 25,
  },
  {
    key: 'half_century',
    label: 'Half Century',
    icon: '⭐',
    description: 'Coach 50 sessions',
    check: (s) => s.sessionCount >= 50,
  },
  {
    key: 'century_club',
    label: 'Century Club',
    icon: '💯',
    description: 'Coach 100 sessions',
    check: (s) => s.sessionCount >= 100,
  },
  {
    key: 'team_player',
    label: 'Team Player',
    icon: '🤝',
    description: 'Coach 3 different athletes',
    check: (s) => s.athleteCount >= 3,
  },
  {
    key: 'all_star_coach',
    label: 'All-Star Coach',
    icon: '🌟',
    description: 'Coach 5+ different athletes',
    check: (s) => s.athleteCount >= 5,
  },
  {
    key: 'storyteller',
    label: 'Storyteller',
    icon: '📝',
    description: 'Write 10 session notes',
    check: (s) => s.noteCount >= 10,
  },
  {
    key: 'heart_reader',
    label: 'Heart Reader',
    icon: '💬',
    description: 'Rate feel on 10 sessions',
    check: (s) => s.feelRatedCount >= 10,
  },
  {
    key: 'cheerleader',
    label: 'Cheerleader',
    icon: '👋',
    description: 'Give 10 kudos',
    check: (s) => s.kudosGivenCount >= 10,
  },
  {
    key: 'rain_or_shine',
    label: 'Rain or Shine',
    icon: '☂️',
    description: 'Coach at least once a month for 4 months straight',
    check: (s) => {
      const months = new Set(
        s.sessionDates.map((d) => d.slice(0, 7)) // 'YYYY-MM'
      )
      const now = new Date()
      for (let i = 0; i < 4; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (!months.has(key)) return false
      }
      return true
    },
  },
  {
    key: 'anchor',
    label: 'Anchor',
    icon: '⚓',
    description: 'Coach at least once a week for 8 weeks straight',
    check: (s) => {
      // Compute ISO week key for each session date
      const weeks = new Set(
        s.sessionDates.map((d) => {
          const date = new Date(d + 'T00:00:00Z')
          // ISO week calculation
          const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
          tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7))
          const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
          const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
          return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
        })
      )
      // Check current week and 7 prior consecutive weeks
      const now = new Date()
      const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
      for (let i = 0; i < 8; i++) {
        const d = new Date(today.getTime() - i * 7 * 86400000)
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
        const ys = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
        const wn = Math.ceil(((d.getTime() - ys.getTime()) / 86400000 + 1) / 7)
        const key = `${d.getUTCFullYear()}-W${String(wn).padStart(2, '0')}`
        if (!weeks.has(key)) return false
      }
      return true
    },
  },
  {
    key: 'trusted_pair',
    label: 'Trusted Pair',
    icon: '🤝',
    description: 'Coach the same athlete 10 times',
    check: (s) => s.sessionsPerAthlete.some((count) => count >= 10),
  },
]

export async function syncBadges(userId: string): Promise<BadgeSyncResult> {
  try {
    // Fetch existing badges
    const { data: existing } = await adminClient
      .from('coach_badges')
      .select('badge_key')
      .eq('user_id', userId)

    const earnedKeys = new Set((existing ?? []).map((b: any) => b.badge_key))

    // Fetch coach stats in parallel
    const [
      { count: sessionCount },
      { data: athleteData },
      { count: noteCount },
      { count: kudosCount },
      { count: feelCount },
    ] = await Promise.all([
      adminClient
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('coach_user_id', userId)
        .eq('status', 'completed')
        .is('strava_deleted_at', null),
      adminClient
        .from('sessions')
        .select('athlete_id, date')
        .eq('coach_user_id', userId)
        .eq('status', 'completed')
        .is('strava_deleted_at', null),
      adminClient
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('coach_user_id', userId)
        .eq('status', 'completed')
        .is('strava_deleted_at', null)
        .not('note', 'is', null),
      adminClient
        .from('kudos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      adminClient
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('coach_user_id', userId)
        .eq('status', 'completed')
        .is('strava_deleted_at', null)
        .not('feel', 'is', null),
    ])

    const rows = (athleteData ?? []) as { athlete_id: string; date: string }[]
    const uniqueAthletes = new Set(rows.map((s) => s.athlete_id))
    const sessionDates = rows.map((s) => s.date)

    const athleteCounts = new Map<string, number>()
    for (const row of rows) {
      athleteCounts.set(row.athlete_id, (athleteCounts.get(row.athlete_id) ?? 0) + 1)
    }
    const sessionsPerAthlete = Array.from(athleteCounts.values())

    const stats: CoachStats = {
      sessionCount: sessionCount ?? 0,
      athleteCount: uniqueAthletes.size,
      noteCount: noteCount ?? 0,
      kudosGivenCount: kudosCount ?? 0,
      feelRatedCount: feelCount ?? 0,
      sessionDates,
      sessionsPerAthlete,
    }

    // Award new badges
    const awarded: string[] = []
    const inserts: { user_id: string; badge_key: string }[] = []

    for (const badge of BADGE_DEFINITIONS) {
      if (earnedKeys.has(badge.key)) continue
      if (badge.check(stats)) {
        awarded.push(badge.key)
        inserts.push({ user_id: userId, badge_key: badge.key })
      }
    }

    if (inserts.length > 0) {
      await adminClient.from('coach_badges').insert(inserts)
    }

    // Revoke badges where conditions are no longer met
    const revoked: string[] = []

    for (const badge of BADGE_DEFINITIONS) {
      if (earnedKeys.has(badge.key) && !badge.check(stats)) {
        revoked.push(badge.key)
      }
    }

    if (revoked.length > 0) {
      await adminClient
        .from('coach_badges')
        .delete()
        .eq('user_id', userId)
        .in('badge_key', revoked)
    }

    return { awarded, revoked }
  } catch (err) {
    console.error('syncBadges error:', err)
    return { awarded: [], revoked: [] }
  }
}

/** @deprecated Use syncBadges instead */
export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  const result = await syncBadges(userId)
  return result.awarded
}

export function getBadgeDefinition(key: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((b) => b.key === key)
}
