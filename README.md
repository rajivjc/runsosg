# SOSG Running Club Hub

A web application for managing a running club for athletes with special needs. Coaches log runs (manually or via Strava sync), track athlete progress through milestones, record coaching cues, and write notes. Caregivers get read-only access to their linked athlete.

## Tech Stack

- **Next.js 14** (App Router)
- **React 18** with TypeScript
- **Supabase** (Auth + Postgres + Row Level Security)
- **Tailwind CSS v4**

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The root route redirects to `/feed`.

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key (server-only) |
| `STRAVA_CLIENT_ID` | Strava API client ID |
| `STRAVA_CLIENT_SECRET` | Strava API secret |
| `STRAVA_WEBHOOK_VERIFY_TOKEN` | Webhook verification |
| `NEXT_PUBLIC_APP_URL` | App base URL for redirects |

## Scripts

```bash
npm run dev        # Dev server at localhost:3000
npm run build      # Production build
npm run lint       # ESLint
npm test           # Jest unit tests
npm run test:e2e   # Playwright E2E tests
```

## Authentication & Roles

Magic-link authentication via Supabase OTP. Three roles:

- **Admin** - Full access, invite users, manage athletes and roles
- **Coach** - Manage sessions, cues, and notes for all athletes
- **Caregiver** - Read-only access to their linked athlete

## Key Features

- **Activity Feed** - Club-wide activity stream
- **Athlete Management** - Profile, run history, coaching cues, notes
- **Strava Integration** - OAuth connect, automatic run sync via webhooks, hashtag-based athlete matching
- **Milestones** - Automatic milestone evaluation (session count, distance, longest run)
- **Notifications** - In-app notifications for coaches

## Testing

**Unit tests** (Jest): `npm test`

**E2E tests** (Playwright): `npm run test:e2e` (requires dev server)

**CI**: GitHub Actions runs build, unit tests, and E2E on push/PR.
