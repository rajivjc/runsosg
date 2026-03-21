/**
 * Storage keys for all hint cards and context cards in the app.
 * Each key is used with localStorage to track whether the hint has been dismissed.
 *
 * Naming convention: sosg_hint_{page}_{feature} or sosg_context_{page}
 *
 * Adding a new hint? Add the key here first, then reference it in the component.
 */
export const HINT_KEYS = {
  CONTEXT_CARD: 'sosg_context_card_dismissed',
  HINT_ATHLETE_DETAIL: 'sosg_hint_athlete_detail',
  HINT_CUES: 'sosg_hint_cues',
  HINT_FEED_POST_ONBOARDING: 'sosg_hint_feed_post_onboarding',
  HINT_CAREGIVER_FEED: 'sosg_hint_caregiver_feed',
  HINT_NOTIFICATIONS: 'sosg_hint_notifications',
} as const
