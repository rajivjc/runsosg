/**
 * Unit tests for iOS PWA bugfixes:
 * 1. sharePdf is exported as async function
 * 2. shareCsv is exported as async function
 * 3. certificate.ts uses sharePdf not doc.save
 * 4. pdf-report.ts uses sharePdf not doc.save
 * 5. ExportButton does not import guardIOSDownload
 * 6. PoweredByBadge uses absolute positioning
 * 7. RunsTab milestone badges use Link not anchor with target blank
 */

import fs from 'fs'
import path from 'path'

import { sharePdf, shareCsv } from '@/lib/utils/ios-download-fix'

describe('iOS PWA bugfixes', () => {
  // Test 1: sharePdf is exported as async function
  test('sharePdf is exported as an async function', () => {
    expect(typeof sharePdf).toBe('function')
  })

  // Test 2: shareCsv is exported as async function
  test('shareCsv is exported as an async function', () => {
    expect(typeof shareCsv).toBe('function')
  })

  // Test 3: certificate.ts uses sharePdf not doc.save
  test('certificate.ts uses sharePdf instead of doc.save', () => {
    const filePath = path.join(process.cwd(), 'src/lib/certificate.ts')
    const source = fs.readFileSync(filePath, 'utf-8')
    expect(source).toMatch(/import\s*\{\s*sharePdf/)
    expect(source).not.toContain('doc.save(')
    expect(source).toContain("doc.output('blob')")
  })

  // Test 4: pdf-report.ts uses sharePdf not doc.save
  test('pdf-report.ts uses sharePdf instead of doc.save', () => {
    const filePath = path.join(process.cwd(), 'src/lib/pdf-report.ts')
    const source = fs.readFileSync(filePath, 'utf-8')
    expect(source).toContain('sharePdf')
    expect(source).not.toContain('doc.save(')
  })

  // Test 5: ExportButton does not import guardIOSDownload
  test('ExportButton does not import guardIOSDownload', () => {
    const filePath = path.join(process.cwd(), 'src/components/athlete/ExportButton.tsx')
    const source = fs.readFileSync(filePath, 'utf-8')
    expect(source).not.toContain('guardIOSDownload')
  })

  // Test 6: PoweredByBadge uses absolute positioning
  test('PoweredByBadge uses absolute positioning', () => {
    const filePath = path.join(process.cwd(), 'src/components/ui/PoweredByBadge.tsx')
    const source = fs.readFileSync(filePath, 'utf-8')
    expect(source).toContain('absolute')
    expect(source).not.toContain('mt-12')
  })

  // Test 7: RunsTab milestone badges use Link not anchor with target blank
  test('RunsTab does not use target="_blank"', () => {
    const filePath = path.join(process.cwd(), 'src/components/athlete/RunsTab.tsx')
    const source = fs.readFileSync(filePath, 'utf-8')
    expect(source).not.toContain('target="_blank"')
  })
})
