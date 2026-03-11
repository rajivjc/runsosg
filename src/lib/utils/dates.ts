const SGT = 'Asia/Singapore'

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: SGT,
  }).format(d)
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: SGT,
  }).format(d)
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
 * Extract a YYYY-MM-DD string from a date value that may be either
 * a plain date string or a full ISO timestamp (from timestamptz columns).
 * Uses Asia/Singapore timezone for consistent date extraction.
 */
export function toDateOnly(value: string | null | undefined): string {
  if (!value) return ''
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return value.trim()
  // Full ISO timestamp — extract date in SGT
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  // Format as YYYY-MM-DD in Singapore timezone
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: SGT,
  }).format(d)
  return parts
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
