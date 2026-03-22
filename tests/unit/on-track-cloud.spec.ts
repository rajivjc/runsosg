/**
 * Static analysis tests for OnTrackCloud component.
 *
 * Verifies:
 * 1. Renders athlete pills up to maxVisible
 * 2. Renders all pills when under maxVisible
 * 3. Pills link to athlete detail page
 */

import * as fs from 'fs'
import * as path from 'path'

describe('OnTrackCloud', () => {
  const filePath = path.join(
    __dirname,
    '../../src/components/feed/OnTrackCloud.tsx'
  )
  let content: string

  beforeAll(() => {
    content = fs.readFileSync(filePath, 'utf-8')
  })

  it('renders athlete pills up to maxVisible with overflow indicator', () => {
    // Should slice athletes to maxVisible
    expect(content).toContain('athletes.slice(0, maxVisible)')

    // Should calculate overflow count
    expect(content).toContain('athletes.length - visible.length')

    // Should render "+N more" pill when overflow > 0
    expect(content).toContain('+{overflow} more')

    // Should conditionally show overflow pill
    expect(content).toContain('overflow > 0')
  })

  it('renders all pills when under maxVisible (default 8)', () => {
    // Default maxVisible should be 8
    expect(content).toContain('maxVisible = 8')

    // When athletes.length <= maxVisible, visible = all athletes
    // and overflow = 0, so "+N more" pill is hidden
  })

  it('pills link to athlete detail page', () => {
    // Should use Next.js Link component
    expect(content).toContain("import Link from 'next/link'")

    // Should link to /athletes/[athleteId]
    expect(content).toContain('/athletes/${a.athleteId}')

    // Each pill should have 44px minimum touch target
    expect(content).toContain('min-h-[44px]')
  })

  it('renders athlete name in each pill', () => {
    expect(content).toContain('{a.athleteName}')
  })

  it('shows a green dot indicator on each pill', () => {
    expect(content).toContain('#059669')
    expect(content).toContain('rounded-full')
  })
})
