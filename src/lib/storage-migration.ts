/**
 * One-time migration of localStorage keys from sosg_ prefix to kita_ prefix.
 * Runs on app load. Safe to call multiple times (idempotent).
 */
const KEY_MAP: Record<string, string> = {
  // Feed cards
  'sosg-beta-banner-dismissed': 'kita-beta-banner-dismissed',
  'sosg_caregiver_onboarding_collapsed': 'kita_caregiver_onboarding_collapsed',
  'sosg_club_stats_expanded': 'kita_club_stats_expanded',
  'sosg_onboarding_collapsed': 'kita_onboarding_collapsed',
  'sosg_onboarding_dismissed': 'kita_onboarding_dismissed',
  // Milestones
  'sosg_seen_milestones': 'kita_seen_milestones',
  // Install banner
  'sosg-install-banner-dismissed': 'kita-install-banner-dismissed',
  'sosg-install-dismissed': 'kita-install-dismissed',
  'sosg-pwa-was-installed': 'kita-pwa-was-installed',
  // Hint keys
  'sosg_context_card_dismissed': 'kita_context_card_dismissed',
  'sosg_hint_athlete_detail': 'kita_hint_athlete_detail',
  'sosg_hint_cues': 'kita_hint_cues',
  'sosg_hint_feed_post_onboarding': 'kita_hint_feed_post_onboarding',
  'sosg_hint_caregiver_feed': 'kita_hint_caregiver_feed',
  'sosg_hint_notifications': 'kita_hint_notifications',
}

export function migrateStorageKeys(): void {
  if (typeof window === 'undefined') return
  try {
    for (const [oldKey, newKey] of Object.entries(KEY_MAP)) {
      const value = localStorage.getItem(oldKey)
      if (value !== null && localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, value)
      }
      localStorage.removeItem(oldKey)
    }
  } catch {
    // localStorage may be unavailable (private browsing, etc.)
  }
}
