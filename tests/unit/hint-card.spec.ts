/**
 * Unit tests for hint card system.
 *
 * Tests that:
 * 1. All hint card storage keys follow the naming convention (kita_hint_* or kita_context_*)
 * 2. No two hint cards share the same storage key
 * 3. Storage keys are valid localStorage keys
 */
import { HINT_KEYS } from '@/lib/hint-keys'

const allKeys = Object.values(HINT_KEYS)

describe('hint card storage keys', () => {
  it('all keys follow the kita_ prefix convention', () => {
    for (const key of allKeys) {
      expect(key).toMatch(/^kita_(hint_|context_)/)
    }
  })

  it('no duplicate storage keys exist', () => {
    const unique = new Set(allKeys)
    expect(unique.size).toBe(allKeys.length)
  })

  it('storage keys are valid localStorage keys (no spaces, reasonable length)', () => {
    for (const key of allKeys) {
      expect(key).toMatch(/^[a-z0-9_]+$/)
      expect(key.length).toBeLessThan(50)
    }
  })

  it('exports the expected number of keys', () => {
    // 1 context card + 5 hint cards = 6 total
    expect(allKeys.length).toBe(6)
  })
})
