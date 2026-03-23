/**
 * Static analysis tests for CaregiverPlanCard component.
 *
 * Tests:
 * 1. renders focus title and progress level
 * 2. renders progress note with teal left border
 * 3. renders goal with progress bar
 * 4. renders recent achievement
 * 5. renders empty state when no focus and no goal
 * 6. does not render achievement section when null
 * 7. renders coach name and date in footer
 * 8. caregiver feed renders CaregiverPlanCard instead of CaregiverWorkingOnCard
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const cardPath = join(__dirname, '..', '..', 'src', 'components', 'feed', 'CaregiverPlanCard.tsx')
const feedPath = join(__dirname, '..', '..', 'src', 'components', 'feed', 'CaregiverFeed.tsx')

let cardSource: string
let feedSource: string

beforeAll(() => {
  cardSource = readFileSync(cardPath, 'utf-8')
  feedSource = readFileSync(feedPath, 'utf-8')
})

describe('CaregiverPlanCard component', () => {
  // 1. renders focus title and progress level
  it('renders focus title and progress level', () => {
    // Focus title is rendered
    expect(cardSource).toContain('{focusTitle}')
    // Progress level badge renders emoji and label
    expect(cardSource).toContain('{pl.emoji}')
    expect(cardSource).toContain('{pl.label}')
    // Making progress level is defined with 📈 emoji
    expect(cardSource).toContain("making_progress")
    expect(cardSource).toContain("'Making progress'")
    expect(cardSource).toContain("'📈'")
  })

  // 2. renders progress note with teal left border
  it('renders progress note with teal left border', () => {
    // "Recent progress" label visible
    expect(cardSource).toContain('Recent progress')
    // Progress note text rendered
    expect(cardSource).toContain('{focusProgressNote}')
    // Teal left border styling
    expect(cardSource).toContain('border-l-teal-600')
    expect(cardSource).toContain('border-l-[3px]')
  })

  // 3. renders goal with progress bar
  it('renders goal with progress bar', () => {
    // 🎯 emoji before goal text
    expect(cardSource).toContain('🎯')
    // Goal text rendered
    expect(cardSource).toContain('{runningGoal}')
    // Progress bar with percentage width
    expect(cardSource).toContain('goalProgress.pct')
    // Shows current/target with unit
    expect(cardSource).toContain('goalProgress.current')
    expect(cardSource).toContain('goalProgress.target')
    expect(cardSource).toContain('goalProgress.unit')
    // Progress bar gradient
    expect(cardSource).toContain('from-teal-600 to-teal-500')
  })

  // 4. renders recent achievement
  it('renders recent achievement', () => {
    // ✅ emoji for achievement
    expect(cardSource).toContain('✅')
    // "Recently achieved:" label
    expect(cardSource).toContain('Recently achieved:')
    // Achievement text rendered in bold
    expect(cardSource).toContain('{recentAchievement}')
    expect(cardSource).toMatch(/<strong>\{recentAchievement\}<\/strong>/)
  })

  // 5. renders empty state when no focus and no goal
  it('renders empty state when no focus and no goal', () => {
    // Empty state condition
    expect(cardSource).toContain('!focusTitle && !runningGoal')
    // Empty state message
    expect(cardSource).toContain('No training plan set yet. Check back soon!')
  })

  // 6. does not render achievement section when null
  it('does not render achievement section when null', () => {
    // Achievement section is conditionally rendered
    expect(cardSource).toContain('{recentAchievement && (')
  })

  // 7. renders coach name and date in footer
  it('renders coach name and date in footer', () => {
    // Coach name interpolation
    expect(cardSource).toContain('Updated by ${focusCoachName}')
    // formatDate used for date display
    expect(cardSource).toContain('formatDate(focusUpdatedAt)')
    // Footer is conditional on focusUpdatedAt
    expect(cardSource).toContain('{focusUpdatedAt && (')
  })

  // 8. caregiver feed renders CaregiverPlanCard instead of CaregiverWorkingOnCard
  it('caregiver feed renders CaregiverPlanCard instead of CaregiverWorkingOnCard', () => {
    // CaregiverPlanCard is imported
    expect(feedSource).toContain("import CaregiverPlanCard from '@/components/feed/CaregiverPlanCard'")
    // CaregiverPlanCard is used in JSX
    expect(feedSource).toContain('<CaregiverPlanCard')
    // CaregiverWorkingOnCard is NOT imported
    expect(feedSource).not.toContain("import CaregiverWorkingOnCard")
    expect(feedSource).not.toContain('<CaregiverWorkingOnCard')
  })
})

describe('CaregiverPlanCard props and types', () => {
  it('exports CaregiverPlanCardProps interface', () => {
    expect(cardSource).toContain('export interface CaregiverPlanCardProps')
  })

  it('accepts all required props', () => {
    expect(cardSource).toContain('athleteFirstName: string')
    expect(cardSource).toContain('focusTitle: string | null')
    expect(cardSource).toContain('focusProgressNote: string | null')
    expect(cardSource).toContain('focusProgressLevel: ProgressLevel | null')
    expect(cardSource).toContain('focusUpdatedAt: string | null')
    expect(cardSource).toContain('focusCoachName: string | null')
    expect(cardSource).toContain('runningGoal: string | null')
    expect(cardSource).toContain('goalProgress: GoalProgress | null')
    expect(cardSource).toContain('recentAchievement: string | null')
  })

  it('imports ProgressLevel from supabase types', () => {
    expect(cardSource).toContain("import type { ProgressLevel } from '@/lib/supabase/types'")
  })

  it('imports GoalProgress from goals', () => {
    expect(cardSource).toContain("import type { GoalProgress } from '@/lib/goals'")
  })

  it('has header showing COACH\'S PLAN FOR [NAME]', () => {
    expect(cardSource).toContain("Coach")
    expect(cardSource).toContain("plan for {athleteFirstName}")
  })

  it('has teal gradient background and rounded-2xl', () => {
    expect(cardSource).toContain('bg-gradient-to-r from-teal-50 to-emerald-50')
    expect(cardSource).toContain('border-teal-100')
    expect(cardSource).toContain('rounded-2xl')
  })

  it('has horizontal divider between focus and goal sections', () => {
    // Teal-100 divider between focus and goal
    expect(cardSource).toContain('h-px bg-teal-100')
    // Divider only shows when both focus and goal exist
    expect(cardSource).toContain('{focusTitle && runningGoal && (')
  })

  it('defines all four progress levels', () => {
    expect(cardSource).toContain('just_started')
    expect(cardSource).toContain('making_progress')
    expect(cardSource).toContain('almost_there')
    expect(cardSource).toContain('achieved')
    expect(cardSource).toContain("'🌱'")
    expect(cardSource).toContain("'📈'")
    expect(cardSource).toContain("'⭐'")
    expect(cardSource).toContain("'✅'")
  })
})
