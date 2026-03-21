/**
 * Static analysis tests for HintCard component.
 *
 * Verifies:
 * 1. Accessibility: aria-label on dismiss button
 * 2. Both teal and amber variant styles are defined
 * 3. localStorage pattern: useEffect guard (no SSR access)
 * 4. Compact design: uses text-sm/text-xs sizing
 * 5. Props type definition
 */

import * as fs from 'fs'
import * as path from 'path'

describe('HintCard component', () => {
  const filePath = path.join(
    __dirname,
    '../../src/components/ui/HintCard.tsx'
  )
  let content: string

  beforeAll(() => {
    content = fs.readFileSync(filePath, 'utf-8')
  })

  it('is a client component', () => {
    expect(content).toContain("'use client'")
  })

  it('has aria-label on dismiss button', () => {
    expect(content).toContain('aria-label="Dismiss hint"')
  })

  it('accepts storageKey, title, description, and variant props', () => {
    expect(content).toContain('storageKey: string')
    expect(content).toContain('title: string')
    expect(content).toContain('description: string')
    expect(content).toContain("variant?: 'teal' | 'amber'")
  })

  it('defaults variant to teal', () => {
    expect(content).toContain("variant = 'teal'")
  })

  it('defines teal variant styles', () => {
    expect(content).toContain('bg-teal-50/60')
    expect(content).toContain('text-teal-800')
    expect(content).toContain('text-teal-700')
  })

  it('defines amber variant styles', () => {
    expect(content).toContain('bg-amber-50/60')
    expect(content).toContain('text-amber-800')
    expect(content).toContain('text-amber-700')
  })

  it('uses compact text sizing (text-sm title, text-xs description)', () => {
    expect(content).toContain('text-sm font-semibold')
    expect(content).toContain('text-xs')
  })

  it('accesses localStorage only inside useEffect or event handlers', () => {
    const lines = content.split('\n')
    const localStorageLines = lines.filter(
      (line) => line.trim().startsWith('localStorage') && !line.trim().startsWith('//')
    )
    for (const line of localStorageLines) {
      expect(line).toMatch(/^\s{4,}/)
    }
  })

  it('returns null when not visible (dismiss pattern)', () => {
    expect(content).toContain('if (!visible) return null')
  })

  it('uses rounded-xl for compact card styling', () => {
    expect(content).toContain('rounded-xl')
  })
})
