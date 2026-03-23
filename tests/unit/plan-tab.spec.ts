/**
 * Static analysis tests for PlanTab component.
 *
 * Tests:
 * 1. renders Current Focus card with title and progress
 * 2. renders empty state when no active focus
 * 3. hides edit button when isReadOnly
 * 4. renders Goal card with progress bar
 * 5. renders Goal empty state when no goal set
 * 6. renders Athlete Pick card with date
 * 7. renders previous goal in Athlete Pick card
 * 8. hides Athlete Pick card when no choice made
 * 9. renders Focus History with correct count
 * 10. Focus History is collapsed by default
 * 11. all progress level badges render correctly
 * 12. accessibility: all interactive elements have aria labels
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const filePath = join(__dirname, '..', '..', 'src', 'components', 'athlete', 'PlanTab.tsx')
let source: string

beforeAll(() => {
  source = readFileSync(filePath, 'utf-8')
})

describe('PlanTab component', () => {
  it('is a client component', () => {
    expect(source).toContain("'use client'")
  })

  // 1. renders Current Focus card with title and progress
  it('renders Current Focus card with title and progress', () => {
    // Current Focus label present
    expect(source).toContain('Current Focus')
    // Renders activeFocus.title
    expect(source).toContain('activeFocus.title')
    // Renders progress_note
    expect(source).toContain('activeFocus.progress_note')
    // Progress level badge renders with emoji and label
    expect(source).toContain('pl.emoji')
    expect(source).toContain('pl.label')
    // Progress note section with "Progress" micro-label
    expect(source).toMatch(/uppercase tracking-wider[\s\S]*?Progress/)
    // Making progress badge styling present
    expect(source).toContain("label: 'Making progress'")
  })

  // 2. renders empty state when no active focus
  it('renders empty state when no active focus', () => {
    // Empty state prompt with firstName interpolation
    expect(source).toContain('What is {firstName} working on right now?')
    // "Add focus" button text
    expect(source).toContain('Add focus')
    // Dashed border for empty state
    expect(source).toContain('border-dashed')
  })

  // 3. hides edit button when isReadOnly
  it('hides edit button when isReadOnly', () => {
    // Edit button is gated behind !isReadOnly
    expect(source).toContain('!isReadOnly')
    // In focus display mode, edit is conditional
    const focusEditSection = source.match(/!isReadOnly[\s\S]{0,200}Edit/)
    expect(focusEditSection).not.toBeNull()
  })

  // 4. renders Goal card with progress bar
  it('renders Goal card with progress bar', () => {
    // Goal label
    expect(source).toContain('🎯 Goal')
    // Progress bar with role=progressbar
    expect(source).toContain('role="progressbar"')
    // aria-valuenow for accessibility
    expect(source).toContain('aria-valuenow={goalProgress.pct}')
    // Shows current / target with unit
    expect(source).toContain('goalProgress.current')
    expect(source).toContain('goalProgress.target')
    expect(source).toContain('goalProgress.unit')
    // Percentage display
    expect(source).toContain('goalProgress.pct}%')
    // Progress bar gradient
    expect(source).toContain('bg-gradient-to-r from-teal-600 to-teal-500')
  })

  // 5. renders Goal empty state when no goal set
  it('renders Goal empty state when no goal set', () => {
    expect(source).toContain('No goal set yet.')
    expect(source).toContain('Set goal')
  })

  // 6. renders Athlete Pick card with date
  it('renders Athlete Pick card with date', () => {
    // "OWN GOAL" label with firstName
    expect(source).toContain("&apos;s own goal")
    // Amber styling
    expect(source).toContain('bg-amber-50')
    expect(source).toContain('border-amber-200')
    // "Chosen by" text
    expect(source).toContain('Chosen by {firstName}')
    // Uses formatDate for the chosen date
    expect(source).toContain('formatDate(goalChoiceUpdatedAt)')
    // pick.label and pick.description rendered
    expect(source).toContain('pick.label')
    expect(source).toContain('pick.description')
    expect(source).toContain('pick.icon')
  })

  // 7. renders previous goal in Athlete Pick card
  it('renders previous goal in Athlete Pick card', () => {
    // "Previously:" text
    expect(source).toContain('Previously:')
    // Previous pick label rendered
    expect(source).toContain('previousPick.label')
    // Previous pick icon
    expect(source).toContain('previousPick.icon')
    // Date range using formatMonthYear
    expect(source).toContain('formatMonthYear(previousGoalChoiceAt)')
    expect(source).toContain('formatMonthYear(goalChoiceUpdatedAt)')
  })

  // 8. hides Athlete Pick card when no choice made
  it('hides Athlete Pick card when no choice made', () => {
    // Conditional rendering: pick && athleteGoalChoice
    expect(source).toContain('pick && athleteGoalChoice')
  })

  // 9. renders Focus History with correct count
  it('renders Focus History with correct count', () => {
    // Dynamic count in header
    expect(source).toContain('Focus history ({focusHistory.length} completed)')
    // Conditional rendering when history exists
    expect(source).toContain('focusHistory.length > 0')
  })

  // 10. Focus History is collapsed by default
  it('Focus History is collapsed by default', () => {
    // showHistory starts false
    expect(source).toContain('useState(false)')
    // Items only rendered when showHistory is true
    expect(source).toContain('{showHistory && (')
    // aria-expanded attribute on toggle button
    expect(source).toContain('aria-expanded={showHistory}')
  })

  // 11. all progress level badges render correctly
  it('all progress level badges render correctly', () => {
    // All four levels defined
    expect(source).toContain("value: 'just_started'")
    expect(source).toContain("label: 'Just started'")
    expect(source).toContain("emoji: '🌱'")

    expect(source).toContain("value: 'making_progress'")
    expect(source).toContain("label: 'Making progress'")
    expect(source).toContain("emoji: '📈'")

    expect(source).toContain("value: 'almost_there'")
    expect(source).toContain("label: 'Almost there'")
    expect(source).toContain("emoji: '⭐'")

    expect(source).toContain("value: 'achieved'")
    expect(source).toContain("label: 'Achieved'")
    expect(source).toContain("emoji: '✅'")
  })

  // 12. accessibility: all interactive elements have aria labels
  it('accessibility: all interactive elements have aria labels', () => {
    // Edit focus button
    expect(source).toContain('aria-label="Edit current focus"')
    // Cancel editing focus
    expect(source).toContain('aria-label="Cancel editing focus"')
    // Edit goal button
    expect(source).toContain('aria-label="Edit goal"')
    // Cancel editing goal
    expect(source).toContain('aria-label="Cancel editing goal"')
    // Progress bar role
    expect(source).toContain('role="progressbar"')
    expect(source).toContain('aria-valuemin={0}')
    expect(source).toContain('aria-valuemax={100}')
    // Focus history toggle
    expect(source).toContain('aria-expanded={showHistory}')
    // Progress level buttons have aria-labels
    expect(source).toContain('aria-label={`Set progress to ${lv.label}`}')
    // Toast uses aria-live
    expect(source).toContain('aria-live="polite"')
    // Add focus button
    expect(source).toContain('aria-label="Add focus area"')
    // Set goal button
    expect(source).toContain('aria-label="Set goal"')
    // Goal type select
    expect(source).toContain('aria-label="Goal type"')
    // Goal target input
    expect(source).toContain('aria-label="Goal target"')
  })

  // Additional structural checks
  it('uses useTransition for server action calls', () => {
    expect(source).toContain('useTransition')
    expect(source).toContain('startFocusTransition')
    expect(source).toContain('startGoalTransition')
  })

  it('calls saveFocusArea and updateAthleteGoal actions', () => {
    expect(source).toContain("import { saveFocusArea, updateAthleteGoal } from '@/app/athletes/[id]/actions'")
    expect(source).toContain('await saveFocusArea(athleteId,')
    expect(source).toContain('await updateAthleteGoal(athleteId,')
  })

  it('calls router.refresh() after successful saves', () => {
    expect(source).toContain('router.refresh()')
  })

  it('has dark mode variants for all major sections', () => {
    // Focus card
    expect(source).toContain('dark:from-teal-950/20')
    expect(source).toContain('dark:to-emerald-950/20')
    expect(source).toContain('dark:border-teal-400/20')
    // Athlete pick
    expect(source).toContain('dark:bg-amber-900/20')
    expect(source).toContain('dark:border-amber-400/30')
    // Goal card
    expect(source).toContain('dark:bg-teal-900/30')
  })

  it('has 44px minimum touch targets on interactive elements', () => {
    // min-h-[44px] applied to buttons
    const minHMatches = source.match(/min-h-\[44px\]/g)
    expect(minHMatches).not.toBeNull()
    expect(minHMatches!.length).toBeGreaterThanOrEqual(6)
  })

  it('shows saved toast with correct pattern', () => {
    expect(source).toContain('fixed bottom-20')
    expect(source).toContain('z-50')
    expect(source).toContain('bg-teal-600')
    expect(source).toContain('✓')
    expect(source).toContain('Saved')
  })

  it('edit mode has visibility hint for caregiver', () => {
    expect(source).toContain("Visible to {firstName}&apos;s caregiver.")
  })

  it('calculates focus history duration', () => {
    expect(source).toContain('calculateDuration')
    // Duration helper exists and computes weeks
    expect(source).toContain('week')
  })

  it('defines athlete goal choice mappings', () => {
    expect(source).toContain("run_further: { label: 'Run further'")
    expect(source).toContain("run_more: { label: 'Run more often'")
    expect(source).toContain("feel_stronger: { label: 'Feel stronger'")
  })
})
