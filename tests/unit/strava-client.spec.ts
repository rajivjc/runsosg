/**
 * Unit tests for Strava client functions.
 *
 * Tests getStravaAuthUrl with desktop and PWA parameters,
 * and createStravaState / verifyStravaState round-trip.
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
  it('returns desktop OAuth URL by default', () => {
    const url = getStravaAuthUrl(TEST_USER_ID)
    expect(url).toContain('https://www.strava.com/oauth/authorize?')
    expect(url).not.toContain('/mobile/')
    expect(url).toContain('client_id=test-client-id')
    expect(url).toContain('redirect_uri=')
    expect(url).toContain('response_type=code')
    expect(url).toContain('scope=activity%3Aread_all')
    expect(url).toContain('state=')
  })

  it('returns desktop OAuth URL when pwa=false', () => {
    const url = getStravaAuthUrl(TEST_USER_ID, false)
    expect(url).toContain('https://www.strava.com/oauth/authorize?')
    expect(url).not.toContain('/mobile/')
  })

  it('returns mobile OAuth URL when pwa=true', () => {
    const url = getStravaAuthUrl(TEST_USER_ID, true)
    expect(url).toContain('https://www.strava.com/oauth/mobile/authorize?')
    expect(url).toContain('client_id=test-client-id')
    expect(url).toContain('response_type=code')
    expect(url).toContain('scope=activity%3Aread_all')
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

  it('PWA URL also uses correct redirect_uri', () => {
    const url = getStravaAuthUrl(TEST_USER_ID, true)
    expect(url).toContain(
      'redirect_uri=' + encodeURIComponent('https://app.example.com/api/strava/callback')
    )
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
