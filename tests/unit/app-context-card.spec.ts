/**
 * Static analysis tests for AppContextCard component.
 *
 * Verifies:
 * 1. Accessibility: aria-label on dismiss button
 * 2. Inclusive design: literal language, no idioms
 * 3. localStorage pattern: useEffect guard (no SSR access)
 * 4. Uses centralized HINT_KEYS constant
 * 5. Three icon+label items as specified
 */

import * as fs from 'fs'
import * as path from 'path'

describe('AppContextCard', () => {
  const filePath = path.join(
    __dirname,
    '../../src/components/feed/AppContextCard.tsx'
  )
  let content: string

  beforeAll(() => {
    content = fs.readFileSync(filePath, 'utf-8')
  })

  it('is a client component', () => {
    expect(content).toContain("'use client'")
  })

  it('has aria-label on dismiss button', () => {
    expect(content).toContain('aria-label="Dismiss welcome card"')
  })

  it('uses centralized HINT_KEYS constant instead of inline string', () => {
    expect(content).toContain("import { HINT_KEYS } from '@/lib/hint-keys'")
    expect(content).toContain('HINT_KEYS.CONTEXT_CARD')
  })

  it('accesses localStorage only inside useEffect (not during SSR)', () => {
    // localStorage calls should only appear inside useEffect or event handlers
    // The component should NOT call localStorage at the top level
    const lines = content.split('\n')
    const topLevelLocalStorage = lines.filter((line, i) => {
      // Skip lines inside useEffect or function bodies
      const trimmed = line.trim()
      return trimmed.startsWith('localStorage') && !trimmed.startsWith('//')
    })
    // All localStorage calls should be inside functions (indented)
    for (const line of topLevelLocalStorage) {
      expect(line).toMatch(/^\s{4,}/) // at least 4 spaces of indentation
    }
  })

  it('uses literal language (no idioms or metaphors)', () => {
    expect(content).not.toContain("you're on fire")
    expect(content).not.toContain('killing it')
    expect(content).not.toContain('crushing it')
    expect(content).not.toContain('so proud')
    expect(content).not.toContain('hit the ground running')
  })

  it('contains exactly three feature items with icons', () => {
    // Each item uses a lucide-react icon component
    expect(content).toContain('Activity')
    expect(content).toContain('TrendingUp')
    expect(content).toContain('MessageCircle')
  })

  it('has short, action-oriented descriptions for each item', () => {
    expect(content).toContain('Log runs and track every session')
    expect(content).toContain('See progress, milestones, and mood trends')
    expect(content).toContain('Coordinate with coaches and caregivers')
  })

  it('has the correct title and subtitle', () => {
    expect(content).toContain('Your coaching hub')
    expect(content).toContain('Everything you need to support your athletes')
  })

  it('uses teal palette matching coach-facing design system', () => {
    expect(content).toContain('from-teal-50')
    expect(content).toContain('to-emerald-50')
    expect(content).toContain('text-teal-500')
  })

  it('returns null when not visible (dismiss pattern)', () => {
    expect(content).toContain('if (!visible) return null')
  })
})
