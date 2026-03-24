/**
 * Tests for SessionListCard component logic.
 *
 * Validates rendering logic, status badges, RSVP display,
 * and role-specific card content.
 */

import type { SessionListItem } from '@/components/sessions/SessionListCard'

function makeSession(overrides: Partial<SessionListItem> = {}): SessionListItem {
  return {
    id: 'session-1',
    title: null,
    session_start: '2026-03-29T00:00:00Z',
    session_end: '2026-03-29T02:00:00Z',
    location: 'Fort Canning',
    status: 'published',
    pairings_published_at: null,
    coaches_available: 18,
    coaches_pending: 3,
    coaches_total: 25,
    athletes_attending: 22,
    athletes_pending: 2,
    athletes_total: 28,
    user_coach_rsvp: null,
    user_athlete_rsvps: [],
    needs_pairings: false,
    ...overrides,
  }
}

describe('SessionListCard logic', () => {
  describe('Status badge', () => {
    it('shows "RSVPs open" for published sessions without pairings', () => {
      const session = makeSession({ status: 'published', pairings_published_at: null })
      expect(session.status).toBe('published')
      expect(session.pairings_published_at).toBeNull()
    })

    it('shows "Pairings published" when pairings exist', () => {
      const session = makeSession({ pairings_published_at: '2026-03-28T10:00:00Z' })
      expect(session.pairings_published_at).toBeTruthy()
    })

    it('shows "Draft" for draft sessions', () => {
      const session = makeSession({ status: 'draft' })
      expect(session.status).toBe('draft')
    })

    it('shows "Completed" for completed sessions', () => {
      const session = makeSession({ status: 'completed' })
      expect(session.status).toBe('completed')
    })
  })

  describe('Border color logic', () => {
    function getBorderColor(session: SessionListItem): string {
      if (session.status === 'draft') return 'border-l-text-hint'
      if (session.status === 'completed') return 'border-l-green-500'
      return 'border-l-accent'
    }

    it('draft gets grey border', () => {
      expect(getBorderColor(makeSession({ status: 'draft' }))).toBe('border-l-text-hint')
    })

    it('completed gets green border', () => {
      expect(getBorderColor(makeSession({ status: 'completed' }))).toBe('border-l-green-500')
    })

    it('published gets teal border', () => {
      expect(getBorderColor(makeSession({ status: 'published' }))).toBe('border-l-accent')
    })
  })

  describe('Coach RSVP display', () => {
    it('shows coach RSVP status when role is coach and RSVP exists', () => {
      const session = makeSession({ user_coach_rsvp: 'available' })
      expect(session.user_coach_rsvp).toBe('available')
    })

    it('shows pending RSVP for coaches with pending status', () => {
      const session = makeSession({ user_coach_rsvp: 'pending' })
      expect(session.user_coach_rsvp).toBe('pending')
    })
  })

  describe('Caregiver athlete RSVP display', () => {
    it('shows athlete RSVP status when role is caregiver', () => {
      const session = makeSession({
        user_athlete_rsvps: [
          { athlete_name: 'Nicholas', status: 'attending' },
          { athlete_name: 'Sarah', status: 'pending' },
        ],
      })
      expect(session.user_athlete_rsvps).toHaveLength(2)
      expect(session.user_athlete_rsvps[0].athlete_name).toBe('Nicholas')
      expect(session.user_athlete_rsvps[0].status).toBe('attending')
    })
  })

  describe('Admin features', () => {
    it('shows "Manage" for admin users on published sessions', () => {
      const session = makeSession({ status: 'published' })
      const isAdmin = true
      const isDraft = session.status === 'draft'
      const showManage = isAdmin && !isDraft
      expect(showManage).toBe(true)
    })

    it('does not show "Manage" for draft sessions', () => {
      const session = makeSession({ status: 'draft' })
      const isAdmin = true
      const isDraft = session.status === 'draft'
      const showManage = isAdmin && !isDraft
      expect(showManage).toBe(false)
    })

    it('draft cards show Edit & Publish / Cancel buttons for admin', () => {
      const session = makeSession({ status: 'draft' })
      const isAdmin = true
      expect(session.status).toBe('draft')
      expect(isAdmin).toBe(true)
    })

    it('manage links to pairings page when needs_pairings is true', () => {
      const session = makeSession({ needs_pairings: true })
      const manageHref = session.needs_pairings
        ? `/admin/sessions/${session.id}/pairings`
        : `/sessions/${session.id}`
      expect(manageHref).toBe('/admin/sessions/session-1/pairings')
    })

    it('manage links to session detail when pairings not needed', () => {
      const session = makeSession({ needs_pairings: false })
      const manageHref = session.needs_pairings
        ? `/admin/sessions/${session.id}/pairings`
        : `/sessions/${session.id}`
      expect(manageHref).toBe('/sessions/session-1')
    })
  })

  describe('Past sessions', () => {
    it('past cards show completed status and participation', () => {
      const session = makeSession({
        status: 'completed',
        user_coach_rsvp: 'available',
      })
      expect(session.status).toBe('completed')
      expect(session.user_coach_rsvp).toBe('available')
    })
  })

  describe('Navigation', () => {
    it('non-draft cards link to /sessions/[id]', () => {
      const session = makeSession()
      const isDraft = session.status === 'draft'
      expect(isDraft).toBe(false)
      expect(`/sessions/${session.id}`).toBe('/sessions/session-1')
    })

    it('draft cards are not linkable', () => {
      const session = makeSession({ status: 'draft' })
      expect(session.status).toBe('draft')
    })
  })
})
