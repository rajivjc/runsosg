import type { ExportSession } from '@/lib/export'

const HEADER = 'Date,Distance (km),Duration (min),Pace (min/km),Feel Rating,Coach Notes,Source'

function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function formatSessionsAsCSV(sessions: ExportSession[]): string {
  const BOM = '\uFEFF'
  const rows = sessions.map(s => {
    return [
      s.date,
      s.distance_km.toFixed(2),
      String(s.duration_min),
      s.pace_min_km,
      s.feel_rating != null ? String(s.feel_rating) : '',
      escapeCSVField(s.coach_notes),
      s.source,
    ].join(',')
  })

  return BOM + [HEADER, ...rows].join('\n')
}

