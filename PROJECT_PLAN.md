# SOSG Running Club — Product Improvement Plan (Updated March 2026)

> This plan supersedes the previous version. It is grounded in a full audit of the current codebase, acknowledges what has already been shipped (badges, kudos, cheers, PWA, Resend emails, coaching insights, photo gallery, celebrations), and focuses on the gaps that matter most.

## Prioritization Framework

Every item is scored on two axes:

- **Impact**: How much does this move the needle on daily usage, emotional engagement, or operational necessity? (1-5)
- **Effort**: How many days of focused dev work? (S = 1-2 days, M = 3-5 days, L = 1-2 weeks, XL = 2-4 weeks)

Items are grouped into 4 phases. Each phase builds on the previous one and can be shipped independently.

---

## PHASE 1: "Make It Sticky" (Weeks 1-3)
*Goal: Give coaches a reason to open the app every day.*

### 1.1 Pre-Session Prep Screen
**Impact: 5 | Effort: M (3-4 days)**

The single highest-leverage feature. When a coach opens the app on a session day, show a focused prep view:

- Pull `club_settings.session_day` and `session_time` (already stored, currently unused)
- On session day, replace the greeting card with a prep card per athlete:
  - Last session summary (date, distance, feel)
  - Current cues (4 categories, pulled from existing cues table)
  - Next milestone approaching (already calculated in `today-focus.ts`)
  - Any declining feel alerts (already calculated in `coaching-insights.ts`)
- Add a "Ready to coach" → "Log run" quick flow

**What already exists:** `club_settings` has `session_day`/`session_time`. `today-focus.ts` already computes approaching milestones and feel declines. Cues data is fully stored. This is primarily a UI assembly task.

**Files to modify:**
- `src/app/feed/page.tsx` — add session-day detection and prep card rendering
- `src/lib/feed/today-focus.ts` — extend to return cues summary per athlete
- New component: `src/components/feed/PrepCard.tsx`

---

### 1.2 Web Push Notifications
**Impact: 5 | Effort: M (4-5 days)**

The notification infrastructure is 70% built. The gap is the last mile:

- Add push subscription management to the service worker (`public/sw.js` — currently handles only caching)
- Create a `push_subscriptions` table (user_id, endpoint, p256dh, auth keys)
- Add subscription UI in account settings (permission prompt + toggle)
- Wire existing notification creation points to also send web push:
  - Milestone achieved → push to caregiver
  - Unmatched Strava run → push to coach
  - New cheer received → push to coaches
  - Feel decline alert → push to coach
- Use the Web Push protocol (npm `web-push` package)

**What already exists:** `notifications` table with `channel` field supporting 'push'. Service worker registered. Notification creation logic in multiple server actions. Email sending via Resend already works.

**Files to create/modify:**
- `public/sw.js` — add push event handler
- New: `src/lib/push.ts` — web push sending utility
- New: `src/app/api/push/subscribe/route.ts` — subscription endpoint
- `src/app/account/page.tsx` — add notification preferences toggle
- New migration: `push_subscriptions` table

---

### 1.3 Quick-Log Floating Action Button
**Impact: 3 | Effort: S (1 day)**

Add a persistent "+" FAB on the feed page that opens the LogRunSheet directly. Currently coaches must navigate to an athlete first, then tap "Log a run." This adds friction to the most important action.

- FAB positioned above bottom nav (respecting safe area)
- Opens LogRunSheet with an athlete selector prepended
- Recently-coached athletes shown first

**Files to modify:**
- `src/app/feed/page.tsx` — add FAB
- `src/components/session/LogRunSheet.tsx` — add athlete selector mode

---

### 1.4 Feed Pagination
**Impact: 3 | Effort: S (2 days)**

The feed is hard-capped at 30 sessions. Add cursor-based pagination:

- "Load more" button at the bottom (not infinite scroll — keeps it simple)
- Use the existing `date` ordering as cursor
- Extract feed data fetching into a server action for incremental loading

**Files to modify:**
- `src/app/feed/page.tsx` — initial load stays server-rendered, add client component for "load more"
- New: `src/app/feed/load-more-actions.ts` — `loadMoreSessions` server action

---

## PHASE 2: "Make It Shareable" (Weeks 4-6)
*Goal: Turn every milestone into organic growth.*

### 2.1 Public Milestone & Journey Pages
**Impact: 5 | Effort: M (3-4 days)**

The `/milestone/[id]` and `/story/[id]` pages exist but require auth. Make them publicly accessible with beautiful OG metadata:

- Create a public layout for these routes (no auth required, no bottom nav)
- Generate OG images server-side (use `@vercel/og` or static SVG templates)
- Add share buttons (copy link, native share API on mobile)
- Include a "Join SOSG Running Club" CTA for visitors

**What already exists:** `/milestone/[id]/page.tsx` and `/story/[id]/page.tsx` already render content. OG metadata generation partially exists. The milestone page already has `generateMetadata`.

**Files to modify:**
- `src/middleware.ts` — exclude `/milestone/*` and `/story/*` from auth
- `src/app/milestone/[id]/page.tsx` — add public layout, share buttons
- `src/app/story/[id]/page.tsx` — add public layout, share buttons
- New: `src/app/api/og/route.tsx` — OG image generation

---

### 2.2 Data Export (CSV/PDF)
**Impact: 4 | Effort: M (3-4 days)**

Coaches and admins need to report outcomes to stakeholders, schools, and funders:

- Add "Export" button on athlete detail page → CSV of all sessions
- Add "Progress Report" button → PDF with chart snapshots, milestone timeline, cue summary
- Add admin-level "Club Report" → aggregate stats PDF
- Use existing Recharts data for chart snapshots

**Files to create:**
- New: `src/app/api/export/sessions/route.ts` — CSV generation
- New: `src/app/api/export/report/route.ts` — PDF generation
- `src/app/athletes/[id]/page.tsx` — add export buttons

---

### 2.3 Year-in-Review / Annual Summary
**Impact: 4 | Effort: M (4-5 days)**

Generate a beautiful per-athlete annual summary page:

- Total distance, session count, milestones earned
- Month-by-month progression chart
- Best moments (longest run, best feel streak, fastest improvement)
- Coach quotes (pulled from coach_notes)
- Shareable as a public link (same pattern as milestone pages)

**Files to create:**
- New: `src/app/review/[athleteId]/page.tsx`
- New: `src/lib/analytics/year-review.ts` — data aggregation
- New: `src/components/review/ReviewCard.tsx` — styled summary blocks

---

## PHASE 3: "Make It Reliable" (Weeks 7-9)
*Goal: Trust, testing, and offline resilience.*

### 3.1 Offline-First for Core Flows
**Impact: 4 | Effort: L (7-8 days)**

Coaches at the track need three things offline:

1. **View athlete cues** — cache cues data in IndexedDB on each visit
2. **Log a run** — queue session creation in IndexedDB, sync when online
3. **View last session** — cache recent sessions per athlete

Implementation:
- Extend the existing service worker (`public/sw.js`) with Workbox-style runtime caching
- Add IndexedDB wrapper for offline queue
- Add sync indicator in the UI ("1 run waiting to sync")
- Background sync via service worker when connectivity returns

**Files to create/modify:**
- `public/sw.js` — add runtime caching strategies + background sync
- New: `src/lib/offline/queue.ts` — IndexedDB queue manager
- New: `src/lib/offline/sync.ts` — background sync logic
- New: `src/components/ui/SyncIndicator.tsx`
- `src/components/session/LogRunSheet.tsx` — queue locally when offline

---

### 3.2 Core Business Logic Tests
**Impact: 4 | Effort: M (4-5 days)**

Test infrastructure exists (Jest + Playwright). Some tests exist for badges, milestones, matching, notifications, and auth. Expand coverage to:

1. **Feed data assembly** — correct grouping, sorting, kudos aggregation
2. **Server actions** — all CRUD actions with role-based access checks
3. **Strava sync pipeline end-to-end** — matching, deduplication, error handling
4. **Cues versioning** — save, undo, version increment
5. **E2E authenticated flows** — login → log session → milestone awarded → visible on feed

**Existing test files to extend:**
- `tests/unit/badges.test.ts`
- `tests/unit/milestones.test.ts`
- `tests/unit/strava-matching.test.ts`
- New: `tests/unit/feed-assembly.test.ts`
- New: `tests/e2e/coach-flow.spec.ts`

---

### 3.3 TypeScript Strictness Pass
**Impact: 3 | Effort: M (3-4 days)**

Replace `as any` casts with proper types. Priority order:

1. Feed page (30+ casts) — define `FeedSession`, `FeedMilestone` interfaces
2. Server actions — type all form data parsing
3. Strava sync — type webhook payloads and API responses
4. Component props — replace `any` props with explicit interfaces

This is not glamorous but it prevents an entire class of runtime bugs.

---

## PHASE 4: "Make It Delightful" (Weeks 10-12)
*Goal: Polish, personalization, and power features.*

### 4.1 Voice-to-Log
**Impact: 4 | Effort: L (5-7 days)**

Use the Web Speech API (browser-native, no external service needed):

- Add a microphone button on the LogRunSheet
- Transcribe speech → parse with simple NLP rules:
  - Athlete name → fuzzy match against athlete list
  - Distance → regex for "X km" or "X kilometers"
  - Feel → keyword matching ("great" → 5, "okay" → 3, "struggled" → 2)
  - Remaining text → session note
- Show parsed result for confirmation before saving
- Fallback: if parsing fails, dump transcription into the note field

**Files to create/modify:**
- New: `src/lib/voice/parser.ts` — speech-to-session parser
- New: `src/components/session/VoiceInput.tsx` — microphone UI
- `src/components/session/LogRunSheet.tsx` — integrate voice input

---

### 4.2 Dark Mode
**Impact: 3 | Effort: M (3-4 days)**

The design token system in `tokens.css` makes this feasible:

- Add dark variants for all CSS custom properties
- Toggle in account settings (system/light/dark)
- Store preference in `localStorage` + respect `prefers-color-scheme`
- Apply via `class="dark"` on `<html>` element

**Files to modify:**
- `src/styles/tokens.css` — add `.dark` variants
- `src/app/layout.tsx` — add theme class
- New: `src/components/ui/ThemeToggle.tsx`
- `src/app/account/page.tsx` — add theme toggle

---

### 4.3 Admin Analytics Dashboard
**Impact: 3 | Effort: M (4-5 days)**

The calculation functions exist in `coaching-insights.ts` and `session-trends.ts` but have no dashboard:

- New admin page: `/admin/analytics`
- Charts: sessions per week (trend), athletes active (trend), km per month
- Coach leaderboard (sessions coached, badges earned)
- Milestone velocity (milestones per month)
- Feel distribution across all athletes

**What already exists:** Recharts is installed. `session-trends.ts` computes weekly volumes. `coaching-insights.ts` computes feel trends.

**Files to create:**
- New: `src/app/admin/analytics/page.tsx`
- New: `src/components/admin/AnalyticsCharts.tsx`

---

### 4.4 Scheduled Session Reminders
**Impact: 3 | Effort: M (3-4 days)**

`club_settings` already stores `session_day` and `session_time`. Use this to:

- Send push notification to coaches 1 hour before session time on session day
- Include athlete count and any alerts (declining feel, approaching milestones)
- Add a cron endpoint similar to `/api/cron/weekly-digest`

**Files to create:**
- New: `src/app/api/cron/session-reminder/route.ts`
- Extend: `src/lib/push.ts` — reminder payload formatting

---

## PRIORITY MATRIX SUMMARY

| # | Feature | Impact | Effort | Phase | Depends On |
|---|---------|--------|--------|-------|------------|
| 1.1 | Pre-Session Prep Screen | 5 | M | 1 | — |
| 1.2 | Web Push Notifications | 5 | M | 1 | — |
| 1.3 | Quick-Log FAB | 3 | S | 1 | — |
| 1.4 | Feed Pagination | 3 | S | 1 | — |
| 2.1 | Public Milestone/Journey Pages | 5 | M | 2 | — |
| 2.2 | Data Export (CSV/PDF) | 4 | M | 2 | — |
| 2.3 | Year-in-Review | 4 | M | 2 | 2.2 |
| 3.1 | Offline-First Core Flows | 4 | L | 3 | 1.2 (push infra) |
| 3.2 | Core Business Logic Tests | 4 | M | 3 | — |
| 3.3 | TypeScript Strictness Pass | 3 | M | 3 | — |
| 4.1 | Voice-to-Log | 4 | L | 4 | — |
| 4.2 | Dark Mode | 3 | M | 4 | — |
| 4.3 | Admin Analytics Dashboard | 3 | M | 4 | — |
| 4.4 | Scheduled Session Reminders | 3 | M | 4 | 1.2 (push) |

---

## IF I HAD TO PICK 3 THINGS TO SHIP FIRST

1. **Pre-Session Prep Screen (1.1)** — Transforms the app from a logger to a coaching tool. Most of the data and computation already exists. 3-4 days.
2. **Web Push Notifications (1.2)** — Unlocks all proactive engagement. Milestone celebrations, session reminders, and cheer delivery all depend on this. 4-5 days.
3. **Public Milestone Pages (2.1)** — Turns every achievement into organic growth. Parents share these. 3-4 days.

These three features combined (~2 weeks of work) would fundamentally change how the app feels. It goes from "I open this to log a run" to "this app helps me coach better and makes parents proud."

---

## NON-FEATURE PRIORITIES (Ongoing, Not Phased)

These should be woven into every phase, not treated as separate projects:

- **Test coverage**: Write tests for every new feature. Add regression tests when fixing bugs.
- **Type safety**: Replace `any` in every file you touch. Don't create a separate "fix types" sprint.
- **Performance**: Profile the feed page query count. Consider denormalized views for the most common queries.
- **Accessibility**: Add focus rings to buttons. Trap focus in modals. Test with VoiceOver.
- **Feed page refactor**: The 750-line `feed/page.tsx` should be decomposed into smaller server components as features are added. Don't refactor it standalone — refactor it as you build on it.

---

## NEW DEPENDENCIES REQUIRED

| Package | Phase | Purpose |
|---------|-------|---------|
| `web-push` | 1 | Web Push protocol for notifications |
| `idb` | 3 | IndexedDB wrapper for offline queue |
| `@vercel/og` | 2 | Server-side OG image generation |
| `@react-pdf/renderer` | 2 | PDF report generation |

---

## METRICS TO TRACK

| Metric | Current (Estimated) | Target |
|--------|-------------------|--------|
| DAU / WAU ratio | ~0.15 (coaches log a few times/week) | 0.4+ |
| Sessions logged within 1hr of session time | Unknown | 60%+ |
| Milestone share rate | ~0% (no public sharing) | 30%+ |
| Caregiver weekly opens | Unknown | 2+ per week |
| Push notification opt-in rate | 0% (not available) | 70%+ |
| Offline session logs synced | 0 (not available) | Track adoption |

---

## WHAT THIS PLAN DOES NOT INCLUDE (AND WHY)

| Excluded Item | Reason |
|---|---|
| UI/UX overhaul | The current UI is functional and consistent. Polish should happen incrementally, not as a rewrite phase. |
| Native mobile app (React Native/Expo) | PWA is the right choice for this user base. No GPS tracking or background processing needed. |
| Real-time/WebSocket updates | The usage patterns (log after sessions, check feed occasionally) don't justify the infrastructure cost. |
| Multi-club support | Premature. Solve for one club exceptionally well first. |
| Athlete self-service | The athletes in this program may have varying abilities with technology. Coach-mediated logging is the right design choice. |
| Audit log | Important eventually, but the club is small enough that trust-based operations work for now. |
