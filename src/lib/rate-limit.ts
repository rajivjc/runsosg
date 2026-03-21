/**
 * In-memory sliding window rate limiter for Vercel serverless.
 *
 * LIMITATION: Each Vercel serverless instance has its own memory space.
 * This rate limiter only enforces limits within a single warm instance.
 * It will NOT prevent distributed abuse across multiple cold starts.
 * For a beta app with low traffic, this catches the most common abuse
 * patterns (automated scripts hitting a warm instance repeatedly).
 *
 * FUTURE: Replace with Upstash Redis (@upstash/ratelimit) for distributed
 * rate limiting across all serverless instances.
 */

type RateLimitResult = {
  success: boolean
  remaining: number
  resetInSeconds: number
}

const store = new Map<string, number[]>()
let callCount = 0
const MAX_KEYS = 10_000

/**
 * Check if a request is within the rate limit.
 *
 * @param key - Unique identifier (e.g. IP address, email, user ID)
 * @param limit - Maximum number of requests allowed in the window
 * @param windowSeconds - Time window in seconds
 * @returns { success, remaining, resetInSeconds }
 *
 * @example
 * const result = checkRateLimit(`login:${email}`, 5, 60)
 * if (!result.success) {
 *   return new Response('Too many requests', { status: 429 })
 * }
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now()
  const windowMs = windowSeconds * 1000

  // Get or create timestamps array for this key
  const timestamps = store.get(key) ?? []

  // Filter out expired timestamps
  const valid = timestamps.filter((t) => now - t < windowMs)

  // Periodic global sweep every 1000 calls
  callCount++
  if (callCount >= 1000) {
    callCount = 0
    for (const [k, v] of store) {
      const active = v.filter((t) => now - t < windowMs)
      if (active.length === 0) {
        store.delete(k)
      } else {
        store.set(k, active)
      }
    }
  }

  // Cap at MAX_KEYS — clear oldest half if exceeded
  if (store.size >= MAX_KEYS) {
    const entries = Array.from(store.entries())
    // Sort by oldest most-recent timestamp (least recently active first)
    entries.sort((a, b) => {
      const aMax = a[1].length > 0 ? a[1][a[1].length - 1] : 0
      const bMax = b[1].length > 0 ? b[1][b[1].length - 1] : 0
      return aMax - bMax
    })
    const toRemove = Math.floor(entries.length / 2)
    for (let i = 0; i < toRemove; i++) {
      store.delete(entries[i][0])
    }
  }

  if (valid.length >= limit) {
    // Calculate when the oldest valid timestamp expires
    const oldestValid = valid[0]
    const resetInSeconds = Math.ceil((oldestValid + windowMs - now) / 1000)
    store.set(key, valid)
    return { success: false, remaining: 0, resetInSeconds }
  }

  valid.push(now)
  store.set(key, valid)

  const remaining = limit - valid.length
  const resetInSeconds = Math.ceil(windowSeconds)

  return { success: true, remaining, resetInSeconds }
}

/**
 * Extract client IP from a Next.js request.
 * Vercel sets x-forwarded-for; falls back to x-real-ip, then 'unknown'.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

// Exported for testing only
export function _resetStore(): void {
  store.clear()
  callCount = 0
}
