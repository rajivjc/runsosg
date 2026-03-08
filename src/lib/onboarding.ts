/**
 * Onboarding state computation — pure function.
 *
 * Determines which onboarding steps a new coach or caregiver has completed
 * based on their activity data. No database calls.
 *
 * Display name is no longer tracked here — it's captured on the /welcome
 * page immediately after first sign-in.
 */

export interface OnboardingInput {
  totalSessionsCoached: number
  hasStravaConnection: boolean
}

export interface CaregiverOnboardingInput {
  hasLinkedAthlete: boolean
  hasViewedAthlete: boolean
  hasSentCheer: boolean
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
    {
      key: 'install_app',
      label: 'Install the app for quick access',
      completed: false, // Only detectable client-side (standalone mode)
      href: '/setup',
    },
  ]

  const completedCount = steps.filter(s => s.completed).length
  // isNewUser is based on server-knowable steps only (exclude client-only install_app)
  const serverSteps = steps.filter(s => s.key !== 'install_app')
  const serverCompleted = serverSteps.filter(s => s.completed).length

  return {
    isNewUser: serverCompleted < serverSteps.length,
    steps,
    completedCount,
    totalCount: steps.length,
  }
}

/**
 * Compute the onboarding state for a caregiver.
 * A caregiver is "new" if they haven't completed all steps.
 */
export function computeCaregiverOnboardingState(input: CaregiverOnboardingInput): OnboardingState {
  const steps: OnboardingStep[] = [
    {
      key: 'view_athlete',
      label: 'View your athlete\u2019s progress',
      completed: input.hasViewedAthlete || !input.hasLinkedAthlete,
      href: '/feed',
    },
    {
      key: 'send_cheer',
      label: 'Send your first cheer',
      completed: input.hasSentCheer,
      href: '/feed',
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
