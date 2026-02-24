/**
 * Unit tests for Strava client functions.
 *
 * Tests getStravaAuthUrl with desktop and mobile parameters.
 */

// Save original env
const originalEnv = { ...process.env }

beforeEach(() => {
  jest.clearAllMocks()
  process.env.STRAVA_CLIENT_ID = 'test-client-id'
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
  delete process.env.CODESPACE_NAME
})

afterEach(() => {
  process.env = { ...originalEnv }
})

import { getStravaAuthUrl } from '@/lib/strava/client'

describe('getStravaAuthUrl', () => {
  it('returns desktop OAuth URL by default', () => {
    const url = getStravaAuthUrl()
    expect(url).toContain('https://www.strava.com/oauth/authorize?')
    expect(url).not.toContain('/mobile/')
    expect(url).toContain('client_id=test-client-id')
    expect(url).toContain('redirect_uri=')
    expect(url).toContain('response_type=code')
    expect(url).toContain('scope=activity%3Aread_all')
  })

  it('returns desktop OAuth URL when mobile=false', () => {
    const url = getStravaAuthUrl(false)
    expect(url).toContain('https://www.strava.com/oauth/authorize?')
    expect(url).not.toContain('/mobile/')
  })

  it('returns mobile OAuth URL when mobile=true', () => {
    const url = getStravaAuthUrl(true)
    expect(url).toContain('https://www.strava.com/oauth/mobile/authorize?')
    expect(url).toContain('client_id=test-client-id')
    expect(url).toContain('response_type=code')
    expect(url).toContain('scope=activity%3Aread_all')
  })

  it('uses NEXT_PUBLIC_APP_URL for redirect_uri', () => {
    const url = getStravaAuthUrl()
    expect(url).toContain(
      'redirect_uri=' + encodeURIComponent('https://app.example.com/api/strava/callback')
    )
  })

  it('uses CODESPACE_NAME for redirect_uri when in codespace', () => {
    process.env.CODESPACE_NAME = 'my-codespace'
    const url = getStravaAuthUrl()
    expect(url).toContain(
      'redirect_uri=' + encodeURIComponent('https://my-codespace-3000.app.github.dev/api/strava/callback')
    )
  })

  it('mobile URL also uses correct redirect_uri', () => {
    const url = getStravaAuthUrl(true)
    expect(url).toContain(
      'redirect_uri=' + encodeURIComponent('https://app.example.com/api/strava/callback')
    )
  })
})
