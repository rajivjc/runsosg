/**
 * Unit tests for Strava client functions.
 *
 * Tests getStravaAuthUrl (always web endpoint) and
 * createStravaState / verifyStravaState round-trip.
 */

// Save original env
const originalEnv = { ...process.env }

beforeEach(() => {
  jest.clearAllMocks()
  process.env.STRAVA_CLIENT_ID = 'test-client-id'
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-secret-key'
  delete process.env.CODESPACE_NAME
})

afterEach(() => {
  process.env = { ...originalEnv }
})

import { getStravaAuthUrl, createStravaState, verifyStravaState } from '@/lib/strava/client'

const TEST_USER_ID = 'user-abc-123'

describe('getStravaAuthUrl', () => {
  it('always returns web OAuth URL (never mobile endpoint)', () => {
    const url = getStravaAuthUrl(TEST_USER_ID)
    expect(url).toContain('https://www.strava.com/oauth/authorize?')
    expect(url).not.toContain('/mobile/')
    expect(url).toContain('client_id=test-client-id')
    expect(url).toContain('redirect_uri=')
    expect(url).toContain('response_type=code')
    expect(url).toContain('scope=activity%3Aread')
    expect(url).toContain('state=')
  })

  it('uses NEXT_PUBLIC_APP_URL for redirect_uri', () => {
    const url = getStravaAuthUrl(TEST_USER_ID)
    expect(url).toContain(
      'redirect_uri=' + encodeURIComponent('https://app.example.com/api/strava/callback')
    )
  })

  it('uses CODESPACE_NAME for redirect_uri when in codespace', () => {
    process.env.CODESPACE_NAME = 'my-codespace'
    const url = getStravaAuthUrl(TEST_USER_ID)
    expect(url).toContain(
      'redirect_uri=' + encodeURIComponent('https://my-codespace-3000.app.github.dev/api/strava/callback')
    )
  })

  it('includes a signed state parameter', () => {
    const url = getStravaAuthUrl(TEST_USER_ID)
    const parsed = new URL(url)
    const state = parsed.searchParams.get('state')
    expect(state).toBeTruthy()
    // State should be verifiable
    expect(verifyStravaState(state!)).toBe(TEST_USER_ID)
  })
})

describe('createStravaState / verifyStravaState', () => {
  it('round-trips successfully', () => {
    const state = createStravaState(TEST_USER_ID)
    expect(typeof state).toBe('string')
    expect(state.length).toBeGreaterThan(0)

    const result = verifyStravaState(state)
    expect(result).toBe(TEST_USER_ID)
  })

  it('returns null for tampered state', () => {
    const state = createStravaState(TEST_USER_ID)
    const tampered = state.slice(0, -2) + 'xx'
    expect(verifyStravaState(tampered)).toBeNull()
  })

  it('returns null for garbage input', () => {
    expect(verifyStravaState('not-valid')).toBeNull()
    expect(verifyStravaState('')).toBeNull()
  })
})
