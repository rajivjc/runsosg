/**
 * Unit tests for the AvatarPicker and ThemeColorPicker components.
 *
 * Following the project's static analysis test pattern:
 * 1. AvatarPicker renders all 8 avatar options
 * 2. ThemeColorPicker renders all 6 colour options
 * 3. Both call their respective server actions on save
 * 4. Accessibility attributes preserved (aria-live, aria-label, role)
 * 5. Touch targets meet 56px+ requirement for athlete-facing page
 */

import * as fs from 'fs'
import * as path from 'path'

describe('AvatarPicker component', () => {
  const filePath = path.join(
    __dirname,
    '../../src/components/athlete/AvatarPicker.tsx'
  )
  let content: string

  beforeAll(() => {
    content = fs.readFileSync(filePath, 'utf-8')
  })

  it('renders all 8 avatar options', () => {
    expect(content).toContain("label: 'Runner'")
    expect(content).toContain("label: 'Man running'")
    expect(content).toContain("label: 'Woman running'")
    expect(content).toContain("label: 'Running shoe'")
    expect(content).toContain("label: 'Medal'")
    expect(content).toContain("label: 'Trophy'")
    expect(content).toContain("label: 'Star'")
    expect(content).toContain("label: 'Strong'")
  })

  it('imports setAthleteAvatar server action', () => {
    expect(content).toContain('setAthleteAvatar')
    expect(content).toContain("from '@/app/my/[athleteId]/actions'")
  })

  it('shows feedback after saving avatar', () => {
    expect(content).toContain('AVATAR_FEEDBACKS')
    expect(content).toContain('setAvatarFeedback(feedback)')
  })

  it('has radiogroup role for avatar selection', () => {
    expect(content).toContain('role="radiogroup"')
    expect(content).toContain('aria-label="Pick your avatar"')
  })

  it('uses radio role on individual avatar buttons', () => {
    expect(content).toContain('role="radio"')
    expect(content).toContain('aria-checked={isSelected}')
  })

  it('has aria-label on avatar button for screen readers', () => {
    expect(content).toContain('aria-label="Choose your avatar"')
  })

  it('has aria-live region for avatar feedback', () => {
    expect(content).toContain('aria-live="polite"')
  })

  it('respects prefers-reduced-motion', () => {
    expect(content).toContain('motion-reduce:transition-none')
    expect(content).toContain('motion-reduce:scale-100')
  })

  it('has 56px touch targets (w-14 h-14 = 56px)', () => {
    expect(content).toContain('w-14 h-14')
  })

  it('is a client component', () => {
    expect(content).toContain("'use client'")
  })

  it('accepts athleteId and currentAvatar props', () => {
    expect(content).toContain('athleteId: string')
    expect(content).toContain('currentAvatar: string | null')
  })
})

describe('ThemeColorPicker component', () => {
  const filePath = path.join(
    __dirname,
    '../../src/components/athlete/ThemeColorPicker.tsx'
  )
  let content: string

  beforeAll(() => {
    content = fs.readFileSync(filePath, 'utf-8')
  })

  it('renders all 6 colour options', () => {
    expect(content).toContain("key: 'teal'")
    expect(content).toContain("key: 'blue'")
    expect(content).toContain("key: 'purple'")
    expect(content).toContain("key: 'green'")
    expect(content).toContain("key: 'amber'")
    expect(content).toContain("key: 'coral'")
  })

  it('imports setAthleteTheme server action', () => {
    expect(content).toContain('setAthleteTheme')
    expect(content).toContain("from '@/app/my/[athleteId]/actions'")
  })

  it('calls onColorChange callback to update parent theme', () => {
    expect(content).toContain('onColorChange(color)')
  })

  it('shows feedback after saving colour', () => {
    expect(content).toContain("setColorFeedback('Nice choice!')")
  })

  it('has aria-pressed on colour buttons', () => {
    expect(content).toContain('aria-pressed={selected}')
  })

  it('has aria-label on each colour button', () => {
    expect(content).toContain('aria-label={')
  })

  it('has aria-live region for colour feedback', () => {
    expect(content).toContain('aria-live="polite"')
  })

  it('has 56px touch targets (w-14 h-14 = 56px)', () => {
    expect(content).toContain('w-14 h-14')
  })

  it('uses semantic section element with aria-label', () => {
    expect(content).toContain('<section')
    expect(content).toContain('aria-label="Pick your color"')
  })

  it('is a client component', () => {
    expect(content).toContain("'use client'")
  })

  it('accepts onColorChange callback prop', () => {
    expect(content).toContain('onColorChange: (color: string) => void')
  })
})
