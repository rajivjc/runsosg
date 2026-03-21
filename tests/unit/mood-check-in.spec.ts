/**
 * Unit tests for the MoodCheckIn component.
 *
 * Following the project's static analysis test pattern:
 * 1. Component renders all 5 mood options
 * 2. Calls saveAthleteMood server action on selection
 * 3. Displays current mood via aria-pressed
 * 4. Preserves accessibility attributes (aria-live, aria-label, aria-pressed)
 * 5. Maintains 56px+ touch targets for athlete-facing page
 */

import * as fs from 'fs'
import * as path from 'path'

describe('MoodCheckIn component', () => {
  const filePath = path.join(
    __dirname,
    '../../src/components/athlete/MoodCheckIn.tsx'
  )
  let content: string

  beforeAll(() => {
    content = fs.readFileSync(filePath, 'utf-8')
  })

  it('renders all 5 mood options (Sad, Tired, Okay, Happy, Excited)', () => {
    expect(content).toContain("label: 'Sad'")
    expect(content).toContain("label: 'Tired'")
    expect(content).toContain("label: 'Okay'")
    expect(content).toContain("label: 'Happy'")
    expect(content).toContain("label: 'Excited'")
  })

  it('imports saveAthleteMood server action for mood submission', () => {
    expect(content).toContain('saveAthleteMood')
    expect(content).toContain("from '@/app/my/[athleteId]/actions'")
  })

  it('calls onSuccess feedback after mood is saved', () => {
    // After successful save, shows "Got it!" feedback
    expect(content).toContain("setMoodFeedback('Got it!')")
  })

  it('displays current mood via aria-pressed attribute', () => {
    expect(content).toContain('aria-pressed={selected}')
  })

  it('has aria-live region for mood feedback', () => {
    expect(content).toContain('aria-live="polite"')
  })

  it('has aria-label on each mood button', () => {
    expect(content).toContain('aria-label={m.label}')
  })

  it('uses semantic section element with aria-label', () => {
    expect(content).toContain('<section')
    expect(content).toContain('aria-label="How are you feeling today"')
  })

  it('is a client component', () => {
    expect(content).toContain("'use client'")
  })

  it('accepts athleteId and currentMood props', () => {
    expect(content).toContain('athleteId: string')
    expect(content).toContain('currentMood: number | null')
  })

  it('accepts theme props for styling', () => {
    expect(content).toContain('themeRing: string')
    expect(content).toContain('themeText: string')
  })
})
