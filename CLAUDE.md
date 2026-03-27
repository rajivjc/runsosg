# CLAUDE.md

## Project Overview

A Next.js 14 web application for managing a running club for athletes with special needs. The club name, timezone, and locale are all configured dynamically from the `clubs` table in the database. Coaches log runs (manually or via Strava sync), track athlete progress through milestones, record coaching cues, write notes, and celebrate achievements. Caregivers get read-only access to their linked athlete with the ability to send cheers and view milestone celebrations. Athletes themselves can access their own PIN-protected personal page to view their running journey, check in with their mood, pick goals, choose an avatar, favourite their best runs, and message their coach.

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
- **Middleware** (`src/middleware.ts`) enforces auth, checks `users.active` flag, and gates `/admin/*` routes by role
- **Role checks** happen in Server Actions and page components; middleware additionally enforces admin route access
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

Pipeline: OAuth connect → webhook receives activity events → `processStravaActivity()` in `lib/strava/sync.ts` matches to athlete (via club hashtag prefix from `clubs.strava_hashtag_prefix` or schedule proximity) → creates session → awards milestones → syncs badges → notifies. Token refresh is automatic with expiry notifications. Unmatched activities are stored in `strava_unmatched` for manual resolution.

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

### Cron Jobs

All cron routes are protected by `CRON_SECRET` Bearer token auth. Configured in `vercel.json`.

- **Weekly digest** (`/api/cron/weekly-digest`): Sends weekly summary emails to coaches and caregivers. Runs Mondays at 9 AM UTC.
- **Session reminders** (`/api/cron/session-reminders`): Runs daily at 6 AM UTC. Handles three tasks:
  - **Auto-completion**: Completes published sessions that have ended (session_end or session_start + 4h) and have at least one logged run. Logic extracted to `lib/sessions/completion.ts`.
  - **RSVP deadline reminders**: Sends push notifications to non-responding coaches/caregivers when their RSVP deadline is within the next 48h.
  - **Morning-of reminders**: Sends push notifications to assigned coaches when their session starts within the next 24h.
  - *Note:* Upgrade to Vercel Pro to run hourly (`0 * * * *`) for tighter reminder windows. See `#todo` comments in route file.
- **Auto-draft sessions** (`/api/cron/draft-sessions`): Runs daily at 10 AM UTC (6 PM SGT). Creates a draft training session for the next occurrence of the configured recurring session day if no draft/published session already exists. Cancelled sessions do not block auto-draft. Notifies admins on creation. Requires `recurring_auto_draft = true` in club settings.

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

### Training Sessions

- Session times are stored as TIMESTAMPTZ in `training_sessions.session_start`
- Always use helpers from `src/lib/sessions/datetime.ts` for display
- Never interpret session_start without the club timezone from getClub().timezone
- The suggestion algorithm uses logged runs (not just assignments) for frequency
- `/admin/sessions/*` routes allow admin OR coaches with can_manage_sessions = true
- All other `/admin/*` routes remain admin-only

## Conventions

### Naming

- Files: `kebab-case` for routes, `PascalCase` for components
- Server Actions: verb-first (`createManualSession`, `updateAthlete`, `saveCues`)
- Types: `PascalCase` (`AthleteData`, `SessionData`, `CuesData`)

### Important Constraints

- **Never import `adminClient` in client components** — it uses the service role key
- **Always verify auth** (`getUser()`) at the start of every Server Action
- **Always verify role** for admin-only operations
- **Date formatting** uses dynamic timezone from `getClub().timezone` (server) or `useClubConfig().timezone` (client). Never hardcode `'Asia/Singapore'`, `'en-SG'`, or `'+08:00'` — the `timezone-guard.spec.ts` CI test enforces this.
- **Email sender name** uses `clubName` from `getClub()` — all `sendEmail()` callers must pass `clubName: club.name` so the From field matches the database club name
- **The root route `/`** redirects to `/feed`
- **`revalidatePath()`** must be called after mutations
- **Server Actions** follow the pattern `(prevState, formData) → Promise<{ error?, success? }>`
- **`RESEND_API_KEY`** must be set for email features to work (gracefully skipped if missing)
- **Public routes** (`/milestone/*`, `/story/*`, `/my/*`) are excluded from auth middleware

### Athlete Access ("My Journey")

- **Route:** `/my/[athleteId]` — PIN-authenticated, no Supabase auth required
- **PIN auth:** 4-digit bcrypt-hashed PIN, rate limited (5 attempts / 15-minute lockout)
- **Cookie:** `athlete_session_[id]` with 24h expiry, HttpOnly, Secure, SameSite=Strict
- **Messages:** Athletes send preset one-tap messages to coaches (stored in `athlete_messages` table). Last sent message shows persistent confirmation
- **Mood check-in:** Emoji-based (5 options: Sad, Tired, Okay, Happy, Excited). One tap. Mood trends visible to coaches
- **Goal picker:** Athletes choose what they want to work on (Run further / Run more often / Feel stronger). One tap, visible to coaches
- **Avatar:** Athletes choose from 8 preset emoji avatars. Choice appears across coach and caregiver views with a "chosen by athlete" indicator (✌️ badge). See avatar guidelines below
- **Theme color:** Athletes pick a color that tints their personal page (teal, blue, purple, green, amber, coral)
- **Favourites:** Athletes can heart their best runs, surfaced in a "My best runs" section
- **QR code:** Coaches can print a QR code for each athlete's page. Designed to be stuck on a fridge or notebook for easy scanning
- **Data shown:** Stats, milestones, goal progress, recent runs, cheers, messages from home — never notes, cues, or medical info

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

### Avatar Selection

Athletes can pick their own avatar from a preset list of 8 options. The avatar appears across all views (athlete, coach, caregiver) with a subtle indicator on non-athlete views showing it was the athlete's choice.

**Allowed avatars (V1):** 🏃 (Runner), 🏃‍♂️ (Man running), 🏃‍♀️ (Woman running), 👟 (Running shoe), 🏅 (Medal), 🏆 (Trophy), ⭐ (Star), 💪 (Strong)

**Selection criteria — do not modify without reviewing these principles:**
- **8 options max** — cognitive accessibility research recommends 3-10 choices for users with IDD
- **No fire emoji (🔥)** — frightens people who take language literally (same reason "you're on fire!" was removed from copy)
- **No animals** — this is an adult running app ("Would Strava let you be a cartoon cat?")
- **No rainbow (🌈)** — introduces unintended LGBTQ+ pride context into a simple identity choice
- **No disability-specific emoji (wheelchair, cane)** — the app is "defined by sport, not disability"
- **Default yellow emoji, no skin tones in V1** — adding 5 skin tone variants per person emoji would exceed the cognitive accessibility limit. Planned for V2 as an optional second step after initial selection
- **Three human options + five sport/achievement options** — covers athletes who want human representation and those who prefer non-human identity
- **Server-side validation required** — the allowed list must be enforced in the server action, not just the UI

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
