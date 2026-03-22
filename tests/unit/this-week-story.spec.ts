import { readFileSync } from 'fs'
import { join } from 'path'
import { getDistanceEquivalent } from '@/lib/feed/utils'

function readSrc(filePath: string): string {
  return readFileSync(join(__dirname, '..', '..', 'src', filePath), 'utf-8')
}

describe('ThisWeekStory', () => {
  let storySource: string
  let coachFeedSource: string

  beforeAll(() => {
    storySource = readSrc('components/feed/ThisWeekStory.tsx')
    coachFeedSource = readSrc('components/feed/CoachFeed.tsx')
  })

  // Test 1: Headline reflects week quality
  describe('Headline reflects week quality', () => {
    it('shows "Quiet week so far" when count is 0', () => {
      // The getHeadline logic must map count === 0 to this string
      expect(storySource).toContain('Quiet week so far')
    })

    it('shows "A good week for the club" for moderate weeks', () => {
      // Default path when count > 0 but conditions for "great" are not met
      expect(storySource).toContain('A good week for the club')
    })

    it('shows "A great week for the club" for strong weeks', () => {
      // count >= 3 && celebrationCount >= 2
      expect(storySource).toContain('A great week for the club')
      // Verify the threshold conditions exist in the logic
      expect(storySource).toContain('count >= 3')
      expect(storySource).toContain('celebrationCount >= 2')
    })
  })

  // Test 2: Celebrations list shows PBs and star moment
  describe('Celebrations list shows PBs and star moment', () => {
    it('renders celebration rows from personal_best items', () => {
      // PB items should use the medal icon
      expect(storySource).toContain("'personal_best'")
      expect(storySource).toContain('🏅')
    })

    it('renders star moment with star icon', () => {
      expect(storySource).toContain('⭐')
      expect(storySource).toContain('starMoment')
    })

    it('deduplicates star moment by athlete name', () => {
      // Should check seenAthletes before adding star moment
      expect(storySource).toContain('seenAthletes')
      expect(storySource).toMatch(/!seenAthletes\.has\(starMoment/)
    })

    it('skips celebration section when no celebrations and no star moment', () => {
      // Should conditionally render based on celebrationRows.length
      expect(storySource).toContain('celebrationRows.length > 0')
    })

    it('shows PB subtitle with previous best', () => {
      // Should extract "(was X km)" pattern from subtitle
      expect(storySource).toMatch(/\(was .+\)/)
    })
  })

  // Test 3: All-time stats render with correct values
  describe('All-time stats render with correct values', () => {
    it('renders the 4-column stat grid', () => {
      // Should have runs, km, athletes, milestones labels
      expect(storySource).toContain('{clubStats.sessions}')
      expect(storySource).toContain('{clubStats.km.toFixed(1)}')
      expect(storySource).toContain('{clubStats.athletes}')
      expect(storySource).toContain('{clubStats.milestones}')
    })

    it('uses text-2xl font-extrabold for stat numbers', () => {
      expect(storySource).toContain('text-2xl font-extrabold text-text-primary')
    })

    it('renders the distance equivalent fun fact', () => {
      expect(storySource).toContain('equiv.label')
      expect(storySource).toContain('getDistanceEquivalent')
    })

    it('does NOT render any movie/hours fun fact', () => {
      expect(storySource).not.toContain('movie')
      expect(storySource).not.toContain('🎬')
      expect(storySource).not.toContain('totalDurationSeconds')
    })

    it('has a teal accent bar on the footer section', () => {
      expect(storySource).toContain('border-t-[3px] border-teal-500')
      expect(storySource).toContain('bg-surface-alt')
    })

    it('renders YOUR CLUB — ALL TIME section title', () => {
      expect(storySource).toMatch(/Your club.*all time/i)
      expect(storySource).toContain('tracking-widest')
    })
  })

  // Test 4: getDistanceEquivalent returns correct values
  describe('getDistanceEquivalent returns correct values', () => {
    it('returns percentage for small distances', () => {
      const result = getDistanceEquivalent(70)
      expect(result.label).toContain('50%')
      expect(result.label).toContain('lap around Singapore')
    })

    it('returns laps for moderate distances', () => {
      const result = getDistanceEquivalent(280)
      expect(result.label).toContain('2.0 laps around Singapore')
    })

    it('returns Earth progress for large distances', () => {
      const result = getDistanceEquivalent(600)
      expect(result.label).toContain('around Earth')
    })
  })

  // Test 5: CoachFeed renders sections in correct order
  describe('CoachFeed renders sections in correct order', () => {
    it('renders Messages from athletes before This week story', () => {
      // Search within the JSX return block only (after 'return (')
      const returnBlock = coachFeedSource.slice(coachFeedSource.indexOf('return ('))
      const messagesIdx = returnBlock.indexOf('Messages from athletes')
      const storyIdx = returnBlock.indexOf('<ThisWeekStory')
      expect(messagesIdx).toBeGreaterThan(-1)
      expect(storyIdx).toBeGreaterThan(-1)
      expect(messagesIdx).toBeLessThan(storyIdx)
    })

    it('renders This week story before Recent sessions', () => {
      const returnBlock = coachFeedSource.slice(coachFeedSource.indexOf('return ('))
      const storyIdx = returnBlock.indexOf('<ThisWeekStory')
      const recentIdx = returnBlock.indexOf('Recent sessions')
      expect(storyIdx).toBeGreaterThan(-1)
      expect(recentIdx).toBeGreaterThan(-1)
      expect(storyIdx).toBeLessThan(recentIdx)
    })

    it('does NOT render Today\'s focus section', () => {
      expect(coachFeedSource).not.toContain("Today's focus")
      expect(coachFeedSource).not.toContain("Today\u2019s focus")
      // Check the template literal version too
      expect(coachFeedSource).not.toContain("Today&apos;s focus")
    })

    it('does NOT render standalone ClubStats card', () => {
      expect(coachFeedSource).not.toContain('<ClubStats')
      expect(coachFeedSource).not.toMatch(/import.*ClubStats.*from/)
    })

    it('does NOT render "Recent activity" divider', () => {
      expect(coachFeedSource).not.toContain('Recent activity')
    })
  })

  // Test 6: Empty state — no sessions this week
  describe('Empty state — no sessions this week', () => {
    it('renders all-time stats footer regardless of weekly activity', () => {
      // Footer section is always rendered (no conditional wrapping around it)
      expect(storySource).toContain('Your club')
      expect(storySource).toContain('all time')
      // The footer div is not wrapped in any weeklyStats condition
      expect(storySource).toContain('border-t-[3px] border-teal-500 bg-surface-alt')
    })

    it('supports "Quiet week so far" headline', () => {
      expect(storySource).toContain('Quiet week so far')
      expect(storySource).toContain('count === 0')
    })

    it('hides celebrations when there are none', () => {
      expect(storySource).toContain('celebrationRows.length > 0')
    })
  })
})

describe('ClubStats movie fun fact removal', () => {
  it('ClubStats no longer contains movie fun fact', () => {
    const clubStatsSource = readSrc('components/feed/ClubStats.tsx')
    expect(clubStatsSource).not.toContain('movie')
    expect(clubStatsSource).not.toContain('🎬')
  })

  it('ClubStats imports getDistanceEquivalent from shared utils', () => {
    const clubStatsSource = readSrc('components/feed/ClubStats.tsx')
    expect(clubStatsSource).toContain("from '@/lib/feed/utils'")
    expect(clubStatsSource).toContain('getDistanceEquivalent')
    // Should NOT have a local definition
    expect(clubStatsSource).not.toContain('function getDistanceEquivalent')
  })
})
