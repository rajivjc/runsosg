# CLAUDE.md

## Project Overview

SOSG Running Club Hub — a Next.js 14 web application for managing a running club for athletes with special needs. Coaches log runs (manually or via Strava sync), track athlete progress through milestones, record coaching cues, and write notes. Caregivers get read-only access to their linked athlete.

**Tech stack:** Next.js 14 (App Router) · React 18 · TypeScript · Supabase (auth + Postgres + RLS) · Tailwind CSS v4

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

Pipeline: OAuth connect → webhook receives activity events → `processStravaActivity()` in `lib/strava/sync.ts` matches to athlete (via `#sosg <name>` hashtag or schedule proximity) → creates session → awards milestones → notifies. Token refresh is automatic with expiry notifications.

### Milestones

Defined in `milestone_definitions` table with JSON conditions (`{ metric, threshold }`). Evaluated via `checkAndAwardMilestones()` after each session. Metrics: `session_count`, `distance_km`, `longest_run`.

### Styling

- **Tailwind CSS v4** with design tokens in `src/styles/tokens.css`
- **44px minimum touch targets** for accessibility
- **`prefers-reduced-motion`** respected

### Database

- **15 tables** with RLS enabled on all. Key tables: `users`, `athletes`, `sessions`, `cues`, `coach_notes`, `milestones`, `milestone_definitions`, `strava_connections`, `notifications`, `invitations`
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
