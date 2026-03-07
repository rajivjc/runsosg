import { computeOnboardingState, computeCaregiverOnboardingState, type OnboardingInput, type CaregiverOnboardingInput } from '@/lib/onboarding'

function input(overrides: Partial<OnboardingInput> = {}): OnboardingInput {
  return {
    userName: null,
    totalSessionsCoached: 0,
    hasStravaConnection: false,
    ...overrides,
  }
}

function caregiverInput(overrides: Partial<CaregiverOnboardingInput> = {}): CaregiverOnboardingInput {
  return {
    userName: null,
    hasLinkedAthlete: false,
    hasViewedAthlete: false,
    hasSentCheer: false,
    ...overrides,
  }
}

describe('computeOnboardingState', () => {
  it('returns isNewUser=true for a completely new user', () => {
    const state = computeOnboardingState(input())
    expect(state.isNewUser).toBe(true)
    expect(state.completedCount).toBe(0)
    expect(state.totalCount).toBe(3)
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

  it('returns isNewUser=false when all steps completed', () => {
    const state = computeOnboardingState(input({
      userName: 'Alex',
      totalSessionsCoached: 5,
      hasStravaConnection: true,
    }))
    expect(state.isNewUser).toBe(false)
    expect(state.completedCount).toBe(3)
    expect(state.totalCount).toBe(3)
  })

  it('returns correct partial completion', () => {
    const state = computeOnboardingState(input({
      userName: 'Alex',
      totalSessionsCoached: 0,
      hasStravaConnection: true,
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

describe('computeCaregiverOnboardingState', () => {
  it('returns isNewUser=true for a completely new caregiver', () => {
    const state = computeCaregiverOnboardingState(caregiverInput())
    expect(state.isNewUser).toBe(true)
    expect(state.completedCount).toBe(1) // view_athlete auto-completes when no linked athlete
    expect(state.totalCount).toBe(3)
  })

  it('marks name step completed when caregiver has a name', () => {
    const state = computeCaregiverOnboardingState(caregiverInput({ userName: 'Sarah' }))
    const nameStep = state.steps.find(s => s.key === 'name')
    expect(nameStep!.completed).toBe(true)
  })

  it('does not mark name step completed for whitespace-only name', () => {
    const state = computeCaregiverOnboardingState(caregiverInput({ userName: '  ' }))
    const nameStep = state.steps.find(s => s.key === 'name')
    expect(nameStep!.completed).toBe(false)
  })

  it('marks view_athlete completed when athlete is linked', () => {
    const state = computeCaregiverOnboardingState(caregiverInput({ hasLinkedAthlete: true, hasViewedAthlete: true }))
    const viewStep = state.steps.find(s => s.key === 'view_athlete')
    expect(viewStep!.completed).toBe(true)
  })

  it('marks send_cheer completed when cheer has been sent', () => {
    const state = computeCaregiverOnboardingState(caregiverInput({ hasSentCheer: true }))
    const cheerStep = state.steps.find(s => s.key === 'send_cheer')
    expect(cheerStep!.completed).toBe(true)
  })

  it('returns isNewUser=false when all steps completed', () => {
    const state = computeCaregiverOnboardingState(caregiverInput({
      userName: 'Sarah',
      hasLinkedAthlete: true,
      hasViewedAthlete: true,
      hasSentCheer: true,
    }))
    expect(state.isNewUser).toBe(false)
    expect(state.completedCount).toBe(3)
  })

  it('each step has a valid href', () => {
    const state = computeCaregiverOnboardingState(caregiverInput())
    for (const step of state.steps) {
      expect(step.href).toBeTruthy()
      expect(step.href.startsWith('/')).toBe(true)
    }
  })

  it('each step has a label', () => {
    const state = computeCaregiverOnboardingState(caregiverInput())
    for (const step of state.steps) {
      expect(step.label.length).toBeGreaterThan(0)
    }
  })
})
