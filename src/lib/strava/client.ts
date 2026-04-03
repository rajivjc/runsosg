import crypto from 'crypto'

// Strava API types

export interface StravaTokenResponse {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete: {
    id: number
    firstname: string
    lastname: string
  }
}

export interface StravaActivity {
  id: number
  name: string
  sport_type: string
  start_date: string
  distance: number
  moving_time: number
  description: string | null
  map: {
    summary_polyline: string | null
  }
  average_heartrate?: number
  max_heartrate?: number
  total_photo_count?: number
  photos?: {
    count: number
    primary?: {
      urls?: Record<string, string>
    }
  }
}

// ─── OAuth state (signed user ID so callback works without browser cookies) ───

const STATE_SECRET = process.env.STRAVA_STATE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const STATE_MAX_AGE_SECONDS = 600 // 10 minutes

export function createStravaState(userId: string): string {
  const ts = Math.floor(Date.now() / 1000)
  const payload = `${userId}.${ts}`
  const sig = crypto
    .createHmac('sha256', STATE_SECRET)
    .update(payload)
    .digest('hex')
    .slice(0, 16)
  return Buffer.from(`${payload}.${sig}`).toString('base64url')
}

export function verifyStravaState(state: string): string | null {
  try {
    const decoded = Buffer.from(state, 'base64url').toString()
    const parts = decoded.split('.')
    if (parts.length !== 3) return null
    const [userId, tsStr, sig] = parts
    const ts = parseInt(tsStr, 10)
    if (!Number.isFinite(ts)) return null

    // Check not expired
    if (Math.floor(Date.now() / 1000) - ts > STATE_MAX_AGE_SECONDS) return null

    // Verify HMAC
    const payload = `${userId}.${tsStr}`
    const expected = crypto
      .createHmac('sha256', STATE_SECRET)
      .update(payload)
      .digest('hex')
      .slice(0, 16)
    if (sig !== expected) return null

    return userId
  } catch {
    return null
  }
}

// ─── Auth URL ──────────────────────────────────────────────────────────────────

export function getStravaAuthUrl(userId: string): string {
  const clientId = process.env.STRAVA_CLIENT_ID
  const codespaceName = process.env.CODESPACE_NAME

  const redirectUri = codespaceName
    ? `https://${codespaceName}-3000.app.github.dev/api/strava/callback`
    : `${process.env.NEXT_PUBLIC_APP_URL}/api/strava/callback`

  const params = new URLSearchParams({
    client_id: clientId ?? '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'activity:read_all',
    state: createStravaState(userId),
  })

  // Always use the web OAuth endpoint. The mobile endpoint opens the Strava
  // native app which then redirects the callback to a NEW browser context —
  // breaking both mobile browser and PWA flows. The connect route handles
  // mobile separately by using a JS redirect (prevents Strava app interception).
  return `https://www.strava.com/oauth/authorize?${params.toString()}`
}

// ─── Token exchange ────────────────────────────────────────────────────────────

export async function exchangeCodeForTokens(
  code: string
): Promise<StravaTokenResponse> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) {
    throw new Error(`Strava token exchange failed: ${res.status}`)
  }

  return res.json() as Promise<StravaTokenResponse>
}

// ─── Token refresh ─────────────────────────────────────────────────────────────

export async function refreshAccessToken(
  refreshToken: string
): Promise<StravaTokenResponse> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    throw new Error(`Strava token refresh failed: ${res.status}`)
  }

  return res.json() as Promise<StravaTokenResponse>
}

// ─── Get single activity ───────────────────────────────────────────────────────

export async function getActivity(
  activityId: number,
  accessToken: string
): Promise<StravaActivity> {
  // Re-parse to a fresh integer to break any taint chain from external input
  const safeId = parseInt(String(activityId), 10)
  if (!Number.isFinite(safeId) || safeId <= 0) {
    throw new Error(`Invalid Strava activity ID: ${activityId}`)
  }

  const url = new URL(
    `/api/v3/activities/${safeId}`,
    'https://www.strava.com'
  )

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    throw new Error(`Strava getActivity failed: ${res.status}`)
  }

  return res.json() as Promise<StravaActivity>
}

// ─── Get athlete activities ────────────────────────────────────────────────────

export async function getAthleteActivities(
  accessToken: string,
  after: number
): Promise<StravaActivity[]> {
  const params = new URLSearchParams({
    after: String(after),
    per_page: '100',
  })

  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  if (!res.ok) {
    throw new Error(`Strava getAthleteActivities failed: ${res.status}`)
  }

  return res.json() as Promise<StravaActivity[]>
}

