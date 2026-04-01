/**
 * Tests for the /demo interactive demo page.
 *
 * Validates:
 * 1. Page and components are self-contained (no app-internal imports)
 * 2. All 9 screen components exist and export defaults
 * 3. Demo data matches the prototype
 * 4. Middleware has /demo as a public path
 * 5. Sitemap includes /demo
 * 6. OG image exists
 */

import * as fs from 'fs'
import * as path from 'path'

const DEMO_DIR = path.join(__dirname, '../../src/components/demo')
const SCREENS_DIR = path.join(DEMO_DIR, 'screens')
const APP_DIR = path.join(__dirname, '../../src/app/demo')

describe('demo page structure', () => {
  it('all required files exist', () => {
    const requiredFiles = [
      'DemoPage.tsx',
      'demo-data.ts',
      'PhoneFrame.tsx',
      'DemoBottomNav.tsx',
      'DemoIcons.tsx',
    ]
    for (const file of requiredFiles) {
      expect(fs.existsSync(path.join(DEMO_DIR, file))).toBe(true)
    }
  })

  it('all 9 screen components exist', () => {
    const screens = [
      'CoachFeed.tsx',
      'CoachSessions.tsx',
      'CoachMilestone.tsx',
      'CaregiverDashboard.tsx',
      'CaregiverSessions.tsx',
      'CaregiverDigest.tsx',
      'AthleteJourney.tsx',
      'AthleteGoal.tsx',
      'AthleteFavourite.tsx',
    ]
    for (const file of screens) {
      expect(fs.existsSync(path.join(SCREENS_DIR, file))).toBe(true)
    }
  })

  it('server page.tsx and opengraph-image.tsx exist', () => {
    expect(fs.existsSync(path.join(APP_DIR, 'page.tsx'))).toBe(true)
    expect(fs.existsSync(path.join(APP_DIR, 'opengraph-image.tsx'))).toBe(true)
  })
})

describe('demo page isolation (no app-internal imports)', () => {
  const allDemoFiles = [
    ...['DemoPage.tsx', 'demo-data.ts', 'PhoneFrame.tsx', 'DemoBottomNav.tsx', 'DemoIcons.tsx']
      .map(f => path.join(DEMO_DIR, f)),
    ...['CoachFeed.tsx', 'CoachSessions.tsx', 'CoachMilestone.tsx',
      'CaregiverDashboard.tsx', 'CaregiverSessions.tsx', 'CaregiverDigest.tsx',
      'AthleteJourney.tsx', 'AthleteGoal.tsx', 'AthleteFavourite.tsx']
      .map(f => path.join(SCREENS_DIR, f)),
  ]

  it.each(allDemoFiles)('%s does not import lucide-react', (filePath) => {
    const content = fs.readFileSync(filePath, 'utf-8')
    expect(content).not.toContain('lucide-react')
  })

  it.each(allDemoFiles)('%s does not import supabase', (filePath) => {
    const content = fs.readFileSync(filePath, 'utf-8')
    expect(content).not.toContain('supabase')
  })

  it.each(allDemoFiles)('%s does not import from @/lib or @/components (outside demo)', (filePath) => {
    const content = fs.readFileSync(filePath, 'utf-8')
    // Should only import from ../demo-data, ../DemoBottomNav, ./screens/*, etc.
    // Not from @/lib/*, @/components/nav/*, etc.
    const nonDemoImports = content.match(/from\s+['"]@\/(?!components\/demo)/g)
    expect(nonDemoImports).toBeNull()
  })
})

describe('demo data', () => {
  let demoDataContent: string

  beforeAll(() => {
    demoDataContent = fs.readFileSync(path.join(DEMO_DIR, 'demo-data.ts'), 'utf-8')
  })

  it('contains Sunrise Running Club', () => {
    expect(demoDataContent).toContain('Sunrise Running Club')
  })

  it('contains all 4 athletes', () => {
    expect(demoDataContent).toContain('Daniel')
    expect(demoDataContent).toContain('Aisha')
    expect(demoDataContent).toContain('Liam')
    expect(demoDataContent).toContain('Priya')
  })

  it('contains all 3 roles', () => {
    expect(demoDataContent).toContain("id: 'coach'")
    expect(demoDataContent).toContain("id: 'caregiver'")
    expect(demoDataContent).toContain("id: 'athlete'")
  })

  it('exports TypeScript types', () => {
    expect(demoDataContent).toContain('export type RoleId')
    expect(demoDataContent).toContain('export interface Athlete')
    expect(demoDataContent).toContain('export interface Role')
  })
})

describe('demo page component', () => {
  let content: string

  beforeAll(() => {
    content = fs.readFileSync(path.join(DEMO_DIR, 'DemoPage.tsx'), 'utf-8')
  })

  it('is a client component', () => {
    expect(content).toContain("'use client'")
  })

  it('imports all 9 screen components', () => {
    expect(content).toContain('CoachFeed')
    expect(content).toContain('CoachSessions')
    expect(content).toContain('CoachMilestone')
    expect(content).toContain('CaregiverDashboard')
    expect(content).toContain('CaregiverSessions')
    expect(content).toContain('CaregiverDigest')
    expect(content).toContain('AthleteJourney')
    expect(content).toContain('AthleteGoal')
    expect(content).toContain('AthleteFavourite')
  })

  it('uses Nunito Sans font (not DM Sans)', () => {
    expect(content).toContain("'Nunito Sans'")
    expect(content).not.toContain("'DM Sans'")
  })

  it('CTA links to /#contact', () => {
    expect(content).toContain('href="/#contact"')
  })

  it('applies marginBottom -64 for layout padding override', () => {
    expect(content).toContain('marginBottom: -64')
  })

  it('does not import auth utilities', () => {
    expect(content).not.toContain('createClient')
    expect(content).not.toContain('getUser')
    expect(content).not.toContain('adminClient')
  })
})

describe('demo server page', () => {
  let content: string

  beforeAll(() => {
    content = fs.readFileSync(path.join(APP_DIR, 'page.tsx'), 'utf-8')
  })

  it('has metadata with correct title', () => {
    expect(content).toContain('See Kita in action')
  })

  it('has OpenGraph metadata', () => {
    expect(content).toContain('openGraph')
    expect(content).toContain('kitarun.com/demo')
  })

  it('has Twitter card metadata', () => {
    expect(content).toContain('twitter')
    expect(content).toContain('summary_large_image')
  })

  it('does not import auth utilities', () => {
    expect(content).not.toContain('createClient')
    expect(content).not.toContain('getUser')
    expect(content).not.toContain('adminClient')
  })
})

describe('demo route is public', () => {
  it('/demo is in middleware PUBLIC_PATHS', () => {
    const middleware = fs.readFileSync(
      path.join(__dirname, '../../src/middleware.ts'),
      'utf-8'
    )
    expect(middleware).toContain("'/demo'")
  })

  it('/demo is in sitemap', () => {
    const sitemap = fs.readFileSync(
      path.join(__dirname, '../../src/app/sitemap.ts'),
      'utf-8'
    )
    expect(sitemap).toContain('kitarun.com/demo')
  })
})

describe('demo bottom nav variants', () => {
  let content: string

  beforeAll(() => {
    content = fs.readFileSync(path.join(DEMO_DIR, 'DemoBottomNav.tsx'), 'utf-8')
  })

  it('coach tabs include Alerts (5 tabs)', () => {
    expect(content).toContain("id: 'alerts'")
    expect(content).toContain("label: 'Alerts'")
  })

  it('caregiver tabs do not include Alerts (4 tabs)', () => {
    // caregiverTabs is defined separately without alerts
    expect(content).toContain('caregiverTabs')
    // The caregiverTabs array should go feed -> sessions -> athletes -> account (no alerts)
    const caregiverSection = content.split('caregiverTabs')[1]?.split('const tabs')[0]
    expect(caregiverSection).not.toContain('alerts')
  })

  it('athlete screens have no bottom nav', () => {
    for (const file of ['AthleteJourney.tsx', 'AthleteGoal.tsx', 'AthleteFavourite.tsx']) {
      const screenContent = fs.readFileSync(path.join(SCREENS_DIR, file), 'utf-8')
      expect(screenContent).not.toContain('DemoBottomNav')
    }
  })

  it('coach screens have bottom nav', () => {
    for (const file of ['CoachFeed.tsx', 'CoachSessions.tsx', 'CoachMilestone.tsx']) {
      const screenContent = fs.readFileSync(path.join(SCREENS_DIR, file), 'utf-8')
      expect(screenContent).toContain('DemoBottomNav')
      expect(screenContent).toContain('role="coach"')
    }
  })

  it('caregiver screens have bottom nav', () => {
    for (const file of ['CaregiverDashboard.tsx', 'CaregiverSessions.tsx', 'CaregiverDigest.tsx']) {
      const screenContent = fs.readFileSync(path.join(SCREENS_DIR, file), 'utf-8')
      expect(screenContent).toContain('DemoBottomNav')
      expect(screenContent).toContain('role="caregiver"')
    }
  })
})

describe('phone frame', () => {
  let content: string

  beforeAll(() => {
    content = fs.readFileSync(path.join(DEMO_DIR, 'PhoneFrame.tsx'), 'utf-8')
  })

  it('has border-radius 32', () => {
    expect(content).toContain('borderRadius: 32')
  })

  it('shows 9:41 status bar time', () => {
    expect(content).toContain('9:41')
  })

  it('has notch element', () => {
    expect(content).toContain('width: 80')
    expect(content).toContain('height: 22')
  })

  it('has box shadow', () => {
    expect(content).toContain('boxShadow')
  })
})

describe('OG image', () => {
  let content: string

  beforeAll(() => {
    content = fs.readFileSync(path.join(APP_DIR, 'opengraph-image.tsx'), 'utf-8')
  })

  it('exports correct alt text', () => {
    expect(content).toContain("alt = 'See Kita in action")
  })

  it('has correct dimensions', () => {
    expect(content).toContain('width: 1200')
    expect(content).toContain('height: 630')
  })

  it('uses teal gradient', () => {
    expect(content).toContain('#0F766E')
    expect(content).toContain('#0D9488')
  })

  it('includes cache headers', () => {
    expect(content).toContain('Cache-Control')
    expect(content).toContain('max-age=86400')
  })

  it('shows kitarun.com/demo domain', () => {
    expect(content).toContain('kitarun.com/demo')
  })
})
