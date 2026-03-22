/**
 * Unit tests for the certificate PDF generator.
 *
 * Tests generateCertificatePdf():
 * 1. Creates a valid PDF with correct constructor options
 * 2. Filename is correctly slugified
 * 3. Coach name is omitted when null
 * 4. Coach name is included when present
 * 5. Default theme colour is teal when null
 * 6. Respects athlete theme colour
 * 7. Falls back to teal for unknown theme colour
 * 8. Date is formatted in Singapore locale
 * 9. CertificateButton component exists and imports correctly
 * 10. Avatar defaults to 🏃 when null
 */

// ── Mock jsPDF ──────────────────────────────────────────────────────────────

const mockText = jest.fn()
const mockOutput = jest.fn().mockReturnValue(new Blob(['pdf'], { type: 'application/pdf' }))
const mockSetFont = jest.fn()
const mockSetFontSize = jest.fn()
const mockSetTextColor = jest.fn()
const mockSetDrawColor = jest.fn()
const mockSetLineWidth = jest.fn()
const mockSetCharSpace = jest.fn()
const mockRoundedRect = jest.fn()
const mockLine = jest.fn()

const mockJsPDFConstructor = jest.fn()

jest.mock('jspdf', () => ({
  jsPDF: jest.fn().mockImplementation((...args: unknown[]) => {
    mockJsPDFConstructor(...args)
    return {
      text: mockText,
      output: mockOutput,
      setFont: mockSetFont,
      setFontSize: mockSetFontSize,
      setTextColor: mockSetTextColor,
      setDrawColor: mockSetDrawColor,
      setLineWidth: mockSetLineWidth,
      setCharSpace: mockSetCharSpace,
      roundedRect: mockRoundedRect,
      line: mockLine,
    }
  }),
}))

const mockSharePdf = jest.fn().mockResolvedValue(undefined)
jest.mock('@/lib/utils/ios-download-fix', () => ({
  sharePdf: (...args: unknown[]) => mockSharePdf(...args),
}))

import { generateCertificatePdf, type CertificateData } from '@/lib/certificate'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeData(overrides: Partial<CertificateData> = {}): CertificateData {
  return {
    athleteName: 'Nicholas Tan',
    milestoneLabel: '5 Sessions',
    milestoneIcon: '🏅',
    achievedAt: '2026-03-15T08:00:00Z',
    coachName: 'Coach Sarah',
    clubName: 'SOSG Running Club',
    themeColor: 'teal',
    avatar: '🏃',
    ...overrides,
  }
}

function resetMocks() {
  mockText.mockClear()
  mockOutput.mockClear()
  mockSharePdf.mockClear()
  mockSetFont.mockClear()
  mockSetFontSize.mockClear()
  mockSetTextColor.mockClear()
  mockSetDrawColor.mockClear()
  mockSetLineWidth.mockClear()
  mockSetCharSpace.mockClear()
  mockRoundedRect.mockClear()
  mockLine.mockClear()
  mockJsPDFConstructor.mockClear()
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('generateCertificatePdf', () => {
  beforeEach(resetMocks)

  test('creates a valid PDF with landscape A4 orientation', async () => {
    await generateCertificatePdf(makeData())

    expect(mockJsPDFConstructor).toHaveBeenCalledWith({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    })
    expect(mockText).toHaveBeenCalledWith('Nicholas Tan', expect.any(Number), expect.any(Number), expect.anything())
    expect(mockText).toHaveBeenCalledWith('5 Sessions', expect.any(Number), expect.any(Number), expect.anything())
    expect(mockText).toHaveBeenCalledWith('CERTIFICATE OF ACHIEVEMENT', expect.any(Number), expect.any(Number), expect.anything())
    expect(mockOutput).toHaveBeenCalledWith('blob')
    expect(mockSharePdf).toHaveBeenCalledWith(expect.any(Blob), expect.stringMatching(/\.pdf$/))
  })

  test('filename is correctly slugified', async () => {
    await generateCertificatePdf(makeData({ athleteName: 'Nicholas Tan', milestoneLabel: '5 Sessions' }))

    expect(mockSharePdf).toHaveBeenCalledWith(expect.any(Blob), 'nicholas-tan-5-sessions.pdf')
  })

  test('coach name is omitted when null', async () => {
    await generateCertificatePdf(makeData({ coachName: null }))

    const textCalls: unknown[] = mockText.mock.calls.map((c: unknown[]) => c[0])
    const hasCoached = textCalls.some((t) => typeof t === 'string' && t.includes('Coached by'))
    expect(hasCoached).toBe(false)
  })

  test('coach name is included when present', async () => {
    await generateCertificatePdf(makeData({ coachName: 'Coach Sarah' }))

    const textCalls: unknown[] = mockText.mock.calls.map((c: unknown[]) => c[0])
    const hasCoachSarah = textCalls.some((t) => typeof t === 'string' && t.includes('Coach Sarah'))
    expect(hasCoachSarah).toBe(true)
  })

  test('default theme colour is teal when null', async () => {
    await generateCertificatePdf(makeData({ themeColor: null }))

    // Teal primary is #0F766E → RGB(15, 118, 110)
    expect(mockSetTextColor).toHaveBeenCalledWith(15, 118, 110)
  })

  test('respects athlete theme colour', async () => {
    await generateCertificatePdf(makeData({ themeColor: 'purple' }))

    // Purple primary is #7C3AED → RGB(124, 58, 237)
    expect(mockSetTextColor).toHaveBeenCalledWith(124, 58, 237)
  })

  test('falls back to teal for unknown theme colour', async () => {
    await generateCertificatePdf(makeData({ themeColor: 'rainbow' }))

    // Should use teal: RGB(15, 118, 110)
    expect(mockSetTextColor).toHaveBeenCalledWith(15, 118, 110)
  })

  test('date is formatted in Singapore locale', async () => {
    await generateCertificatePdf(makeData({ achievedAt: '2026-03-15T08:00:00Z' }))

    const textCalls: unknown[] = mockText.mock.calls.map((c: unknown[]) => c[0])
    const hasDate = textCalls.some((t) => typeof t === 'string' && t === '15 March 2026')
    expect(hasDate).toBe(true)
  })

  test('CertificateButton component exists and exports correctly', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@/components/milestone/CertificateButton')
    expect(mod.default).toBeDefined()
    expect(typeof mod.default).toBe('function')
  })

  test('avatar defaults to 🏃 when null', async () => {
    await generateCertificatePdf(makeData({ avatar: null }))

    const textCalls: unknown[] = mockText.mock.calls.map((c: unknown[]) => c[0])
    const hasRunnerEmoji = textCalls.some((t) => t === '🏃')
    expect(hasRunnerEmoji).toBe(true)
  })
})
