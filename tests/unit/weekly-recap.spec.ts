import { computeWeeklyRecap, type RecapSession, type RecapMilestone } from '@/lib/feed/weekly-recap'

const WEEK_START = new Date('2026-02-23T00:00:00') // Monday

function session(overrides: Partial<RecapSession> = {}): RecapSession {
  return {
    athlete_id: 'a1',
    athlete_name: 'Ali',
    distance_km: 2.5,
    feel: 3,
    ...overrides,
  }
}

describe('computeWeeklyRecap', () => {
  it('returns zeros for empty sessions', () => {
    const recap = computeWeeklyRecap([], [], WEEK_START)
    expect(recap.totalSessions).toBe(0)
    expect(recap.totalKm).toBe(0)
    expect(recap.activeAthletes).toBe(0)
    expect(recap.milestonesEarned).toBe(0)
    expect(recap.starMoment).toBeNull()
  })

  it('counts sessions, km, and unique athletes', () => {
    const sessions = [
      session({ athlete_id: 'a1', distance_km: 3.0 }),
      session({ athlete_id: 'a2', athlete_name: 'Priya', distance_km: 2.0 }),
      session({ athlete_id: 'a1', distance_km: 1.5 }),
    ]
    const recap = computeWeeklyRecap(sessions, [], WEEK_START)
    expect(recap.totalSessions).toBe(3)
    expect(recap.totalKm).toBeCloseTo(6.5)
    expect(recap.activeAthletes).toBe(2)
  })

  it('counts milestones achieved within the week', () => {
    const milestones: RecapMilestone[] = [
      { achievedAt: '2026-02-24T10:00:00Z' }, // within week
      { achievedAt: '2026-02-27T10:00:00Z' }, // within week
      { achievedAt: '2026-02-20T10:00:00Z' }, // before week
      { achievedAt: '2026-03-05T10:00:00Z' }, // after week
    ]
    const recap = computeWeeklyRecap([session()], milestones, WEEK_START)
    expect(recap.milestonesEarned).toBe(2)
  })

  it('picks feel=5 as star moment over longer distance', () => {
    const sessions = [
      session({ athlete_name: 'Ali', feel: 5, distance_km: 1.0 }),
      session({ athlete_name: 'Priya', feel: 3, distance_km: 5.0 }),
    ]
    const recap = computeWeeklyRecap(sessions, [], WEEK_START)
    expect(recap.starMoment).not.toBeNull()
    expect(recap.starMoment!.athleteName).toBe('Ali')
    expect(recap.starMoment!.type).toBe('feel')
  })

  it('picks longest distance when no feel=5', () => {
    const sessions = [
      session({ athlete_name: 'Ali', feel: 4, distance_km: 2.0 }),
      session({ athlete_name: 'Priya', feel: 3, distance_km: 4.5 }),
    ]
    const recap = computeWeeklyRecap(sessions, [], WEEK_START)
    expect(recap.starMoment).not.toBeNull()
    expect(recap.starMoment!.athleteName).toBe('Priya')
    expect(recap.starMoment!.type).toBe('distance')
    expect(recap.starMoment!.value).toContain('4.5')
  })

  it('returns null star moment for sessions without feel or distance', () => {
    const sessions = [session({ feel: null, distance_km: null })]
    const recap = computeWeeklyRecap(sessions, [], WEEK_START)
    expect(recap.starMoment).toBeNull()
  })

  it('handles null distance_km gracefully in totals', () => {
    const sessions = [
      session({ distance_km: 3.0 }),
      session({ distance_km: null }),
      session({ distance_km: 2.0 }),
    ]
    const recap = computeWeeklyRecap(sessions, [], WEEK_START)
    expect(recap.totalKm).toBeCloseTo(5.0)
  })
})
