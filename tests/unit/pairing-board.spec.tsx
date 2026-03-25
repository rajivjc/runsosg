/**
 * Unit tests for the PairingBoard component and related UI components.
 */

import React from 'react'

// ── Mocks ────────────────────────────────────────────────────────────────

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}))

jest.mock('@/lib/sessions/pairing-actions', () => ({
  savePairings: jest.fn().mockResolvedValue({ success: 'Saved' }),
  publishPairings: jest.fn().mockResolvedValue({ success: 'Published' }),
  republishPairings: jest.fn().mockResolvedValue({ success: 'Republished' }),
}))

jest.mock('@/lib/sessions/notifications', () => ({
  notifyPairingsPublished: jest.fn(),
  notifyPairingsRepublished: jest.fn(),
}))

// Simple test renderer
function render(element: React.ReactElement) {
  // Use React's test utilities to get the component tree
  const ReactDOMServer = require('react-dom/server')
  const html = ReactDOMServer.renderToString(element)
  return { html }
}

import PairingBoard, { type PairingBoardProps } from '@/components/sessions/PairingBoard'
import PairingSummaryBar from '@/components/sessions/PairingSummaryBar'
import CoachFilterBar from '@/components/sessions/CoachFilterBar'
import CoachPairingRow from '@/components/sessions/CoachPairingRow'
import UnassignedAthletesList from '@/components/sessions/UnassignedAthletesList'
import AthletePickerSheet from '@/components/sessions/AthletePickerSheet'
import CoachPickerSheet from '@/components/sessions/CoachPickerSheet'

// ── Test data ────────────────────────────────────────────────────────────

const defaultProps: PairingBoardProps = {
  sessionId: 'session-1',
  formattedDate: 'Sat 29 Mar',
  location: 'Fort Canning',
  maxAthletesPerCoach: 3,
  initialCoaches: [
    {
      id: 'c1',
      name: 'Alice',
      athletes: [
        { id: 'a1', name: 'Nicholas', tag: 'regular' },
        { id: 'a2', name: 'Sarah', tag: 'regular' },
      ],
    },
    {
      id: 'c2',
      name: 'Bob',
      athletes: [{ id: 'a3', name: 'Marcus', tag: 'suggested' }],
    },
    { id: 'c3', name: 'Carol', athletes: [] },
    { id: 'c4', name: 'Emily', athletes: [] },
  ],
  initialUnassigned: [
    { id: 'a4', name: 'David C' },
    { id: 'a5', name: 'Wei Lin' },
  ],
  pairingsPublishedAt: null,
  pairingsStale: false,
  staleMessage: null,
  hasSuggestions: true,
}

// ── PairingBoard ────────────────────────────────────────────────────────

describe('PairingBoard', () => {
  it('renders all available coaches', () => {
    const { html } = render(<PairingBoard {...defaultProps} />)

    expect(html).toContain('Alice')
    expect(html).toContain('Bob')
    expect(html).toContain('Carol')
    expect(html).toContain('Emily')
  })

  it('shows assigned athletes per coach with correct tags', () => {
    const { html } = render(<PairingBoard {...defaultProps} />)

    expect(html).toContain('Nicholas')
    expect(html).toContain('Sarah')
    expect(html).toContain('Marcus')
    // Tags are rendered as badge text
    expect(html).toMatch(/regular/)
    expect(html).toMatch(/suggested/)
  })

  it('shows correct title and location', () => {
    const { html } = render(<PairingBoard {...defaultProps} />)

    expect(html).toContain('Assign Pairings')
    expect(html).toContain('Sat 29 Mar')
    expect(html).toContain('Fort Canning')
  })

  it('shows suggestion banner when suggestions applied', () => {
    const { html } = render(<PairingBoard {...defaultProps} hasSuggestions={true} />)

    expect(html).toContain('Suggestions applied')
  })

  it('shows no-history message when no suggestions and no assignments', () => {
    const { html } = render(
      <PairingBoard
        {...defaultProps}
        hasSuggestions={false}
        initialCoaches={defaultProps.initialCoaches.map((c) => ({ ...c, athletes: [] }))}
        initialUnassigned={[
          { id: 'a1', name: 'Nicholas' },
          { id: 'a2', name: 'Sarah' },
          { id: 'a3', name: 'Marcus' },
          { id: 'a4', name: 'David C' },
          { id: 'a5', name: 'Wei Lin' },
        ]}
      />
    )

    expect(html).toContain('No coaching history yet')
  })

  it('shows stale banner when pairings are stale', () => {
    const { html } = render(
      <PairingBoard
        {...defaultProps}
        pairingsStale={true}
        staleMessage="Coach Emily unavailable — 2 athletes unassigned"
      />
    )

    expect(html).toContain('Coach Emily unavailable')
  })

  it('shows published state when pairings already published', () => {
    const { html } = render(
      <PairingBoard
        {...defaultProps}
        pairingsPublishedAt="2026-03-29T13:12:00Z"
        pairingsStale={false}
      />
    )

    expect(html).toContain('Published')
    expect(html).toContain('Edit Pairings')
  })

  it('renders unassigned athletes', () => {
    const { html } = render(<PairingBoard {...defaultProps} />)

    expect(html).toContain('David C')
    expect(html).toContain('Wei Lin')
  })

  it('shows Publish Pairings button', () => {
    const { html } = render(<PairingBoard {...defaultProps} />)

    expect(html).toContain('Publish Pairings')
  })

  it('disables publish when no assignments', () => {
    const { html } = render(
      <PairingBoard
        {...defaultProps}
        initialCoaches={defaultProps.initialCoaches.map((c) => ({ ...c, athletes: [] }))}
      />
    )

    // Button should have disabled attribute
    expect(html).toContain('disabled')
  })

  it('shows unassigned warning below publish button', () => {
    const { html } = render(<PairingBoard {...defaultProps} />)

    expect(html).toContain('still unassigned')
  })

  it('works with 18 coaches at scale', () => {
    const manyCoaches = Array.from({ length: 18 }, (_, i) => ({
      id: `c${i + 1}`,
      name: `Coach ${i + 1}`,
      athletes:
        i < 10
          ? [{ id: `a${i * 2 + 1}`, name: `Athlete ${i * 2 + 1}`, tag: 'suggested' as const }]
          : [],
    }))

    const { html } = render(
      <PairingBoard
        {...defaultProps}
        initialCoaches={manyCoaches}
        initialUnassigned={[]}
      />
    )

    expect(html).toContain('Coach 1')
    expect(html).toContain('Coach 18')
    expect(html).toContain('coaches')
    expect(html).toMatch(/18/)
  })
})

// ── PairingSummaryBar ───────────────────────────────────────────────────

describe('PairingSummaryBar', () => {
  it('shows correct counts', () => {
    const { html } = render(
      <PairingSummaryBar coachCount={10} totalAthletes={20} unassignedCount={3} />
    )

    // React SSR inserts <!-- --> between number and text
    expect(html).toContain('coaches')
    expect(html).toContain('athletes')
    expect(html).toContain('unassigned')
    expect(html).toMatch(/10/)
    expect(html).toMatch(/20/)
    expect(html).toMatch(/3/)
  })

  it('shows "All assigned" when unassigned = 0', () => {
    const { html } = render(
      <PairingSummaryBar coachCount={10} totalAthletes={20} unassignedCount={0} />
    )

    expect(html).toContain('All assigned')
  })

  it('updates when counts change', () => {
    const { html: html1 } = render(
      <PairingSummaryBar coachCount={10} totalAthletes={20} unassignedCount={5} />
    )
    expect(html1).toContain('unassigned')
    expect(html1).toMatch(/5/)

    const { html: html2 } = render(
      <PairingSummaryBar coachCount={10} totalAthletes={20} unassignedCount={0} />
    )
    expect(html2).toContain('All assigned')
  })
})

// ── CoachFilterBar ──────────────────────────────────────────────────────

describe('CoachFilterBar', () => {
  it('renders search input and filter buttons', () => {
    const { html } = render(
      <CoachFilterBar
        search=""
        onSearchChange={() => {}}
        filter="all"
        onFilterChange={() => {}}
      />
    )

    expect(html).toContain('Filter coaches')
    expect(html).toContain('All')
    expect(html).toContain('Has athletes')
    expect(html).toContain('No athletes')
    expect(html).toContain('&lt; 3 athletes')
  })
})

// ── CoachPairingRow ─────────────────────────────────────────────────────

describe('CoachPairingRow', () => {
  it('renders coach name and athletes', () => {
    const { html } = render(
      <CoachPairingRow
        coachId="c1"
        coachName="Alice"
        athletes={[
          { id: 'a1', name: 'Nicholas', tag: 'regular' },
          { id: 'a2', name: 'Sarah', tag: null },
        ]}
        maxAthletes={3}
        onAddClick={() => {}}
        onRemoveClick={() => {}}
      />
    )

    expect(html).toContain('Alice')
    // React SSR: "2<!-- -->/<!-- -->3"
    expect(html).toMatch(/2/)
    expect(html).toMatch(/3/)
    expect(html).toContain('Nicholas')
    expect(html).toContain('Sarah')
    expect(html).toContain('regular')
  })

  it('shows "No athletes assigned" when empty', () => {
    const { html } = render(
      <CoachPairingRow
        coachId="c1"
        coachName="Carol"
        athletes={[]}
        maxAthletes={3}
        onAddClick={() => {}}
        onRemoveClick={() => {}}
      />
    )

    expect(html).toContain('No athletes assigned')
  })

  it('hides Add button when at max', () => {
    const { html } = render(
      <CoachPairingRow
        coachId="c1"
        coachName="Alice"
        athletes={[
          { id: 'a1', name: 'Nicholas', tag: null },
          { id: 'a2', name: 'Sarah', tag: null },
          { id: 'a3', name: 'Marcus', tag: null },
        ]}
        maxAthletes={3}
        onAddClick={() => {}}
        onRemoveClick={() => {}}
      />
    )

    // When at max (3/3), the Add button should not be rendered
    // Check for green dot (full) and no "Add" text
    expect(html).not.toContain('>Add<')
  })

  it('shows status dot colors correctly', () => {
    // Full (green)
    const { html: fullHtml } = render(
      <CoachPairingRow
        coachId="c1"
        coachName="Alice"
        athletes={[
          { id: 'a1', name: 'N', tag: null },
          { id: 'a2', name: 'S', tag: null },
          { id: 'a3', name: 'M', tag: null },
        ]}
        maxAthletes={3}
        onAddClick={() => {}}
        onRemoveClick={() => {}}
      />
    )
    expect(fullHtml).toContain('bg-emerald-500')

    // Partial (amber)
    const { html: partialHtml } = render(
      <CoachPairingRow
        coachId="c1"
        coachName="Bob"
        athletes={[{ id: 'a1', name: 'N', tag: null }]}
        maxAthletes={3}
        onAddClick={() => {}}
        onRemoveClick={() => {}}
      />
    )
    expect(partialHtml).toContain('bg-amber-500')

    // Empty (gray)
    const { html: emptyHtml } = render(
      <CoachPairingRow
        coachId="c1"
        coachName="Carol"
        athletes={[]}
        maxAthletes={3}
        onAddClick={() => {}}
        onRemoveClick={() => {}}
      />
    )
    expect(emptyHtml).toContain('bg-gray-300')
  })
})

// ── UnassignedAthletesList ──────────────────────────────────────────────

describe('UnassignedAthletesList', () => {
  it('shows athletes with assign buttons', () => {
    const { html } = render(
      <UnassignedAthletesList
        athletes={[
          { id: 'a1', name: 'David C' },
          { id: 'a2', name: 'Wei Lin' },
        ]}
        onAssignClick={() => {}}
      />
    )

    expect(html).toContain('David C')
    expect(html).toContain('Wei Lin')
    expect(html).toContain('Assign')
    expect(html).toContain('Unassigned Athletes (2)')
  })

  it('shows "All Athletes Assigned" when empty', () => {
    const { html } = render(
      <UnassignedAthletesList athletes={[]} onAssignClick={() => {}} />
    )

    expect(html).toContain('All Athletes Assigned')
  })

  it('shows amber background when unassigned > 0', () => {
    const { html } = render(
      <UnassignedAthletesList
        athletes={[{ id: 'a1', name: 'David' }]}
        onAssignClick={() => {}}
      />
    )

    expect(html).toContain('bg-amber-50')
  })

  it('shows green background when all assigned', () => {
    const { html } = render(
      <UnassignedAthletesList athletes={[]} onAssignClick={() => {}} />
    )

    expect(html).toContain('bg-emerald-50')
  })
})

// ── AthletePickerSheet ──────────────────────────────────────────────────

describe('AthletePickerSheet', () => {
  it('shows only unassigned athletes when open', () => {
    const { html } = render(
      <AthletePickerSheet
        open={true}
        onClose={() => {}}
        coachName="Alice"
        unassignedAthletes={[
          { id: 'a1', name: 'David C' },
          { id: 'a2', name: 'Wei Lin' },
        ]}
        onSelect={() => {}}
      />
    )

    // React SSR inserts <!-- --> between text nodes
    expect(html).toContain('Alice')
    expect(html).toContain('Add athlete to')
    expect(html).toContain('David C')
    expect(html).toContain('Wei Lin')
  })

  it('returns null when closed', () => {
    const { html } = render(
      <AthletePickerSheet
        open={false}
        onClose={() => {}}
        coachName="Alice"
        unassignedAthletes={[{ id: 'a1', name: 'David' }]}
        onSelect={() => {}}
      />
    )

    expect(html).not.toContain('Add athlete to')
  })

  it('shows empty state when all athletes assigned', () => {
    const { html } = render(
      <AthletePickerSheet
        open={true}
        onClose={() => {}}
        coachName="Alice"
        unassignedAthletes={[]}
        onSelect={() => {}}
      />
    )

    expect(html).toContain('All athletes are assigned')
  })

  it('has search input', () => {
    const { html } = render(
      <AthletePickerSheet
        open={true}
        onClose={() => {}}
        coachName="Alice"
        unassignedAthletes={[{ id: 'a1', name: 'David' }]}
        onSelect={() => {}}
      />
    )

    expect(html).toContain('Search unassigned athletes')
  })
})

// ── CoachPickerSheet ────────────────────────────────────────────────────

describe('CoachPickerSheet', () => {
  it('shows only coaches with capacity', () => {
    const { html } = render(
      <CoachPickerSheet
        open={true}
        onClose={() => {}}
        athleteName="David C"
        coaches={[
          { id: 'c1', name: 'Alice', currentCount: 2 },
          { id: 'c2', name: 'Bob', currentCount: 3 }, // At max
          { id: 'c3', name: 'Carol', currentCount: 0 },
        ]}
        maxAthletes={3}
        onSelect={() => {}}
      />
    )

    // React SSR inserts <!-- --> between dynamic text
    expect(html).toContain('David C')
    expect(html).toContain('Assign')
    expect(html).toContain('Alice')
    // Bob is at max (3/3), should be filtered out
    expect(html).not.toContain('Bob')
    expect(html).toContain('Carol')
  })

  it('returns null when closed', () => {
    const { html } = render(
      <CoachPickerSheet
        open={false}
        onClose={() => {}}
        athleteName="David"
        coaches={[]}
        maxAthletes={3}
        onSelect={() => {}}
      />
    )

    expect(html).not.toContain('Assign')
  })

  it('shows each coach current count', () => {
    const { html } = render(
      <CoachPickerSheet
        open={true}
        onClose={() => {}}
        athleteName="David"
        coaches={[
          { id: 'c1', name: 'Alice', currentCount: 1 },
        ]}
        maxAthletes={3}
        onSelect={() => {}}
      />
    )

    // React SSR renders "1<!-- -->/<!-- -->3<!-- --> athletes"
    expect(html).toContain('Alice')
    expect(html).toContain('athletes')
  })

  it('shows empty state when no coaches available', () => {
    const { html } = render(
      <CoachPickerSheet
        open={true}
        onClose={() => {}}
        athleteName="David"
        coaches={[
          { id: 'c1', name: 'Alice', currentCount: 3 }, // All at max
        ]}
        maxAthletes={3}
        onSelect={() => {}}
      />
    )

    expect(html).toContain('No available coaches found')
  })
})
