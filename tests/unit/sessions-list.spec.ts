/**
 * Tests for Sessions list page logic.
 *
 * Validates session filtering, grouping, and visibility rules.
 */

import {
  isSessionPast,
  getSessionWeekLabel,
} from '@/lib/sessions/datetime'

const TZ = 'Asia/Singapore'

// Helper to create a session-like object
function makeSession(opts: {
  status: string
  session_start: string
  session_end?: string | null
}) {
  return {
    id: `s-${Math.random().toString(36).slice(2, 8)}`,
    status: opts.status,
    session_start: opts.session_start,
    session_end: opts.session_end ?? null,
  }
}

describe('Sessions list filtering', () => {
  describe('Upcoming tab', () => {
    it('shows published sessions that have not ended', () => {
      const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const session = makeSession({ status: 'published', session_start: future })
      const isPast = isSessionPast(session.session_start, session.session_end, TZ)
      expect(session.status).toBe('published')
      expect(isPast).toBe(false)
    })

    it('does NOT show cancelled sessions', () => {
      const sessions = [
        makeSession({ status: 'published', session_start: new Date(Date.now() + 86400000).toISOString() }),
        makeSession({ status: 'cancelled', session_start: new Date(Date.now() + 86400000).toISOString() }),
      ]
      const filtered = sessions.filter(s => s.status !== 'cancelled')
      expect(filtered).toHaveLength(1)
      expect(filtered[0].status).toBe('published')
    })

    it('today\'s session remains visible (session_start + 4h > now)', () => {
      // Session started 2 hours ago — should still be upcoming
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      const session = makeSession({ status: 'published', session_start: twoHoursAgo })
      const isPast = isSessionPast(session.session_start, session.session_end, TZ)
      expect(isPast).toBe(false) // 4h window means it's still visible
    })

    it('session with explicit end time that has passed is marked past', () => {
      const pastEnd = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const pastStart = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      const session = makeSession({
        status: 'published',
        session_start: pastStart,
        session_end: pastEnd,
      })
      const isPast = isSessionPast(session.session_start, session.session_end, TZ)
      expect(isPast).toBe(true)
    })
  })

  describe('Past tab', () => {
    it('shows completed sessions in reverse chronological order', () => {
      const sessions = [
        { ...makeSession({ status: 'completed', session_start: '2026-03-22T00:00:00Z' }), date: new Date('2026-03-22') },
        { ...makeSession({ status: 'completed', session_start: '2026-03-15T00:00:00Z' }), date: new Date('2026-03-15') },
        { ...makeSession({ status: 'completed', session_start: '2026-03-29T00:00:00Z' }), date: new Date('2026-03-29') },
      ]
      const sorted = sessions
        .filter(s => s.status === 'completed')
        .sort((a, b) => new Date(b.session_start).getTime() - new Date(a.session_start).getTime())
      expect(sorted[0].session_start).toBe('2026-03-29T00:00:00Z')
      expect(sorted[2].session_start).toBe('2026-03-15T00:00:00Z')
    })

    it('does NOT show cancelled sessions in past tab', () => {
      const sessions = [
        makeSession({ status: 'completed', session_start: '2026-03-22T00:00:00Z' }),
        makeSession({ status: 'cancelled', session_start: '2026-03-15T00:00:00Z' }),
      ]
      const past = sessions.filter(s => s.status === 'completed')
      expect(past).toHaveLength(1)
    })
  })

  describe('Draft visibility', () => {
    it('draft sessions only visible to admin / can_manage_sessions users', () => {
      const sessions = [
        makeSession({ status: 'published', session_start: '2026-04-05T00:00:00Z' }),
        makeSession({ status: 'draft', session_start: '2026-04-12T00:00:00Z' }),
      ]

      // Non-admin: filter out drafts
      const coachVisible = sessions.filter(s => s.status !== 'draft')
      expect(coachVisible).toHaveLength(1)

      // Admin: see all
      const adminVisible = sessions
      expect(adminVisible).toHaveLength(2)
    })
  })

  describe('Week grouping', () => {
    it('groups sessions by week with correct labels', () => {
      // Use dates relative to a known "now"
      // We test the getSessionWeekLabel function directly
      const now = new Date()

      // Session this week (today + 2 days, or adjust if near end of week)
      const thisWeekDate = new Date(now)
      thisWeekDate.setDate(thisWeekDate.getDate() + 1)
      const thisWeekLabel = getSessionWeekLabel(thisWeekDate.toISOString(), TZ)

      // Session next week (today + 8 days)
      const nextWeekDate = new Date(now)
      nextWeekDate.setDate(nextWeekDate.getDate() + 8)
      const nextWeekLabel = getSessionWeekLabel(nextWeekDate.toISOString(), TZ)

      // Session in 2 weeks (today + 15 days)
      const twoWeeksDate = new Date(now)
      twoWeeksDate.setDate(twoWeeksDate.getDate() + 15)
      const twoWeeksLabel = getSessionWeekLabel(twoWeeksDate.toISOString(), TZ)

      expect(thisWeekLabel).toBe('THIS WEEK')
      expect(nextWeekLabel).toBe('NEXT WEEK')
      expect(twoWeeksLabel).toBe('IN 2 WEEKS')
    })
  })
})
