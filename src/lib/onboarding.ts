/**
 * Onboarding state computation — pure function.
 *
 * Determines which onboarding steps a new coach has completed
 * based on their activity data. No database calls.
 */

export interface OnboardingInput {
  userName: string | null
  totalSessionsCoached: number
  hasStravaConnection: boolean
}

export interface OnboardingStep {
  key: string
  label: string
  completed: boolean
  href: string
}

export interface OnboardingState {
  isNewUser: boolean
  steps: OnboardingStep[]
  completedCount: number
  totalCount: number
}

/**
 * Compute the onboarding state for a coach.
 * A user is considered "new" if they haven't completed all steps.
 */
export function computeOnboardingState(input: OnboardingInput): OnboardingState {
  const steps: OnboardingStep[] = [
    {
      key: 'name',
      label: 'Set your display name',
      completed: input.userName != null && input.userName.trim().length > 0,
      href: '/account',
    },
    {
      key: 'strava',
      label: 'Connect Strava for auto-sync',
      completed: input.hasStravaConnection,
      href: '/account',
    },
    {
      key: 'log_run',
      label: 'Log your first run',
      completed: input.totalSessionsCoached > 0,
      href: '/athletes',
    },
  ]

  const completedCount = steps.filter(s => s.completed).length

  return {
    isNewUser: completedCount < steps.length,
    steps,
    completedCount,
    totalCount: steps.length,
  }
}
