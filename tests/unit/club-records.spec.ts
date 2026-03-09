import { findClubBestWeek } from '@/lib/analytics/club-records'

describe('findClubBestWeek', () => {
  it('returns null for empty sessions', () => {
    expect(findClubBestWeek([])).toBeNull()
  })

  it('returns the single week when only one session exists', () => {
    const result = findClubBestWeek([{ date: '2025-03-05', distance_km: 2.5 }])
    expect(result).not.toBeNull()
    expect(result!.sessions).toBe(1)
    expect(result!.km).toBe(2.5)
  })

  it('finds the week with the most sessions', () => {
    const sessions = [
      // Week of 3 Mar 2025 (Mon): 3 sessions
      { date: '2025-03-03', distance_km: 1 },
      { date: '2025-03-04', distance_km: 2 },
      { date: '2025-03-05', distance_km: 1.5 },
      // Week of 10 Mar 2025: 1 session
      { date: '2025-03-10', distance_km: 5 },
    ]
    const result = findClubBestWeek(sessions)
    expect(result!.sessions).toBe(3)
    expect(result!.km).toBe(4.5)
    expect(result!.weekLabel).toContain('Mar')
  })

  it('breaks ties by km', () => {
    const sessions = [
      // Week A: 2 sessions, 10 km
      { date: '2025-03-03', distance_km: 5 },
      { date: '2025-03-04', distance_km: 5 },
      // Week B: 2 sessions, 3 km
      { date: '2025-03-10', distance_km: 1 },
      { date: '2025-03-11', distance_km: 2 },
    ]
    const result = findClubBestWeek(sessions)
    expect(result!.sessions).toBe(2)
    expect(result!.km).toBe(10)
  })

  it('handles null distance_km', () => {
    const sessions = [
      { date: '2025-03-03', distance_km: null },
      { date: '2025-03-04', distance_km: 2 },
    ]
    const result = findClubBestWeek(sessions)
    expect(result!.sessions).toBe(2)
    expect(result!.km).toBe(2)
  })
})
