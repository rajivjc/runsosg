# CLAUDE.md

## Project Overview

SOSG Running Club Hub — a Next.js 14 web application for managing a running club for athletes with special needs. Coaches log runs (manually or via Strava sync), track athlete progress through milestones, record coaching cues, write notes, and celebrate achievements. Caregivers get read-only access to their linked athlete with cheering and milestone sharing.

**Tech stack:** Next.js 14 (App Router) · React 18 · TypeScript · Supabase (auth + Postgres + RLS) · Tailwind CSS v4 · Recharts · Resend · Lucide React · Sharp

## Quick Reference

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint via next lint
npm test             # Jest unit tests (--runInBand)
npm run test:e2e     # Playwright E2E tests (requires dev server)
```

## Architecture & Key Patterns

### Authentication & Authorization

- **Magic-link auth** via Supabase OTP — no passwords
- **Three roles:** `admin` (full access), `coach` (manage sessions/cues/notes), `caregiver` (read-only, linked athlete only)
- **Middleware** (`src/middleware.ts`) enforces auth and checks `users.active` flag
- **Role checks** happen in Server Actions and page components, not middleware
- **Invitation flow:** Admin invites → Supabase `inviteUserByEmail` → `handle_new_user()` trigger assigns role
- **Public routes:** `/milestone/*`, `/story/*`, `/login`, `/auth/callback`, `/setup` are excluded from auth

### Supabase Clients

- **Server client** (`lib/supabase/server.ts`): Cookie-based, respects RLS. Used for auth verification via `getUser()`.
- **Browser client** (`lib/supabase/client.ts`): Client-side, used only in login form.
- **Admin client** (`lib/supabase/admin.ts`): Service-role key, bypasses RLS. **Server-only.** Used for most data fetching.

### Data Flow

1. Server Components fetch data using `adminClient`
2. Data passed as props to Client Components
3. Mutations go through Server Actions (`'use server'`)
4. After mutations, `revalidatePath()` refreshes data; clients call `router.refresh()`

### Strava Integration

Pipeline: OAuth connect → webhook receives activity events → `processStravaActivity()` in `lib/strava/sync.ts` matches to athlete (via `#sosg <name>` hashtag or schedule proximity) → creates session → awards milestones → syncs badges → notifies. Token refresh is automatic with expiry notifications. Unmatched activities are stored in `strava_unmatched` for manual resolution.

### Milestones

Defined in `milestone_definitions` table with JSON conditions (`{ metric, threshold }`). Evaluated via `checkAndAwardMilestones()` after each session. Metrics: `session_count`, `distance_km`, `longest_run`. Milestone pages are publicly shareable with OG image generation via `@vercel/og`.

### Badges & Streaks

- **Coach badges** (`lib/badges.ts`): Auto-awarded achievements (First Steps, High Five, Double Digits, Cheerleader, etc.) evaluated after sessions and interactions
- **Coaching streaks** (`lib/streaks.ts`): Weekly coaching streak tracking (Mon–Sun, UTC)

### Goals

Structured goal progress tracking (`lib/goals.ts`). Athletes set targets for `distance_total`, `distance_single`, or `session_count` with progress computed from session data.

### Cheers & Kudos

- **Kudos**: Coaches give kudos on sessions (stored in `kudos` table)
- **Cheers**: Caregivers send encouragement messages to coaches (stored in `cheers` table) with `viewed_at` read receipts

### Media

- **Upload** (`lib/media-client.ts`): Client-side image compression via `browser-image-compression`, uploaded to Supabase Storage
- **Retrieval** (`lib/media.ts`): Server-side signed URL generation with expiry
- Photos displayed in a lightbox viewer on athlete profile pages

### Email

- **Provider** (`lib/email/resend.ts`): Resend integration, requires `RESEND_API_KEY`
- **Templates** (`lib/email/templates.ts`): HTML email templates for notifications
- **Weekly digest** (`lib/email/weekly-digest.ts`): Automated weekly summary emails via `/api/cron/weekly-digest` endpoint (protected by `CRON_SECRET`)

### Public Sharing

- Milestone (`/milestone/[id]`) and story (`/story/[id]`) pages are publicly accessible
- OG images generated server-side for social media previews
- Privacy controlled by `allow_public_sharing` flag on athletes table
- Caregivers can override with `sharing_disabled_by_caregiver` to lock out public sharing

### Feed System

Role-specific feeds with separate data loaders:
- **Coach feed** (`lib/feed/coach-data.ts`): All athletes, sessions, milestones, badges, streaks, onboarding state
- **Caregiver feed** (`lib/feed/caregiver-data.ts`): Linked athlete only, cheer history, goal progress
- **Weekly recap** (`lib/feed/weekly-recap.ts`): Aggregated weekly summary generation
- **Shared queries** (`lib/feed/shared-queries.ts`): Common feed data queries
- **Coaching insights** (`lib/analytics/coaching-insights.ts`): Feel trend analysis, declining alerts
- **Session trends** (`lib/analytics/session-trends.ts`): Session volume analytics

### Styling

- **Tailwind CSS v4** with design tokens in `src/styles/tokens.css`
- **44px minimum touch targets** for accessibility
- **`prefers-reduced-motion`** respected

### Database

- **20+ tables** with RLS enabled on all. Key tables: `users`, `athletes`, `sessions`, `cues`, `coach_notes`, `milestones`, `milestone_definitions`, `strava_connections`, `strava_sync_log`, `strava_unmatched`, `notifications`, `invitations`, `media`, `kudos`, `cheers`, `coach_badges`, `goals`, `club_settings`
- **Triggers:** `handle_new_user()`, `update_cues_version()`
- Migrations in `supabase/migrations/` ordered by timestamp
- Types manually maintained in `src/lib/supabase/types.ts`

## Conventions

### Naming

- Files: `kebab-case` for routes, `PascalCase` for components
- Server Actions: verb-first (`createManualSession`, `updateAthlete`, `saveCues`)
- Types: `PascalCase` (`AthleteData`, `SessionData`, `CuesData`)

### Important Constraints

- **Never import `adminClient` in client components** — it uses the service role key
- **Always verify auth** (`getUser()`) at the start of every Server Action
- **Always verify role** for admin-only operations
- **Date formatting** uses `Asia/Singapore` timezone throughout
- **The root route `/`** redirects to `/feed`
- **`revalidatePath()`** must be called after mutations
- **Server Actions** follow the pattern `(prevState, formData) → Promise<{ error?, success? }>`
- **`RESEND_API_KEY`** must be set for email features to work (gracefully skipped if missing)
- **Public routes** (`/milestone/*`, `/story/*`, `/my/*`) are excluded from auth middleware

### Athlete Access ("My Journey")

- **Route:** `/my/[athleteId]` — PIN-authenticated, no Supabase auth required
- **PIN auth:** 4-digit bcrypt-hashed PIN, rate limited (5 attempts / 15-minute lockout)
- **Cookie:** `athlete_session_[id]` with 24h expiry, HttpOnly, Secure, SameSite=Strict
- **Messages:** Athletes send preset one-tap messages to coaches (stored in `athlete_messages` table)
- **Data shown:** Stats, milestones, goal progress, recent runs, cheers — never notes, cues, or medical info

## Inclusive Design Principles

These principles are **mandatory** for all athlete-facing, caregiver-facing, and public pages. They are informed by WCAG 2.2 AAA, W3C COGA (Cognitive Accessibility), Special Olympics design research, and sensory safety guidelines for people with intellectual and developmental disabilities (IDD), autism, and Down syndrome.

### Language

- **Person-first:** "athlete with an intellectual disability" (per Special Olympics guidelines)
- **Never use:** "kids," "special athletes," "suffering from," "brave," "inspiring" for routine activities
- **Literal language only** — no idioms ("you're on fire!"), no metaphors, no sarcasm. People who take language literally will be confused or frightened
- **Celebrate like any running app:** "Great run today!" not "So proud of you!" — the test is: "Would I say this to a neurotypical adult runner?"
- **Reading level:** Grade 9 max. Short sentences, one idea per sentence, active voice
- **No streak-breaking guilt:** "Great week!" not "Don't lose your streak!"

### Accessibility (WCAG 2.2 AAA Targets)

- **Contrast:** 7:1 ratio for body text on athlete-facing pages (4.5:1 AA minimum elsewhere)
- **Touch targets:** 56px+ on athlete-facing pages, 44px minimum elsewhere. 30px+ spacing between interactive elements
- **Typography:** 16px minimum body text, 1.5x line height, left-aligned only. Never justified text
- **Navigation:** Icons paired with text labels on all interactive elements (icons alone fail for non-readers; text alone fails for low-literacy users). Max 5 primary options per screen
- **Numbers:** Always show a visual alternative alongside numbers (progress bar next to "8.5 km"). Not everyone can interpret numerical data
- **Semantic HTML:** Use `<main>`, `<section>`, `<nav>` before reaching for ARIA. Use `aria-live="polite"` for all action feedback
- **Font choice:** Sans-serif only (system-ui, Arial, Verdana). No italics. Slightly increased letter-spacing (0.12em) aids readability

### Sensory Safety

- **Celebrations default to calm:** Static badge + warm color glow as default. Animation layered on only when `prefers-reduced-motion` is NOT set
- **No seizure-risk colors:** Never use saturated red (#EF4444 or similar) in animated/flashing elements. Use soft coral (#FB923C) instead. Never exceed 3 flashes per second
- **Reduced-motion fallback:** When `prefers-reduced-motion` is active, show a **static celebration** (badge + text + gentle background color). Never just hide feedback — that robs the user of their moment
- **No auto-playing media:** All sounds off by default, opt-in only. No auto-playing video
- **Color palette:** Limit to 3 primary colors (teal, warm amber, soft white/gray). Muted tones. Avoid neon, high-saturation, or clashing colors
- **Animation limits:** Transitions under 300ms. Opacity-only is safest for vestibular sensitivity. No parallax, no scroll-jacking

### Dignity & Autonomy

- **Athletes see what caregivers see:** Athletes should have access to at least everything their caregiver can see about them
- **Self-comparison only:** "Your longest run yet!" — never rankings or comparisons to other athletes
- **Celebrate effort and participation:** "You showed up today!" is valid. Outcomes are not the only thing worth celebrating
- **No infantilizing design:** Sophisticated and elegant, simultaneously accessible. The test: "Would I show this to a neurotypical adult runner the same way?"
- **No inspiration porn:** Celebrate the achievement, not the disability. Running 2km is an achievement because running 2km is hard, not because the runner has a disability

### Privacy

- **Public pages never expose:** Disability type, diagnosis, medical info, coach notes, cues, feel ratings, or emergency contacts
- **Photo sharing** requires athlete consent (or caregiver consent if athlete lacks capacity)
- **Data minimization:** The athlete page shows only celebration-worthy data. Sensitive coaching information stays in authenticated coach views

### Celebration Design

| Do | Don't |
|---|---|
| Gentle scale-up of badge (200-300ms) | Confetti explosion with particles |
| Static celebratory illustration with subtle glow | Flashing lights or strobing effects |
| Warm color highlight (gold border, soft glow) | Neon colors, high-saturation bursts |
| User-initiated replay ("See my achievement again") | Looping celebration animation |
| Persistent visual indicator (badge stays on screen) | Animation that plays and disappears |
| Calm text: "Amazing work!" | Figurative text: "YOU'RE ON FIRE!" |

### Key Sources

- [WCAG 2.2 Specification](https://www.w3.org/TR/WCAG22/) — AAA targets for contrast, target size, authentication
- [W3C COGA — Making Content Usable for People with Cognitive Disabilities](https://w3c.github.io/coga/content-usable/) — 8 objectives, 50+ design patterns
- [Special Olympics Design Research](https://blinkux.com/work/special-olympics-case-study) — one-tap responses, personalized storybooks, celebrating on the athlete's terms
- [WCAG 2.2 Target Size (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) — 44px minimum, research shows 75px+ optimal for motor impairments
- [Accessibility.com — Sensory-Friendly Design for Autistic Users](https://www.accessibility.com/blog/sensory-friendly-design-creating-digital-spaces-that-support-autistic-users) — low-arousal colors, predictable patterns
