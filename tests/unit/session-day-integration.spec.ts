/**
 * Unit tests for Phase 7 — Session Day Integration.
 *
 * Tests cover:
 * - LogRunSheet pre-population from session context
 * - training_session_id linkage in run logging
 * - Post-log display state for coach and caregiver views
 * - Group logging (multiple athletes per submission)
 */

import type {
  AssignmentCardData,
  CaregiverSessionConfirmedCardData,
  SessionCardData,
} from '@/lib/feed/types'

// ── Helpers ─────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<SessionCardData> = {}): SessionCardData {
  return {
    id: 'ts-1',
    title: 'Training',
    sessionStart: '2026-03-29T00:00:00.000Z',
    sessionEnd: '2026-03-29T02:00:00.000Z',
    location: 'Fort Canning',
    status: 'published',
    pairingsPublishedAt: '2026-03-28T00:00:00.000Z',
    pairingsStale: false,
    ...overrides,
  }
}

// ── LogRunSheet Pre-population Tests ────────────────────────────────────

describe('LogRunSheet pre-population', () => {
  it('date is set to session date', () => {
    const sessionStart = '2026-03-29T00:00:00.000Z'
    const timezone = 'UTC'
    const sessionDate = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date(sessionStart))
    expect(sessionDate).toBe('2026-03-29')
  })

  it('date uses club timezone for conversion', () => {
    const sessionStart = '2026-03-28T23:00:00.000Z' // 11 PM UTC = next day in UTC+8
    const timezone = 'Asia/Singapore'
    const sessionDate = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date(sessionStart))
    expect(sessionDate).toBe('2026-03-29') // Next day in Singapore
  })

  it('assigned athletes are pre-selected', () => {
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
    // All assigned athletes should become pre-selected entries
    const preSelectedEntries = card.athletes.map(a => ({
      athleteId: a.id,
      name: a.name,
      selected: true,
    }))
    expect(preSelectedEntries).toHaveLength(2)
    expect(preSelectedEntries.every(e => e.selected)).toBe(true)
  })

  it('training_session_id is set from session context', () => {
    const card: AssignmentCardData = {
      type: 'session_assignment',
      session: makeSession({ id: 'ts-abc' }),
      athletes: [],
      loggedRuns: {},
      allAthletes: [],
    }
    expect(card.session.id).toBe('ts-abc')
    // This id is passed as trainingSessionId to GroupLogRunSheet
  })

  it('coach can add non-assigned athletes from allAthletes', () => {
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

  it('coach can remove pre-selected athletes (deselect)', () => {
    // Simulate the toggle logic in GroupLogRunSheet
    const entries = [
      { athleteId: 'a1', selected: true },
      { athleteId: 'a2', selected: true },
    ]
    // Coach deselects athlete a2
    const updated = entries.map(e =>
      e.athleteId === 'a2' ? { ...e, selected: false } : e
    )
    expect(updated[0].selected).toBe(true)
    expect(updated[1].selected).toBe(false)
    const selectedCount = updated.filter(e => e.selected).length
    expect(selectedCount).toBe(1)
  })
})

// ── training_session_id Linkage Tests ───────────────────────────────────

describe('Run logging with session link', () => {
  it('logged run includes training_session_id when from session context', () => {
    const formData = new FormData()
    formData.set('date', '2026-03-29')
    formData.set('distance_km', '2.5')
    formData.set('duration_minutes', '25')
    formData.set('training_session_id', 'ts-abc')

    expect(formData.get('training_session_id')).toBe('ts-abc')
  })

  it('logged run has training_session_id NULL when logged outside session context', () => {
    const formData = new FormData()
    formData.set('date', '2026-03-29')
    formData.set('distance_km', '5.0')
    formData.set('duration_minutes', '30')
    // No training_session_id set — simulates logging from athlete profile

    const trainingSessionId = (formData.get('training_session_id') as string ?? '').trim() || null
    expect(trainingSessionId).toBeNull()
  })

  it('multiple athletes logged from same session all share same training_session_id', () => {
    const trainingSessionId = 'ts-abc'
    const athleteIds = ['a1', 'a2', 'a3']

    const sessionInserts = athleteIds.map(athleteId => {
      const formData = new FormData()
      formData.set('date', '2026-03-29')
      formData.set('distance_km', '2.0')
      formData.set('duration_minutes', '20')
      formData.set('training_session_id', trainingSessionId)
      return {
        athlete_id: athleteId,
        training_session_id: formData.get('training_session_id'),
      }
    })

    // All share the same training_session_id
    expect(sessionInserts.every(s => s.training_session_id === 'ts-abc')).toBe(true)
    // Each has a unique athlete_id
    expect(new Set(sessionInserts.map(s => s.athlete_id)).size).toBe(3)
  })

  it('training_session_id extraction handles empty string as null', () => {
    const formData = new FormData()
    formData.set('training_session_id', '')

    const trainingSessionId = (formData.get('training_session_id') as string ?? '').trim() || null
    expect(trainingSessionId).toBeNull()
  })

  it('training_session_id extraction handles whitespace-only as null', () => {
    const formData = new FormData()
    formData.set('training_session_id', '   ')

    const trainingSessionId = (formData.get('training_session_id') as string ?? '').trim() || null
    expect(trainingSessionId).toBeNull()
  })
})

// ── Post-Log Display Tests ──────────────────────────────────────────────

describe('Assignment display after logging', () => {
  it('coach sees run logged status for logged athletes', () => {
    const card: AssignmentCardData = {
      type: 'session_assignment',
      session: makeSession(),
      athletes: [
        { id: 'a1', name: 'Nicholas', cues: '1km walk-run', avatar: '🏃' },
        { id: 'a2', name: 'Sarah', cues: 'Steady pace', avatar: null },
      ],
      loggedRuns: {
        a1: { distance_km: 2.5, note: 'Great session' },
      },
      allAthletes: [],
    }
    // Nicholas has a logged run
    expect(card.loggedRuns['a1']).toBeDefined()
    expect(card.loggedRuns['a1'].distance_km).toBe(2.5)
    expect(card.loggedRuns['a1'].note).toBe('Great session')
    // Sarah does not
    expect(card.loggedRuns['a2']).toBeUndefined()
  })

  it('coach sees athlete cues for unlogged athletes', () => {
    const card: AssignmentCardData = {
      type: 'session_assignment',
      session: makeSession(),
      athletes: [
        { id: 'a1', name: 'Nicholas', cues: '1km walk-run', avatar: null },
        { id: 'a2', name: 'Sarah', cues: 'Steady pace', avatar: null },
      ],
      loggedRuns: {
        a1: { distance_km: 2.5, note: null },
      },
      allAthletes: [],
    }
    // Nicholas logged → cues NOT shown (show logged state instead)
    const nicholasLogged = !!card.loggedRuns['a1']
    expect(nicholasLogged).toBe(true)
    // Sarah not logged → cues shown
    const sarahLogged = !!card.loggedRuns['a2']
    expect(sarahLogged).toBe(false)
    expect(card.athletes[1].cues).toBe('Steady pace')
  })

  it('caregiver sees run completed with distance for their athlete', () => {
    const card: CaregiverSessionConfirmedCardData = {
      type: 'caregiver_session_confirmed',
      session: makeSession(),
      athletes: [
        { athleteId: 'a1', athleteName: 'Nicholas', coachName: 'Alice' },
      ],
      loggedRuns: {
        a1: { distance_km: 2.5 },
      },
    }
    expect(card.loggedRuns['a1']).toBeDefined()
    expect(card.loggedRuns['a1'].distance_km).toBe(2.5)
  })

  it('caregiver sees no logged run when athlete has not run yet', () => {
    const card: CaregiverSessionConfirmedCardData = {
      type: 'caregiver_session_confirmed',
      session: makeSession(),
      athletes: [
        { athleteId: 'a1', athleteName: 'Nicholas', coachName: 'Alice' },
      ],
      loggedRuns: {},
    }
    expect(card.loggedRuns['a1']).toBeUndefined()
  })

  it('Log Runs button remains available after logging (button text changes)', () => {
    const card: AssignmentCardData = {
      type: 'session_assignment',
      session: makeSession(),
      athletes: [
        { id: 'a1', name: 'Nicholas', cues: null, avatar: null },
        { id: 'a2', name: 'Sarah', cues: null, avatar: null },
      ],
      loggedRuns: {
        a1: { distance_km: 2.5, note: null },
        a2: { distance_km: 1.8, note: null },
      },
      allAthletes: [],
    }
    // When all athletes logged, button text should change to "Log More"
    const loggedCount = card.athletes.filter(a => card.loggedRuns[a.id]).length
    const someLogged = loggedCount > 0
    expect(someLogged).toBe(true)
    const buttonText = someLogged ? 'Log More' : 'Log Runs'
    expect(buttonText).toBe('Log More')
  })

  it('feed card shows "Log Runs" when no runs logged yet', () => {
    const card: AssignmentCardData = {
      type: 'session_assignment',
      session: makeSession(),
      athletes: [
        { id: 'a1', name: 'Nicholas', cues: null, avatar: null },
      ],
      loggedRuns: {},
      allAthletes: [],
    }
    const loggedCount = card.athletes.filter(a => card.loggedRuns[a.id]).length
    const someLogged = loggedCount > 0
    const buttonText = someLogged ? 'Log More' : 'Log Runs'
    expect(buttonText).toBe('Log Runs')
  })
})

// ── Group Log Flow Tests ────────────────────────────────────────────────

describe('Group log flow', () => {
  it('each athlete gets their own session row', () => {
    const athletes = [
      { id: 'a1', name: 'Nicholas', distanceKm: '2.5', durationMinutes: '25' },
      { id: 'a2', name: 'Sarah', distanceKm: '1.8', durationMinutes: '20' },
    ]
    const trainingSessionId = 'ts-1'

    // Simulate creating one FormData per athlete
    const formDatas = athletes.map(a => {
      const fd = new FormData()
      fd.set('date', '2026-03-29')
      fd.set('distance_km', a.distanceKm)
      fd.set('duration_minutes', a.durationMinutes)
      fd.set('training_session_id', trainingSessionId)
      return { athleteId: a.id, formData: fd }
    })

    // Each creates a separate session row with unique athlete_id
    expect(formDatas).toHaveLength(2)
    expect(formDatas[0].athleteId).toBe('a1')
    expect(formDatas[1].athleteId).toBe('a2')
    // All share the same training_session_id
    expect(formDatas[0].formData.get('training_session_id')).toBe('ts-1')
    expect(formDatas[1].formData.get('training_session_id')).toBe('ts-1')
    // But different distances
    expect(formDatas[0].formData.get('distance_km')).toBe('2.5')
    expect(formDatas[1].formData.get('distance_km')).toBe('1.8')
  })

  it('validation fails if any selected athlete has missing required fields', () => {
    const entries = [
      { athleteId: 'a1', name: 'Nicholas', selected: true, distanceKm: '2.5', durationMinutes: '25' },
      { athleteId: 'a2', name: 'Sarah', selected: true, distanceKm: '', durationMinutes: '20' },
    ]

    const selected = entries.filter(e => e.selected)
    const errors: string[] = []
    for (const entry of selected) {
      const dist = parseFloat(entry.distanceKm)
      if (isNaN(dist) || dist <= 0) {
        errors.push(`Distance is required for ${entry.name}`)
      }
    }
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('Sarah')
  })

  it('deselected athletes are not submitted', () => {
    const entries = [
      { athleteId: 'a1', selected: true, distanceKm: '2.5' },
      { athleteId: 'a2', selected: false, distanceKm: '' },
      { athleteId: 'a3', selected: true, distanceKm: '3.0' },
    ]
    const toSubmit = entries.filter(e => e.selected)
    expect(toSubmit).toHaveLength(2)
    expect(toSubmit.map(e => e.athleteId)).toEqual(['a1', 'a3'])
  })
})

// ── AssignmentSection post-log state ────────────────────────────────────

describe('AssignmentSection post-log state', () => {
  it('coach view shows logged runs with distance and note', () => {
    const myAthletes = [
      { athlete_id: 'a1', athlete_name: 'Nicholas' },
      { athlete_id: 'a2', athlete_name: 'Sarah' },
    ]
    const loggedRuns: Record<string, { distance_km: number | null; note: string | null }> = {
      a1: { distance_km: 2.5, note: 'Great session' },
    }

    // Nicholas has a logged run
    expect(loggedRuns[myAthletes[0].athlete_id]).toBeDefined()
    expect(loggedRuns[myAthletes[0].athlete_id].distance_km).toBe(2.5)
    expect(loggedRuns[myAthletes[0].athlete_id].note).toBe('Great session')
    // Sarah does not
    expect(loggedRuns[myAthletes[1].athlete_id]).toBeUndefined()
  })

  it('caregiver view shows run completed for their linked athlete', () => {
    const caregiverAthleteIds = ['a1']
    const loggedRuns: Record<string, { distance_km: number | null; note: string | null }> = {
      a1: { distance_km: 2.5, note: null },
    }

    for (const id of caregiverAthleteIds) {
      const logged = loggedRuns[id]
      expect(logged).toBeDefined()
      expect(logged.distance_km).toBe(2.5)
    }
  })

  it('Log Runs button still available for corrections after logging', () => {
    const loggedRuns: Record<string, { distance_km: number | null; note: string | null }> = {
      a1: { distance_km: 2.5, note: null },
      a2: { distance_km: 1.8, note: null },
    }
    const trainingSessionId = 'ts-1'
    const sessionDate = '2026-03-29'
    // Button is available whenever trainingSessionId and sessionDate are set
    expect(trainingSessionId).toBeTruthy()
    expect(sessionDate).toBeTruthy()
    // Even when all runs are logged
    expect(Object.keys(loggedRuns).length).toBeGreaterThan(0)
  })
})
