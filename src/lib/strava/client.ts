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
}

// ─── Auth URL ──────────────────────────────────────────────────────────────────

export function getStravaAuthUrl(): string {
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
  })

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
  const res = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

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
