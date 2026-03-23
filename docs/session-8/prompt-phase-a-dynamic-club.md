# Phase A: Dynamic Club Name — Implementation Prompts

**Goal:** Replace all hardcoded "SOSG Running Club" references with dynamic values from the database. Rename `club_settings` → `clubs` table. Create a `getClub()` helper as the single source of truth. Zero visual or functional change for end users.

**Execution order:** Prompt 1 → 2 → 3 → 4 (strict sequence)

**After every prompt run:**
```bash
npm run build && npm test && npm run lint
```

---

## Prompt 1 of 4 — Database Migration: Rename `club_settings` → `clubs`, Add New Columns

### Instructions

Create a new Supabase migration file `supabase/migrations/20260325000000_rename_club_settings_to_clubs.sql` that does the following:

1. **Rename the table:** `ALTER TABLE club_settings RENAME TO clubs;`

2. **Add new columns** to the `clubs` table:
   ```sql
   ALTER TABLE clubs ADD COLUMN slug TEXT UNIQUE NOT NULL DEFAULT 'default';
   ALTER TABLE clubs ADD COLUMN tagline TEXT DEFAULT 'Growing Together';
   ALTER TABLE clubs ADD COLUMN strava_hashtag_prefix TEXT DEFAULT '#SOSG';
   ALTER TABLE clubs ADD COLUMN locale TEXT NOT NULL DEFAULT 'en-SG';
   ```

3. **Backfill the existing row:**
   ```sql
   UPDATE clubs SET slug = 'sosg' WHERE slug = 'default';
   ```

4. **Create a backward-compatible view** so any code not yet updated still works:
   ```sql
   CREATE VIEW club_settings AS SELECT * FROM clubs;
   ```

5. **Add an index on slug:**
   ```sql
   CREATE INDEX idx_clubs_slug ON clubs (slug);
   ```

6. **Update `src/lib/supabase/database.types.ts`:**
   - Rename the `club_settings` key inside `Tables` to `clubs`
   - Add the new columns to the `Row`, `Insert`, and `Update` types:
     - `slug: string` (Row), `slug?: string` (Insert/Update)
     - `tagline: string | null` (Row), `tagline?: string | null` (Insert/Update)
     - `strava_hashtag_prefix: string | null` (Row), `strava_hashtag_prefix?: string | null` (Insert/Update)
     - `locale: string` (Row), `locale?: string` (Insert/Update)
   - **Keep the `club_settings` key as well** (because the view exists), pointing to the same type shape. The simplest way: define the `clubs` type, then add `club_settings: typeof clubs` or duplicate the type.

7. **Update `src/lib/supabase/types.ts`:**
   - Change `export type ClubSettings = Database['public']['Tables']['club_settings']['Row']` to:
     ```typescript
     export type Club = Database['public']['Tables']['clubs']['Row']
     /** @deprecated Use Club instead */
     export type ClubSettings = Club
     ```

### Test cases

Create `tests/unit/clubs-migration.spec.ts`:

1. **`clubs` type has all original columns** — Verify `Club` type includes `id`, `name`, `logo_url`, `home_location`, `session_day`, `session_time`, `strava_club_id`, `timezone`, `updated_at`
2. **`clubs` type has new columns** — Verify `Club` type includes `slug`, `tagline`, `strava_hashtag_prefix`, `locale`
3. **`ClubSettings` is assignable to `Club`** — Type compatibility check (TypeScript `satisfies` or assignment test)
4. **slug has correct default** — Verify the type allows `slug` to be optional on Insert (defaults in DB)
5. **locale has correct default** — Verify the type allows `locale` to be optional on Insert (defaults in DB)

### Do NOT skip the test file.

### Common failure modes
- Forgetting to update BOTH `Row` and `Insert`/`Update` types in `database.types.ts`
- The view `club_settings` must include ALL columns from `clubs` including the new ones
- The `slug` unique constraint must exist — it's needed for future subdomain routing

### Build gate
```bash
npm run build && npm test && npm run lint
```

---

## Prompt 2 of 4 — `getClub()` Helper + Update All Data Fetchers

### Instructions

Read `CLAUDE.md` for project conventions before starting.

**Step 1: Create `src/lib/club.ts`**

```typescript
import { adminClient } from '@/lib/supabase/admin'
import type { Club } from '@/lib/supabase/types'

let cachedClub: Club | null = null

/**
 * Fetch the club configuration. Single source of truth for club name,
 * timezone, locale, tagline, and all club-level settings.
 *
 * Uses a module-level cache that resets per serverless invocation
 * (Next.js Server Components run in fresh module scope per request in production).
 *
 * For multi-tenancy (future): accept an optional clubId parameter.
 */
export async function getClub(): Promise<Club> {
  if (cachedClub) return cachedClub

  const { data, error } = await adminClient
    .from('clubs')
    .select('*')
    .limit(1)
    .single()

  if (error || !data) {
    throw new Error('Failed to load club settings')
  }

  cachedClub = data
  return data
}

/**
 * Reset the cache. Call this after updating club settings
 * so the next getClub() call fetches fresh data.
 */
export function resetClubCache(): void {
  cachedClub = null
}
```

**Step 2: Update all files that currently query `club_settings` or `clubs` directly**

Replace every `adminClient.from('club_settings').select(...)` and `adminClient.from('clubs').select(...)` call with `getClub()`. There are exactly these locations:

| File | Current pattern | Change to |
|------|----------------|-----------|
| `src/app/admin/settings/page.tsx` | `adminClient.from('club_settings').select('*').limit(1).maybeSingle()` | `getClub()` — pass full `club` object to `ClubSettingsForm` |
| `src/app/admin/settings/actions.ts` | `adminClient.from('club_settings').select('id')...` and `.from('club_settings').update(...)` and `.from('club_settings').insert(...)` | Change all `.from('club_settings')` to `.from('clubs')`. After successful update, call `resetClubCache()`. |
| `src/app/athletes/[id]/page.tsx` | `adminClient.from('club_settings').select('name').limit(1).single()` | `getClub()` — use `club.name` instead of `clubSettingsRow?.name` |
| `src/app/milestone/[id]/page.tsx` | `adminClient.from('club_settings').select('name').limit(1).single()` | `getClub()` — use `club.name` |
| `src/lib/feed/coach-data.ts` | `adminClient.from('club_settings').select('name').limit(1).single()` | `getClub()` — use `club.name` instead of `clubSettingsRow?.name ?? 'SOSG Running Club'` |
| `src/lib/feed/caregiver-data.ts` | `adminClient.from('club_settings').select('name').limit(1).single()` | `getClub()` — use `club.name` instead of `clubSettingsRow?.name ?? 'SOSG Running Club'` |

**Critical:** Remove ALL `?? 'SOSG Running Club'` fallbacks. The club name comes from the database. If `getClub()` fails, it throws — that's the correct behavior (the app can't function without club config).

**Step 3: Update the admin settings form**

In `src/app/admin/settings/page.tsx`, pass the new fields to `ClubSettingsForm`:
```typescript
const club = await getClub()
// ...
<ClubSettingsForm
  name={club.name}
  homeLocation={club.home_location}
  sessionDay={club.session_day}
  sessionTime={club.session_time}
  stravaClubId={club.strava_club_id}
  tagline={club.tagline}
  locale={club.locale}
  stravaHashtagPrefix={club.strava_hashtag_prefix}
/>
```

Update `src/components/admin/ClubSettingsForm.tsx` to include form fields for the new settings: `tagline`, `locale` (a text input for now), and `strava_hashtag_prefix`. Add these at the bottom of the existing form.

Update `src/app/admin/settings/actions.ts` — the `updateClubSettings` action should read and persist the new fields (`tagline`, `locale`, `strava_hashtag_prefix`) from formData, writing to `clubs` not `club_settings`.

**Step 4: Update the metadata title in `src/app/admin/settings/page.tsx`**

Change from static:
```typescript
export const metadata: Metadata = { title: 'Club Settings — SOSG Running Club' }
```
to dynamic using `generateMetadata`:
```typescript
export async function generateMetadata(): Promise<Metadata> {
  const club = await getClub()
  return { title: `Club Settings — ${club.name}` }
}
```

Do the same for `src/app/admin/audit/page.tsx`, `src/app/admin/page.tsx`, and `src/app/admin/milestones/page.tsx` — all have hardcoded `SOSG Running Club` in their metadata.

### Test cases

Create `tests/unit/get-club.spec.ts`:

1. **`getClub()` returns all expected fields** — Mock `adminClient.from('clubs').select('*')...single()` to return a full club object. Verify the result includes `name`, `timezone`, `locale`, `tagline`, `slug`, `strava_hashtag_prefix`.

2. **`getClub()` returns cached result on second call** — Call `getClub()` twice. Verify `adminClient.from` is only called once.

3. **`resetClubCache()` clears the cache** — Call `getClub()`, then `resetClubCache()`, then `getClub()` again. Verify `adminClient.from` is called twice.

4. **`getClub()` throws on database error** — Mock `adminClient` to return `{ data: null, error: { message: 'fail' } }`. Verify `getClub()` throws.

5. **Coach feed uses club name from `getClub()`** — In the existing coach-data tests (if they exist) or a new test, verify that the feed data loader calls `getClub()` and uses its `name` field, not a hardcoded string.

6. **Caregiver feed uses club name from `getClub()`** — Same as above for caregiver feed.

### Do NOT skip the test file.

### Common failure modes
- Importing `getClub` in a client component — it uses `adminClient` which is server-only. It must only be called in Server Components, Server Actions, or server-side library code.
- Forgetting to call `resetClubCache()` after the settings update action — the admin would save new settings but the app would keep showing old values until the next cold start.
- The `Promise.all` batches in `coach-data.ts` and `caregiver-data.ts` currently include the `club_settings` query. When replacing with `getClub()`, make sure it's still inside the `Promise.all` (or called before it) so it doesn't add an extra waterfall.
- The `generateMetadata` function must be `async` and exported as a named export. It replaces the `metadata` const export — you cannot have both.

### Build gate
```bash
npm run build && npm test && npm run lint
```

---

## Prompt 3 of 4 — Replace All Hardcoded Club Name References

### Instructions

Read `src/lib/club.ts` (created in Prompt 2) before starting. This is the `getClub()` helper.

This prompt replaces every remaining hardcoded "SOSG Running Club" string in application code with the dynamic club name. There are ~70 remaining references after Prompt 2.

**The rule:** If a string is the club's name, tagline, or a combination like "SOSG Running Club — Growing Together", it must come from `getClub()` on the server or be passed as a prop to client components. If a string is platform branding (like "Powered by SOSG Running Club Hub"), leave it for now — that becomes "Powered by Kita" in Phase C.

### Group A: Page metadata (Server Components — use `generateMetadata`)

Convert these files from static `export const metadata` to dynamic `export async function generateMetadata()`:

| File | Current title | New title |
|------|--------------|-----------|
| `src/app/layout.tsx` | `'SOSG Running Club'` | `club.name` (this is the root layout — use `getClub()`) |
| `src/app/feed/page.tsx` | `'Feed — SOSG Running Club'` | `'Feed — ${club.name}'` |
| `src/app/athletes/page.tsx` | `'Athletes — SOSG Running Club'` | `'Athletes — ${club.name}'` |
| `src/app/athletes/[id]/page.tsx` | Already dynamic but has `SOSG Running Club` fallback | Use `club.name` from `getClub()` |
| `src/app/athletes/[id]/edit/page.tsx` | `'Edit Athlete — SOSG Running Club'` | `'Edit Athlete — ${club.name}'` |
| `src/app/admin/athletes/new/page.tsx` | `'Add Athlete — SOSG Running Club'` | `'Add Athlete — ${club.name}'` |
| `src/app/account/page.tsx` | `'My Account — SOSG Running Club'` | `'My Account — ${club.name}'` |
| `src/app/login/layout.tsx` | `'Sign In — SOSG Running Club'` | `'Sign In — ${club.name}'` |
| `src/app/digest/page.tsx` | `'Weekly Notes — SOSG Running Club'` | `'Weekly Notes — ${club.name}'` |
| `src/app/about/page.tsx` | `'Why I Built This — SOSG Running Club'` | `'Why I Built This — ${club.name}'` |
| `src/app/about/caregiver/page.tsx` | `'Our Running Club — SOSG Running Club'` | `'Our Running Club — ${club.name}'` |
| `src/app/milestone/[id]/page.tsx` | Multiple SOSG references in metadata + page body | Use `club.name` and `club.tagline` |

**Important for `src/app/layout.tsx`:** This is the root layout. It currently has:
```typescript
title: 'SOSG Running Club',
description: 'Running club hub for coaches and athletes — growing together',
```
Change to:
```typescript
export async function generateMetadata(): Promise<Metadata> {
  const club = await getClub()
  return {
    title: club.name,
    description: `Running club hub for coaches and athletes — ${(club.tagline ?? 'growing together').toLowerCase()}`,
    appleWebApp: { title: club.name },
  }
}
```

Also update the visible header text in `layout.tsx` that currently says:
```tsx
SOSG Running Club
```
This needs the club name from `getClub()`. Since `layout.tsx` is a Server Component, call `getClub()` in the component body and use `club.name`.

### Group B: OG image routes (Server-side — use `getClub()` directly)

| File | Change |
|------|--------|
| `src/app/api/milestone/[id]/image/route.tsx` | Replace `'SOSG Running Club — Growing Together'` with `${club.name} — ${club.tagline}`. Call `getClub()` at the top of the handler. Also replace the `en-SG` locale in `toLocaleDateString` with `club.locale`. |
| `src/app/api/story/[id]/image/route.tsx` | Same pattern. |

### Group C: Email templates (add `clubName` and `tagline` parameters)

Update `src/lib/email/templates.ts`:

1. Change the `layout()` function signature to accept `clubName` and `tagline`:
   ```typescript
   function layout(content: string, clubName: string = 'Running Club', tagline: string = 'Growing Together'): string {
   ```
2. Replace the hardcoded `SOSG Running Club` in the header `<td>` with `${escapeHtml(clubName)}`
3. Replace the hardcoded `SOSG Running Club — Growing Together` in the footer with `${escapeHtml(clubName)} — ${escapeHtml(tagline)}`
4. Update every exported template function (`milestoneEmail`, `weeklyDigestEmail`, `caregiverDigestEmail`, `invitationEmail`) to accept `clubName` and `tagline` in their options object and pass them through to `layout()`.

Update all callers of these template functions:
- `src/app/admin/actions.ts` (invitation email) — fetch club via `getClub()`, pass `club.name` and `club.tagline`. Also replace the hardcoded subject `"You're invited to SOSG Running Club"` with `"You're invited to ${club.name}"`.
- `src/lib/email/weekly-digest.ts` — fetch club, pass to template functions.
- Any other file that calls template functions from `templates.ts`.

Update `src/lib/email/resend.ts`:
- The `DEFAULT_FROM` fallback currently says `'SOSG Running Club <noreply@sosg.run>'`. Change to use the `RESEND_FROM_EMAIL` env var only, with a generic fallback: `'Running Club <noreply@example.com>'`. The actual club name in the "from" field requires a runtime DB call which is not appropriate for a module-level constant. Leave a `// TODO: Per-club sender for multi-tenancy` comment.

### Group D: Story and certificate generators (add `clubName` parameter)

**`src/lib/story/narrative.ts`:**
- The `generateNarrative` function (or equivalent — check the actual export name) has hardcoded strings like `"joined SOSG Running Club in"` and `"is part of the SOSG Running Club family"`.
- Add a `clubName: string` parameter to the function signature.
- Replace all hardcoded SOSG references with the parameter.
- Update all callers (likely `src/lib/story/data.ts` or wherever the narrative is generated) to pass `club.name` from `getClub()`.

**`src/lib/certificate.ts`:**
- Line 129 has `doc.text('SOSG Running Club Hub', ...)`. The `CertificateData` type already includes `clubName`. Change this line to use `data.clubName` instead of the hardcoded string.

**`src/lib/pdf-report.ts`:**
- Line 159 has `doc.text('Generated from SOSG Running Club Hub · ...')`.
- Add `clubName: string` to the `generateProgressReport` function signature.
- Replace the hardcoded string with `Generated from ${clubName} · ${generatedDate}`.
- Update the caller in `src/components/athlete/ExportButton.tsx` to pass `clubName` (received as a prop from the parent Server Component).

### Group E: Client components (receive via props)

These client components have hardcoded SOSG strings and need the value passed as a prop:

| Component | Hardcoded string | Fix |
|-----------|-----------------|-----|
| `src/components/story/StoryFooter.tsx` | `"SOSG Running Club"` in share text and footer | Add `clubName` and `tagline` props. Parent Server Component passes from `getClub()`. |
| `src/components/nav/InstallBanner.tsx` | `"install SOSG Run on your device"` | Add `clubName` prop. Change to `install ${clubName} on your device`. Parent layout passes it. |
| `src/app/auth/accept-invite/page.tsx` | `"Welcome to SOSG Running Club"` | This is a Server Component — use `getClub()` directly. |
| `src/app/login/page.tsx` | `"SOSG Running Club"` in the visible header | This is a Client Component. The parent `login/layout.tsx` is a Server Component — fetch club there and pass down, OR make the login page itself a Server Component with a client form child. Choose the simpler approach. |
| `src/app/account/page.tsx` | `"The story behind SOSG Running Club"` text | Server Component — use `getClub()`. |
| `src/app/milestone/[id]/page.tsx` | `"SOSG Running Club"` in page body (line ~114) and `"SOSG Running Club — Growing Together"` (line ~192) | Server Component — use `getClub()`. |

### Group F: Remaining component SOSG references

| Component | String | Fix |
|-----------|--------|-----|
| `src/components/ui/PoweredByBadge.tsx` | `"Powered by SOSG Running Club Hub"` | **Leave as-is for now.** This becomes "Powered by Kita" in Phase C (platform branding). Add a `// TODO: Phase C — rebrand to Kita` comment. |
| `src/components/feed/WeeklyRecapCard.tsx` | `"growing together"` in the stats line | Add `tagline` prop. Parent passes from feed data (which already has `clubName`). |

### What NOT to change in this prompt

- **localStorage keys** (`sosg_onboarding_collapsed`, `sosg_hint_*`, etc.) — these are internal identifiers, not user-facing. Changing them would reset user preferences. Leave for Phase C.
- **Service worker cache names** (`sosg-v10`, `sosg-pending-nav`) — same reason. Phase C.
- **PWA manifest** (`manifest.json`) — Phase C.
- **PoweredByBadge** — Phase C platform branding.
- **Strava matching regex** — Prompt 4.
- **Timezone/locale references** — Phase B.

### Test cases

Create `tests/unit/dynamic-club-name.spec.ts`:

1. **No hardcoded 'SOSG Running Club' in src/ except allowed locations** — Use a grep-based test. Scan all `.ts` and `.tsx` files in `src/` for the literal string `'SOSG Running Club'` or `"SOSG Running Club"`. The ONLY allowed locations are:
   - `src/lib/supabase/database.types.ts` (generated types)
   - `src/components/ui/PoweredByBadge.tsx` (Phase C)
   - Test fixtures
   - Comments containing `// TODO`

2. **Email layout() uses clubName parameter in header** — Call `layout('test', 'Test Club', 'Test Tagline')` and verify the HTML contains `Test Club` in the header section and `Test Club — Test Tagline` in the footer.

3. **invitationEmail() uses clubName in body** — Call `invitationEmail({ role: 'coach', inviterName: 'Alice', acceptUrl: '/accept', clubName: 'Test Club', tagline: 'Test' })` and verify the HTML contains `You're invited to Test Club`.

4. **generateNarrative() uses clubName parameter** — Call the narrative function with `clubName: 'Test Club'` and empty sessions. Verify the output contains `Test Club`, not `SOSG`.

5. **certificate PDF uses data.clubName** — Verify that `generateCertificatePdf` uses `data.clubName` (already in the type), not a hardcoded string. This can be a code-inspection test or a mock test.

6. **pdf-report uses clubName parameter** — Verify that `generateProgressReport` accepts and uses a `clubName` parameter.

7. **OG milestone image route fetches club from database** — Mock `getClub()` to return `{ name: 'Test Club', tagline: 'Test' }`. Verify the route handler uses those values.

8. **Root layout title is dynamic** — Verify `src/app/layout.tsx` exports `generateMetadata` (not a static `metadata` const).

### Do NOT skip the test file.

### Common failure modes
- **`generateMetadata` and `metadata` cannot coexist** in the same file. Delete the `export const metadata` when adding `export async function generateMetadata`.
- **Client Components cannot call `getClub()`** — they must receive the club name as a prop. If you're tempted to call `getClub()` in a component with `'use client'`, stop — pass it from the parent Server Component instead.
- **The `layout()` function in `templates.ts` is not exported** — it's called by the exported template functions. Update its signature but keep it private. The exported functions pass `clubName`/`tagline` through.
- **`src/app/login/page.tsx` is a client component** (`'use client'` at top). The club name must be passed from `login/layout.tsx` (Server Component) or from a server-rendered wrapper.
- **Don't break the `Promise.all` batches** in feed loaders. If you replace the `club_settings` query with `getClub()`, keep it inside the `Promise.all` or ensure it doesn't add waterfall latency.

### Build gate
```bash
npm run build && npm test && npm run lint
```

---

## Prompt 4 of 4 — Dynamic Strava Hashtag Prefix

### Instructions

Read `src/lib/club.ts` (the `getClub()` helper) and `src/lib/strava/matching.ts` before starting.

**Step 1: Refactor `extractAthleteNames()` in `src/lib/strava/matching.ts`**

Currently the function has a hardcoded regex built around the literal string `sosg`:

```typescript
const sosgPattern = /(?:#sosg|sosg)\s+([^#]+)/gi
```

Change the function signature to accept a `prefix` parameter:

```typescript
export function extractAthleteNames(text: string, prefix: string): string[] {
```

Build the regex dynamically from the prefix:

```typescript
// Escape special regex characters in the prefix, strip leading # if present
const cleanPrefix = prefix.replace(/^#/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const prefixPattern = new RegExp(`(?:#${cleanPrefix}|${cleanPrefix})\\s+([^#]+)`, 'gi')
```

Replace all references to `sosg` in the function body:
- The "Pattern 2" section that removes sosg segments: update to use the dynamic prefix
- The check `if (match[1].toLowerCase() === 'sosg') continue` → `if (match[1].toLowerCase() === cleanPrefix.toLowerCase()) continue`

**Step 2: Update all callers of `extractAthleteNames()`**

Find every call to `extractAthleteNames()` in the codebase (likely in `src/lib/strava/sync.ts` and possibly `src/lib/strava/matching.ts` itself) and pass the prefix:

```typescript
import { getClub } from '@/lib/club'

const club = await getClub()
const prefix = club.strava_hashtag_prefix ?? '#SOSG'
const names = extractAthleteNames(activityTitle, prefix)
```

**Step 3: Update the unmatched activity notification**

In `src/lib/strava/sync.ts`, there's a hardcoded message:
```
"... add #sosg <n> to the Strava title and re-sync."
```

Change this to use the dynamic prefix:
```typescript
const club = await getClub()
const prefix = club.strava_hashtag_prefix ?? '#SOSG'
// ...
`... add ${prefix} <name> to the Strava title and re-sync.`
```

Make sure `getClub()` is called once at the top of the sync handler, not repeatedly inside loops.

### Test cases

Update `tests/unit/strava-matching.spec.ts` (or create if it doesn't exist):

1. **`extractAthleteNames` works with default SOSG prefix** — `extractAthleteNames('Morning run #sosg Alex Tan', '#SOSG')` returns `['Alex Tan']`. This verifies backward compatibility.

2. **`extractAthleteNames` works with custom prefix** — `extractAthleteNames('Morning run #SUNBEAM Wei Lin', '#SUNBEAM')` returns `['Wei Lin']`.

3. **`extractAthleteNames` is case-insensitive on prefix** — `extractAthleteNames('Morning run #Sunbeam Wei', '#SUNBEAM')` returns `['Wei']`.

4. **`extractAthleteNames` handles prefix with special regex characters** — `extractAthleteNames('Morning run #C++ Alex', '#C++')` returns `['Alex']` (tests regex escaping).

5. **Multiple names with custom prefix** — `extractAthleteNames('#SUNBEAM Wei #SUNBEAM Alex Tan', '#SUNBEAM')` returns `['Wei', 'Alex Tan']`.

6. **Unmatched notification uses dynamic prefix** — Mock `getClub()` to return `{ strava_hashtag_prefix: '#MYCLUB' }`. Verify the notification message contains `#MYCLUB`, not `#sosg`.

### Do NOT skip the test file.

### Common failure modes
- **Regex injection** — if the prefix contains characters like `+`, `(`, `)`, `.`, they must be escaped before being put in a regex. The `replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` call handles this.
- **The prefix in the DB includes the `#`** — e.g., `'#SOSG'`. The regex needs to handle both `#sosg` (with hash) and `sosg` (without hash) in activity titles. The current code does this with `(?:#sosg|sosg)` — the dynamic version must preserve this pattern.
- **Calling `getClub()` inside a loop** — the Strava webhook handler may process multiple activities. Call `getClub()` once at the top, not per activity.
- **Existing tests** — if there are existing tests for `extractAthleteNames` that don't pass a prefix, update them to pass the prefix parameter. Don't break existing tests.

### Build gate
```bash
npm run build && npm test && npm run lint
```

---

## Summary

| Prompt | What | Files created/modified | Test cases |
|--------|------|----------------------|------------|
| 1 | DB migration + types | 1 migration, 2 type files | 5 |
| 2 | `getClub()` helper + data fetchers | ~8 files | 6 |
| 3 | All hardcoded club name references | ~25 files | 8 |
| 4 | Strava hashtag prefix | ~3 files | 6 |
| **Total** | | **~35 files** | **25** |

After all 4 prompts, changing the club name, tagline, or Strava prefix in admin settings propagates everywhere. The app looks and behaves identically. Zero user-facing changes. The foundation is set for Phase B (timezone/locale) and eventually 4.1.2 (full multi-tenancy).
