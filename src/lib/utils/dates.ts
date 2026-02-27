const SGT = 'Asia/Singapore'

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: SGT,
  }).format(new Date(dateStr))
}

export function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: SGT,
  }).format(new Date(dateStr))
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function formatDistance(metres: number): string {
  if (metres >= 1000) return `${(metres / 1000).toFixed(2)} km`
  return `${metres}m`
}

/**
 * Validate that a string is a valid YYYY-MM-DD date.
 * Returns the validated date string or null if invalid.
 */
export function parseValidDate(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null
  const d = new Date(trimmed + 'T12:00:00+08:00')
  if (isNaN(d.getTime())) return null
  return trimmed
}
