# SOSG Running Club Hub — Project Plan

> **Guiding principles:** Community, Friendship, Growing Together, Special Needs, Empathy
>
> **Design philosophy:** The app should make coaches feel like they're part of something meaningful — not filling out forms. Every interaction should celebrate the athletes and the community. Connection over competition. Progress over perfection.

---

## Phase 1: Foundation — Bug Fixes & Code Quality
**Priority: CRITICAL | Effort: Small | Impact: Stability**

These are blocking issues that undermine trust in the app and should be fixed before any feature work.

### 1.1 Fix `revalidatePath` bugs
- `updateCoachNote` in `src/app/athletes/[id]/actions.ts` revalidates `/athletes` instead of `/athletes/${athleteId}` — edits don't refresh the page the user is on
- `updateManualSession` has the same bug — coaches edit a session and see stale data
- **Fix:** Change both to revalidate the specific athlete path

### 1.2 Fix notification type hack
- `low_feel_alert` uses `as unknown as 'feel_prompt'` double cast to bypass the type system
- The DB `CHECK` constraint on `notifications.type` may not include `low_feel_alert`, risking runtime INSERT failures
- **Fix:** Add `low_feel_alert` to the TypeScript types and verify the DB constraint includes it

### 1.3 Remove dead code
- `QuickLogSheet.tsx` — fully implemented but imported nowhere
- `FeedTab.tsx` — exists as a component file but never rendered
- `zustand` dependency — legacy, not actively used
- **Fix:** Remove all three; removes confusion and reduces bundle

### 1.4 Add role checks to unprotected server actions
- `addCoachNote` does not verify the caller's role — a caregiver could call it directly
- **Fix:** Add `role !== 'caregiver'` guard at the top of the action

### 1.5 Add missing error boundaries and loading states
- No `error.tsx` anywhere — unhandled errors show Next.js default error page
- No `loading.tsx` for `/feed`, `/admin`, `/account`, `/milestone/[id]`
- No custom `not-found.tsx`
- **Fix:** Add `error.tsx` at root + key route segments, `loading.tsx` skeletons for all pages, and a custom 404 page

### 1.6 Fix TypeScript prop mismatches
- `AdminPage` — `UserRow` props type error, implicit `any` in `.map()` callbacks
- `NotesTab` — `NoteCard` `onChanged` prop signature mismatch
- `RunsTab` — `SessionCard` prop type mismatch
- `AthleteSearch` — `AthleteCard` receives extra props via spread
- **Fix:** Correct all prop types and add explicit type annotations to callbacks

---

## Phase 2: UI/UX Overhaul — From Prototype to Professional
**Priority: HIGH | Effort: Large | Impact: Perception + Engagement**

The feedback is clear: the app looks like a prototype. The goal is to match the quality feel of Nike Run Club / Strava while maintaining the warmth and accessibility that makes SOSG special.

### 2.1 Design system consolidation
**Problem:** 150+ CSS tokens defined in `tokens.css` but almost never used — inline Tailwind overrides them everywhere, creating inconsistency.

**Actions:**
- Create a Tailwind theme extension that maps to CSS custom property values so tokens and Tailwind work together (not against each other)
- Audit all pages and replace hardcoded Tailwind classes with token-based utilities
- Fix color deviation: bottom nav uses `text-blue-600` instead of the teal accent
- Remove unused `.card-*`, `.btn-*`, `.auth-*` CSS rules that nothing references

### 2.2 Warm color palette evolution
**Problem:** Current palette reads as generic SaaS — cool grays, clinical feel.

| Token | Current | New | Rationale |
|-------|---------|-----|-----------|
| `--color-bg` | `#F8F9FB` (cool gray) | `#FBF9F7` (warm off-white) | Warmer base, less clinical |
| `--color-brand` | `#111111` (near-black) | `#1A1A2E` (warm dark blue) | Softer, more approachable |
| `--color-accent` | `#0D9488` (teal) | Keep | Teal = growth, health, trust |
| NEW `--color-celebrate` | — | `#F59E0B` (warm amber) | For milestones and streaks |
| NEW `--color-warmth` | — | `#FEF3C7` (light amber) | Celebration backgrounds |

### 2.3 Typography refinement
- Increase `--type-body-size` from 14px to 15px for better readability (special-needs context)
- Increase `--type-h1-weight` from 650 to 700 for stronger headlines
- Add responsive typography scaling between mobile/tablet breakpoints
- Standardize all inline `text-xs`, `text-sm`, etc. to reference type tokens

### 2.4 Card and component redesign
**Feed cards:**
- Add subtle gradient backgrounds for milestone-earning sessions (warm amber tint)
- Improve feel indicator visibility — larger dots, clearer color coding
- Add athlete initials/avatar to each card for quick visual scanning
- Improve section headers — current `text-gray-300` is too light on light backgrounds

**Athlete cards:**
- Larger feel-dot indicators (currently `w-2.5 h-2.5` — too small)
- Progress indicator showing distance to next milestone
- Last-run recency indicator ("Ran 2 days ago" vs "Last run 3 weeks ago")

**Session cards (RunsTab):**
- Hero metric layout: distance as large display number (like Nike/Strava)
- Better visual hierarchy between primary data (distance, duration) and secondary (pace, date)
- Improved feel selector with larger touch targets and clearer labels

### 2.5 Empty states and micro-copy
Replace all generic empty states with warm, encouraging messages:
- "No sessions yet" → "Ready for the first run? Let's go!"
- "No notes" → "Notes help track what works — add the first one"
- Feed empty → "The club is quiet today. Be the first to log a run!"
- Error states → "Something went wrong — let's try again" (not just "Error")

### 2.6 Micro-interactions and animations
- **Session logged:** Gentle checkmark animation (Lottie, 300ms)
- **Milestone earned:** Confetti burst + badge reveal (Lottie, 500ms)
- **List items:** Subtle stagger-in animation on page load
- **Tab switching:** Smooth crossfade between tab content
- **All animations respect `prefers-reduced-motion`** — fall back to instant static display
- Add `lottie-react` dependency for animation playback

### 2.7 Motivational UX copy throughout
Every text string should reflect SOSG's values:
- Button labels: "Log a Run" → "Let's Log a Run!"
- After save: "Session saved" → "Great run with {athlete}! That's their {nth} this month."
- Coach greeting: Show warmth — "{name}, you've coached {n} athletes this week. Keep going!"
- Milestone: "Milestone achieved" → "{athlete} just hit a new milestone! Growing together."

---

## Phase 3: Engagement Features — Making Coaches Want to Open the App
**Priority: HIGH | Effort: Medium | Impact: Retention**

Research from Nike Run Club, Strava, and fitness app studies shows that the apps coaches love combine **frictionless core actions** with **social rewards** and **visible progress**.

### 3.1 Frictionless session logging (2-3 taps)
**This is the single most impactful change.** If logging feels like a chore, nothing else matters.

- **Smart defaults:** Pre-fill date with today, remember last athlete coached, suggest common distances
- **Quick log mode:** Tap athlete → enter distance → done (feel + notes optional, can be added later)
- **Draft persistence:** If a coach starts logging but gets interrupted, save form state to localStorage
- **Post-log celebration:** After saving, show updated athlete stats + any milestones earned + warm confirmation

### 3.2 Kudos / High-five on feed items
Borrowed directly from Strava — the single most transferable engagement pattern.

- One-tap interaction on any feed session card
- Brief heart/high-five float animation (200ms)
- Kudos counter visible on the card
- Creates social reward loop: "I logged a run → other coaches gave kudos → I feel seen"
- **DB:** New `kudos` table (user_id, session_id, created_at)
- Low effort, high engagement impact

### 3.3 Coach streak tracking
- Track consecutive weeks where a coach logged at least one session
- Display on feed greeting card: "Week 7" with a flame icon
- Weekly streak (not daily) — one missed Saturday doesn't break momentum
- Streak milestones at 4, 8, 12, 26, 52 weeks trigger celebration animation
- Visible only to the coach themselves (not competitive between coaches)

### 3.4 Monthly club goals
- Admin-configurable monthly target: "Let's log 50 runs this month!"
- Progress bar visible on feed page
- Updates in real-time as sessions are logged
- Celebrates when the club hits the goal together
- Reinforces "growing together" — it's a club achievement, not individual

### 3.5 Improved notifications as engagement triggers
- Saturday morning "It's running day!" push/in-app notification (if sessions are scheduled)
- "Your streak is at risk!" gentle reminder if a week is about to pass without logging
- "{Athlete} earned a new milestone!" notification to relevant coaches
- All notifications use warm, encouraging tone

### 3.6 "Compare to past self" progress framing
- Never show athlete-to-athlete comparisons (empathy over competition)
- Frame all progress as personal growth: "Marcus's longest run yet!"
- Show trend arrows on athlete profiles: distance trending up, sessions more frequent
- Monthly mini-summaries: "This month: 8 sessions, 14.2km total — up from 6 sessions last month"

---

## Phase 4: Shareable Milestone Cards
**Priority: HIGH | Effort: Medium | Impact: Community Pride + Organic Growth**

Currently milestones are "take a screenshot and share." The infrastructure is partially there (`share_image_url` field exists, milestone detail page is beautifully designed) but the bridge to social sharing is missing.

### 4.1 Dynamic OG metadata for milestone pages
- Add `generateMetadata()` to `/src/app/milestone/[id]/page.tsx`
- Set `og:title`, `og:description`, `og:image`, `twitter:card`, `twitter:image`
- When a milestone URL is shared on WhatsApp/Facebook/LinkedIn, it shows a rich preview card

### 4.2 Server-side milestone image generation
- Create `/api/milestone/[id]/image` route using `@vercel/og` (Satori)
- Renders a beautiful PNG card (1200x630 for OG, 1080x1080 for Instagram)
- Design: warm gradient background (teal-to-emerald), large milestone icon, athlete name, achievement label, date, SOSG branding + "Growing Together" tagline
- Cache with appropriate HTTP headers for performance
- Store generated URL in `milestones.share_image_url`

### 4.3 Share button on milestone badges
- When a coach or caregiver views a milestone, show a prominent "Share" button
- On mobile: triggers Web Share API (native share sheet — WhatsApp, Instagram, etc.)
- Fallback: copy link to clipboard
- After earning a milestone: full-screen celebration card with share prompt
- Caregivers sharing these on WhatsApp creates organic growth and family pride

### 4.4 Monthly review cards (future)
- Generate a "Month in Review" card for each athlete
- Sessions count, total distance, milestones earned, coach name
- Shareable format — caregivers share to family WhatsApp groups
- Reinforces the club's community narrative

---

## Phase 5: PWA — Mobile App Experience Without the App Store
**Priority: HIGH | Effort: Medium | Impact: Native App Feel**

**Decision: PWA over Expo/React Native.** Reasoning:
- Strava sync already works via server-side webhooks — no native background processing needed
- Coaches log sessions after the run (not during) — no GPS tracking needed
- Small focused community — App Store distribution adds friction, not value
- Extends existing Next.js codebase vs. full rewrite
- Install-to-home-screen gives native feel on both iOS and Android

### 5.1 Web App Manifest
- Create `manifest.json` with app name, icons, theme color, display mode
- Design app icons at all required sizes (192x192, 512x512)
- Set `display: "standalone"` for full-screen experience
- Set `theme_color` to match teal accent
- Configure `start_url` to `/feed`

### 5.2 Service Worker with Serwist
- Add `@serwist/next` (successor to `next-pwa`, works with App Router)
- Cache static assets and page shells for fast loading
- Offline fallback page: "You're offline — your sessions will sync when you're back"
- Cache recent feed data for offline viewing
- Pre-cache common routes (`/feed`, `/athletes`)

### 5.3 Install prompt
- Show a tasteful "Add to Home Screen" banner for mobile users
- Only show after 2+ visits (don't annoy first-time users)
- Explain the benefit: "Install SOSG for quick access — no app store needed"
- Remember dismissal so it doesn't re-appear

### 5.4 Push notifications (Android first)
- Register service worker for push subscription
- Integrate with web push API for session reminders and milestone notifications
- iOS push support is limited — provide in-app notification center as fallback
- Notification types: running day reminders, milestone achievements, streak alerts

### 5.5 Splash screen and app-like transitions
- Custom splash screen with SOSG branding on app launch
- Page transitions that feel native (slide left/right between pages)
- Pull-to-refresh on feed page
- Haptic feedback on milestone celebrations (where supported)

---

## Phase 6: Resend SMTP Integration — Branded Email Experience
**Priority: MEDIUM | Effort: Medium | Impact: Professional Polish**

Currently all emails (magic links, invitations) are sent by Supabase's built-in email service — generic templates, no branding. The notification schema supports an `email` channel that's never been implemented.

### 6.1 Resend setup
- Add `resend` package
- Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to environment config
- Create `/src/lib/email/resend.ts` — shared Resend client
- Verify sender domain for deliverability

### 6.2 Email templates with react-email
- Add `react-email` for component-based email templates
- Create branded templates in `/src/components/emails/`:
  - `MagicLinkEmail.tsx` — login magic link with SOSG branding
  - `InvitationEmail.tsx` — welcome invitation with role explanation
  - `MilestoneEmail.tsx` — "Your athlete achieved a milestone!" for caregivers
  - `WeeklyDigestEmail.tsx` — weekly summary for coaches (optional)
  - `layout.tsx` — shared email layout with SOSG header/footer
- Design consistent with app's warm color palette (teal accent, warm backgrounds)

### 6.3 Configure Supabase custom SMTP
- Point Supabase Auth email delivery to Resend SMTP
- This means magic links and invite emails automatically use Resend's infrastructure
- Custom templates get applied to all auth emails

### 6.4 Notification email delivery
- Implement email sending for notifications where `channel: 'email'`
- Milestone earned → email to linked caregiver
- Strava token expiry → email to connected coach
- Weekly digest → optional email summary to all coaches

---

## Phase 7: Strava Integration Completeness
**Priority: MEDIUM | Effort: Small | Impact: Data Completeness**

The Strava pipeline is architecturally complete but has gaps.

### 7.1 Historical sync / backfill endpoint
- `getAthleteActivities` in `client.ts` is implemented but never called
- Create an admin action to trigger backfill for a connected coach
- Useful for importing runs recorded before the webhook was set up

### 7.2 Fix unmatched runs table
- `sync.ts` references `strava_unmatched` table but it's not in the schema types
- Verify the migration exists; if not, create it
- Surface unmatched runs in the admin panel for manual assignment

### 7.3 Hide coaching stats from caregivers
- Account page shows "Your coaching stats" to all users including caregivers
- Caregivers see "0 sessions" which is confusing
- Conditionally hide the stats card for caregiver role

---

## Phase 8: Test Coverage Expansion
**Priority: MEDIUM | Effort: Medium | Impact: Confidence**

Current coverage: 3 unit test files (dates, milestones, matching) + 4 E2E tests (login page only). No server actions, no components, no Strava sync tested.

### 8.1 Server action unit tests
- `createManualSession`, `updateManualSession` — session CRUD
- `saveCues` — cue management
- `addCoachNote`, `updateCoachNote`, `deleteCoachNote` — notes CRUD
- `inviteUser`, `changeUserRole`, `toggleUserActive` — admin actions
- Use the existing mock pattern (Proxy-based chainable Supabase mocks)

### 8.2 Strava pipeline tests
- `processStravaActivity` — end-to-end sync flow
- `getValidAccessToken` — token refresh logic
- Error scenarios: expired tokens, unmatched runs, duplicate activities

### 8.3 Component tests
- Feed page grouping logic (`groupByDate`)
- Milestone celebration display
- Session card expand/collapse behavior

### 8.4 E2E expansion
- Authenticated coach flow: login → view feed → log a session → see it appear
- Admin flow: invite user → change role
- Milestone flow: log a run that triggers a milestone → verify it appears

---

## Deferred: Caregiver Access Control
**Status: ON HOLD — Pending club discussion**

The audit identified that caregivers can see all athletes' data (not just their linked athlete). This is a valid concern but the decision has been deferred pending discussion with coaches and caregivers about the desired experience, given the current culture of open sharing via Excel, WhatsApp, and Strava.

---

## Implementation Order & Dependencies

```
Phase 1 (Foundation)     ←── Start here. Unblocks everything.
  ↓
Phase 2 (UI/UX Overhaul) ←── Biggest perceived improvement.
  ↓                           Can be done incrementally.
Phase 3 (Engagement)     ←── Builds on the new UI.
  ↓                           Kudos, streaks, celebrations.
Phase 4 (Milestones)     ←── Can start in parallel with Phase 3.
  ↓                           Independent workstream.
Phase 5 (PWA)            ←── After UI is polished.
  ↓                           Adds native app feel.
Phase 6 (Resend)         ←── Independent. Can be done anytime.
  ↓
Phase 7 (Strava)         ←── Independent. Low urgency.
  ↓
Phase 8 (Tests)          ←── Ongoing. Add tests as features land.
```

### Parallelizable work:
- Phase 4 (Milestones) can run in parallel with Phase 3 (Engagement)
- Phase 6 (Resend) is fully independent — can be done at any time
- Phase 8 (Tests) should be woven into every phase, not saved for last

---

## New Dependencies Required

| Package | Phase | Purpose |
|---------|-------|---------|
| `lottie-react` | 2, 3 | Celebration animations (confetti, checkmarks) |
| `@vercel/og` | 4 | Server-side milestone image generation |
| `@serwist/next` | 5 | PWA service worker for Next.js App Router |
| `resend` | 6 | Transactional email delivery |
| `react-email` | 6 | Component-based email templates |

Dependencies to **remove**: `zustand` (unused legacy)

---

## Success Metrics

How we'll know each phase worked:

| Phase | Metric |
|-------|--------|
| 1. Foundation | Zero runtime errors in production, all TypeScript strict |
| 2. UI/UX | Coach feedback: "Looks professional" / "Looks like a real app" |
| 3. Engagement | Coaches open the app unprompted; session logging frequency increases |
| 4. Milestones | Caregivers sharing milestone cards on WhatsApp |
| 5. PWA | Coaches install to home screen; app loads in <2s |
| 6. Resend | Professional branded emails; higher magic-link click-through |
| 7. Strava | Zero unmatched runs; historical data imported |
| 8. Tests | >80% coverage on server actions; CI catches regressions |
