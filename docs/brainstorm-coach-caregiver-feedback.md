# Brainstorm: Coach-to-Caregiver Feedback & Expectation Alignment

## The Two Scenarios We're Solving

### Scenario A: "Aunty Bibo expects 7min/km pace for Nicholas"
**Problem:** Caregiver has inflated performance expectations. She doesn't know Nicholas's actual pace.
**Root cause:** The app shows "2.1 km · 20 min" but never says "pace: 9:30/km". The caregiver has no reference point.
**What would fix it:** If Aunty Bibo opened the app and saw Nicholas's actual pace (9:30/km) prominently displayed, she'd never ask for 7min/km. The data speaks for itself.

### Scenario B: "Grandma thinks Gayatri is a fast runner (she can't run yet)"
**Problem:** Caregiver has a completely wrong mental model of where the athlete is. Was rude to coaches because of it.
**Root cause:** There's nothing in the app that communicates "Gayatri is at the walk-run interval stage." The caregiver fills the void with assumptions.
**What would fix it:** If Grandma saw a coach's note saying "Gayatri is building up to continuous running with walk-run intervals" and a progress card showing 0.5km sessions, the reality would be clear.

---

## What Caregivers See TODAY (The Current Screen)

```
┌─────────────────────────────────────────────┐
│  Good morning, Aunty Bibo                   │
│  Here's how Nicholas is doing this month    │
│                                             │
│    7 runs     25.3 km     😊🙂😊🔥😊      │
│                                             │
│  View Nicholas's journey story →            │
├─────────────────────────────────────────────┤
│  MILESTONES & PROGRESS                      │
│  🏅 First Run  🏅 5 Sessions  🏅 1km Club  │
│                                             │
│  🎯 10 Sessions    ████████░░  8/10         │
│     Just 2 more runs to go!                 │
├─────────────────────────────────────────────┤
│  WHAT COACHES ARE SAYING ABOUT NICHOLAS     │
│  ❝ Great effort today, kept a steady pace   │
│     throughout the whole run ❞              │
│    — Coach Grace · March 10                 │
├─────────────────────────────────────────────┤
│  SEND ENCOURAGEMENT                         │
│  ┌──────────┐  ┌──────────────┐            │
│  │Go Nick!🎉│  │You got this!💪│            │
│  └──────────┘  └──────────────┘            │
├─────────────────────────────────────────────┤
│  THIS WEEK                                  │
│  ┌─────────────────────────────────────┐    │
│  │ ┃ Coach Grace ran with Nicholas     │    │
│  │ ┃              2.1 km   😊         │    │
│  │ ┃ 20 min · March 14, 2026          │    │
│  │ ┃ "Good steady run today"          │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

**The gap:** Aunty Bibo sees "2.1 km · 20 min" but the app never tells her that's ~9:30/km pace. She has no frame of reference. For Grandma, she sees nothing about *what Gayatri is working on* — just raw session data (if any).

---

## IDEA 1: Show Pace on Session Cards

**Solves:** Scenario A (Aunty Bibo / pace expectations)
**Effort:** Low — calculate `duration / distance`, display next to existing metrics
**Where:** Every session card in the feed, visible to all roles

### What changes on screen

```
  BEFORE                              AFTER
  ┌───────────────────────┐          ┌───────────────────────────┐
  │ ┃ Grace ran with Nick  │          │ ┃ Grace ran with Nick      │
  │ ┃         2.1 km  😊  │          │ ┃     2.1 km  9:31/km  😊 │
  │ ┃ 20 min · March 14   │          │ ┃ 20 min · March 14       │
  └───────────────────────┘          └───────────────────────────┘
```

That's it. One small addition. But now when Aunty Bibo scrolls through Nicholas's last 10 sessions and every single one says "9:20/km", "9:45/km", "9:10/km" — she understands his pace range without anyone having to tell her.

### Coach workflow
**No change.** Coaches log runs the same way (distance + duration). Pace is auto-calculated.

### Caregiver experience
Aunty Bibo opens the app, scrolls through recent runs, and sees Nicholas consistently runs ~9:30/km. When she thinks about Chiang Mai, she now has a real number. No coach needs to have an awkward conversation.

---

## IDEA 2: "Currently Working On" Status

**Solves:** Scenario B (Grandma / wrong mental model of ability level)
**Effort:** Low — two new text fields on athlete record + display on both profile and caregiver feed
**Where:** Coach edits it on the **athlete profile page** (dedicated card), caregiver sees it on their feed

### Placement Decision: Own Card on the Athlete Profile Page

**Why not the edit page?** Coaches rarely visit the edit page — it's for one-time admin tasks (medical info, emergency contacts). They'd never find "working on" there or remember to update it.

**Why a dedicated card on the profile page?** Coaches visit the athlete profile constantly (to log runs, check cues, write notes). A visible card between the Goal Progress bar and the Tab Bar means they see it every time. An empty state naturally prompts them to fill it in.

### Coach workflow — on the athlete profile page

```
  ATHLETE PROFILE (coach view)
  ┌─── PROFILE STRIP ─────────────────────────┐
  │  🎯 Complete 2km without stopping          │
  │  🏥 No medical concerns                    │
  └────────────────────────────────────────────┘

  ┌─── GOAL PROGRESS ─────────────────────────┐
  │  🎯 Session count   4 / 10                │
  │  ████████░░░░░░░░░░░░░░░░░░░░░            │
  └────────────────────────────────────────────┘

  ┌─── NEW: WORKING ON ───────────────────────┐
  │  🏃 Walk-run intervals, building to       │
  │     2 min running / 1 min walking          │
  │                                            │
  │  📈 Can now run 90 seconds without         │
  │     stopping. Great improvement!           │
  │                                            │
  │  Updated by Coach Grace · Mar 1   [Edit]  │
  └────────────────────────────────────────────┘

  ┌─── CHEERS FROM HOME ──────────────────────┐
  │  ...                                       │
  └────────────────────────────────────────────┘

  ┌ Runs │ Cues │ Notes │ Photos │ Story ──────┐
```

**When empty (first time):**
```
  ┌─── WORKING ON ────────────────────────────┐
  │  What is Gayatri working on right now?     │
  │                                            │
  │  Add a short status to help caregivers     │
  │  understand what stage Gayatri is at.      │
  │                                            │
  │                            [Add status]    │
  └────────────────────────────────────────────┘
```

**Edit flow:** Coach clicks [Edit] or [Add status] → inline expansion or small modal with two fields:
```
  ┌─── EDIT: WORKING ON ─────────────────────┐
  │                                            │
  │  What is Gayatri working on right now?     │
  │  ┌────────────────────────────────────────┐│
  │  │ Walk-run intervals, building to 2 min ││
  │  │ running / 1 min walking               ││
  │  └────────────────────────────────────────┘│
  │                                            │
  │  Recent progress (optional):               │
  │  ┌────────────────────────────────────────┐│
  │  │ Can now run for 90 seconds without    ││
  │  │ stopping                              ││
  │  └────────────────────────────────────────┘│
  │                                            │
  │  ℹ️ Visible to Gayatri's caregiver.        │
  │                                            │
  │  [Cancel]                     [Save]       │
  └────────────────────────────────────────────┘
```

Coach writes 1-2 sentences, hits Save. Updates ~once a month. Done.

**Why coaches will actually use this:**
1. They **see it every time** they open an athlete's profile (it's above the tabs)
2. The **empty state prompts** them — "What is Gayatri working on?" is a natural question
3. It's **fast** — two short text fields, not a full form
4. They can see **their own status** — it serves as a quick reference for themselves too
5. It's **inline editable** on the page they already use daily

### What the caregiver sees (on their feed)

This status appears **prominently** on the caregiver feed, right under the monthly stats:

```
  ┌─────────────────────────────────────────────┐
  │  Good morning, Grandma                      │
  │  Here's how Gayatri is doing this month     │
  │                                             │
  │    2 runs     0.8 km      🙂😊             │
  │                                             │
  │  ┌───────────────────────────────────────┐  │
  │  │ 🏃 WHAT GAYATRI IS WORKING ON       │  │
  │  │                                      │  │
  │  │ Walk-run intervals. Building up to   │  │
  │  │ 2 minutes running, 1 minute walking. │  │
  │  │                                      │  │
  │  │ Recent progress:                     │  │
  │  │ Can now run for 90 seconds without   │  │
  │  │ stopping.                            │  │
  │  │                                      │  │
  │  │ Updated by Coach Grace · March 1     │  │
  │  └───────────────────────────────────────┘  │
  │                                             │
  │  View Gayatri's journey story →             │
  └─────────────────────────────────────────────┘
```

Now Grandma sees two things:
1. **"0.8 km total this month"** — factual session data
2. **"Walk-run intervals"** — coach's description of what Gayatri is working on

There's no room for the fantasy that Gayatri is a fast runner. The coach has told her, through the app, exactly where Gayatri is — without needing an awkward face-to-face conversation.

---

## IDEA 3: Progress Updates — Without Adding Another Writing Surface

**The problem with the original Idea 3:** Coaches already write in 5-8 places (session notes, coach notes, cues, story updates, communication notes, medical notes, running goal). Adding a new "progress update note" type would make the app feel like homework. Coaches will hate it.

**The coach's real need:** Caregivers need to see progress context. But that doesn't mean *coaches* need to write more.

### Option A: Auto-Generated Progress Summary (ZERO coach effort)

The app already has all the data. **Generate the summary automatically from session data:**

```
  CAREGIVER SEES (auto-generated, no coach action needed):
  ┌─────────────────────────────────────────────┐
  │  📊 NICHOLAS THIS MONTH                    │
  │                                             │
  │  7 runs · 25.3 km total                    │
  │  Average pace: 9:25 per km                 │
  │  Average distance: 3.6 km per run          │
  │  Longest run this month: 4.1 km            │
  │                                             │
  │  Compared to last month:                   │
  │  Distance per run: 2.8 km → 3.6 km  ↑     │
  │  Runs per week: 1.5 → 1.75          ↑     │
  │                                             │
  │  ██████████████████████░░░░ 3.6 km avg     │
  └─────────────────────────────────────────────┘
```

**How this works:**
- Computed entirely from `sessions` table data — no new writing needed
- Updates automatically as sessions are logged
- Month-over-month comparison gives context ("improving" vs "plateau")
- Pace displayed prominently addresses Scenario A directly

**Limitation:** Doesn't address Scenario B well. Auto-generated data can't say "working on walk-run intervals" — that requires human context.

### Option B: Enrich Idea 2 to Do Double Duty (TWO fields, athlete profile page)

Instead of a separate "progress update" note, make the **"Currently Working On" card from Idea 2 slightly richer** with a second optional "Recent progress" field. Both fields live on the **athlete profile page** as a dedicated card (see Idea 2 mockups above for the full design).

**Why this is better than a new note type:**
- Lives on the **athlete profile page** coaches already visit daily — not a new surface
- It's a **status** that gets updated occasionally, not a stream of notes
- Only 2 short fields, not a full form
- Replaces itself (latest update wins), no accumulating timeline
- Coaches see it every time they open the athlete, so they naturally keep it current

### Option C: Combine A + B (RECOMMENDED)

Use **both** approaches together:
- **Auto-generated data summary** (Option A) gives factual, numbers-based context — zero coach effort
- **"Working on" status** (Option B) gives narrative context — minimal coach effort (update occasionally)

```
  CAREGIVER FEED — COMBINED VIEW
  ┌─────────────────────────────────────────────┐
  │  Good morning, Grandma                      │
  │  Here's how Gayatri is doing this month     │
  │                                             │
  │    2 runs     0.8 km      🙂😊             │
  │                                             │
  │  ┌─ COACH UPDATE ─────────────────────────┐ │
  │  │ 🏃 Working on: Walk-run intervals,     │ │
  │  │ building to 2 min running / 1 min      │ │
  │  │ walking.                               │ │
  │  │                                        │ │
  │  │ Recent progress: Can now run for 90    │ │
  │  │ seconds without stopping.              │ │
  │  │                                        │ │
  │  │ — Coach Grace · March 1                │ │
  │  └────────────────────────────────────────┘ │
  │                                             │
  │  ┌─ AUTO SUMMARY ─────────────────────────┐ │
  │  │ 📊 This month: 2 runs · 0.8 km total  │ │
  │  │ Average distance: 0.4 km per run       │ │
  │  │ Average pace: 12:30 per km             │ │
  │  │                                        │ │
  │  │ vs last month: 0.3 km/run → 0.4 km ↑  │ │
  │  └────────────────────────────────────────┘ │
  └─────────────────────────────────────────────┘
```

**Grandma now sees:**
1. Coach says "walk-run intervals" — she can't claim Gayatri is a fast runner
2. Data says "0.4 km per run at 12:30/km" — reality is unambiguous
3. Progress arrow shows improvement — so it's still positive and motivating

**Coach effort:** Update the "working on" field once a month (30 seconds). Everything else is automatic.

### How Option C solves the scenarios

**Aunty Bibo (Scenario A):** Auto-summary shows "Average pace: 9:25/km". Coach's note says "Working on: steady pacing at a comfortable effort." She sees the actual numbers and the coach's framing — 7min/km is clearly unrealistic.

**Grandma (Scenario B):** Coach's note says "Walk-run intervals, building to 2 min running." Auto-summary shows "0.4 km per run." Grandma can't maintain the illusion that Gayatri is a fast runner. But the "↑" arrow shows improvement, so it's still a positive story.

---

## IDEA 4: Athlete Progress Card (Data Visualization)

**Solves:** Scenario A primarily — gives visual proof of ability level
**Effort:** Medium — new component, data query, Recharts chart
**Where:** New card on caregiver feed, between the monthly stats and milestones

### What the caregiver sees

```
  ┌─────────────────────────────────────────────┐
  │  📊 NICHOLAS'S PROGRESS                    │
  │                                             │
  │  Recent pace                                │
  │  9:25 /km  (average of last 5 runs)        │
  │  ████████████████████░░░░ ← visual bar     │
  │                                             │
  │  Distance per run (last 8 weeks)            │
  │  km                                         │
  │  3 ┤              ·  ·                      │
  │  2 ┤     ·  ·  ·        ·                  │
  │  1 ┤  ·                                     │
  │  0 ┤──────────────────────→ weeks           │
  │    Jan    Feb    Mar                        │
  │                                             │
  │  Consistency: Ran 8 of the last 10 weeks    │
  │  ██████████████████░░░░                     │
  │                                             │
  │  Personal bests                             │
  │  🏃 Longest run: 2.8 km                    │
  │  ⏱  Best pace: 8:45 /km                    │
  └─────────────────────────────────────────────┘
```

### How this solves Scenario A

Aunty Bibo sees:
- **"Recent pace: 9:25/km"** — hard number, no ambiguity
- **Distance chart trending upward from 1km to 2.5km** — progress is real but gradual
- **"Best pace: 8:45/km"** — even his best is far from 7min/km

She can see exactly where Nicholas is. The chart shows improvement (motivating) but also shows reality (calibrating).

### Coach workflow
**No change.** This card is auto-generated from existing session data. Coaches don't need to do anything extra.

---

## How Each Idea Maps to the Coach's Points

```
┌──────────────────────┬───────────────────────┬───────────────────────┐
│                      │ SCENARIO A            │ SCENARIO B            │
│                      │ Aunty Bibo expects    │ Grandma thinks        │
│                      │ 7min pace for         │ Gayatri is a fast     │
│                      │ Nicholas              │ runner (she can't     │
│                      │                       │ run yet)              │
├──────────────────────┼───────────────────────┼───────────────────────┤
│ Idea 1:              │ ✅ DIRECT FIX         │ ○ Partial help        │
│ Show pace on         │ Every session card    │ If Gayatri has runs,  │
│ session cards        │ shows 9:30/km.        │ pace shows reality.   │
│                      │ Aunty Bibo sees it    │ But if she has few    │
│                      │ every time she        │ or no sessions, not   │
│                      │ scrolls.              │ much data to show.    │
├──────────────────────┼───────────────────────┼───────────────────────┤
│ Idea 2:              │ ○ Partial help        │ ✅ DIRECT FIX         │
│ "Currently           │ If coach writes       │ "Walk-run intervals"  │
│ working on"          │ "steady pacing at     │ immediately tells     │
│ status               │ 9-10min/km" it helps. │ Grandma where         │
│                      │                       │ Gayatri actually is.  │
├──────────────────────┼───────────────────────┼───────────────────────┤
│ Idea 3:              │ ✅ STRONG FIX         │ ✅ STRONG FIX         │
│ Progress update      │ "Next goal: 3km at    │ "Working on: walk-    │
│ notes                │ 9-10min/km" sets      │ run intervals" +      │
│                      │ realistic targets.    │ "Improved: can now    │
│                      │                       │ walk-run for 10 min"  │
├──────────────────────┼───────────────────────┼───────────────────────┤
│ Idea 4:              │ ✅ STRONG FIX         │ ○ Partial help        │
│ Progress card        │ "Avg pace: 9:25/km"   │ Chart with 0.3km,     │
│ with chart           │ + trend chart =       │ 0.5km sessions tells  │
│                      │ undeniable visual     │ a story, but early-   │
│                      │ evidence.             │ stage athletes have   │
│                      │                       │ little data.          │
└──────────────────────┴───────────────────────┴───────────────────────┘
```

**Key insight from the matrix:** No single idea solves both scenarios perfectly.
- Scenario A (inflated pace expectations) → best solved by **showing the data** (Ideas 1 & 4)
- Scenario B (wrong mental model of ability) → best solved by **coach narrative** (Ideas 2 & 3)

**Recommended combination:** Ideas 1 + 2 together cover both scenarios with LOW effort. Idea 3 adds depth for coaches who want to write more.

---

## Recommended Implementation Order

| Order | Idea | Effort | Coach effort | What it solves |
|-------|------|--------|-------------|----------------|
| 1st | Show pace on session cards | Low (UI-only) | Zero | Scenario A — pace reality |
| 2nd | "Working on" + "Recent progress" card on athlete profile page | Low (2 DB fields + UI) | 30 sec/month | Scenario B — ability context |
| 3rd | Auto-generated monthly summary card | Medium (data query + component) | Zero | Both — factual comparison |
| 4th | Athlete progress card with chart | Medium (Recharts component) | Zero | Scenario A — visual proof |

**Key design decision:** No new writing surfaces. The "working on" fields live on the existing athlete edit page. Everything else is auto-generated from session data. Total new coach effort: ~30 seconds per athlete per month.

---

## Dignity & Language Guardrails

All implementations must follow CLAUDE.md inclusive design principles:
- **Self-comparison only**: "Your longest run yet!" never rankings or comparisons
- **Celebrate effort**: "Ran 8 of 10 weeks" is worth celebrating
- **Literal language**: "Running pace: 9 minutes per kilometer" not "finding their stride"
- **No pressure**: Progress cards frame everything as a journey, never "not good enough"
- **Visual + number**: Always pair metrics with visual bars/charts (not everyone reads numbers)
- **Grade 9 reading**: Short sentences, one idea per sentence, active voice
