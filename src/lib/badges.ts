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
]

export async function checkAndAwardBadges(userId: string): Promise<string[]> {
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
        .eq('status', 'completed'),
      adminClient
        .from('sessions')
        .select('athlete_id')
        .eq('coach_user_id', userId)
        .eq('status', 'completed'),
      adminClient
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('coach_user_id', userId)
        .eq('status', 'completed')
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
        .not('feel', 'is', null),
    ])

    const uniqueAthletes = new Set((athleteData ?? []).map((s: any) => s.athlete_id))

    const stats: CoachStats = {
      sessionCount: sessionCount ?? 0,
      athleteCount: uniqueAthletes.size,
      noteCount: noteCount ?? 0,
      kudosGivenCount: kudosCount ?? 0,
      feelRatedCount: feelCount ?? 0,
    }

    // Check for new badges
    const newBadges: string[] = []
    const inserts: { user_id: string; badge_key: string }[] = []

    for (const badge of BADGE_DEFINITIONS) {
      if (earnedKeys.has(badge.key)) continue
      if (badge.check(stats)) {
        newBadges.push(badge.key)
        inserts.push({ user_id: userId, badge_key: badge.key })
      }
    }

    if (inserts.length > 0) {
      await adminClient.from('coach_badges').insert(inserts)
    }

    return newBadges
  } catch (err) {
    console.error('checkAndAwardBadges error:', err)
    return []
  }
}

export function getBadgeDefinition(key: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((b) => b.key === key)
}
