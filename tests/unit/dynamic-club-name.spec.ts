import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'

describe('Dynamic club name — no hardcoded SOSG Running Club', () => {
  const srcDir = path.resolve(__dirname, '../../src')

  // Allowed locations for 'SOSG Running Club'
  const ALLOWED_FILES = [
    'src/lib/supabase/database.types.ts',
    'src/components/ui/PoweredByBadge.tsx', // Phase C
  ]

  test('no hardcoded "SOSG Running Club" in src/ except allowed locations', () => {
    // Use grep to find all matches
    let grepOutput = ''
    try {
      grepOutput = execSync(
        `grep -rn "SOSG Running Club" --include="*.ts" --include="*.tsx" "${srcDir}"`,
        { encoding: 'utf-8' }
      )
    } catch {
      // grep returns exit code 1 when no matches found — that's fine
      return
    }

    const lines = grepOutput.trim().split('\n').filter(Boolean)
    const violations = lines.filter(line => {
      // Allow test fixtures and TODO comments
      if (line.includes('// TODO')) return false
      if (line.includes('.spec.ts')) return false
      if (line.includes('.test.ts')) return false

      // Check if the file is in the allowed list
      for (const allowed of ALLOWED_FILES) {
        const absAllowed = path.resolve(__dirname, '../../', allowed)
        if (line.startsWith(absAllowed)) return false
      }
      return true
    })

    if (violations.length > 0) {
      fail(
        `Found ${violations.length} hardcoded "SOSG Running Club" reference(s):\n${violations.join('\n')}`
      )
    }
  })

  test('email layout() uses clubName parameter in header and footer', () => {
    // We can't easily import the private layout function, but we can test through the public API
    const { invitationEmail } = require('../../src/lib/email/templates')
    const html = invitationEmail({
      role: 'coach',
      inviterName: 'Alice',
      acceptUrl: '/accept',
      clubName: 'Test Club',
      tagline: 'Test Tagline',
    })

    // Header should contain Test Club
    expect(html).toContain('Test Club')
    // Footer should contain Test Club — Test Tagline
    expect(html).toContain('Test Club — Test Tagline')
  })

  test('invitationEmail() uses clubName in body', () => {
    const { invitationEmail } = require('../../src/lib/email/templates')
    const html = invitationEmail({
      role: 'coach',
      inviterName: 'Alice',
      acceptUrl: '/accept',
      clubName: 'Test Club',
      tagline: 'Test',
    })

    expect(html).toContain('invited to Test Club')
    expect(html).not.toContain('SOSG')
  })

  test('generateNarrative() uses clubName parameter', () => {
    const { generateNarrative } = require('../../src/lib/story/narrative')
    const result = generateNarrative({
      athleteName: 'Jane',
      joinedAt: '2025-01-15',
      runningGoal: null,
      sessions: [],
      milestones: [],
      clubName: 'Test Club',
    })

    const allText = result.chapters.flatMap((c: any) => c.paragraphs).join(' ')
    expect(allText).toContain('Test Club')
    expect(allText).not.toContain('SOSG')
  })

  test('certificate PDF uses data.clubName', () => {
    // Code inspection test: verify the certificate.ts file uses data.clubName, not hardcoded string
    const certFile = fs.readFileSync(
      path.resolve(srcDir, 'lib/certificate.ts'),
      'utf-8'
    )
    // The footer line should use data.clubName
    expect(certFile).toContain('data.clubName')
    expect(certFile).not.toContain("'SOSG Running Club Hub'")
  })

  test('pdf-report uses clubName parameter', () => {
    const pdfFile = fs.readFileSync(
      path.resolve(srcDir, 'lib/pdf-report.ts'),
      'utf-8'
    )
    // Verify signature accepts clubName
    expect(pdfFile).toContain('clubName')
    // Verify it uses the parameter in the footer
    expect(pdfFile).toContain('Generated from ${clubName}')
    expect(pdfFile).not.toContain('SOSG Running Club Hub')
  })

  test('OG milestone image route uses getClub()', () => {
    const routeFile = fs.readFileSync(
      path.resolve(srcDir, 'app/api/milestone/[id]/image/route.tsx'),
      'utf-8'
    )
    expect(routeFile).toContain("import { getClub } from '@/lib/club'")
    expect(routeFile).toContain('await getClub()')
    expect(routeFile).not.toContain("'SOSG Running Club")
  })

  test('root layout title is dynamic (exports generateMetadata, not static metadata)', () => {
    const layoutFile = fs.readFileSync(
      path.resolve(srcDir, 'app/layout.tsx'),
      'utf-8'
    )
    expect(layoutFile).toContain('export async function generateMetadata')
    expect(layoutFile).not.toMatch(/export const metadata\s*[=:]/)
  })
})
