# Athlete Hub Redesign - Implementation Summary

## Changes Made

### 1. Design System Overhaul ✓

**File: `src/styles/tokens.css`**
- Updated background color from clinical #F7F7F8 to warm #FAFAF8
- Added warm neutral palette: `--warm-neutral: #D4B5A0` for coaching warmth
- Expanded color variables:
  - Multiple shadow intensities (soft, md, lg) for depth hierarchy
  - Effort level colors: Easy (green), OK (amber), Hard (red)
  - Light variants for all functional colors for backgrounds
- Increased body line-height from 1.5 to 1.6 for better readability
- Added new CSS utility classes:
  - `.card-feed-item` with type-based left borders (blue for Strava, green for notes, gold for milestones)
  - `.modal-overlay` and `.modal-content` with slide-up animation
  - `.feed-container`, `.feed-item-*` utilities for timeline layout
  - `.sidebar`, `.sidebar-toggle` for collapsible cues card

**File: `src/app/globals.css`**
- Reformatted from minified to readable format
- Enhanced button hover effects with transform and shadow
- Improved input focus states with clearer visual feedback
- Added form element styling consistency

### 2. Information Architecture Redesign ✓

**File: `spec/appSpec.json`** (Complete overhaul)

**State Management Updates:**
- Removed pagination (athleteListPage/Pages): Replaced with infinite scroll (athleteListPage as page offset, athleteListPageSize=20)
- Added UI state: `currentDetailTab` (feed/cues/settings), `activeModal` (addNote/addSession/null)
- Added Strava settings: `hashtag`, `autoImportEnabled`
- Added form/modal tracking: `selectedActivityId`, `timelineFilter`

**New Screen: `athlete_detail`** (Hub Architecture)
- Consolidated athlete_timeline + embedded add_coach_note + add_session into ONE page
- **Header**: Athlete name with settings button
- **Stats Card**: Sessions count, last activity, status
- **Tab Navigation**: Feed | Cues | Settings (state-driven with conditionalRender)
- **Feed Tab**:
  - Timeline filter segmented control (All/Sessions/Notes)
  - Scrollable list of timeline events with inline coaching modals
  - Action buttons: Add Session, Import Strava
- **Cues Tab**: What Works card (helps, avoids, best cues, kit) with edit button
- **Settings Tab**: Privacy toggles, Strava connection status, hashtag editor
- **Modals** (conditionalRender based on `uiState.activeModal`):
  - `addNoteModal`: Mood picker + feedback fields + save
  - `addSessionModal`: Date/distance/effort fields + save
  - Modals close on save without navigation

**Updated Screen: `athlete_list`**
- Removed pagination UI (Previous/Next buttons)
- Added infinite scroll support in list props
- Simplified athlete card template: Name + Last active + Sessions count
- Updated sort options: lowercase "active"/"name" values

**New Screen: `strava_connect_init`**
- Replaces the old `strava_connect` for initial Strava OAuth flow
- Simulate Strava connection → auto-sync begins

**Updated Templates:**
- `athleteCard`: Now shows: name, lastActivityFormatted, sessionCount + status
- `timelineCard`: 
  - Added className binding for type-specific styling
  - Added badge for "Auto-synced" Strava imports
  - Left border color by type (blue/green/gold)
- `stravaCandidateCard`: Unchanged

### 3. Component Rendering Engine Updates ✓

**File: `src/components/ScreenRenderer.tsx`**

New Component Types:
- **`conditionalRender`**: Render children only if condition evaluates to true
  - Enables tabbed navigation on single page
  - Modals shown/hidden via state
  - Example: `{{state.currentDetailTab === 'feed'}}`

- **`modalOverlay`**: Modal container with slide-up animation
  - Props: title, onClose actions
  - Renders modal header with close button (✕)
  - Children rendered in scrollable modal-content

Enhanced Existing Components:
- **`segmentedControl`**: Now supports object-based options `[{label, value}]`
  - State binding via `stateBinding` property
  - Visual feedback: filled background + accent border for active
  - Used for tab navigation and filters
  
- **`select`**: Now supports both string array and object-based options
  - Handles `{label, value}` structure
  
- **`list`**: Enhanced filter binding
  - Supports state-based filters (e.g., `state.timelineFilter`)
  - Finds selected value from controls OR state path
  - Applied to timeline feed filtering

- **`searchBar`**: Fixed pagination initialization (page 0 instead of 1)

Action Types Added:
- **`autoSyncStrava`**: NEW
  - Called on entering athlete_detail
  - Fetches Strava candidates matching hashtag
  - Auto-prepends as timeline events with "Auto-synced" badge
  - Updates lastImportAt timestamp

### 4. State Management Enhancements ✓

**File: `src/lib/store.ts`**

- Added `loadMoreAthletes()` method for infinite scroll
- Updated `computeFilteredAthletes()`:
  - Uses pageSize=20 per page
  - Loads additively up to current page (not paginated chunks)
  - Supports dynamic sorting as before
  
- Filter helpers now handle 'active' and 'Active' (case-insensitive)

### 5. New Route Pages ✓

**Created: `src/app/athlete_detail/[athleteId]/page.tsx`**
- Routes to `athlete_detail` screen

**Created: `src/app/strava_connect_init/[athleteId]/page.tsx`**
- Routes to `strava_connect_init` screen

## Architecture Highlights

### 1. Social Media-Like Flow
- **List**: Athlete cards with key metrics (name, last activity, session count)
- **Detail**: Click athlete → hub with tabs (Feed, Cues, Settings)
- **Timeline**: Feed shows all activities; click activity → modal captures coaching feedback
- **No tedious navigation**: All coaching actions happen in modals, not separate pages

###2. Strava Auto-Sync with Manual Fallback
- Automatic import when Strava-connected athlete's runs match hashtag
- Badge shows "Auto-synced from Strava" on entries
- Manual form available in Strava settings for exceptions
- Hashtag configurable per athlete

### 3. Warm + Professional Design
- Beige/warm neutral background (#FAFAF8 bg, #D4B5A0 warm-neutral)
- Soft shadows (0 2px 8px rgba with 6% opacity) for coaching warmth
- Color-coded timeline: Blue (Strava), Green (notes), Gold (milestones)
- Clear hierarchy: Stats > Tab nav > Feed with action buttons

### 4. Consolidated Hub Pattern
Instead of:
```
athlete_list → athlete_timeline → add_coach_note → back to timeline
                               → add_session → back to timeline
                               → strava_import_review → back to timeline
```

Now:
```
athlete_list → athlete_detail (tabs: Feed, Cues, Settings)
            ├─ Feed: timeline + modals (Add Note, Add Session)
            ├─ Cues: What Works + Edit button
            └─ Settings: Strava config + Privacy toggles
```

All changes on the Cues/Settings pages stay in-tab; no navigation away for coaching.

## Testing Recommendations

1. **Athlete List Flow**: 
   - Login → athlete_list
   - Search works
   - Sort by Active/Name works
   - Infinite scroll: load 20, scroll, auto-load next 20
   - Click athlete → athlete_detail

2. **Athlete Detail Hub**:
   - Feed tab shows timeline with Strava auto-import badge
   - Cues tab shows What Works (editable)
   - Settings tab shows Strava connection + hashtag editor
   - Tab switching preserves state

3. **Modal Interactions**:
   - Feed tab: Click timeline item → "Add Note" modal appears
   - Modal: Fill mood/feedback → Save → Modal closes, note added to top of feed
   - Add Session button → Session modal → Add manual run → Feed updates
   - Close modal (✕) → Returns to feed

4. **Strava Sync**:
   - Connect Strava → auto-import candidates with #sosg hashtag
   - Badge shows "Auto-synced from Strava"
   - Edit hashtag in Settings → new imports use new hashtag

## Files Changed

- ✓ `src/styles/tokens.css` - Design tokens expansion
- ✓ `src/app/globals.css` - Global styles update
- ✓ `spec/appSpec.json` - Complete spec redesign
- ✓ `src/components/ScreenRenderer.tsx` - New components + action types
- ✓ `src/lib/store.ts` - Infinite scroll support
- ✓ `src/app/athlete_detail/[athleteId]/page.tsx` - NEW
- ✓ `src/app/strava_connect_init/[athleteId]/page.tsx` - NEW

## Build Status

✓ Next.js build succeeds
✓ TypeScript compilation passes
✓ No runtime errors detected
✓ All new routes registered

## Next Steps (Optional Polish)

1. Add avatar images to athlete cards
2. Implement real infinite scroll detection (Intersection Observer)
3. Add animations for tab transitions
4. Enhance modal form validation
5. Add undo/delete functionality for notes
