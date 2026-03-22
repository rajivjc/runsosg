/**
 * Unit tests for the narrative coaching digest.
 *
 * Tests the pure narrative generator functions and verifies
 * page structure and route protection.
 */

import { generateCoachNarrative, generateCaregiverNarrative, pickVariant } from '@/lib/digest/narrative'
import type {
  CoachDigestInput,
  CaregiverDigestInput,
  AthleteWeekData,
} from '@/lib/digest/types'
import * as fs from 'fs'
import * as path from 'path'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeAthlete(overrides: Partial<AthleteWeekData> = {}): AthleteWeekData {
  return {
    athleteId: 'athlete-1',
    athleteName: 'Wei Jie',
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
    totalSessionsAllTime: 15,
    totalKmAllTime: 52.3,
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

function makeCaregiverInput(overrides: Partial<CaregiverDigestInput> = {}): CaregiverDigestInput {
  return {
    caregiverName: 'Jane',
    weekLabel: '10 Mar – 16 Mar 2026',
    athlete: makeAthlete(),
    ...overrides,
  }
}

// ── Test 1: Zero sessions returns isEmpty ────────────────────────────────────

test('generateCoachNarrative returns opening for zero sessions', () => {
  const input = makeCoachInput({
    athletes: [],
    totalSessionsAllAthletes: 0,
    totalKmAllAthletes: 0,
  })
  const result = generateCoachNarrative(input)

  expect(result.isEmpty).toBe(true)
  const opening = result.paragraphs.find(p => p.type === 'opening')
  expect(opening).toBeDefined()
  expect(opening!.text.toLowerCase()).toMatch(/quiet week|no sessions|nothing logged/)
})

// ── Test 2: Personal best highlight ──────────────────────────────────────────

test('generateCoachNarrative returns highlights for personal best', () => {
  const input = makeCoachInput({
    athletes: [
      makeAthlete({
        personalBest: { distanceKm: 5.1, previousBestKm: 4.8, date: '2026-03-15' },
      }),
    ],
  })
  const result = generateCoachNarrative(input)

  const highlights = result.paragraphs.filter(p => p.type === 'highlight')
  expect(highlights.length).toBeGreaterThanOrEqual(1)

  const pbHighlight = highlights.find(p => p.text.includes('5.1') && p.text.toLowerCase().includes('personal best'))
  expect(pbHighlight).toBeDefined()
})

// ── Test 3: Going quiet heads-up ─────────────────────────────────────────────

test('generateCoachNarrative returns heads-up for going quiet', () => {
  const input = makeCoachInput({
    athletes: [
      makeAthlete({
        sessionsThisWeek: 0,
        totalKmThisWeek: 0,
        goingQuiet: { daysSinceLastSession: 14, averageCadenceDays: 5 },
      }),
    ],
    totalSessionsAllAthletes: 0,
    totalKmAllAthletes: 0,
  })
  const result = generateCoachNarrative(input)

  const headsUp = result.paragraphs.filter(p => p.type === 'heads-up')
  expect(headsUp.length).toBeGreaterThanOrEqual(1)
  expect(headsUp[0].text).toContain('14 days')
})

// ── Test 4: One highlight per athlete (PB wins over milestone) ───────────────

test('generateCoachNarrative limits to one highlight per athlete', () => {
  const input = makeCoachInput({
    athletes: [
      makeAthlete({
        athleteId: 'athlete-1',
        athleteName: 'Wei Jie',
        personalBest: { distanceKm: 5.1, previousBestKm: 4.8, date: '2026-03-15' },
        milestonesEarned: [{ label: 'First 5K', icon: '🏅' }],
      }),
    ],
  })
  const result = generateCoachNarrative(input)

  const highlights = result.paragraphs.filter(
    p => p.type === 'highlight' && p.athleteId === 'athlete-1'
  )
  expect(highlights).toHaveLength(1)
  // Personal best should win over milestone by priority
  expect(highlights[0].text.toLowerCase()).toContain('personal best')
})

// ── Test 5: Caregiver narrative does not mention feel ratings ─────────────────

test('generateCaregiverNarrative does not mention feel ratings', () => {
  const input = makeCaregiverInput({
    athlete: makeAthlete({
      feelsThisWeek: [5, 4, 4, 3],
      feelTrend: 'improving',
    }),
  })
  const result = generateCaregiverNarrative(input)

  const allText = result.paragraphs.map(p => p.text).join(' ')
  const bannedWords = ['feel', 'Tough', 'Okay', 'Good', 'Great', 'Amazing']
  for (const word of bannedWords) {
    expect(allText).not.toContain(word)
  }
})

// ── Test 6: Caregiver narrative includes milestone ───────────────────────────

test('generateCaregiverNarrative includes milestone in body', () => {
  const input = makeCaregiverInput({
    athlete: makeAthlete({
      milestonesEarned: [{ label: 'First 5K', icon: '🏅' }],
    }),
  })
  const result = generateCaregiverNarrative(input)

  const allText = result.paragraphs.map(p => p.text).join(' ')
  expect(allText).toContain('First 5K')
})

// ── Test 7: Coach narrative includes closing paragraph ───────────────────────

test('generateCoachNarrative includes closing paragraph', () => {
  const input = makeCoachInput()
  const result = generateCoachNarrative(input)

  const closing = result.paragraphs[result.paragraphs.length - 1]
  expect(closing.type).toBe('closing')
})

// ── Test 8: pickVariant is deterministic ─────────────────────────────────────

test('pickVariant is deterministic', () => {
  const options = ['a', 'b', 'c']
  const weekLabel = '10 Mar – 16 Mar 2026'

  const result1 = pickVariant(options, weekLabel)
  const result2 = pickVariant(options, weekLabel)

  expect(result1).toBe(result2)
})

// ── Test 9: Caregiver narrative handles null caregiver name ──────────────────

test('generateCaregiverNarrative handles null caregiver name', () => {
  const input = makeCaregiverInput({ caregiverName: null })
  const result = generateCaregiverNarrative(input)

  const allText = result.paragraphs.map(p => p.text).join(' ')
  expect(allText).not.toContain('null')
  expect(allText).not.toContain('undefined')
})

// ── Test 10: Narrative uses literal language (no banned phrases) ─────────────

test('narrative paragraphs use literal language', () => {
  // Coach narrative with rich data
  const coachInput = makeCoachInput({
    athletes: [
      makeAthlete({
        athleteId: 'a1',
        athleteName: 'Wei Jie',
        personalBest: { distanceKm: 5.1, previousBestKm: 4.8, date: '2026-03-15' },
        milestonesEarned: [{ label: 'Great Attitude', icon: '🏅' }],
        bestWeekEver: true,
      }),
      makeAthlete({
        athleteId: 'a2',
        athleteName: 'Amir',
        sessionsThisWeek: 0,
        totalKmThisWeek: 0,
        goingQuiet: { daysSinceLastSession: 14, averageCadenceDays: 5 },
      }),
    ],
    totalSessionsAllAthletes: 3,
    totalKmAllAthletes: 15.2,
  })
  const coachNarrative = generateCoachNarrative(coachInput)

  // Caregiver narrative with rich data
  const caregiverInput = makeCaregiverInput({
    athlete: makeAthlete({
      personalBest: { distanceKm: 5.1, previousBestKm: 4.8, date: '2026-03-15' },
      milestonesEarned: [{ label: 'First 5K', icon: '🏅' }],
    }),
  })
  const caregiverNarrative = generateCaregiverNarrative(caregiverInput)

  const allParagraphs = [
    ...coachNarrative.paragraphs,
    ...caregiverNarrative.paragraphs,
  ]

  const bannedPhrases = ['crushed it', 'on fire', 'killing it', 'smashed', 'amazing job', 'so proud']
  for (const p of allParagraphs) {
    const lower = p.text.toLowerCase()
    for (const phrase of bannedPhrases) {
      expect(lower).not.toContain(phrase)
    }
  }
})

// ── Test 11: Digest page file exists and is a Server Component ───────────────

test('digest page file exists and is a Server Component', () => {
  const pagePath = path.resolve(__dirname, '../../src/app/digest/page.tsx')
  const content = fs.readFileSync(pagePath, 'utf-8')

  expect(content).toContain('export default async function')
  expect(content).not.toContain("'use client'")
  expect(content).not.toContain('"use client"')
})

// ── Test 12: Digest route is in PROTECTED_PATHS ──────────────────────────────

test('digest route is in PROTECTED_PATHS', () => {
  const middlewarePath = path.resolve(__dirname, '../../src/middleware.ts')
  const content = fs.readFileSync(middlewarePath, 'utf-8')

  expect(content).toContain("'/digest'")
})
