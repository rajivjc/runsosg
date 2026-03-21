/**
 * Tests for PoweredByBadge component.
 *
 * Verifies:
 * 1. Badge text is present
 * 2. Link points to /login
 * 3. aria-label on the link
 * 4. Renders as a footer element
 */

import * as fs from 'fs'
import * as path from 'path'

describe('PoweredByBadge', () => {
  const filePath = path.join(
    __dirname,
    '../../src/components/ui/PoweredByBadge.tsx'
  )
  let content: string

  beforeAll(() => {
    content = fs.readFileSync(filePath, 'utf-8')
  })

  it('renders the badge text', () => {
    expect(content).toContain('Powered by SOSG Running Club Hub')
  })

  it('links to /login', () => {
    expect(content).toContain('href="/login"')
  })

  it('has aria-label on the link', () => {
    expect(content).toContain('aria-label="Visit SOSG Running Club Hub"')
  })

  it('renders as a footer element', () => {
    expect(content).toContain('<footer')
    expect(content).toContain('</footer>')
  })
})
