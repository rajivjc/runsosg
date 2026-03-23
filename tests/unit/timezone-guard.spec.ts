/**
 * Guard rail test: Ensures no hardcoded timezone/locale values creep back in.
 *
 * Phase B of 4.1.1 made timezone and locale dynamic from the clubs table.
 * This test fails if hardcoded 'Asia/Singapore', 'en-SG', or '+08:00' appear
 * in source files outside the approved allow-list.
 *
 * If this test fails, it means someone added a hardcoded timezone or locale.
 * Fix: use getClub().timezone / getClub().locale (server) or useClubConfig() (client).
 */

import { execSync } from 'child_process'
import path from 'path'

const ROOT = path.resolve(__dirname, '../../src')

// Files that are ALLOWED to contain hardcoded timezone/locale values.
// Each entry must have a reason.
const ALLOW_LIST = [
  'lib/club.ts',                           // Build-time fallback when DB is unreachable
  'lib/utils/dates.ts',                    // Timezone helper catch-block fallbacks
  'components/providers/ClubConfigProvider.tsx', // Context default value
  'components/admin/ClubSettingsForm.tsx',  // Placeholder text in form input
  'app/admin/settings/actions.ts',         // Insert fallback for new club row
]

// Patterns to search for (these should not appear in non-allowed files)
const FORBIDDEN_PATTERNS = [
  "'Asia/Singapore'",
  '"Asia/Singapore"',
  "'en-SG'",
  '"en-SG"',
  "'+08:00'",
  '"+08:00"',
  "T12:00:00+08:00",
]

function grepForPattern(pattern: string): string[] {
  try {
    // Use grep to find matches, excluding tests, node_modules, and comments
    const cmd = `grep -rn ${JSON.stringify(pattern)} "${ROOT}" --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v ".test." | grep -v ".spec." | grep -v "__tests__" || true`
    const output = execSync(cmd, { encoding: 'utf-8' }).trim()
    if (!output) return []
    return output.split('\n').filter(Boolean)
  } catch {
    return []
  }
}

function isAllowed(filePath: string): boolean {
  const relative = filePath.replace(ROOT + '/', '').replace(ROOT + '\\', '')
  // Strip line number suffix for matching
  const fileOnly = relative.split(':')[0]
  return ALLOW_LIST.some(allowed => fileOnly.endsWith(allowed))
}

function isDefaultParam(line: string): boolean {
  // Allow: timezone = 'Asia/Singapore' or locale = 'en-SG' (function default params)
  // Allow: ?? 'Asia/Singapore' or ?? 'en-SG' (null coalescing fallbacks)
  return (
    /=\s*'Asia\/Singapore'/.test(line) ||
    /=\s*'en-SG'/.test(line) ||
    /\?\?\s*'Asia\/Singapore'/.test(line) ||
    /\?\?\s*'en-SG'/.test(line) ||
    /=\s*"Asia\/Singapore"/.test(line) ||
    /=\s*"en-SG"/.test(line) ||
    /\?\?\s*"Asia\/Singapore"/.test(line) ||
    /\?\?\s*"en-SG"/.test(line)
  )
}

function isComment(line: string): boolean {
  const trimmed = line.split(':').slice(2).join(':').trim()
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')
}

describe('Timezone guard rail', () => {
  const violations: string[] = []

  beforeAll(() => {
    for (const pattern of FORBIDDEN_PATTERNS) {
      const matches = grepForPattern(pattern)
      for (const match of matches) {
        if (isAllowed(match)) continue
        if (isDefaultParam(match)) continue
        if (isComment(match)) continue
        violations.push(match)
      }
    }
  })

  it('should have no hardcoded timezone/locale outside allow-list', () => {
    if (violations.length > 0) {
      const message = [
        '',
        'TIMEZONE GUARD RAIL FAILED',
        '',
        `Found ${violations.length} hardcoded timezone/locale reference(s):`,
        '',
        ...violations.map(v => `  ${v}`),
        '',
        'How to fix:',
        '  - Server code: use getClub().timezone / getClub().locale',
        '  - Client code: use useClubConfig() from ClubConfigProvider',
        '  - Lib functions: add timezone/locale parameter with default',
        '  - If this file should be allowed, add it to ALLOW_LIST in timezone-guard.spec.ts',
        '',
      ].join('\n')
      throw new Error(message)
    }
  })
})
