/**
 * Static analysis tests for public about pages.
 *
 * Verifies:
 * 1. Auth gate has been removed from both about pages
 * 2. Essay content is preserved
 * 3. ShareButton and CloseButton are still present
 * 4. No sensitive data imports remain
 */

import * as fs from 'fs'
import * as path from 'path'

describe('about page (public)', () => {
  const filePath = path.join(
    __dirname,
    '../../src/app/about/page.tsx'
  )
  let content: string

  beforeAll(() => {
    content = fs.readFileSync(filePath, 'utf-8')
  })

  it('does not import auth utilities', () => {
    expect(content).not.toContain('createClient')
    expect(content).not.toContain('adminClient')
    expect(content).not.toContain("from 'next/navigation'")
  })

  it('does not contain auth check logic', () => {
    expect(content).not.toContain('getUser')
    expect(content).not.toContain("redirect('/login')")
    expect(content).not.toContain("redirect('/feed')")
  })

  it('is an async function (uses getClub() for dynamic club name)', () => {
    expect(content).toContain('export default async function AboutPage()')
  })

  it('preserves essay content', () => {
    expect(content).toContain('It started with a moment I almost missed')
    expect(content).toContain('Why I Built This')
    expect(content).toContain('defined by the sport')
  })

  it('preserves ShareButton component', () => {
    expect(content).toContain('ShareButton')
    expect(content).toContain('Share this story')
  })

  it('preserves CloseButton component', () => {
    expect(content).toContain('CloseButton')
  })

  it('has OpenGraph metadata', () => {
    expect(content).toContain('openGraph')
    expect(content).toContain('Why I Built This')
  })
})

describe('caregiver about page (public)', () => {
  const filePath = path.join(
    __dirname,
    '../../src/app/about/caregiver/page.tsx'
  )
  let content: string

  beforeAll(() => {
    content = fs.readFileSync(filePath, 'utf-8')
  })

  it('does not import auth utilities', () => {
    expect(content).not.toContain('createClient')
    expect(content).not.toContain('adminClient')
    expect(content).not.toContain("from 'next/navigation'")
  })

  it('does not contain auth check logic', () => {
    expect(content).not.toContain('getUser')
    expect(content).not.toContain("redirect('/login')")
    expect(content).not.toContain("redirect('/feed')")
  })

  it('is an async function (uses getClub() for dynamic club name)', () => {
    expect(content).toContain('export default async function CaregiverAboutPage()')
  })

  it('preserves essay content', () => {
    expect(content).toContain('every run deserves to be remembered')
    expect(content).toContain('Our Running Club')
  })

  it('preserves ShareButton component', () => {
    expect(content).toContain('ShareButton')
  })

  it('preserves CloseButton component', () => {
    expect(content).toContain('CloseButton')
  })
})
