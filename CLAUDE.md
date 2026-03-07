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
- **Public routes** (`/milestone/*`, `/story/*`) are excluded from auth middleware
