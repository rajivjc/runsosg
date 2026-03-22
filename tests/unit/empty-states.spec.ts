import { readFileSync } from 'fs'
import { join } from 'path'

function readSrc(path: string): string {
  return readFileSync(join(__dirname, '..', '..', 'src', path), 'utf-8')
}

describe('Empty state designs', () => {
  test('Athletes page has role-aware empty state', () => {
    const source = readSrc('app/athletes/page.tsx')
    expect(source).toContain('isAdmin')
    expect(source).toContain('/admin/athletes/new')
    expect(source).toContain('Athletes will appear here once an admin adds them.')
  })

  test('Notifications page uses positive empty state', () => {
    const source = readSrc('app/notifications/page.tsx')
    expect(source).toContain('All caught up')
    expect(source).toContain('🔔')
    expect(source).not.toContain('No notifications yet.')
  })

  test('CoachSessionFeed does not say "Be the first to log a run"', () => {
    const source = readSrc('components/feed/CoachSessionFeed.tsx')
    expect(source).not.toContain('Be the first to log a run')
    expect(source).toContain('No sessions logged yet')
  })

  test('CaregiverFeed does not tell caregivers to log runs', () => {
    const source = readSrc('components/feed/CaregiverFeed.tsx')
    expect(source).not.toContain('Be the first to log a run')
    expect(source).toContain('coach logs a run')
  })

  test('PhotosTab uses consistent heading size', () => {
    const source = readSrc('components/athlete/PhotosTab.tsx')
    const noPhotosMatch = source.match(/No photos yet[\s\S]{0,20}/)
    // The heading line should use text-base, not text-sm
    expect(source).toContain('text-base font-semibold text-text-primary mb-1">No photos yet')
  })

  test('All empty states use consistent emoji size (text-4xl)', () => {
    const files = [
      'app/athletes/page.tsx',
      'app/notifications/page.tsx',
      'components/feed/CoachSessionFeed.tsx',
      'components/feed/CaregiverFeed.tsx',
      'components/athlete/PhotosTab.tsx',
    ]
    for (const file of files) {
      const source = readSrc(file)
      expect(source).toContain('text-4xl')
    }
  })
})
