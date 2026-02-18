# Phase 2: Shell & Layout Primitives - Mapping Documentation

## Overview
Phase 2 introduces a production-grade app shell structure that provides consistent layout across all screens while maintaining backward compatibility with the spec-driven renderer.

## Architecture Changes

### Old Pattern (Phase 1)
```
page.tsx
  ├─ SpecGate (routes pages to screens)
  └─ ScreenRenderer
     ├─ <main className="page">
     │  └─ Screen components (title + children)
     └─ Direct content rendering
```

**Issues:**
- No global navigation
- No consistent header structure
- Layout decisions embedded in CSS
- Limited responsive control per screen

### New Pattern (Phase 2)
```
layout.tsx (Root)
  └─ AppShell (5-section wrapper)
     ├─ TopBar (logo, actions) - sticky @64px
     ├─ NavTabs (Athletes, Profile) - sticky @120px
     ├─ Main Content Wrapper
     │  ├─ PageHeader (optional, title + actions)
     │  ├─ FilterRow (optional, sticky filters)
     │  ├─ Content Area (scrollable)
     │  │  └─ SpecGate → ScreenRenderer
     │  └─ Nav Spacer (prevents overlap)
     └─ Bottom Nav compensation
```

**Improvements:**
- ✅ Consistent global navigation
- ✅ Reusable shell structure
- ✅ Cleaner separation: shell logic vs. screen content
- ✅ Full responsive control (desktop/tablet/mobile)
- ✅ Sticky positioning without layout shift
- ✅ Accessibility-first (44px+ touch targets)

---

## Layout Primitive Mapping

| Component | Old Approach | New Approach | Location |
|-----------|--------------|--------------|----------|
| **Top Bar** | None (no global header) | `.app-topbar` (sticky @64px) | AppShell section 1 |
| **Navigation** | Not present | `.app-nav-tabs` (sticky @120px) | AppShell section 2 |
| **Page Title** | Hardcoded in screen title | Removed from ScreenRenderer | Implicit in AppShell |
| **Page Layout** | `.page` class CSS | `.app-content-wrapper` | AppShell wrapper |
| **Content Padding** | `padding: 32px` (desktop) | `padding: 16px` (mobile), `32px` (tablet/desktop) | `.app-content` |
| **Max Width** | `max-width: 800px` (limited) | `max-width: 1280px` (production) | Both mobile-first responsive |
| **Responsive Behavior** | Single breakpoint | Multiple: mobile (16px), tablet (32px), desktop (1280px) | Media queries in shell CSS |

---

## File Changes Summary

### New Files
- `src/components/AppShell.tsx` (155 lines)
  - Main shell wrapper component
  - 5 sections: TopBar, NavTabs, MainContent, PageHeader, FilterRow
  - Conditional rendering based on auth state
  - Auto-hides on login/register screens

### Modified Files

#### `src/app/layout.tsx`
**Before:**
```tsx
export default function RootLayout({ children }) {
  return <html><body>{children}</body></html>;
}
```

**After:**
```tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
```
- Now wraps all routes with AppShell
- AppShell handles shell visibility logic

#### `src/components/ScreenRenderer.tsx`
**Before:**
```tsx
return (
  <main className="page">
    <h1>{screen.title}</h1>
    {screen.components.map(...)}
  </main>
);
```

**After:**
```tsx
return (
  <div>
    {screen.layout?.type !== 'centered' && <h1>{screen.title}</h1>}
    {screen.components.map(...)}
  </div>
);
```
- Removed `.page` wrapper (now provided by AppShell)
- Conditional title rendering based on layout type
- Cleaner content output

#### `src/components/SpecGate.tsx`
**Before:**
```tsx
return <ScreenRenderer screenId={screenId} routeParams={routeParams} />;
```

**After:**
```tsx
const isCentered = screen?.layout?.type === 'centered';
return (
  <div style={isCentered ? { display: 'flex', ... } : undefined}>
    <ScreenRenderer screenId={screenId} routeParams={routeParams} />
  </div>
);
```
- Added centered layout support for login/register
- Flexbox centering for auth screens

#### `src/styles/tokens.css`
**Added sections:**
- `.app-shell` (main container)
- `.app-topbar` (header @64px, sticky, border-bottom)
- `.app-nav-tabs` (nav @120px, sticky, tab buttons)
- `.app-content-wrapper` (flex column, scrollable)
- `.app-page-header` (optional title section)
- `.app-filter-row` (optional sticky filters)
- `.app-content` (main content with 1280px max-width)
- `.app-nav-spacer` (compensation for sticky nav)

**Responsive Breakpoints:**
- Mobile: `16px` side padding, full-width
- Tablet (768px+): `32px` side padding, max `1280px`
- Desktop (1280px+): centered `1280px` container

---

## CSS Class Reference (New)

### Core Shell
- `.app-shell` — Main container (flex column, min-height 100vh)
- `.app-topbar` — Header bar (sticky @top: 0, z-index: 100)
- `.app-nav-tabs` — Navigation bar (sticky @top: 64px, z-index: 90)
- `.app-content-wrapper` — Scrollable main area (flex: 1)
- `.app-content` — Content box (max-width: 1280px, auto margins)

### Sub-components
- `.app-topbar-content` — Inner wrapper (max-width: 1280px)
- `.app-nav-tabs-content` — Tab container
- `.app-nav-tab` — Individual tab button
- `.app-page-header` — Optional title section
- `.app-filter-row` — Optional filter bar
- `.app-nav-spacer` — Bottom spacer (80px height)

### Utilities
- `.icon-button` — Minimal icon button (no border, no background)
- `.app-logo` — Logo text in topbar

---

## Responsive Breakpoints

| Media | Padding | Max Width | Use Case |
|-------|---------|-----------|----------|
| Mobile (`<768px`) | `16px` | `100%` | Phone screens |
| Tablet (`768px-1280px`) | `32px` | `100%` | iPad, split views |
| Desktop (`≥1280px`) | `32px` | `1280px` | Desktop monitors |

---

## Screen-Specific Behavior

### Login / Register
- AppShell hides (shell.hideShell condition)
- Content area centered (100vh, flexbox center)
- Full screen form layout

### Athlete List
- AppShell visible (authenticated)
- TopBar shows (sticky at top)
- NavTabs shows (Athletes tab active)
- Search + filters in content area
- List with pagination

### Athlete Detail
- AppShell visible (authenticated)
- TopBar shows (sticky)
- NavTabs shows (Athletes tab active)
- PageHeader could show athlete name (optional, not yet implemented)
- Tabs (Feed, Cues, Settings) in content area

---

## Migration Checklist

- [x] Create AppShell component
- [x] Update root layout.tsx to use AppShell
- [x] Update ScreenRenderer to remove `.page` wrapper
- [x] Update SpecGate for centered layouts
- [x] Add shell styles to tokens.css
- [x] Responsive breakpoints: mobile, tablet, desktop
- [x] Sticky positioning without layout shift
- [x] Navigation tabs with active state
- [x] Tests passing (build, unit, E2E)
- [ ] Screenshots for visual validation (pending)

---

## Known Limitations / Future Enhancements

1. **PageHeader section** — Currently not populated by screens; could be used for breadcrumbs, back buttons
2. **FilterRow section** — Not populated; reserved for future filter UI component
3. **Two-column layouts** — Not implemented; can be added in Phase 3 (atom/state screens)
4. **Sticky nav spacer** — Fixed at 80px; could be made dynamic based on content height
5. **Tab navigation** — Currently uses `window.location.href`; should use Next.js router for better UX

---

## Testing Impact

| Test Suite | Result | Notes |
|-----------|--------|-------|
| Build | ✅ PASS | No TypeScript errors, bundle size unchanged |
| Unit | ✅ PASS | 44/44 tests passing (spec/actions untouched) |
| E2E | ✅ PASS | 14/14 passing (6 skipped pre-existing) |
| Visual | 📸 Pending | Screenshots needed for 3 screens × 2 viewports |

---

## Backward Compatibility

✅ **Maintained:**
- Spec-driven renderer fully functional
- All screens still use AppSpec
- State management unchanged
- Route structure unchanged
- Component rendering unaffected

❌ **Breaking Changes:**
- None (this is a layout refactor only)

---

## Next Steps (Phase 3+)

- Implement PageHeader + FilterRow for specific screens
- Two-column layouts with context panels
- Advanced state visibility (modals, sidebars, conditionals)
- Animation/transition on navigation
- Accessibility improvements (ARIA labels, focus management)
