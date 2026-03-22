import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ExportSession } from '@/lib/export'
import { sharePdf } from '@/lib/utils/ios-download-fix'

const SGT = 'Asia/Singapore'

export function calculateSummaryStats(sessions: ExportSession[]): {
  totalSessions: number
  totalDistanceKm: number
  averagePace: string
  dateRange: string
} {
  if (sessions.length === 0) {
    return { totalSessions: 0, totalDistanceKm: 0, averagePace: '—', dateRange: '—' }
  }

  const totalSessions = sessions.length
  const totalDistanceKm = Math.round(sessions.reduce((sum, s) => sum + s.distance_km, 0) * 10) / 10
  const totalDurationMin = sessions.reduce((sum, s) => sum + s.duration_min, 0)

  let averagePace = '—'
  if (totalDistanceKm > 0 && totalDurationMin > 0) {
    const paceMin = totalDurationMin / totalDistanceKm
    const mins = Math.floor(paceMin)
    const secs = Math.round((paceMin - mins) * 60)
    averagePace = `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Parse dates from "DD MMM YYYY" format to find range
  const parsedDates = sessions
    .map(s => new Date(s.date))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())

  let dateRange = '—'
  if (parsedDates.length > 0) {
    const fmt = (d: Date) =>
      new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: SGT }).format(d)
    const earliest = fmt(parsedDates[0])
    const latest = fmt(parsedDates[parsedDates.length - 1])
    dateRange = earliest === latest ? earliest : `${earliest} – ${latest}`
  }

  return { totalSessions, totalDistanceKm, averagePace, dateRange }
}

export async function generateProgressReport(data: ExportSession[], athleteName: string): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 18

  const stats = calculateSummaryStats(data)

  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(0, 0, 0)
  doc.text(athleteName, margin, 25)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(14)
  doc.setTextColor(100, 100, 100)
  doc.text('Progress Report', margin, 33)

  // Divider line
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.5)
  doc.line(margin, 37, pageWidth - margin, 37)

  // Summary stats (2x2 grid)
  const statsY = 44
  const colMid = pageWidth / 2
  doc.setFontSize(11)

  // Row 1
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(60, 60, 60)
  doc.text('Total Sessions:', margin, statsY)
  doc.setFont('helvetica', 'normal')
  doc.text(String(stats.totalSessions), margin + 36, statsY)

  doc.setFont('helvetica', 'bold')
  doc.text('Total Distance:', colMid, statsY)
  doc.setFont('helvetica', 'normal')
  doc.text(`${stats.totalDistanceKm} km`, colMid + 36, statsY)

  // Row 2
  const statsY2 = statsY + 7
  doc.setFont('helvetica', 'bold')
  doc.text('Average Pace:', margin, statsY2)
  doc.setFont('helvetica', 'normal')
  doc.text(`${stats.averagePace} min/km`, margin + 36, statsY2)

  doc.setFont('helvetica', 'bold')
  doc.text('Date Range:', colMid, statsY2)
  doc.setFont('helvetica', 'normal')
  doc.text(stats.dateRange, colMid + 36, statsY2)

  // Generate footer date
  const generatedDate = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: SGT,
  }).format(new Date())

  // Session table
  const tableBody = data.map(s => [
    s.date,
    s.distance_km.toFixed(2),
    String(s.duration_min),
    s.pace_min_km || '—',
    s.feel_rating != null ? String(s.feel_rating) : '—',
  ])

  const totalPages = { count: 0 }

  autoTable(doc, {
    startY: statsY2 + 10,
    margin: { left: margin, right: margin, bottom: 25 },
    head: [['Date', 'Distance (km)', 'Duration (min)', 'Pace (min/km)', 'Feel']],
    body: tableBody,
    columnStyles: {
      0: { cellWidth: (pageWidth - 2 * margin) * 0.25 },
      1: { cellWidth: (pageWidth - 2 * margin) * 0.18 },
      2: { cellWidth: (pageWidth - 2 * margin) * 0.18 },
      3: { cellWidth: (pageWidth - 2 * margin) * 0.18 },
      4: { cellWidth: (pageWidth - 2 * margin) * 0.21 },
    },
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [243, 244, 246],
      textColor: [30, 30, 30],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    didDrawPage: () => {
      totalPages.count = doc.getNumberOfPages()
    },
  })

  // Add footers to all pages
  const numPages = doc.getNumberOfPages()
  for (let i = 1; i <= numPages; i++) {
    doc.setPage(i)
    doc.setFontSize(9)
    doc.setTextColor(156, 163, 175)
    doc.setFont('helvetica', 'normal')

    const footerY = pageHeight - 15
    doc.text(`Generated from SOSG Running Club Hub · ${generatedDate}`, margin, footerY)
    doc.text(`Page ${i} of ${numPages}`, pageWidth - margin, footerY, { align: 'right' })
  }

  const filename = athleteName.toLowerCase().replace(/\s+/g, '-') + '-progress-report.pdf'
  const blob = doc.output('blob')
  await sharePdf(blob, filename)
}
