import { computeOnboardingState, type OnboardingInput } from '@/lib/onboarding'

function input(overrides: Partial<OnboardingInput> = {}): OnboardingInput {
  return {
    userName: null,
    totalSessionsCoached: 0,
    hasStravaConnection: false,
    athleteCount: 0,
    ...overrides,
  }
}

describe('computeOnboardingState', () => {
  it('returns isNewUser=true for a completely new user', () => {
    const state = computeOnboardingState(input())
    expect(state.isNewUser).toBe(true)
    expect(state.completedCount).toBe(0)
    expect(state.totalCount).toBe(4)
  })

  it('marks name step completed when user has a name', () => {
    const state = computeOnboardingState(input({ userName: 'Alex' }))
    const nameStep = state.steps.find(s => s.key === 'name')
    expect(nameStep!.completed).toBe(true)
    expect(state.completedCount).toBe(1)
  })

  it('does not mark name step completed for empty string', () => {
    const state = computeOnboardingState(input({ userName: '  ' }))
    const nameStep = state.steps.find(s => s.key === 'name')
    expect(nameStep!.completed).toBe(false)
  })

  it('marks log_run step completed when sessions > 0', () => {
    const state = computeOnboardingState(input({ totalSessionsCoached: 3 }))
    const runStep = state.steps.find(s => s.key === 'log_run')
    expect(runStep!.completed).toBe(true)
  })

  it('marks strava step completed when connected', () => {
    const state = computeOnboardingState(input({ hasStravaConnection: true }))
    const stravaStep = state.steps.find(s => s.key === 'strava')
    expect(stravaStep!.completed).toBe(true)
  })

  it('marks view_athlete step completed when athletes > 0', () => {
    const state = computeOnboardingState(input({ athleteCount: 5 }))
    const viewStep = state.steps.find(s => s.key === 'view_athlete')
    expect(viewStep!.completed).toBe(true)
  })

  it('returns isNewUser=false when all steps completed', () => {
    const state = computeOnboardingState(input({
      userName: 'Alex',
      totalSessionsCoached: 5,
      hasStravaConnection: true,
      athleteCount: 3,
    }))
    expect(state.isNewUser).toBe(false)
    expect(state.completedCount).toBe(4)
    expect(state.totalCount).toBe(4)
  })

  it('returns correct partial completion', () => {
    const state = computeOnboardingState(input({
      userName: 'Alex',
      totalSessionsCoached: 0,
      hasStravaConnection: true,
      athleteCount: 0,
    }))
    expect(state.isNewUser).toBe(true)
    expect(state.completedCount).toBe(2) // name + strava
  })

  it('each step has a valid href', () => {
    const state = computeOnboardingState(input())
    for (const step of state.steps) {
      expect(step.href).toBeTruthy()
      expect(step.href.startsWith('/')).toBe(true)
    }
  })

  it('each step has a label', () => {
    const state = computeOnboardingState(input())
    for (const step of state.steps) {
      expect(step.label.length).toBeGreaterThan(0)
    }
  })
})
