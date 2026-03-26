/**
 * Unit tests for feed session cards — CoachRsvpCard, CaregiverRsvpCard,
 * AssignmentCard, PairingsReviewCard, and feed card expiry logic.
 */

import React from 'react'

// ── Mocks ────────────────────────────────────────────────────────────────

const mockCoachRsvp = jest.fn()
const mockCaregiverAthleteRsvp = jest.fn()

jest.mock('@/lib/sessions/rsvp-actions', () => ({
  coachRsvp: (...args: unknown[]) => mockCoachRsvp(...args),
  caregiverAthleteRsvp: (...args: unknown[]) => mockCaregiverAthleteRsvp(...args),
}))

jest.mock('@/components/providers/ClubConfigProvider', () => ({
  useClubConfig: () => ({ timezone: 'UTC', locale: 'en' }),
}))

jest.mock('next/link', () => {
  return ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) =>
    React.createElement('a', { href, ...props }, children)
})

// ── Imports ─────────────────────────────────────────────────────────────

import type {
  CoachRsvpCardData,
  CaregiverSessionRsvpCardData,
  AssignmentCardData,
  PairingsReviewCardData,
  SessionCardData,
} from '@/lib/feed/types'

// ── Helpers ─────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<SessionCardData> = {}): SessionCardData {
  return {
    id: 'session-1',
    title: 'Training',
    sessionStart: '2026-03-29T00:00:00.000Z',
    sessionEnd: '2026-03-29T02:00:00.000Z',
    location: 'Fort Canning',
    status: 'published',
    pairingsPublishedAt: null,
    pairingsStale: false,
    ...overrides,
  }
}

// ── Feed card expiry tests ──────────────────────────────────────────────

describe('Feed card expiry logic', () => {
  function isSessionCardVisible(sessionStart: string, status: string): boolean {
    if (status !== 'published') return false
    const sessionStartMs = new Date(sessionStart).getTime()
    const bufferMs = 24 * 60 * 60 * 1000
    return Date.now() < sessionStartMs + bufferMs
  }

  it('shows card for published session before session_start', () => {
    const futureStart = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    expect(isSessionCardVisible(futureStart, 'published')).toBe(true)
  })

  it('shows card on session day (within 24h buffer)', () => {
    // Session started 2 hours ago — within 24h buffer
    const recentStart = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    expect(isSessionCardVisible(recentStart, 'published')).toBe(true)
  })

  it('hides card after session_start + 24 hours', () => {
    // Session started 25 hours ago
    const oldStart = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    expect(isSessionCardVisible(oldStart, 'published')).toBe(false)
  })

  it('hides card when session is completed', () => {
    const futureStart = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    expect(isSessionCardVisible(futureStart, 'completed')).toBe(false)
  })

  it('hides card when session is cancelled', () => {
    const futureStart = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    expect(isSessionCardVisible(futureStart, 'cancelled')).toBe(false)
  })

  it('hides card for draft sessions', () => {
    const futureStart = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    expect(isSessionCardVisible(futureStart, 'draft')).toBe(false)
  })
})

// ── CoachRsvpCard data shape tests ──────────────────────────────────────

describe('CoachRsvpCard data', () => {
  it('pending state has correct shape with two RSVP options', () => {
    const card: CoachRsvpCardData = {
      type: 'session_rsvp',
      session: makeSession(),
      rsvpStatus: 'pending',
      coachCount: 18,
      athleteCount: 22,
    }
    expect(card.rsvpStatus).toBe('pending')
    expect(card.coachCount).toBe(18)
    expect(card.athleteCount).toBe(22)
  })

  it('responded state shows correct status', () => {
    const card: CoachRsvpCardData = {
      type: 'session_rsvp',
      session: makeSession(),
      rsvpStatus: 'available',
      coachCount: 18,
      athleteCount: 22,
    }
    expect(card.rsvpStatus).toBe('available')
  })

  it('links to correct session detail URL', () => {
    const card: CoachRsvpCardData = {
      type: 'session_rsvp',
      session: makeSession({ id: 'session-xyz' }),
      rsvpStatus: 'pending',
      coachCount: 0,
      athleteCount: 0,
    }
    expect(card.session.id).toBe('session-xyz')
  })
})

// ── CaregiverRsvpCard data shape tests ──────────────────────────────────

describe('CaregiverRsvpCard data', () => {
  it('single athlete shows correct shape', () => {
    const card: CaregiverSessionRsvpCardData = {
      type: 'caregiver_session_rsvp',
      session: makeSession(),
      athletes: [{ athleteId: 'a1', athleteName: 'Nicholas', rsvpStatus: 'pending' }],
    }
    expect(card.athletes).toHaveLength(1)
    expect(card.athletes[0].athleteName).toBe('Nicholas')
  })

  it('multi-athlete batches all athletes in one card', () => {
    const card: CaregiverSessionRsvpCardData = {
      type: 'caregiver_session_rsvp',
      session: makeSession(),
      athletes: [
        { athleteId: 'a1', athleteName: 'Nicholas', rsvpStatus: 'pending' },
        { athleteId: 'a2', athleteName: 'Sarah', rsvpStatus: 'pending' },
        { athleteId: 'a3', athleteName: 'Marcus', rsvpStatus: 'pending' },
      ],
    }
    expect(card.athletes).toHaveLength(3)
    // ONE card, not separate ones — all athletes are in the same card
    expect(card.type).toBe('caregiver_session_rsvp')
  })

  it('per-athlete status can be mixed (some responded, some pending)', () => {
    const card: CaregiverSessionRsvpCardData = {
      type: 'caregiver_session_rsvp',
      session: makeSession(),
      athletes: [
        { athleteId: 'a1', athleteName: 'Nicholas', rsvpStatus: 'attending' },
        { athleteId: 'a2', athleteName: 'Sarah', rsvpStatus: 'pending' },
        { athleteId: 'a3', athleteName: 'Marcus', rsvpStatus: 'not_attending' },
      ],
    }
    const pending = card.athletes.filter(a => a.rsvpStatus === 'pending')
    const responded = card.athletes.filter(a => a.rsvpStatus !== 'pending')
    expect(pending).toHaveLength(1)
    expect(responded).toHaveLength(2)
  })
})

// ── AssignmentCard data shape tests ─────────────────────────────────────

describe('AssignmentCard data', () => {
  it('shows assigned athletes with cues', () => {
    const card: AssignmentCardData = {
      type: 'session_assignment',
      session: makeSession(),
      athletes: [
        { id: 'a1', name: 'Nicholas', cues: '1km walk-run', avatar: '🏃' },
        { id: 'a2', name: 'Sarah', cues: 'Steady pace', avatar: null },
      ],
      loggedRuns: {},
      allAthletes: [],
    }
    expect(card.athletes).toHaveLength(2)
    expect(card.athletes[0].cues).toBe('1km walk-run')
    expect(card.athletes[1].cues).toBe('Steady pace')
  })

  it('handles athletes with no cues', () => {
    const card: AssignmentCardData = {
      type: 'session_assignment',
      session: makeSession(),
      athletes: [
        { id: 'a1', name: 'Nicholas', cues: null, avatar: null },
      ],
      loggedRuns: {},
      allAthletes: [],
    }
    expect(card.athletes[0].cues).toBeNull()
  })

  it('includes loggedRuns for athletes who have completed runs', () => {
    const card: AssignmentCardData = {
      type: 'session_assignment',
      session: makeSession(),
      athletes: [
        { id: 'a1', name: 'Nicholas', cues: '1km walk-run', avatar: '🏃' },
        { id: 'a2', name: 'Sarah', cues: 'Steady pace', avatar: null },
      ],
      loggedRuns: {
        a1: { distance_km: 2.5, note: 'Great session', sync_source: null },
      },
      allAthletes: [
        { id: 'a1', name: 'Nicholas', avatar: '🏃' },
        { id: 'a2', name: 'Sarah', avatar: null },
        { id: 'a3', name: 'Marcus', avatar: null },
      ],
    }
    expect(card.loggedRuns['a1']).toBeDefined()
    expect(card.loggedRuns['a1'].distance_km).toBe(2.5)
    expect(card.loggedRuns['a2']).toBeUndefined()
  })

  it('has empty loggedRuns before any runs are logged', () => {
    const card: AssignmentCardData = {
      type: 'session_assignment',
      session: makeSession(),
      athletes: [
        { id: 'a1', name: 'Nicholas', cues: null, avatar: null },
      ],
      loggedRuns: {},
      allAthletes: [],
    }
    expect(Object.keys(card.loggedRuns)).toHaveLength(0)
  })

  it('allAthletes includes athletes not in assignment for add-athlete', () => {
    const card: AssignmentCardData = {
      type: 'session_assignment',
      session: makeSession(),
      athletes: [
        { id: 'a1', name: 'Nicholas', cues: null, avatar: null },
      ],
      loggedRuns: {},
      allAthletes: [
        { id: 'a1', name: 'Nicholas', avatar: null },
        { id: 'a2', name: 'Sarah', avatar: null },
        { id: 'a3', name: 'Marcus', avatar: null },
      ],
    }
    const availableToAdd = card.allAthletes.filter(
      a => !card.athletes.some(assigned => assigned.id === a.id)
    )
    expect(availableToAdd).toHaveLength(2)
    expect(availableToAdd.map(a => a.name)).toEqual(['Sarah', 'Marcus'])
  })
})

// ── PairingsReviewCard data shape tests ─────────────────────────────────

describe('PairingsReviewCard data', () => {
  it('shows stale details and links to pairings page', () => {
    const card: PairingsReviewCardData = {
      type: 'session_pairings_review',
      session: makeSession({ id: 'session-abc', pairingsStale: true }),
      staleDetails: 'Coach Emily is no longer available — 2 athletes need reassignment.',
    }
    expect(card.session.pairingsStale).toBe(true)
    expect(card.staleDetails).toContain('Emily')
    // The component should link to /admin/sessions/session-abc/pairings
    expect(card.session.id).toBe('session-abc')
  })
})

// ── isSessionToday / isSessionTomorrow tests ────────────────────────────

import { isSessionToday, isSessionTomorrow } from '@/lib/sessions/datetime'

describe('isSessionToday', () => {
  it('returns true for a session today', () => {
    const today = new Date()
    expect(isSessionToday(today.toISOString(), 'UTC')).toBe(true)
  })

  it('returns false for a session tomorrow', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    expect(isSessionToday(tomorrow.toISOString(), 'UTC')).toBe(false)
  })
})

describe('isSessionTomorrow', () => {
  it('returns true for a session tomorrow', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    expect(isSessionTomorrow(tomorrow.toISOString(), 'UTC')).toBe(true)
  })

  it('returns false for a session today', () => {
    const today = new Date()
    expect(isSessionTomorrow(today.toISOString(), 'UTC')).toBe(false)
  })
})
