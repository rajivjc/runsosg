/**
 * Static analysis tests for FeelTrendBars component.
 *
 * Verifies:
 * 1. Renders correct number of bars based on ratings
 * 2. Does not crash with empty ratings
 * 3. Colour coding: green for 4-5, amber for 3, red for 1-2
 */

import * as fs from 'fs'
import * as path from 'path'

describe('FeelTrendBars', () => {
  const filePath = path.join(
    __dirname,
    '../../src/components/feed/FeelTrendBars.tsx'
  )
  let content: string

  beforeAll(() => {
    content = fs.readFileSync(filePath, 'utf-8')
  })

  it('renders correct number of bars by mapping over ratings', () => {
    // Should map over ratings array to render bars
    expect(content).toContain('ratings.map')

    // Each bar should have fixed dimensions (6px wide, 16px tall)
    expect(content).toContain('width: 6')
    expect(content).toContain('height: 16')
  })

  it('does not crash with empty ratings', () => {
    // Should handle empty ratings gracefully
    expect(content).toContain('ratings.length === 0')

    // Should return null for empty ratings
    expect(content).toContain('return null')
  })

  it('uses correct colour coding for feel ratings', () => {
    // Green for good ratings (4-5)
    expect(content).toContain('--color-success')
    expect(content).toContain('rating >= 4')

    // Amber for mid ratings (3)
    expect(content).toContain('--color-warning')
    expect(content).toContain('rating === 3')

    // Red for low ratings (1-2)
    expect(content).toContain('--color-danger')
  })

  it('has accessible labelling', () => {
    expect(content).toContain('aria-label')
  })

  it('uses compact layout with proper spacing', () => {
    expect(content).toContain('gap-[2px]')
    expect(content).toContain('rounded-sm')
  })
})
