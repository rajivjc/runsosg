/**
 * Unit tests for the coach feed priority system.
 *
 * Tests bucket computation logic for needs attention, going quiet,
 * near milestone, and on track athlete groupings.
 */

import {
  computeNeedsAttention,
  computeGoingQuiet,
  computeNearMilestone,
  median,
} from '@/lib/feed/coach-priorities'

// ─── Helpers ─────────────────────────────────────────────────────

function makeAthlete(id: string, name: string, avatar: string | null = null) {
  return { id, name, avatar }
}

function makeSession(
  athlete_id: string,
  date: string,
  feel: number | null = null,
  distance_km: number | null = null,
) {
  return { athlete_id, date, feel, distance_km }
}

// ─── median helper ───────────────────────────────────────────────

describe('median', () => {
  it('returns median of odd-length array', () => {
    expect(median([1, 3, 5])).toBe(3)
  })
  it('returns median of even-length array', () => {
    expect(median([1, 3, 5, 7])).toBe(4)
  })
  it('returns 0 for empty array', () => {
    expect(median([])).toBe(0)
  })
})

// ─── Needs Attention ─────────────────────────────────────────────

describe('computeNeedsAttention', () => {
  it('flags athlete with 3 consecutive low feel ratings as declining_feel', () => {
    const athletes = [makeAthlete('a1', 'Alice')]
    const sessions = {
      a1: [
        makeSession('a1', '2026-03-10', 4),
        makeSession('a1', '2026-03-12', 3),
        makeSession('a1', '2026-03-15', 2),
        makeSession('a1', '2026-03-18', 2),
        makeSession('a1', '2026-03-20', 1),
      ],
    }

    const result = computeNeedsAttention(athletes, sessions)
    expect(result).toHaveLength(1)
    expect(result[0].athleteId).toBe('a1')
    expect(result[0].reason).toBe('declining_feel')
    expect(result[0].recentFeelRatings).toEqual([4, 3, 2, 2, 1])
  })

  it('flags athlete with sudden feel drop as sudden_drop', () => {
    const athletes = [makeAthlete('a1', 'Alice')]
    const sessions = {
      a1: [
        makeSession('a1', '2026-03-05', 4),
        makeSession('a1', '2026-03-08', 4),
        makeSession('a1', '2026-03-11', 5),
        makeSession('a1', '2026-03-14', 4),
        makeSession('a1', '2026-03-17', 4),
        makeSession('a1', '2026-03-20', 1),
      ],
    }

    const result = computeNeedsAttention(athletes, sessions)
    expect(result).toHaveLength(1)
    expect(result[0].athleteId).toBe('a1')
    expect(result[0].reason).toBe('sudden_drop')
  })

  it('does NOT flag athlete with too few sessions', () => {
    const athletes = [makeAthlete('a1', 'Alice')]
    const sessions = {
      a1: [
        makeSession('a1', '2026-03-18', 2),
        makeSession('a1', '2026-03-20', 1),
      ],
    }

    const result = computeNeedsAttention(athletes, sessions)
    expect(result).toHaveLength(0)
  })

  it('does NOT flag athlete when feel ratings have nulls making count < 3', () => {
    const athletes = [makeAthlete('a1', 'Alice')]
    const sessions = {
      a1: [
        makeSession('a1', '2026-03-10', null),
        makeSession('a1', '2026-03-12', null),
        makeSession('a1', '2026-03-15', 2),
        makeSession('a1', '2026-03-18', 1),
      ],
    }

    const result = computeNeedsAttention(athletes, sessions)
    expect(result).toHaveLength(0)
  })

  it('sorts sudden_drop before declining_feel', () => {
    const athletes = [
      makeAthlete('a1', 'Alice'),
      makeAthlete('a2', 'Bob'),
    ]
    const sessions = {
      // Alice: declining feel (last 3 all ≤ 2)
      a1: [
        makeSession('a1', '2026-03-10', 3),
        makeSession('a1', '2026-03-12', 3),
        makeSession('a1', '2026-03-15', 2),
        makeSession('a1', '2026-03-18', 2),
        makeSession('a1', '2026-03-20', 1),
      ],
      // Bob: sudden drop (avg ~4, dropped to 1)
      a2: [
        makeSession('a2', '2026-03-05', 4),
        makeSession('a2', '2026-03-08', 4),
        makeSession('a2', '2026-03-11', 5),
        makeSession('a2', '2026-03-14', 4),
        makeSession('a2', '2026-03-17', 4),
        makeSession('a2', '2026-03-20', 1),
      ],
    }

    const result = computeNeedsAttention(athletes, sessions)
    expect(result).toHaveLength(2)
    expect(result[0].reason).toBe('sudden_drop')
    expect(result[0].athleteId).toBe('a2')
    expect(result[1].reason).toBe('declining_feel')
    expect(result[1].athleteId).toBe('a1')
  })
})

// ─── Going Quiet ─────────────────────────────────────────────────

describe('computeGoingQuiet', () => {
  // Fixed reference date so tests are deterministic
  const now = new Date('2026-03-22T12:00:00+08:00')

  it('flags athlete exceeding 2x their cadence as going quiet', () => {
    const athletes = [makeAthlete('a1', 'Alice')]
    const sessions = {
      a1: [
        makeSession('a1', '2026-02-10'),
        makeSession('a1', '2026-02-15'),
        makeSession('a1', '2026-02-20'),
        makeSession('a1', '2026-02-25'),
        makeSession('a1', '2026-03-02'),
        makeSession('a1', '2026-03-07'), // Last session 15 days ago (cadence ~5 days)
      ],
    }

    const result = computeGoingQuiet(athletes, sessions, now)
    expect(result).toHaveLength(1)
    expect(result[0].athleteId).toBe('a1')
    expect(result[0].daysSinceLastSession).toBe(15)
    expect(result[0].averageCadenceDays).toBe(5)
  })

  it('does NOT flag athlete under 14-day minimum', () => {
    const athletes = [makeAthlete('a1', 'Alice')]
    const sessions = {
      a1: [
        makeSession('a1', '2026-03-02'),
        makeSession('a1', '2026-03-05'),
        makeSession('a1', '2026-03-08'),
        makeSession('a1', '2026-03-12'), // 10 days ago (3.3× cadence but under 14 days)
      ],
    }

    const result = computeGoingQuiet(athletes, sessions, now)
    expect(result).toHaveLength(0)
  })

  it('does NOT flag athlete with fewer than 3 sessions', () => {
    const athletes = [makeAthlete('a1', 'Alice')]
    const sessions = {
      a1: [
        makeSession('a1', '2026-01-01'),
        makeSession('a1', '2026-01-10'),
      ],
    }

    const result = computeGoingQuiet(athletes, sessions, now)
    expect(result).toHaveLength(0)
  })

  it('sorts longest absence first', () => {
    const athletes = [
      makeAthlete('a1', 'Alice'),
      makeAthlete('a2', 'Bob'),
    ]
    const sessions = {
      a1: [
        makeSession('a1', '2026-01-01'),
        makeSession('a1', '2026-01-06'),
        makeSession('a1', '2026-01-11'),
        makeSession('a1', '2026-03-01'), // 21 days ago
      ],
      a2: [
        makeSession('a2', '2026-01-01'),
        makeSession('a2', '2026-01-06'),
        makeSession('a2', '2026-01-11'),
        makeSession('a2', '2026-02-20'), // 30 days ago
      ],
    }

    const result = computeGoingQuiet(athletes, sessions, now)
    expect(result.length).toBeGreaterThanOrEqual(2)
    expect(result[0].athleteId).toBe('a2') // 30 days > 21 days
    expect(result[1].athleteId).toBe('a1')
  })
})

// ─── Near Milestone ──────────────────────────────────────────────

describe('computeNearMilestone', () => {
  const milestoneDefs = [
    { id: 'm1', label: '50th run', icon: '🏅', condition: { metric: 'session_count', threshold: 50 } },
    { id: 'm2', label: '100 km total', icon: '🌟', condition: { metric: 'distance_km', threshold: 100 } },
    { id: 'm3', label: '10th run', icon: '⭐', condition: { metric: 'session_count', threshold: 10 } },
  ]

  it('flags athlete close to session_count milestone', () => {
    const athletes = [makeAthlete('a1', 'Alice')]
    // 49 sessions → 1 away from 50th run
    const sessions: Record<string, ReturnType<typeof makeSession>[]> = {
      a1: Array.from({ length: 49 }, (_, i) =>
        makeSession('a1', `2026-01-${String(i + 1).padStart(2, '0')}`, null, 2),
      ),
    }

    const result = computeNearMilestone(athletes, sessions, {}, milestoneDefs)
    const milestone50 = result.find(r => r.milestoneName === '50th run')
    expect(milestone50).toBeDefined()
    expect(milestone50!.current).toBe(49)
    expect(milestone50!.target).toBe(50)
    expect(milestone50!.unit).toBe('sessions')
  })

  it('flags athlete close to distance milestone', () => {
    const athletes = [makeAthlete('a1', 'Alice')]
    // 98 km total → within 3 units of 100 km
    const sessions = {
      a1: [
        makeSession('a1', '2026-01-01', null, 50),
        makeSession('a1', '2026-01-05', null, 48),
      ],
    }

    const result = computeNearMilestone(athletes, sessions, {}, milestoneDefs)
    const milestone100km = result.find(r => r.milestoneName === '100 km total')
    expect(milestone100km).toBeDefined()
    expect(milestone100km!.current).toBe(98)
    expect(milestone100km!.target).toBe(100)
    expect(milestone100km!.unit).toBe('km')
  })

  it('rounds milestone distance to 1 decimal place', () => {
    const athletes = [makeAthlete('a1', 'Alice')]
    // Distances that produce floating point artifacts: 4.1 + 3.2 + 2.3 + 1.4 + 86.1 = 97.1
    // But JS may produce 97.09999... or 97.10000...001
    const sessions = {
      a1: [
        makeSession('a1', '2026-01-01', null, 4.1),
        makeSession('a1', '2026-01-05', null, 3.2),
        makeSession('a1', '2026-01-10', null, 2.3),
        makeSession('a1', '2026-01-15', null, 1.4),
        makeSession('a1', '2026-01-20', null, 86.1),
      ],
    }

    const result = computeNearMilestone(athletes, sessions, {}, milestoneDefs)
    const milestone100km = result.find(r => r.milestoneName === '100 km total')
    expect(milestone100km).toBeDefined()
    // current should be cleanly rounded, not a floating point artifact
    expect(milestone100km!.current).toBe(97.1)
    expect(String(milestone100km!.current)).not.toContain('999')
    expect(String(milestone100km!.current)).not.toContain('001')
  })

  it('does NOT flag athlete who already earned the milestone', () => {
    const athletes = [makeAthlete('a1', 'Alice')]
    const sessions = {
      a1: Array.from({ length: 49 }, (_, i) =>
        makeSession('a1', `2026-01-${String(i + 1).padStart(2, '0')}`),
      ),
    }
    const earned = { a1: new Set(['m1']) } // Already earned 50th run

    const result = computeNearMilestone(athletes, sessions, earned, milestoneDefs)
    const milestone50 = result.find(r => r.milestoneName === '50th run')
    expect(milestone50).toBeUndefined()
  })

  it('does NOT flag athlete far from milestone', () => {
    const athletes = [makeAthlete('a1', 'Alice')]
    const sessions = {
      a1: Array.from({ length: 20 }, (_, i) =>
        makeSession('a1', `2026-01-${String(i + 1).padStart(2, '0')}`),
      ),
    }

    const result = computeNearMilestone(athletes, sessions, {}, milestoneDefs)
    // 20 sessions: not near 50 (30 away, >10%), but should be near nothing except maybe 10th run (already past)
    const milestone50 = result.find(r => r.milestoneName === '50th run')
    expect(milestone50).toBeUndefined()
  })

  it('sorts closest to milestone first', () => {
    const athletes = [
      makeAthlete('a1', 'Alice'),
      makeAthlete('a2', 'Bob'),
    ]
    const sessions = {
      a1: Array.from({ length: 48 }, (_, i) =>
        makeSession('a1', `2026-01-${String(i + 1).padStart(2, '0')}`),
      ), // 48 sessions: 2 away from 50
      a2: Array.from({ length: 49 }, (_, i) =>
        makeSession('a2', `2026-01-${String(i + 1).padStart(2, '0')}`),
      ), // 49 sessions: 1 away from 50
    }

    const result = computeNearMilestone(athletes, sessions, {}, milestoneDefs)
    const m50results = result.filter(r => r.milestoneName === '50th run')
    expect(m50results).toHaveLength(2)
    expect(m50results[0].athleteId).toBe('a2') // 1 away < 2 away
    expect(m50results[1].athleteId).toBe('a1')
  })
})

// ─── On Track (integration-level test with pure functions) ───────

describe('on track bucket', () => {
  it('places healthy athletes in onTrack', () => {
    const athletes = [makeAthlete('a1', 'Alice')]
    const sessions = {
      a1: [
        makeSession('a1', '2026-03-10', 4, 3),
        makeSession('a1', '2026-03-14', 4, 3),
        makeSession('a1', '2026-03-17', 3, 3),
        makeSession('a1', '2026-03-20', 4, 3),
      ],
    }

    const milestoneDefs = [
      { id: 'm1', label: '50th run', icon: '🏅', condition: { metric: 'session_count', threshold: 50 } },
    ]

    const now = new Date('2026-03-22T12:00:00+08:00')

    const needsAttention = computeNeedsAttention(athletes, sessions)
    const goingQuiet = computeGoingQuiet(athletes, sessions, now)
    const nearMilestone = computeNearMilestone(athletes, sessions, {}, milestoneDefs)

    const flaggedIds = new Set([
      ...needsAttention.map(a => a.athleteId),
      ...goingQuiet.map(a => a.athleteId),
      ...nearMilestone.map(a => a.athleteId),
    ])

    const onTrack = athletes
      .filter(a => !flaggedIds.has(a.id))
      .map(a => ({ athleteId: a.id, athleteName: a.name, avatar: a.avatar }))

    expect(onTrack).toHaveLength(1)
    expect(onTrack[0].athleteId).toBe('a1')
  })
})
