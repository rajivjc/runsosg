# Running Club Hub

A web application for managing a running club for athletes with special needs. Club name, timezone, and locale are all configured dynamically from the database — the app is designed to work for any club, not just one. Coaches log runs (manually or via Strava sync), track athlete progress through milestones, record coaching cues, write notes, and celebrate achievements. Caregivers get read-only access to their linked athlete with the ability to send cheers and view milestone celebrations. Athletes themselves can view their own running journey through a PIN-protected personal page.

> **Why I Built This** — *It started with a moment I almost missed. An athlete finished a 5km run and looked around to see if anyone was watching. We were. I could have built something defined by disability. I built something defined by the sport.*

## Tech Stack

- **Next.js 14** (App Router)
- **React 18** with TypeScript
- **Supabase** (Auth + Postgres + Row Level Security)
- **Tailwind CSS v4**
- **Recharts** for progress charts
- **Resend** for transactional emails
- **Lucide React** for icons
- **Sharp** for image processing
- **bcryptjs** for athlete PIN hashing
- **web-push** for push notifications

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
| `CONTACT_EMAIL` | Privacy page contact email (optional, defaults to `privacy@example.com`) |
| `CRON_SECRET` | Auth token for cron endpoints |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push notification VAPID key (optional) |
| `VAPID_PRIVATE_KEY` | Push notification VAPID private key (optional) |

## Scripts

```bash
npm run dev        # Dev server at localhost:3000
npm run build      # Production build
npm run lint       # ESLint
npm test           # Jest unit tests
npm run test:e2e   # Playwright E2E tests
```

## Authentication & Roles

Magic-link authentication via Supabase OTP. Four access levels:

- **Admin** — Full access, invite users, manage athletes and roles
- **Coach** — Manage sessions, cues, and notes for all athletes
- **Caregiver** — Read-only access to their linked athlete, send cheers
- **Athlete** — PIN-authenticated access to their own running journey page (no Supabase auth needed)

## Dynamic Club Configuration

The app reads all club-specific values from the `clubs` table in the database:

- **Club name** — displayed in the UI, email templates, email sender name, certificates, and metadata
- **Timezone** — used for all date calculations, session boundaries, quiet hours, and display formatting
- **Locale** — used for date/number formatting
- **Strava hashtag prefix** — the club's Strava activity tag (e.g. `#SOSG`, `#SUNBEAM`)
- **Tagline** — shown in email footers and public pages

Server code reads these via `getClub()` (cached with `unstable_cache`). Client components access timezone and locale via the `useClubConfig()` hook from `ClubConfigProvider`. A CI guard test (`timezone-guard.spec.ts`) prevents hardcoded timezone/locale values from being re-introduced.

## Key Features

### Core

- **Activity Feed** — Role-specific activity stream with weekly recaps, coaching insights, and greeting cards
- **Athlete Management** — Profiles, run history, coaching cues (4-category with version history), and coach notes
- **Strava Integration** — OAuth connect, automatic run sync via webhooks, hashtag-based athlete matching, unmatched activity resolution
- **Milestones** — Automatic milestone evaluation (session count, distance, longest run) with sensory-safe celebration overlays
- **Notifications** — In-app notifications and optional push notifications for milestone awards, Strava events, and more
- **Data Export** — CSV export of athlete session history and PDF progress reports for coaches and admins
- **Printable Certificates** — Auto-generated PDF milestone certificates with athlete's avatar, theme color, and club name. Designed to be frameable and dignified
- **Training Programs** — Plan tab on athlete profiles with structured multi-week training goals and progress tracking
- **Narrative Coaching Digest** — In-app and email weekly digest with natural language narrative summarising each athlete's week, highlights, and heads-up alerts

### Athlete Voice

- **My Journey Page** (`/my/[athleteId]`) — PIN-protected athlete-facing page showing stats, milestones, goal progress, recent runs, and cheers from caregivers
- **Avatar Selection** — Athletes choose from 8 preset emoji avatars (runners, shoe, medal, trophy, star, strong). Their choice appears across coach and caregiver views with a "chosen by athlete" indicator
- **Mood Check-in** — Emoji-based daily mood (Sad, Tired, Okay, Happy, Excited). One tap. Mood trends visible to coaches for proactive support
- **Goal Picker** — Athletes choose what they want to work on: run further, run more often, or feel stronger. Visible to coaches
- **Theme Color** — Athletes personalise their page with a color choice (teal, blue, purple, green, amber, coral) that tints their personal page
- **My Best Runs** — Athletes heart their favourite runs, surfaced in a dedicated section on their page
- **Preset Messages** — Athletes send one-tap messages to coaches ("Thank you!", "That was fun!", "I want to run more!", "See you next week!") with persistent sent confirmation
- **QR Code Access** — Coaches print a QR code for each athlete's page, designed to be stuck on a fridge or notebook for easy scanning by the athlete or caregiver
- **Coach PIN Setup** — Coaches set a 4-digit PIN for each athlete with step-by-step guidance and copy-link support
- **Rate-Limited Auth** — 5 PIN attempts per 15-minute window, bcrypt-hashed storage, HttpOnly session cookies

### Engagement

- **Kudos & Cheers** — Coaches give kudos on sessions; caregivers send cheers with read receipts
- **Coach Badges** — Auto-awarded achievements (First Steps, High Five, Double Digits, Cheerleader, etc.) with amber/gold celebration overlays
- **Coaching Streaks** — Weekly coaching streak tracking
- **Structured Goals** — Athletes set distance and session targets with visual progress tracking
- **Cheer Toasts** — Real-time toast notifications when coaches receive new cheers
- **First Run Celebrations** — Warm acknowledgment overlay when a coach logs an athlete's first session
- **Coach Feed Priorities** — "Needs Attention" section surfacing declining-feel alerts, unmatched Strava activities, and unread messages above the main feed

### Sharing & Media

- **Public Sharing** — Milestone and athlete story pages shareable publicly with OG images
- **Caregiver Privacy Controls** — Caregivers can disable public sharing for their linked athlete
- **Photo Gallery** — Session photo uploads with compression, lightbox viewer, and signed URLs
- **Athlete Story Pages** — Journey and career history pages

### Analytics & Communication

- **Progress Charts** — Recharts-based visualizations of athlete progress
- **Coaching Insights** — Feel trend analysis, declining feel alerts, personal bests, and best-week-ever detection
- **Weekly Digest Emails** — Automated weekly summaries via Resend and cron
- **Push Notifications** — Optional web push via VAPID/web-push with quiet hours support
- **Dark Mode** — Full dark mode with system/light/dark toggle, warm palette (not cold blue-gray), all WCAG AAA contrast ratios maintained
- **PWA Support** — Installable as a home screen app with service worker and install prompt

## Inclusive Design

All athlete-facing, caregiver-facing, and public pages follow research-backed inclusive design principles. See [CLAUDE.md](./CLAUDE.md#inclusive-design-principles) for the full guidelines. Key highlights:

- **WCAG 2.2 AAA targets** — 7:1 contrast, 56px+ touch targets, semantic HTML, `aria-live` feedback
- **Literal language only** — No idioms, metaphors, or sarcasm. Grade 9 reading level
- **Sensory safety** — No seizure-risk colors in animations, calm default celebrations, `prefers-reduced-motion` respected with static fallbacks that still celebrate the achievement
- **Icons paired with text** on all navigation (supports non-readers and low-literacy users)
- **Visual alternatives for numbers** — Progress bars alongside numeric values
- **Privacy by design** — Athlete pages never expose medical info, coach notes, cues, or feel ratings
- **Avatar selection** — 8 carefully chosen options within cognitive accessibility limits. No fire emoji (literal language principle), no animals (adult running app), no disability-specific symbols (defined by sport, not disability). See CLAUDE.md for full rationale
- **Athlete autonomy** — Athletes choose their own avatar, color theme, goals, and favourite runs. Small choices matter when many choices are made for you

Sources: WCAG 2.2, W3C COGA, Special Olympics design research, sensory-friendly design for autistic users.

## Testing

**Unit tests** (Jest): `npm test` — 70+ suites covering server actions, business logic, accessibility audits, celebration safety, timezone guard rails, dark mode, plan tab, certificates, and narrative digest

**E2E tests** (Playwright): `npm run test:e2e` (requires dev server)

**CI**: GitHub Actions runs build, unit tests, and E2E on push/PR.

## Database

20+ tables with Row Level Security enabled on all. Migrations live in `supabase/migrations/` ordered by timestamp. Types are manually maintained in `src/lib/supabase/types.ts`.

Key tables: `users`, `athletes`, `sessions`, `cues`, `coach_notes`, `milestones`, `milestone_definitions`, `strava_connections`, `strava_sync_log`, `strava_unmatched`, `notifications`, `invitations`, `media`, `kudos`, `cheers`, `coach_badges`, `goals`, `clubs`, `athlete_messages`, `push_subscriptions`, `athlete_moods`, `athlete_favorites`, `training_plans`, `audit_log`
