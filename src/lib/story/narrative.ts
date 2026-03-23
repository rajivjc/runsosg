/**
 * Story narrative generator.
 *
 * Pure function module — takes pre-fetched data and returns structured
 * narrative sections. No database calls, no adminClient imports.
 * Follows the same pattern as src/lib/feed/weekly-recap.ts.
 *
 * Language rules (from CLAUDE.md):
 * - Person-first, literal language only
 * - No idioms, metaphors, or sarcasm
 * - Grade 9 reading level, short sentences, active voice
 * - Self-comparison only — never rankings
 * - No feel ratings on public pages
 */

// ─── Input types ──────────────────────────────────────────────────────────────

export interface NarrativeSession {
  date: string
  distance_km: number | null
}

export interface NarrativeMilestone {
  label: string
  achieved_at: string
  icon: string | null
}

export interface NarrativeInput {
  athleteName: string
  joinedAt: string | null
  runningGoal: string | null
  sessions: NarrativeSession[]
  milestones: NarrativeMilestone[]
  clubName?: string
}

// ─── Output types ─────────────────────────────────────────────────────────────

export interface NarrativeChapter {
  title: string
  paragraphs: string[]
  milestones: NarrativeMilestone[]
  personalBest: { distance: number; date: string } | null
}

export interface ProgressComparison {
  firstSessionDistance: number | null
  recentSessionDistance: number | null
  hasEnoughData: boolean
}

export interface StoryNarrative {
  chapters: NarrativeChapter[]
  progress: ProgressComparison
  streakCallout: string | null
  totalKm: number
  totalSessions: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMonthYear(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-SG', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Singapore',
  })
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Singapore',
  })
}

/** Get the year-month key (e.g. "2026-03") for grouping. */
function yearMonth(dateStr: string): string {
  const d = new Date(dateStr)
  // Use Singapore timezone for consistency
  const sgDate = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Singapore' }))
  const y = sgDate.getFullYear()
  const m = String(sgDate.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** Get ISO week number for streak calculation. */
function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr)
  const sgDate = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Singapore' }))
  // Get Monday of this week
  const day = sgDate.getDay()
  const diff = sgDate.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(sgDate)
  monday.setDate(diff)
  return monday.toISOString().slice(0, 10)
}

function findPersonalBest(
  sessions: NarrativeSession[]
): { distance: number; date: string } | null {
  let best: { distance: number; date: string } | null = null
  for (const s of sessions) {
    if (s.distance_km != null && s.distance_km > 0) {
      if (!best || s.distance_km > best.distance) {
        best = { distance: s.distance_km, date: s.date }
      }
    }
  }
  return best
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generateNarrative(input: NarrativeInput): StoryNarrative {
  const { athleteName, joinedAt, sessions, milestones, clubName = 'the running club' } = input
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const totalSessions = sorted.length
  const totalKm = sorted.reduce((sum, s) => sum + (s.distance_km ?? 0), 0)

  // Handle empty case
  if (sorted.length === 0) {
    const startSentence = joinedAt
      ? `${athleteName} joined ${clubName} in ${formatMonthYear(joinedAt)}.`
      : `${athleteName} is part of the ${clubName} family.`

    return {
      chapters: [
        {
          title: 'The Beginning',
          paragraphs: [startSentence, 'The journey is just getting started.'],
          milestones: [],
          personalBest: null,
        },
      ],
      progress: {
        firstSessionDistance: null,
        recentSessionDistance: null,
        hasEnoughData: false,
      },
      streakCallout: null,
      totalKm: 0,
      totalSessions: 0,
    }
  }

  // Group sessions into time buckets
  const firstMonth = yearMonth(sorted[0].date)
  const lastMonth = yearMonth(sorted[sorted.length - 1].date)

  // Determine distinct months
  const allMonths = new Set(sorted.map(s => yearMonth(s.date)))
  const monthsArray = Array.from(allMonths).sort()

  // Split sessions into chapter buckets
  type Bucket = { sessions: NarrativeSession[]; milestones: NarrativeMilestone[] }
  const chapters: { title: string; bucket: Bucket }[] = []

  if (monthsArray.length === 1) {
    // Single month — just "The Beginning"
    chapters.push({
      title: 'The Beginning',
      bucket: {
        sessions: sorted,
        milestones: milestones.filter(m => yearMonth(m.achieved_at) === firstMonth),
      },
    })
  } else {
    // Multi-month: split into beginning / middle / recent
    const beginningMonths = new Set([monthsArray[0]])
    const recentThreshold = new Date()
    recentThreshold.setDate(recentThreshold.getDate() - 30)

    const recentSessions = sorted.filter(
      s => new Date(s.date) >= recentThreshold
    )
    const recentMonths = new Set(recentSessions.map(s => yearMonth(s.date)))

    // "The Beginning" = first month
    const beginningSessions = sorted.filter(s => beginningMonths.has(yearMonth(s.date)))
    chapters.push({
      title: 'The Beginning',
      bucket: {
        sessions: beginningSessions,
        milestones: milestones.filter(m => beginningMonths.has(yearMonth(m.achieved_at))),
      },
    })

    // "Finding Their Stride" = everything between first month and recent 30 days
    const middleSessions = sorted.filter(s => {
      const ym = yearMonth(s.date)
      return !beginningMonths.has(ym) && !recentMonths.has(ym)
    })
    if (middleSessions.length > 0) {
      const middleMonths = new Set(middleSessions.map(s => yearMonth(s.date)))
      chapters.push({
        title: 'Finding Their Stride',
        bucket: {
          sessions: middleSessions,
          milestones: milestones.filter(m => middleMonths.has(yearMonth(m.achieved_at))),
        },
      })
    }

    // "Recently" = last 30 days (only if different from beginning)
    if (recentSessions.length > 0 && firstMonth !== lastMonth) {
      // Filter out sessions already in beginning
      const recentOnly = recentSessions.filter(
        s => !beginningMonths.has(yearMonth(s.date))
      )
      if (recentOnly.length > 0) {
        chapters.push({
          title: 'Recently',
          bucket: {
            sessions: recentOnly,
            milestones: milestones.filter(m => {
              const d = new Date(m.achieved_at)
              return d >= recentThreshold && !beginningMonths.has(yearMonth(m.achieved_at))
            }),
          },
        })
      }
    }
  }

  // Build narrative chapters
  const overallPB = findPersonalBest(sorted)
  const narrativeChapters: NarrativeChapter[] = chapters.map(
    ({ title, bucket }, idx) => {
      const paragraphs: string[] = []
      const chapterSessions = bucket.sessions
      const chapterKm = chapterSessions.reduce(
        (sum, s) => sum + (s.distance_km ?? 0),
        0
      )

      // Opening sentence
      if (idx === 0) {
        const startDate = joinedAt ?? sorted[0].date
        paragraphs.push(
          `${athleteName} started running with ${clubName} in ${formatMonthYear(startDate)}.`
        )
      }

      // Session count and distance
      if (chapterSessions.length === 1) {
        if (chapterKm > 0) {
          paragraphs.push(
            `${athleteName} completed 1 session covering ${chapterKm.toFixed(1)}km.`
          )
        } else {
          paragraphs.push(`${athleteName} completed 1 session.`)
        }
      } else if (chapterSessions.length > 1) {
        if (chapterKm > 0) {
          paragraphs.push(
            `${athleteName} completed ${chapterSessions.length} sessions covering ${chapterKm.toFixed(1)}km.`
          )
        } else {
          paragraphs.push(
            `${athleteName} completed ${chapterSessions.length} sessions.`
          )
        }
      }

      // Personal best in this chapter
      const chapterPB = findPersonalBest(chapterSessions)
      let pbForChapter: NarrativeChapter['personalBest'] = null
      if (
        chapterPB &&
        overallPB &&
        chapterPB.distance === overallPB.distance &&
        chapterPB.date === overallPB.date
      ) {
        pbForChapter = chapterPB
        paragraphs.push(
          `${athleteName} ran their longest distance yet: ${chapterPB.distance.toFixed(1)}km on ${formatShortDate(chapterPB.date)}.`
        )
      }

      // Milestones
      for (const m of bucket.milestones) {
        paragraphs.push(
          `${athleteName} earned the "${m.label}" milestone.`
        )
      }

      return {
        title,
        paragraphs,
        milestones: bucket.milestones,
        personalBest: pbForChapter,
      }
    }
  )

  // Progress comparison
  const firstWithDistance = sorted.find(
    s => s.distance_km != null && s.distance_km > 0
  )
  const lastWithDistance = [...sorted]
    .reverse()
    .find(s => s.distance_km != null && s.distance_km > 0)

  const progress: ProgressComparison = {
    firstSessionDistance: firstWithDistance?.distance_km ?? null,
    recentSessionDistance: lastWithDistance?.distance_km ?? null,
    hasEnoughData: sorted.length >= 3,
  }

  // Streak callout: consecutive weeks with at least one session
  const weekKeys = [...new Set(sorted.map(s => getWeekKey(s.date)))].sort()
  let maxStreak = 1
  let currentStreak = 1
  for (let i = 1; i < weekKeys.length; i++) {
    const prev = new Date(weekKeys[i - 1])
    const curr = new Date(weekKeys[i])
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays === 7) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 1
    }
  }

  let streakCallout: string | null = null
  if (maxStreak >= 3) {
    streakCallout = `${maxStreak} weeks in a row with at least one session.`
  }

  return {
    chapters: narrativeChapters,
    progress,
    streakCallout,
    totalKm,
    totalSessions,
  }
}
