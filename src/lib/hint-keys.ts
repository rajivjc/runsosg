/**
 * Storage keys for all hint cards and context cards in the app.
 * Each key is used with localStorage to track whether the hint has been dismissed.
 *
 * Naming convention: kita_hint_{page}_{feature} or kita_context_{page}
 *
 * Adding a new hint? Add the key here first, then reference it in the component.
 */
export const HINT_KEYS = {
  CONTEXT_CARD: 'kita_context_card_dismissed',
  HINT_ATHLETE_DETAIL: 'kita_hint_athlete_detail',
  HINT_CUES: 'kita_hint_cues',
  HINT_FEED_POST_ONBOARDING: 'kita_hint_feed_post_onboarding',
  HINT_CAREGIVER_FEED: 'kita_hint_caregiver_feed',
  HINT_NOTIFICATIONS: 'kita_hint_notifications',
} as const
