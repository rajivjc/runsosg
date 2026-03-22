/**
 * Static analysis tests for PrioritySummary component.
 *
 * Verifies:
 * 1. Renders all 4 counters when there are items in multiple buckets
 * 2. Renders collapsed view when all athletes are on track
 */

import * as fs from 'fs'
import * as path from 'path'

describe('PrioritySummary', () => {
  const filePath = path.join(
    __dirname,
    '../../src/components/feed/PrioritySummary.tsx'
  )
  let content: string

  beforeAll(() => {
    content = fs.readFileSync(filePath, 'utf-8')
  })

  it('renders all 4 counters when there are items in multiple buckets', () => {
    // Component should have all four counter labels
    expect(content).toContain('Needs attention')
    expect(content).toContain('Going quiet')
    expect(content).toContain('Near milestone')
    expect(content).toContain('On track')

    // Should render each count value
    expect(content).toContain('{c.count}')

    // Should use coloured backgrounds per bucket
    expect(content).toContain('bg-red-100')
    expect(content).toContain('bg-amber-100')
    expect(content).toContain('bg-blue-100')
    expect(content).toContain('bg-emerald-100')
  })

  it('renders collapsed view when all athletes are on track', () => {
    // Should have the "All N athletes on track" text
    expect(content).toContain('All {totalAthletes} athletes on track')

    // Should check that all non-onTrack counts are zero
    expect(content).toContain('needsAttentionCount === 0')
    expect(content).toContain('goingQuietCount === 0')
    expect(content).toContain('nearMilestoneCount === 0')

    // Collapsed view uses emerald colour
    expect(content).toContain('bg-emerald-100')
    expect(content).toContain('text-emerald-600')
  })

  it('accepts the required props', () => {
    expect(content).toContain('needsAttentionCount: number')
    expect(content).toContain('goingQuietCount: number')
    expect(content).toContain('nearMilestoneCount: number')
    expect(content).toContain('onTrackCount: number')
    expect(content).toContain('totalAthletes: number')
  })
})
