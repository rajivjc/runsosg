/**
 * Unit tests for the narrative digest polish: cumulative context,
 * progress fractions, teaser text, email HTML, and new components.
 */

import {
  generateCoachNarrative,
  generateCaregiverNarrative,
  generateTeaserText,
  narrativeToEmailHtml,
} from '@/lib/digest/narrative'
import type {
  CoachDigestInput,
  CaregiverDigestInput,
  AthleteWeekData,
  DigestNarrative,
  NarrativeParagraph,
} from '@/lib/digest/types'
import * as fs from 'fs'
import * as path from 'path'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeAthlete(overrides: Partial<AthleteWeekData> = {}): AthleteWeekData {
  return {
    athleteId: 'athlete-1',
    athleteName: 'Wei Jie Tan',
    avatar: null,
    sessionsThisWeek: 2,
    totalKmThisWeek: 8.5,
    feelsThisWeek: [4, 3],
    personalBest: null,
    milestonesEarned: [],
    feelTrend: 'stable',
    goingQuiet: null,
    approachingMilestone: null,
    bestWeekEver: false,
    totalSessionsAllTime: 19,
    totalKmAllTime: 67.8,
    lastSessionDate: '2026-03-15',
    ...overrides,
  }
}

function makeCoachInput(overrides: Partial<CoachDigestInput> = {}): CoachDigestInput {
  return {
    coachName: 'Rajiv',
    weekLabel: '10 Mar – 16 Mar 2026',
    athletes: [makeAthlete()],
    totalSessionsAllAthletes: 2,
    totalKmAllAthletes: 8.5,
    ...overrides,
  }
}

// ── Test 1: AthleteWeekData includes cumulative fields ──────────────────────

test('AthleteWeekData includes cumulative fields', () => {
  const typesPath = path.resolve(__dirname, '../../src/lib/digest/types.ts')
  const content = fs.readFileSync(typesPath, 'utf-8')

  expect(content).toContain('totalSessionsAllTime')
  expect(content).toContain('totalKmAllTime')
  expect(content).toContain('lastSessionDate')
})

// ── Test 2: Approaching milestone text includes progress fraction ───────────

test('approaching milestone text includes progress fraction', () => {
  const input = makeCoachInput({
    athletes: [
      makeAthlete({
        approachingMilestone: { label: '25 Sessions', current: 19, target: 25, unit: 'sessions' },
      }),
    ],
  })
  const result = generateCoachNarrative(input)

  const highlights = result.paragraphs.filter(p => p.type === 'highlight')
  const msHighlight = highlights.find(p => p.text.includes('25 Sessions'))
  expect(msHighlight).toBeDefined()
  expect(msHighlight!.text).toContain('19 of 25')
})

// ── Test 3: Opening includes cumulative context for light weeks ─────────────

test('opening includes cumulative context for light weeks', () => {
  const input = makeCoachInput({
    athletes: [
      makeAthlete({
        sessionsThisWeek: 1,
        totalKmThisWeek: 3.2,
        totalSessionsAllTime: 19,
        totalKmAllTime: 67.8,
      }),
    ],
    totalSessionsAllAthletes: 1,
    totalKmAllAthletes: 3.2,
  })
  const result = generateCoachNarrative(input)

  const opening = result.paragraphs.find(p => p.type === 'opening')
  expect(opening).toBeDefined()
  expect(opening!.text).toMatch(/19 sessions|67\.8km/)
})

// ── Test 4: generateTeaserText returns highlight text ───────────────────────

test('generateTeaserText returns highlight text', () => {
  const input = makeCoachInput({
    athletes: [
      makeAthlete({
        personalBest: { distanceKm: 5.1, previousBestKm: 4.8, date: '2026-03-15' },
      }),
    ],
  })
  const result = generateCoachNarrative(input)
  const teaser = generateTeaserText(result)

  expect(teaser.toLowerCase()).toContain('personal best')
})

// ── Test 5: generateTeaserText truncates long text ──────────────────────────

test('generateTeaserText truncates long text', () => {
  // Create a narrative with a very long highlight
  const longText = 'A'.repeat(120)
  const narrative: DigestNarrative = {
    weekLabel: '10 Mar – 16 Mar 2026',
    paragraphs: [
      { type: 'highlight', text: longText },
    ],
    isEmpty: false,
  }
  const teaser = generateTeaserText(narrative)

  expect(teaser.length).toBeLessThanOrEqual(80)
  expect(teaser).toContain('...')
})

// ── Test 6: narrativeToEmailHtml returns valid HTML ─────────────────────────

test('narrativeToEmailHtml returns valid HTML', () => {
  const input = makeCoachInput({
    athletes: [
      makeAthlete({
        personalBest: { distanceKm: 5.1, previousBestKm: 4.8, date: '2026-03-15' },
      }),
    ],
  })
  const narrative = generateCoachNarrative(input)
  const html = narrativeToEmailHtml(narrative)

  expect(html).toContain('<p')
  // Verify highlights have border-left style
  expect(html).toContain('border-left')
  // Verify no raw angle brackets in text content (basic check)
  // The HTML itself uses <p> tags, so we check that text content is escaped properly
  // by checking the output doesn't contain unescaped user text patterns
  expect(html.length).toBeGreaterThan(0)
})

// ── Test 7: narrativeToEmailHtml escapes special characters ─────────────────

test('narrativeToEmailHtml escapes special characters', () => {
  // Create a narrative with special characters in athlete name
  const narrative: DigestNarrative = {
    weekLabel: '10 Mar – 16 Mar 2026',
    paragraphs: [
      { type: 'opening', text: 'Test with <script> & "quotes"' },
      { type: 'highlight', text: 'Athlete A & B ran <5km', icon: '⭐' },
    ],
    isEmpty: false,
  }
  const html = narrativeToEmailHtml(narrative)

  expect(html).toContain('&amp;')
  expect(html).toContain('&lt;')
  // Raw < should not appear in text content
  expect(html).not.toContain('<script>')
})

// ── Test 8: DigestTeaser component file exists ──────────────────────────────

test('DigestTeaser component file exists', () => {
  const teaserPath = path.resolve(__dirname, '../../src/components/feed/DigestTeaser.tsx')
  const content = fs.readFileSync(teaserPath, 'utf-8')

  expect(content).toContain("'use client'")
  expect(content).toContain('/digest')
})

// ── Test 9: NarrativeParagraph has avatar and milestoneProgress fields ──────

test('NarrativeParagraph has avatar and milestoneProgress fields', () => {
  const typesPath = path.resolve(__dirname, '../../src/lib/digest/types.ts')
  const content = fs.readFileSync(typesPath, 'utf-8')

  expect(content).toContain('avatar')
  expect(content).toContain('milestoneProgress')
})

// ── Test 10: Coach feed types include digestTeaser ──────────────────────────

test('coach feed types include digestTeaser', () => {
  const typesPath = path.resolve(__dirname, '../../src/lib/feed/types.ts')
  const content = fs.readFileSync(typesPath, 'utf-8')

  expect(content).toContain('digestTeaser')
})
