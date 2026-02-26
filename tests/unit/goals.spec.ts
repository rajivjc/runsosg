import { calculateGoalProgress, type SessionForGoal } from '@/lib/goals'

describe('calculateGoalProgress', () => {
  describe('distance_total', () => {
    it('sums all session distances', () => {
      const sessions: SessionForGoal[] = [
        { distance_km: 3.0 },
        { distance_km: 2.5 },
        { distance_km: 1.5 },
      ]
      const result = calculateGoalProgress('distance_total', 25, sessions)
      expect(result.current).toBe(7)
      expect(result.target).toBe(25)
      expect(result.pct).toBe(28)
      expect(result.unit).toBe('km')
      expect(result.label).toContain('25km total')
    })

    it('handles null distances', () => {
      const sessions: SessionForGoal[] = [
        { distance_km: 3.0 },
        { distance_km: null },
        { distance_km: 2.0 },
      ]
      const result = calculateGoalProgress('distance_total', 10, sessions)
      expect(result.current).toBe(5)
      expect(result.pct).toBe(50)
    })

    it('caps percentage at 100 when goal exceeded', () => {
      const sessions: SessionForGoal[] = [{ distance_km: 15.0 }]
      const result = calculateGoalProgress('distance_total', 10, sessions)
      expect(result.pct).toBe(100)
      expect(result.current).toBe(15)
    })
  })

  describe('distance_single', () => {
    it('picks the best single session distance', () => {
      const sessions: SessionForGoal[] = [
        { distance_km: 2.0 },
        { distance_km: 3.5 },
        { distance_km: 1.0 },
      ]
      const result = calculateGoalProgress('distance_single', 5, sessions)
      expect(result.current).toBe(3.5)
      expect(result.pct).toBe(70)
      expect(result.unit).toBe('km')
      expect(result.label).toContain('5km in one session')
    })

    it('returns 0 for empty sessions', () => {
      const result = calculateGoalProgress('distance_single', 5, [])
      expect(result.current).toBe(0)
      expect(result.pct).toBe(0)
    })

    it('handles all null distances', () => {
      const sessions: SessionForGoal[] = [
        { distance_km: null },
        { distance_km: null },
      ]
      const result = calculateGoalProgress('distance_single', 5, sessions)
      expect(result.current).toBe(0)
    })
  })

  describe('session_count', () => {
    it('counts the number of sessions', () => {
      const sessions: SessionForGoal[] = [
        { distance_km: 2.0 },
        { distance_km: 3.0 },
        { distance_km: 1.5 },
      ]
      const result = calculateGoalProgress('session_count', 10, sessions)
      expect(result.current).toBe(3)
      expect(result.target).toBe(10)
      expect(result.pct).toBe(30)
      expect(result.unit).toBe('runs')
    })

    it('handles zero target', () => {
      const result = calculateGoalProgress('session_count', 0, [])
      expect(result.pct).toBe(0)
    })
  })

  it('returns 0 pct for empty sessions regardless of type', () => {
    expect(calculateGoalProgress('distance_total', 10, []).pct).toBe(0)
    expect(calculateGoalProgress('distance_single', 5, []).pct).toBe(0)
    expect(calculateGoalProgress('session_count', 20, []).pct).toBe(0)
  })
})
