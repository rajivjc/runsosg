# SOSG Running Club Hub

A web application for managing a running club for athletes with special needs. Coaches log runs (manually or via Strava sync), track athlete progress through milestones, record coaching cues, write notes, and celebrate achievements. Caregivers get read-only access to their linked athlete with the ability to send cheers and view milestone celebrations.

## Tech Stack

- **Next.js 14** (App Router)
- **React 18** with TypeScript
- **Supabase** (Auth + Postgres + Row Level Security)
- **Tailwind CSS v4**
- **Recharts** for progress charts
- **Resend** for transactional emails
- **Lucide React** for icons
- **Sharp** for image processing

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
| `STRAVA_STATE_SECRET` | OAuth state signing (optional) |
| `NEXT_PUBLIC_APP_URL` | App base URL for redirects |
| `RESEND_API_KEY` | Email sending via Resend |
| `RESEND_FROM_EMAIL` | Sender address (optional, has default) |
| `CRON_SECRET` | Auth token for cron endpoints |

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
- **Caregiver** - Read-only access to their linked athlete, send cheers

## Key Features

### Core
- **Activity Feed** - Role-specific activity stream with weekly recaps and greeting cards
- **Athlete Management** - Profiles, run history, coaching cues (4-category with version history), and coach notes
- **Strava Integration** - OAuth connect, automatic run sync via webhooks, hashtag-based athlete matching, unmatched activity resolution
- **Milestones** - Automatic milestone evaluation (session count, distance, longest run) with celebration overlays
- **Notifications** - In-app notifications for milestone awards, Strava events, and more

### Engagement
- **Kudos & Cheers** - Coaches give kudos on sessions; caregivers send cheers with read receipts
- **Coach Badges** - Auto-awarded achievements (First Steps, High Five, Double Digits, Cheerleader, etc.)
- **Coaching Streaks** - Weekly coaching streak tracking
- **Structured Goals** - Athletes set distance and session targets with progress tracking

### Sharing & Media
- **Public Sharing** - Milestone and athlete story pages shareable publicly with OG images
- **Caregiver Privacy Controls** - Caregivers can disable public sharing for their linked athlete
- **Photo Gallery** - Session photo uploads with compression, lightbox viewer, and signed URLs
- **Athlete Story Pages** - Journey and career history pages

### Analytics & Communication
- **Progress Charts** - Recharts-based visualizations of athlete progress
- **Coaching Insights** - Feel trend analysis and declining feel alerts
- **Weekly Digest Emails** - Automated weekly summaries via Resend and cron
- **PWA Support** - Installable as a home screen app with service worker and install prompt

## Testing

**Unit tests** (Jest): `npm test`

**E2E tests** (Playwright): `npm run test:e2e` (requires dev server)

**CI**: GitHub Actions runs build, unit tests, and E2E on push/PR.
