import { jsPDF } from 'jspdf'
import { sharePdf } from '@/lib/utils/ios-download-fix'

const THEME_HEX: Record<string, { primary: string; light: string }> = {
  teal:   { primary: '#0F766E', light: '#CCFBF1' },
  blue:   { primary: '#1D4ED8', light: '#DBEAFE' },
  purple: { primary: '#7C3AED', light: '#EDE9FE' },
  green:  { primary: '#15803D', light: '#DCFCE7' },
  amber:  { primary: '#B45309', light: '#FEF3C7' },
  coral:  { primary: '#EA580C', light: '#FFEDD5' },
}

export interface CertificateData {
  athleteName: string
  milestoneLabel: string
  milestoneIcon: string
  achievedAt: string
  coachName: string | null
  clubName: string
  themeColor: string | null
  avatar: string | null
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function generateCertificatePdf(data: CertificateData): Promise<void> {
  const theme = THEME_HEX[data.themeColor ?? ''] ?? THEME_HEX.teal
  const primaryRgb = hexToRgb(theme.primary)
  const avatar = data.avatar ?? '🏃'

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const pageW = 297
  const pageH = 210

  // ─── Double border ────────────────────────────────────────────
  // Outer border
  doc.setDrawColor(...primaryRgb)
  doc.setLineWidth(1.5 * 0.3528) // 1.5pt in mm
  doc.roundedRect(15, 15, pageW - 30, pageH - 30, 4, 4, 'S')

  // Inner border (30% opacity simulated by blending with white)
  const innerR = Math.round(primaryRgb[0] * 0.3 + 255 * 0.7)
  const innerG = Math.round(primaryRgb[1] * 0.3 + 255 * 0.7)
  const innerB = Math.round(primaryRgb[2] * 0.3 + 255 * 0.7)
  doc.setDrawColor(innerR, innerG, innerB)
  doc.setLineWidth(0.5 * 0.3528) // 0.5pt in mm
  doc.roundedRect(18, 18, pageW - 36, pageH - 36, 3, 3, 'S')

  const centerX = pageW / 2

  // ─── Avatar emoji ─────────────────────────────────────────────
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(64)
  doc.setTextColor(0, 0, 0)
  doc.text(avatar, centerX, 55, { align: 'center' })

  // ─── "CERTIFICATE OF ACHIEVEMENT" ─────────────────────────────
  doc.setFontSize(12)
  doc.setTextColor(...primaryRgb)
  doc.setCharSpace(3)
  doc.text('CERTIFICATE OF ACHIEVEMENT', centerX, 70, { align: 'center' })
  doc.setCharSpace(0)

  // ─── Decorative line above name ───────────────────────────────
  const lineColor40R = Math.round(primaryRgb[0] * 0.4 + 255 * 0.6)
  const lineColor40G = Math.round(primaryRgb[1] * 0.4 + 255 * 0.6)
  const lineColor40B = Math.round(primaryRgb[2] * 0.4 + 255 * 0.6)
  doc.setDrawColor(lineColor40R, lineColor40G, lineColor40B)
  doc.setLineWidth(0.5 * 0.3528)
  doc.line(centerX - 20, 78, centerX + 20, 78)

  // ─── Athlete name ─────────────────────────────────────────────
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(17, 24, 39) // #111827
  doc.text(data.athleteName, centerX, 92, { align: 'center' })

  // ─── Milestone label ──────────────────────────────────────────
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...primaryRgb)
  doc.text(data.milestoneLabel, centerX, 106, { align: 'center' })

  // ─── Decorative line below milestone ──────────────────────────
  doc.setDrawColor(lineColor40R, lineColor40G, lineColor40B)
  doc.setLineWidth(0.5 * 0.3528)
  doc.line(centerX - 20, 113, centerX + 20, 113)

  // ─── Date ─────────────────────────────────────────────────────
  const dateStr = new Date(data.achievedAt).toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Singapore',
  })
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(107, 114, 128) // #6B7280
  doc.text(dateStr, centerX, 124, { align: 'center' })

  // ─── Coach name ───────────────────────────────────────────────
  if (data.coachName) {
    doc.text(`Coached by ${data.coachName}`, centerX, 132, { align: 'center' })
  }

  // ─── Footer ───────────────────────────────────────────────────
  doc.setFontSize(10)
  doc.setTextColor(156, 163, 175) // #9CA3AF
  doc.text(data.clubName, 25, pageH - 22, { align: 'left' })
  doc.text('SOSG Running Club Hub', pageW - 25, pageH - 22, { align: 'right' })

  // ─── Save ─────────────────────────────────────────────────────
  const filename = `${slugify(data.athleteName)}-${slugify(data.milestoneLabel)}.pdf`
  const blob = doc.output('blob')
  await sharePdf(blob, filename)
}
