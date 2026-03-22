/**
 * Narrative digest generator — pure functions.
 *
 * Transforms structured week data into warm, readable prose.
 * No database calls. No imports from @/lib/supabase.
 */

import type {
  CoachDigestInput,
  CaregiverDigestInput,
  DigestNarrative,
  NarrativeParagraph,
  AthleteWeekData,
} from './types'

// ─── Helpers ──────────────────────────────────────────────────

export function pickVariant(options: string[], weekLabel: string): string {
  let hash = 0
  for (let i = 0; i < weekLabel.length; i++) {
    hash = ((hash << 5) - hash + weekLabel.charCodeAt(i)) | 0
  }
  return options[Math.abs(hash) % options.length]
}

function formatKm(km: number): string {
  return km % 1 === 0 ? `${km}` : `${km.toFixed(1)}`
}

function pluralSessions(n: number): string {
  return n === 1 ? '1 session' : `${n} sessions`
}

const MAX_HIGHLIGHTS = 5

// ─── Coach Narrative ──────────────────────────────────────────

export function generateCoachNarrative(input: CoachDigestInput): DigestNarrative {
  const { coachName, weekLabel, athletes, totalSessionsAllAthletes, totalKmAllAthletes } = input
  const paragraphs: NarrativeParagraph[] = []

  const athletesWithSessions = athletes.filter(a => a.sessionsThisWeek > 0)
  const isEmpty = totalSessionsAllAthletes === 0

  // --- Opening ---
  if (isEmpty) {
    // Compute club-wide cumulative totals for context
    const totalAthleteCount = athletes.length
    const totalSessionsAcrossAll = athletes.reduce((sum, a) => sum + a.totalSessionsAllTime, 0)
    const cumulativeSuffix = totalAthleteCount > 0 && totalSessionsAcrossAll > 0
      ? ` The club's been at it though: ${totalAthleteCount} athlete${totalAthleteCount !== 1 ? 's' : ''}, ${totalSessionsAcrossAll}+ sessions and counting.`
      : ''

    const opening = pickVariant(
      [
        `Quiet week — no sessions logged between ${weekLabel}.${cumulativeSuffix || " That's okay, everyone needs a rest week."}`,
        `No sessions this week (${weekLabel}).${cumulativeSuffix || ' Rest is part of the process.'}`,
        `Nothing logged between ${weekLabel}.${cumulativeSuffix || ' A quiet week can be a good reset.'}`,
      ],
      weekLabel
    )
    paragraphs.push({ type: 'opening', text: opening })
  } else if (totalSessionsAllAthletes <= 2 && athletesWithSessions.length <= 2) {
    const firstAthlete = athletesWithSessions[0]
    const cumulativeContext = firstAthlete.totalSessionsAllTime > 0
      ? ` — that brings ${firstAthlete.athleteName.split(' ')[0] === firstAthlete.athleteName ? 'their' : (athletesWithSessions.length === 1 ? 'their' : 'the')} total to ${firstAthlete.totalSessionsAllTime} sessions and ${formatKm(firstAthlete.totalKmAllTime)}km`
      : ''
    if (totalSessionsAllAthletes === 1 && athletesWithSessions.length === 1) {
      paragraphs.push({
        type: 'opening',
        text: `One session this week with ${firstAthlete.athleteName}${cumulativeContext}. Here's what stood out.`,
      })
    } else {
      paragraphs.push({
        type: 'opening',
        text: `${pluralSessions(totalSessionsAllAthletes)} this week with ${athletesWithSessions.map(a => a.athleteName).join(' and ')}${cumulativeContext}. Here's what stood out.`,
      })
    }
  } else {
    const greeting = pickVariant(
      [
        `Here's your week, ${coachName}.`,
        `Week in review, ${coachName}.`,
        `Your weekly notes, ${coachName}.`,
      ],
      weekLabel
    )
    paragraphs.push({
      type: 'opening',
      text: `${greeting} ${pluralSessions(totalSessionsAllAthletes)} across ${athletesWithSessions.length} athlete${athletesWithSessions.length !== 1 ? 's' : ''}, covering ${formatKm(totalKmAllAthletes)}km.`,
    })
  }

  // --- Per-athlete highlights ---
  // Score athletes by interest level for prioritisation
  const scored = athletesWithSessions
    .map(a => ({ athlete: a, score: getInterestScore(a) }))
    .sort((a, b) => b.score - a.score)

  const highlighted: NarrativeParagraph[] = []
  for (const { athlete } of scored) {
    if (highlighted.length >= MAX_HIGHLIGHTS) break
    const p = generateAthleteHighlight(athlete)
    if (p) highlighted.push(p)
  }

  // If we skipped athletes, add a summary line
  const skippedCount = athletesWithSessions.length - highlighted.length
  if (skippedCount > 0) {
    const lastHighlight = highlighted[highlighted.length - 1]
    if (lastHighlight) {
      paragraphs.push(...highlighted)
      paragraphs.push({
        type: 'highlight',
        text: `...and ${skippedCount} more athlete${skippedCount !== 1 ? 's' : ''} had steady weeks.`,
      })
    }
  } else {
    paragraphs.push(...highlighted)
  }

  // --- Heads-up ---
  const headsUp: NarrativeParagraph[] = []
  for (const athlete of athletes) {
    if (athlete.goingQuiet) {
      headsUp.push({
        type: 'heads-up',
        text: `${athlete.athleteName} hasn't had a session in ${athlete.goingQuiet.daysSinceLastSession} days. They'd been averaging every ${athlete.goingQuiet.averageCadenceDays} days. Might be worth a check-in.`,
        athleteId: athlete.athleteId,
        athleteName: athlete.athleteName,
        icon: '👋',
      })
    }
    if (athlete.feelTrend === 'declining') {
      headsUp.push({
        type: 'heads-up',
        text: `${athlete.athleteName}'s feel ratings have been lower recently.`,
        athleteId: athlete.athleteId,
        athleteName: athlete.athleteName,
        icon: '📉',
      })
    }
  }
  paragraphs.push(...headsUp)

  // --- Closing ---
  const hasHighlights = highlighted.length > 0
  const hasConcerns = headsUp.length > 0

  if (isEmpty) {
    paragraphs.push({
      type: 'closing',
      text: pickVariant(
        ['Rest weeks are part of the process. See you next week.', 'Back at it next week.'],
        weekLabel
      ),
    })
  } else if (hasHighlights && !hasConcerns) {
    paragraphs.push({
      type: 'closing',
      text: pickVariant(
        ['Good week overall. Keep it going.', 'Solid week. More to come.', 'Nice progress this week.'],
        weekLabel
      ),
    })
  } else if (hasConcerns && !hasHighlights) {
    paragraphs.push({
      type: 'closing',
      text: 'A few things to keep an eye on. Every week is different.',
    })
  } else {
    paragraphs.push({
      type: 'closing',
      text: pickVariant(
        ['Good week with a few things to watch. Keep going.', 'Mixed week — some highlights, some things to follow up on.'],
        weekLabel
      ),
    })
  }

  return { weekLabel, paragraphs, isEmpty }
}

function getInterestScore(athlete: AthleteWeekData): number {
  if (athlete.bestWeekEver) return 6
  if (athlete.personalBest) return 5
  if (athlete.milestonesEarned.length > 0) return 4
  if (athlete.approachingMilestone) return 3
  if (athlete.feelTrend === 'improving') return 2
  return 1
}

function generateAthleteHighlight(athlete: AthleteWeekData): NarrativeParagraph | null {
  const { athleteId, athleteName } = athlete

  if (athlete.bestWeekEver) {
    return {
      type: 'highlight',
      text: `${athleteName} just had the best week yet — ${pluralSessions(athlete.sessionsThisWeek)} covering ${formatKm(athlete.totalKmThisWeek)}km. That's a new high.`,
      athleteId,
      athleteName,
      icon: '🏆',
      avatar: athlete.avatar,
    }
  }

  if (athlete.personalBest) {
    const pb = athlete.personalBest
    const prev = pb.previousBestKm ? `, up from ${formatKm(pb.previousBestKm)}km` : ''
    return {
      type: 'highlight',
      text: `${athleteName} ran ${formatKm(pb.distanceKm)}km — a new personal best${prev}.`,
      athleteId,
      athleteName,
      icon: '⭐',
      avatar: athlete.avatar,
    }
  }

  if (athlete.milestonesEarned.length > 0) {
    const m = athlete.milestonesEarned[0]
    return {
      type: 'highlight',
      text: `${athleteName} earned '${m.label}' ${m.icon}. A real achievement.`,
      athleteId,
      athleteName,
      icon: m.icon,
      avatar: athlete.avatar,
    }
  }

  if (athlete.approachingMilestone) {
    const ms = athlete.approachingMilestone
    const remaining = ms.target - ms.current
    return {
      type: 'highlight',
      text: `${athleteName} is ${remaining} ${ms.unit} away from '${ms.label}' (${ms.current} of ${ms.target}). Getting close.`,
      athleteId,
      athleteName,
      icon: '🎯',
      avatar: athlete.avatar,
      milestoneProgress: { current: ms.current, target: ms.target, label: ms.label },
    }
  }

  if (athlete.feelTrend === 'improving') {
    return {
      type: 'highlight',
      text: `${athleteName} has been feeling good lately — feel ratings trending up over recent sessions.`,
      athleteId,
      athleteName,
      icon: '😊',
      avatar: athlete.avatar,
    }
  }

  // Active but nothing special
  return {
    type: 'highlight',
    text: `${athleteName} had ${pluralSessions(athlete.sessionsThisWeek)} this week. Steady progress.`,
    athleteId,
    athleteName,
    icon: '🏃',
    avatar: athlete.avatar,
  }
}

// ─── Caregiver Narrative ──────────────────────────────────────

export function generateCaregiverNarrative(input: CaregiverDigestInput): DigestNarrative {
  const { weekLabel, athlete } = input
  const paragraphs: NarrativeParagraph[] = []
  const isEmpty = athlete.sessionsThisWeek === 0

  // --- Opening ---
  if (isEmpty) {
    paragraphs.push({
      type: 'opening',
      text: `No sessions this week for ${athlete.athleteName}. That's okay — rest is part of the process.`,
    })
  } else {
    const greeting = pickVariant(
      [
        `Here's ${athlete.athleteName}'s week (${weekLabel}).`,
        `${athlete.athleteName}'s week in review (${weekLabel}).`,
        `Weekly update for ${athlete.athleteName} (${weekLabel}).`,
      ],
      weekLabel
    )
    paragraphs.push({ type: 'opening', text: greeting })
  }

  // --- Body ---
  if (!isEmpty) {
    const parts: string[] = []

    parts.push(
      `${pluralSessions(athlete.sessionsThisWeek)} this week, covering ${formatKm(athlete.totalKmThisWeek)}km.`
    )

    if (athlete.personalBest) {
      const pb = athlete.personalBest
      const prev = pb.previousBestKm ? `, up from ${formatKm(pb.previousBestKm)}km` : ''
      parts.push(`${athlete.athleteName} ran ${formatKm(pb.distanceKm)}km — a new personal best${prev}.`)
    }

    if (athlete.milestonesEarned.length > 0) {
      const m = athlete.milestonesEarned[0]
      parts.push(`${athlete.athleteName} earned '${m.label}' ${m.icon} this week.`)
    }

    if (athlete.approachingMilestone) {
      const ms = athlete.approachingMilestone
      const remaining = ms.target - ms.current
      parts.push(`${remaining} more ${ms.unit} until the next milestone: '${ms.label}' (${ms.current} of ${ms.target}).`)
    }

    if (athlete.bestWeekEver) {
      parts.push(`This was ${athlete.athleteName}'s best week yet.`)
    }

    paragraphs.push({
      type: 'highlight',
      text: parts.join(' '),
      athleteId: athlete.athleteId,
      athleteName: athlete.athleteName,
    })
  }

  // --- Closing ---
  let closingText: string
  if (isEmpty) {
    closingText = 'Every session counts.'
  } else if (athlete.personalBest || athlete.bestWeekEver || athlete.milestonesEarned.length > 0) {
    closingText = 'Wonderful progress.'
  } else {
    closingText = pickVariant(['Steady week.', 'Every session counts.', 'Solid progress.'], weekLabel)
  }

  paragraphs.push({ type: 'closing', text: closingText })

  return { weekLabel, paragraphs, isEmpty }
}

// ─── Teaser Text ──────────────────────────────────────────────

/**
 * Generate a single-line teaser for the feed card.
 * Picks the most interesting observation from the week.
 */
export function generateTeaserText(narrative: DigestNarrative): string {
  // Priority: first highlight paragraph text, truncated to ~80 chars
  const highlight = narrative.paragraphs.find(p => p.type === 'highlight')
  if (highlight) {
    const text = highlight.text
    return text.length > 80 ? text.slice(0, 77) + '...' : text
  }
  // Fallback to opening
  const opening = narrative.paragraphs.find(p => p.type === 'opening')
  return opening?.text ?? 'Your weekly notes are ready.'
}

// ─── Email HTML ───────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Render a DigestNarrative as simple HTML paragraphs for email.
 * No Tailwind — uses inline styles only (email-safe).
 */
export function narrativeToEmailHtml(narrative: DigestNarrative): string {
  const BRAND = '#0F766E'
  const MUTED = '#6B7280'

  return narrative.paragraphs
    .map(p => {
      if (p.type === 'opening') {
        return `<p style="font-size:15px;color:#111827;margin:0 0 16px 0;line-height:1.6;">${escapeHtml(p.text)}</p>`
      }
      if (p.type === 'highlight') {
        const icon = p.icon ? `${p.icon} ` : ''
        return `<p style="font-size:14px;color:#4B5563;margin:0 0 12px 0;line-height:1.6;padding-left:8px;border-left:2px solid ${BRAND};">${icon}${escapeHtml(p.text)}</p>`
      }
      if (p.type === 'heads-up') {
        const icon = p.icon ? `${p.icon} ` : ''
        return `<p style="font-size:14px;color:#92400E;margin:0 0 12px 0;line-height:1.6;padding-left:8px;border-left:2px solid #F59E0B;">${icon}${escapeHtml(p.text)}</p>`
      }
      if (p.type === 'closing') {
        return `<p style="font-size:14px;color:${MUTED};font-style:italic;margin:16px 0 0 0;">${escapeHtml(p.text)}</p>`
      }
      return ''
    })
    .join('\n')
}
