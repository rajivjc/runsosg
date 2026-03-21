import { checkRateLimit, getClientIp, _resetStore } from '@/lib/rate-limit'

function mockRequest(headers: Record<string, string>): Request {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  } as unknown as Request
}

beforeEach(() => {
  _resetStore()
})

describe('checkRateLimit', () => {
  test('allows requests within the limit', () => {
    const r1 = checkRateLimit('allows-within-limit-key', 3, 60)
    const r2 = checkRateLimit('allows-within-limit-key', 3, 60)
    const r3 = checkRateLimit('allows-within-limit-key', 3, 60)

    expect(r1.success).toBe(true)
    expect(r2.success).toBe(true)
    expect(r3.success).toBe(true)
    expect(r1.remaining).toBe(2)
    expect(r2.remaining).toBe(1)
    expect(r3.remaining).toBe(0)
  })

  test('rejects requests exceeding the limit', () => {
    const r1 = checkRateLimit('exceeds-limit-key', 3, 60)
    const r2 = checkRateLimit('exceeds-limit-key', 3, 60)
    const r3 = checkRateLimit('exceeds-limit-key', 3, 60)
    const r4 = checkRateLimit('exceeds-limit-key', 3, 60)

    expect(r1.success).toBe(true)
    expect(r2.success).toBe(true)
    expect(r3.success).toBe(true)
    expect(r4.success).toBe(false)
    expect(r4.remaining).toBe(0)
  })

  test('resets after the window expires', () => {
    jest.useFakeTimers()
    try {
      const r1 = checkRateLimit('resets-window-key', 2, 1)
      const r2 = checkRateLimit('resets-window-key', 2, 1)
      expect(r1.success).toBe(true)
      expect(r2.success).toBe(true)

      const r3 = checkRateLimit('resets-window-key', 2, 1)
      expect(r3.success).toBe(false)

      jest.advanceTimersByTime(1100)

      const r4 = checkRateLimit('resets-window-key', 2, 1)
      expect(r4.success).toBe(true)
    } finally {
      jest.useRealTimers()
    }
  })

  test('tracks different keys independently', () => {
    checkRateLimit('key-a', 2, 60)
    checkRateLimit('key-a', 2, 60)
    const rA = checkRateLimit('key-a', 2, 60)
    expect(rA.success).toBe(false)

    const rB = checkRateLimit('key-b', 2, 60)
    expect(rB.success).toBe(true)
  })

  test('remaining count decreases correctly', () => {
    const results = Array.from({ length: 5 }, () =>
      checkRateLimit('remaining-key', 5, 60)
    )
    expect(results.map((r) => r.remaining)).toEqual([4, 3, 2, 1, 0])
  })

  test('resetInSeconds is a positive number when rate limited', () => {
    checkRateLimit('reset-seconds-key', 2, 60)
    checkRateLimit('reset-seconds-key', 2, 60)
    const r = checkRateLimit('reset-seconds-key', 2, 60)

    expect(r.success).toBe(false)
    expect(r.resetInSeconds).toBeGreaterThan(0)
    expect(r.resetInSeconds).toBeLessThanOrEqual(60)
  })

  test('prunes expired timestamps', () => {
    jest.useFakeTimers()
    try {
      checkRateLimit('prune-key', 2, 1)
      checkRateLimit('prune-key', 2, 1)

      jest.advanceTimersByTime(2000)

      // Expired entries should be pruned, so this should succeed
      const r1 = checkRateLimit('prune-key', 2, 1)
      expect(r1.success).toBe(true)

      checkRateLimit('prune-key', 2, 1)
      const r3 = checkRateLimit('prune-key', 2, 1)
      expect(r3.success).toBe(false)
    } finally {
      jest.useRealTimers()
    }
  })
})

describe('getClientIp', () => {
  test('extracts IP from x-forwarded-for header', () => {
    const req = mockRequest({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })
    expect(getClientIp(req)).toBe('1.2.3.4')
  })

  test('extracts IP from x-real-ip header', () => {
    const req = mockRequest({ 'x-real-ip': '9.10.11.12' })
    expect(getClientIp(req)).toBe('9.10.11.12')
  })

  test('falls back to unknown when no headers present', () => {
    const req = mockRequest({})
    expect(getClientIp(req)).toBe('unknown')
  })

  test('handles single IP in x-forwarded-for', () => {
    const req = mockRequest({ 'x-forwarded-for': '1.2.3.4' })
    expect(getClientIp(req)).toBe('1.2.3.4')
  })
})
