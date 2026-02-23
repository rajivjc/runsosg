# CLAUDE.md

## Project Overview

SOSG Running Club Hub — a Next.js 14 web application for managing a running club for athletes with special needs. Coaches log runs (manually or via Strava sync), track athlete progress through milestones, record coaching cues, and write notes. Caregivers get read-only access to their linked athlete.

**Tech stack:** Next.js 14 (App Router) · React 18 · TypeScript · Supabase (auth + Postgres + RLS) · Tailwind CSS v4 · Zustand (legacy, not actively used)

## Quick Reference

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint via next lint
npm test             # Jest unit tests (--runInBand)
npm run test:e2e     # Playwright E2E tests (requires dev server)
```

## Repository Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout (imports globals.css, renders BottomNav)
│   ├── page.tsx                  # Root redirect → /feed
│   ├── login/                    # Magic-link auth (client component)
│   │   ├── page.tsx              # Login form UI
│   │   └── actions.ts            # Client-side sendMagicLink via Supabase OTP
│   ├── auth/callback/route.ts    # OAuth/magic-link callback handler
│   ├── feed/page.tsx             # Club activity feed (server component)
│   ├── athletes/                 # Athlete listing + detail
│   │   ├── page.tsx              # Athlete list with search
│   │   └── [id]/                 # Dynamic athlete detail
│   │       ├── page.tsx          # Athlete hub (tabs: runs, cues, notes)
│   │       ├── edit/page.tsx     # Edit athlete profile
│   │       └── actions.ts        # Server Actions: CRUD sessions, cues, notes
│   ├── admin/                    # Admin panel (invite users, manage roles)
│   │   ├── page.tsx              # User management + invitations
│   │   ├── actions.ts            # Server Actions: invite, role changes, CRUD athletes
│   │   └── athletes/new/page.tsx # Add athlete form
│   ├── account/                  # User account settings
│   │   ├── page.tsx              # Display name, Strava status, sign out
│   │   └── actions.ts            # Server Actions: sign out, disconnect Strava, update name
│   ├── milestone/[id]/page.tsx   # Milestone detail page
│   ├── notifications/actions.ts  # Server Actions: mark notifications read
│   └── api/strava/               # Strava integration API routes
│       ├── connect/route.ts      # Redirect to Strava OAuth
│       ├── callback/route.ts     # Handle Strava OAuth callback
│       └── webhook/route.ts      # Strava webhook receiver (GET verify + POST events)
├── components/
│   ├── account/                  # SignOutButton, DisplayNameForm, StravaStatus
│   ├── admin/                    # AdminInviteForm, UserRow, DeleteAthleteButton, etc.
│   ├── athlete/                  # AthleteTabs, RunsTab, CuesTab, NotesTab, LogRunSheet, etc.
│   ├── athletes/                 # AthleteCard, AthleteSearch, StravaConnectBanner
│   ├── nav/                      # BottomNav (server) + BottomNavClient (client)
│   └── notifications/            # NotificationsPanel
├── lib/
│   ├── supabase/
│   │   ├── types.ts              # Database type definitions (all tables + row interfaces)
│   │   ├── server.ts             # Server-side Supabase client (cookie-based)
│   │   ├── client.ts             # Browser-side Supabase client
│   │   └── admin.ts              # Service-role admin client (server-only!)
│   ├── strava/
│   │   ├── client.ts             # Strava API wrapper (auth, token exchange, activities)
│   │   ├── matching.ts           # Activity→athlete matching (hashtag + schedule)
│   │   ├── sync.ts               # Full webhook processing pipeline
│   │   └── tokens.ts             # Token refresh with auto-notification on expiry
│   ├── milestones.ts             # Automatic milestone evaluation + awarding
│   └── utils/dates.ts            # Date/time formatting (Asia/Singapore timezone)
├── middleware.ts                  # Auth guard for protected routes + active user check
└── styles/tokens.css              # CSS custom properties (design tokens)

supabase/
├── migrations/                   # SQL migrations (initial schema + incremental)
│   ├── 20250001000000_initial_schema.sql
│   ├── 20260221000000_add_users_active.sql
│   ├── 20260222000000_add_session_id_to_milestones.sql
│   └── 20260223000000_add_personal_best_milestone_definition.sql
└── seed.sql                      # Seed data

tests/
└── e2e/sosg.spec.ts              # Playwright E2E tests

.github/workflows/ci.yml          # CI: build → unit tests → Playwright E2E
```

## Architecture & Key Patterns

### Authentication & Authorization

- **Magic-link auth** via Supabase OTP — no passwords stored
- **Three user roles:** `admin`, `coach`, `caregiver`
  - Admins: full access, invite users, manage athletes, change roles
  - Coaches: manage sessions, cues, notes for all athletes
  - Caregivers: read-only access to their linked athlete only
- **Middleware** (`src/middleware.ts`) enforces auth on protected routes and checks the `users.active` flag; deactivated users are signed out and redirected
- **Role checks** happen in Server Actions and page components, not middleware
- **Invitation flow:** Admin sends invite → Supabase `inviteUserByEmail` → on callback, `handle_new_user()` trigger assigns role from `invitations` table

### Supabase Clients (important distinction)

| Client | File | Usage |
|--------|------|-------|
| **Server client** | `lib/supabase/server.ts` | Cookie-based, respects RLS. Use in Server Components/Actions for user-scoped reads. |
| **Browser client** | `lib/supabase/client.ts` | Client-side. Used only in login form. |
| **Admin client** | `lib/supabase/admin.ts` | Service-role key, bypasses RLS. **Server-only.** Used for cross-user queries and admin operations. |

**Convention:** Most data fetching uses `adminClient` for simplicity (bypasses RLS), with role checks done in application code. Auth verification always uses the server client's `getUser()`.

### Data Flow Pattern

1. Server Components fetch data using `adminClient`
2. Data is passed as props to Client Components
3. Mutations go through Server Actions (`'use server'` functions)
4. After mutations, `revalidatePath()` refreshes the page data
5. Client components call `router.refresh()` for immediate UI updates

### Strava Integration

The Strava sync pipeline:
1. **Connect:** `/api/strava/connect` → Strava OAuth → `/api/strava/callback` stores tokens
2. **Webhook:** Strava POSTs activity events to `/api/strava/webhook`
3. **Sync:** `processStravaActivity()` in `lib/strava/sync.ts`:
   - Logs to `strava_sync_log`
   - Filters to running activities only (`Run`, `TrailRun`, `VirtualRun`)
   - Matches to athlete via hashtag (`#sosg <name>`) or schedule proximity
   - Creates/updates session, awards milestones, creates notifications
4. **Token refresh:** Automatic with notification on expiry

### Milestones

- Defined in `milestone_definitions` table with conditions (JSON: `{ metric, threshold }`)
- Evaluated automatically after each session via `checkAndAwardMilestones()`
- Metrics: `session_count`, `distance_km`, `longest_run`

### Styling

- **Tailwind CSS v4** with `@tailwindcss/postcss` plugin
- **CSS custom properties** defined in `src/styles/tokens.css` for colors, typography, spacing, shadows, radii
- **Component styles** in `src/styles/tokens.css` (cards, buttons, forms, modals, tabs, etc.)
- **Inline Tailwind classes** used extensively in page components
- **44px minimum touch targets** enforced via CSS for accessibility
- **`prefers-reduced-motion`** respected

### Database

- **15 tables** with Row Level Security enabled on all
- Key tables: `users`, `athletes`, `sessions`, `cues`, `coach_notes`, `milestones`, `milestone_definitions`, `strava_connections`, `strava_sync_log`, `notifications`, `invitations`
- **Triggers:** `handle_new_user()` (auto-create user row on signup), `update_cues_version()` (version history for cues)
- **RLS helper:** `get_my_role()` function used in policies
- Migrations are in `supabase/migrations/` ordered by timestamp

## Environment Variables

Required in `.env.local` (see `.env.local.example`):

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (public, RLS-scoped) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key (server-only, bypasses RLS) |
| `STRAVA_CLIENT_ID` | Strava API app client ID |
| `STRAVA_CLIENT_SECRET` | Strava API app secret |
| `STRAVA_WEBHOOK_VERIFY_TOKEN` | Webhook subscription verification |
| `NEXT_PUBLIC_APP_URL` | App base URL for redirects |

## Testing

### Unit Tests (Jest)

- Config: `jest.config.ts` — `ts-jest` preset, node environment
- Test files: `tests/unit/**/*.spec.ts`
- Path alias: `@/` → `src/`
- Run: `npm test` (uses `--runInBand` for sequential execution)

### E2E Tests (Playwright)

- Config: `playwright.config.ts`
- Test files: `tests/e2e/**/*.spec.ts`
- Auto-starts dev server on port 3000
- Single worker, no retries, sequential execution for determinism
- Run: `npm run test:e2e`
- Note: Many E2E tests are `test.skip`ped (from an older JSON-driven prototype)

### CI (GitHub Actions)

- Workflow: `.github/workflows/ci.yml`
- Triggers: push to `main`/`feat/prototype-v2`, all PRs
- Steps: `npm ci` → `npm run build` → `npm test --bail` → install Chromium → `npm run test:e2e`
- Node 20, Ubuntu latest
- Test artifacts uploaded on failure

## Conventions

### Code Style

- **TypeScript strict mode** — `strict: true` in `tsconfig.json`
- **No `allowJs`** — TypeScript only
- **Path aliases:** `@/*` maps to `src/*`
- **Server Actions** use `'use server'` directive and follow the pattern `(prevState, formData) → Promise<{ error?, success? }>`
- **Server Components** are the default; Client Components use `'use client'` only when needed (interactivity, hooks)
- **`any` casts** are used pragmatically in data transformation layers (after Supabase queries with joins)

### Naming Conventions

- Files: `kebab-case` for routes, `PascalCase` for components
- Server Actions: verb-first (`createManualSession`, `updateAthlete`, `saveCues`)
- Types/interfaces: `PascalCase` (`AthleteData`, `SessionData`, `CuesData`)
- CSS classes: `kebab-case` following BEM-like patterns (`card-feed-item`, `athlete-row-content`)

### Important Constraints

- **Never import `adminClient` in client components** — it uses the service role key
- **Always verify auth** (`getUser()`) at the start of every Server Action
- **Always verify role** for admin-only operations
- **Date formatting** uses `Asia/Singapore` timezone throughout
- **The root route `/`** redirects to `/feed`
- **`revalidatePath()`** must be called after mutations to refresh server-rendered data
- **Supabase types** are manually maintained in `src/lib/supabase/types.ts` (not auto-generated)
