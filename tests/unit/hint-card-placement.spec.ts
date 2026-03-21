/**
 * Static analysis tests for hint card placement across the app.
 *
 * Verifies:
 * 1. CoachFeed: AppContextCard inside onboarding block, HintCard after onboarding
 * 2. CaregiverFeed: amber HintCard present
 * 3. Athlete detail page: HintCard present with correct key
 * 4. CuesTab: HintCard present with correct key
 * 5. Notifications page: HintCard present with correct key
 * 6. All placements use centralized HINT_KEYS
 */

import * as fs from 'fs'
import * as path from 'path'
import { HINT_KEYS } from '@/lib/hint-keys'

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(__dirname, '../../', relativePath), 'utf-8')
}

describe('hint card placement — CoachFeed', () => {
  let content: string

  beforeAll(() => {
    content = readFile('src/components/feed/CoachFeed.tsx')
  })

  it('imports AppContextCard', () => {
    expect(content).toContain("import AppContextCard from '@/components/feed/AppContextCard'")
  })

  it('imports HintCard and HINT_KEYS', () => {
    expect(content).toContain("import HintCard from '@/components/ui/HintCard'")
    expect(content).toContain("import { HINT_KEYS } from '@/lib/hint-keys'")
  })

  it('renders AppContextCard inside the onboarding block', () => {
    // AppContextCard should appear before OnboardingCard, both inside showOnboarding
    const contextIdx = content.indexOf('<AppContextCard')
    const onboardingIdx = content.indexOf('<OnboardingCard')
    expect(contextIdx).toBeGreaterThan(-1)
    expect(onboardingIdx).toBeGreaterThan(-1)
    expect(contextIdx).toBeLessThan(onboardingIdx)
  })

  it('renders post-onboarding HintCard with correct storage key', () => {
    expect(content).toContain('HINT_KEYS.HINT_FEED_POST_ONBOARDING')
  })

  it('does not modify OnboardingCard props', () => {
    expect(content).toContain('firstName={firstName}')
    expect(content).toContain('steps={onboarding.steps}')
    expect(content).toContain('completedCount={onboarding.completedCount}')
    expect(content).toContain('totalCount={onboarding.totalCount}')
  })
})

describe('hint card placement — CaregiverFeed', () => {
  let content: string

  beforeAll(() => {
    content = readFile('src/components/feed/CaregiverFeed.tsx')
  })

  it('imports HintCard and HINT_KEYS', () => {
    expect(content).toContain("import HintCard from '@/components/ui/HintCard'")
    expect(content).toContain("import { HINT_KEYS } from '@/lib/hint-keys'")
  })

  it('uses the caregiver feed hint key', () => {
    expect(content).toContain('HINT_KEYS.HINT_CAREGIVER_FEED')
  })

  it('uses amber variant for caregiver pages', () => {
    expect(content).toContain('variant="amber"')
  })

  it('does not modify CaregiverOnboardingCard', () => {
    expect(content).toContain('<CaregiverOnboardingCard')
  })
})

describe('hint card placement — athlete detail page', () => {
  let content: string

  beforeAll(() => {
    content = readFile('src/app/athletes/[id]/page.tsx')
  })

  it('imports HintCard and HINT_KEYS', () => {
    expect(content).toContain("import HintCard from '@/components/ui/HintCard'")
    expect(content).toContain("import { HINT_KEYS } from '@/lib/hint-keys'")
  })

  it('uses the athlete detail hint key', () => {
    expect(content).toContain('HINT_KEYS.HINT_ATHLETE_DETAIL')
  })

  it('places HintCard before AthleteTabs', () => {
    const hintIdx = content.indexOf('HINT_KEYS.HINT_ATHLETE_DETAIL')
    const tabsIdx = content.indexOf('<AthleteTabs')
    expect(hintIdx).toBeGreaterThan(-1)
    expect(tabsIdx).toBeGreaterThan(-1)
    expect(hintIdx).toBeLessThan(tabsIdx)
  })
})

describe('hint card placement — CuesTab', () => {
  let content: string

  beforeAll(() => {
    content = readFile('src/components/athlete/CuesTab.tsx')
  })

  it('imports HintCard and HINT_KEYS', () => {
    expect(content).toContain("import HintCard from '@/components/ui/HintCard'")
    expect(content).toContain("import { HINT_KEYS } from '@/lib/hint-keys'")
  })

  it('uses the cues hint key', () => {
    expect(content).toContain('HINT_KEYS.HINT_CUES')
  })
})

describe('hint card placement — notifications page', () => {
  let content: string

  beforeAll(() => {
    content = readFile('src/app/notifications/page.tsx')
  })

  it('imports HintCard and HINT_KEYS', () => {
    expect(content).toContain("import HintCard from '@/components/ui/HintCard'")
    expect(content).toContain("import { HINT_KEYS } from '@/lib/hint-keys'")
  })

  it('uses the notifications hint key', () => {
    expect(content).toContain('HINT_KEYS.HINT_NOTIFICATIONS')
  })
})

describe('all hint card descriptions follow inclusive design', () => {
  const hintDescriptions = [
    'New sessions, milestones, and alerts from all athletes show up here. Tap any session card for details.',
    'Use the tabs below to see runs, coaching cues, notes, and photos. Update cues after each session so the next coach is prepared.',
    'These cues are shared with all coaches and carry over between sessions. Add what helps, what to avoid, and the best cues for this athlete.',
    "This is where you'll see sessions, milestones, and weekly recaps. You can send cheers to encourage your athlete before their next run.",
    'Milestone awards, low feel alerts, and unmatched Strava runs appear here. Unmatched runs need your help to link to the right athlete.',
  ]

  it.each(hintDescriptions)('description "%s" uses literal language', (desc) => {
    const lower = desc.toLowerCase()
    expect(lower).not.toContain("you're on fire")
    expect(lower).not.toContain('killing it')
    expect(lower).not.toContain('crushing it')
    expect(lower).not.toContain('hit the ground running')
    expect(lower).not.toContain('so proud')
  })

  it.each(hintDescriptions)('description "%s" has at most two sentences', (desc) => {
    const sentenceCount = desc.split(/[.!?]+/).filter((s) => s.trim().length > 0).length
    expect(sentenceCount).toBeLessThanOrEqual(2)
  })

  it.each(hintDescriptions)('description "%s" uses active voice', (desc) => {
    // Passive voice indicators
    expect(desc).not.toMatch(/\bcan be (used|seen|found)\b/i)
    expect(desc).not.toMatch(/\bis shown\b/i)
    expect(desc).not.toMatch(/\bare displayed\b/i)
  })
})
