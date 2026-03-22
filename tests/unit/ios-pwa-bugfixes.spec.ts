/**
 * Unit tests for iOS PWA bugfixes:
 * 1. guardIOSDownload is a callable no-op in Node
 * 2. RunsTab milestone badges use Next.js Link, not anchor with target="_blank"
 * 3. EditAthleteForm internal links use Link, not anchor with target="_blank"
 * 4. CaregiverSharingControl internal links use Link
 * 5. certificate.ts calls guardIOSDownload before doc.save
 * 6. ExportButton calls guardIOSDownload before downloads
 */

import fs from 'fs'
import path from 'path'

import { guardIOSDownload } from '@/lib/utils/ios-download-fix'

describe('iOS PWA bugfixes', () => {
  // Test 1: guardIOSDownload is a callable function
  test('guardIOSDownload is a callable function and does not throw in Node', () => {
    expect(typeof guardIOSDownload).toBe('function')
    expect(() => guardIOSDownload()).not.toThrow()
  })

  // Test 2: RunsTab milestone badges use Link not anchor with target blank
  test('RunsTab uses Link instead of anchor with target="_blank"', () => {
    const filePath = path.join(process.cwd(), 'src/components/athlete/RunsTab.tsx')
    const source = fs.readFileSync(filePath, 'utf-8')
    expect(source).not.toContain('target="_blank"')
    expect(source).toMatch(/import\s+Link\s+from\s+['"]next\/link['"]/)
  })

  // Test 3: EditAthleteForm internal links use Link not anchor with target blank
  test('EditAthleteForm story link does not use target="_blank"', () => {
    const filePath = path.join(process.cwd(), 'src/components/athlete/EditAthleteForm.tsx')
    const source = fs.readFileSync(filePath, 'utf-8')
    expect(source).not.toContain('target="_blank"')
  })

  // Test 4: CaregiverSharingControl internal links use Link
  test('CaregiverSharingControl story link does not use target="_blank"', () => {
    const filePath = path.join(process.cwd(), 'src/components/feed/CaregiverSharingControl.tsx')
    const source = fs.readFileSync(filePath, 'utf-8')
    expect(source).not.toContain('target="_blank"')
  })

  // Test 5: certificate.ts calls guardIOSDownload before save
  test('certificate.ts imports and calls guardIOSDownload before doc.save', () => {
    const filePath = path.join(process.cwd(), 'src/lib/certificate.ts')
    const source = fs.readFileSync(filePath, 'utf-8')
    expect(source).toContain('guardIOSDownload')
    const guardIndex = source.indexOf('guardIOSDownload()')
    const saveIndex = source.indexOf('doc.save(')
    expect(guardIndex).toBeGreaterThan(-1)
    expect(saveIndex).toBeGreaterThan(-1)
    expect(guardIndex).toBeLessThan(saveIndex)
  })

  // Test 6: ExportButton calls guardIOSDownload before downloads
  test('ExportButton imports and calls guardIOSDownload', () => {
    const filePath = path.join(process.cwd(), 'src/components/athlete/ExportButton.tsx')
    const source = fs.readFileSync(filePath, 'utf-8')
    expect(source).toContain('guardIOSDownload')
    expect(source).toMatch(/import\s*\{[^}]*guardIOSDownload[^}]*\}\s*from/)
  })
})
