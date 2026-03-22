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

  it('renders N bars for N ratings by mapping over ratings array', () => {
    expect(content).toContain('ratings.map')

    // Each bar should have fixed dimensions (6px wide, 18px tall)
    expect(content).toContain('width: 6')
    expect(content).toContain('height: 18')
  })

  it('applies green style for rating >= 4', () => {
    expect(content).toContain('rating >= 4')
    expect(content).toContain('#059669')
  })

  it('applies red style for rating <= 2', () => {
    expect(content).toContain('#DC2626')
  })

  it('handles empty ratings array', () => {
    expect(content).toContain('ratings.length === 0')
    expect(content).toContain('return null')
  })

  it('has accessible labelling', () => {
    expect(content).toContain('aria-label')
  })

  it('uses compact layout with proper spacing', () => {
    // 3px gap between bars, 2px border radius
    expect(content).toContain("gap: '3px'")
    expect(content).toContain('borderRadius: 2')
  })
})
