/**
 * Tests to verify the semantic token migration.
 * Run after the migration to catch any missed references.
 */
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

describe('Semantic token migration', () => {
  const srcDir = path.join(process.cwd(), 'src')

  test('tokens.css has been deleted', () => {
    const tokensPath = path.join(srcDir, 'styles', 'tokens.css')
    expect(fs.existsSync(tokensPath)).toBe(false)
  })

  test('globals.css contains semantic colour variables', () => {
    const globalsPath = path.join(srcDir, 'app', 'globals.css')
    const content = fs.readFileSync(globalsPath, 'utf-8')
    expect(content).toContain('--color-bg:')
    expect(content).toContain('--color-surface:')
    expect(content).toContain('--color-text-primary:')
    expect(content).toContain('--color-border:')
    expect(content).toContain('@theme')
  })

  test('no remaining bg-white in components (except allowed patterns)', () => {
    const result = execSync(
      `grep -rl "bg-white" src/components/ src/app/ --include="*.tsx" || true`,
      { cwd: process.cwd(), encoding: 'utf-8' }
    ).trim()

    // Allowed files: QR code (needs white bg for scanning), toggle knobs (physical knob stays white)
    const allowedFiles = [
      'AthleteQrCode.tsx',
      'PushToggle.tsx',
      'SessionNotificationsToggle.tsx',
      'EditAthleteForm.tsx',
    ]
    // Filter out allowed patterns: gradients, opacity modifiers, toggle knobs, QR codes
    const files = result.split('\n').filter(f => f.trim())
    const violations = files.filter(f => {
      if (allowedFiles.some(a => f.endsWith(a))) return false
      const content = fs.readFileSync(f, 'utf-8')
      // Allow bg-white/60 (opacity modifier on gradient cards)
      // Allow bg-white inside gradient strings
      // Allow after:bg-white (toggle knobs must stay white)
      const lines = content.split('\n').filter(line =>
        line.includes('bg-white') &&
        !line.includes('bg-white/') &&
        !line.includes('from-') &&
        !line.includes('to-') &&
        !line.includes('after:bg-white')
      )
      return lines.length > 0
    })

    expect(violations).toEqual([])
  })

  test('no remaining text-gray-900 in components', () => {
    const result = execSync(
      `grep -rn "text-gray-900" src/components/ src/app/ --include="*.tsx" || true`,
      { cwd: process.cwd(), encoding: 'utf-8' }
    ).trim()
    expect(result).toBe('')
  })

  test('no remaining border-gray-200 in components', () => {
    const result = execSync(
      `grep -rn "border-gray-200" src/components/ src/app/ --include="*.tsx" || true`,
      { cwd: process.cwd(), encoding: 'utf-8' }
    ).trim()
    expect(result).toBe('')
  })

  test('no orphaned var(--color-) references in components', () => {
    const result = execSync(
      `grep -rn "var(--color-" src/components/ --include="*.tsx" || true`,
      { cwd: process.cwd(), encoding: 'utf-8' }
    ).trim()
    expect(result).toBe('')
  })

  test('body has bg-bg and text-text-primary classes', () => {
    const layoutPath = path.join(srcDir, 'app', 'layout.tsx')
    const content = fs.readFileSync(layoutPath, 'utf-8')
    expect(content).toContain('bg-bg')
    expect(content).toContain('text-text-primary')
  })
})
