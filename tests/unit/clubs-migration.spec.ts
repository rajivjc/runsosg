/**
 * Unit tests for the clubs migration (renamed from club_settings).
 *
 * Verifies:
 * 1. Club type has all original columns
 * 2. Club type has new columns (slug, tagline, strava_hashtag_prefix, locale)
 * 3. ClubSettings is assignable to Club (backward compatibility)
 * 4. slug has correct default (optional on Insert)
 * 5. locale has correct default (optional on Insert)
 */

import type { Database } from '@/lib/supabase/database.types'
import type { Club, ClubSettings } from '@/lib/supabase/types'

// ── Type-level helpers ───────────────────────────────────────────────────────

type ClubRow = Database['public']['Tables']['clubs']['Row']
type ClubInsert = Database['public']['Tables']['clubs']['Insert']
type ClubUpdate = Database['public']['Tables']['clubs']['Update']

// Compile-time assertion: if the key doesn't exist on the type, this errors
type AssertHasKey<T, K extends keyof T> = K

// ── Tests ────────────────────────────────────────────────────────────────────

describe('clubs migration types', () => {
  // 1. clubs type has all original columns
  it('Club type includes all original club_settings columns', () => {
    // These type assertions will fail at compile time if any column is missing
    type _id = AssertHasKey<ClubRow, 'id'>
    type _name = AssertHasKey<ClubRow, 'name'>
    type _logoUrl = AssertHasKey<ClubRow, 'logo_url'>
    type _homeLocation = AssertHasKey<ClubRow, 'home_location'>
    type _sessionDay = AssertHasKey<ClubRow, 'session_day'>
    type _sessionTime = AssertHasKey<ClubRow, 'session_time'>
    type _stravaClubId = AssertHasKey<ClubRow, 'strava_club_id'>
    type _timezone = AssertHasKey<ClubRow, 'timezone'>
    type _updatedAt = AssertHasKey<ClubRow, 'updated_at'>

    // Runtime verification with a mock object
    const club: ClubRow = {
      id: 'test-id',
      name: 'Test Club',
      logo_url: null,
      home_location: null,
      session_day: null,
      session_time: null,
      strava_club_id: null,
      timezone: 'Asia/Singapore',
      updated_at: null,
      slug: 'test',
      tagline: null,
      strava_hashtag_prefix: null,
      locale: 'en-SG',
      recurring_session_day: null,
      recurring_session_time: null,
      recurring_session_end: null,
      recurring_session_location: null,
      recurring_auto_draft: false,
      max_athletes_per_coach: 3,
    }

    expect(club.id).toBe('test-id')
    expect(club.name).toBe('Test Club')
    expect(club.timezone).toBe('Asia/Singapore')
  })

  // 2. clubs type has new columns
  it('Club type includes new columns (slug, tagline, strava_hashtag_prefix, locale)', () => {
    type _slug = AssertHasKey<ClubRow, 'slug'>
    type _tagline = AssertHasKey<ClubRow, 'tagline'>
    type _prefix = AssertHasKey<ClubRow, 'strava_hashtag_prefix'>
    type _locale = AssertHasKey<ClubRow, 'locale'>

    const club: ClubRow = {
      id: 'test-id',
      name: 'Test Club',
      logo_url: null,
      home_location: null,
      session_day: null,
      session_time: null,
      strava_club_id: null,
      timezone: 'Asia/Singapore',
      updated_at: null,
      slug: 'sosg',
      tagline: 'Growing Together',
      strava_hashtag_prefix: '#SOSG',
      locale: 'en-SG',
      recurring_session_day: null,
      recurring_session_time: null,
      recurring_session_end: null,
      recurring_session_location: null,
      recurring_auto_draft: false,
      max_athletes_per_coach: 3,
    }

    expect(club.slug).toBe('sosg')
    expect(club.tagline).toBe('Growing Together')
    expect(club.strava_hashtag_prefix).toBe('#SOSG')
    expect(club.locale).toBe('en-SG')
  })

  // 3. ClubSettings is assignable to Club
  it('ClubSettings is assignable to Club (backward compatibility)', () => {
    const club: Club = {
      id: 'test-id',
      name: 'Test Club',
      logo_url: null,
      home_location: null,
      session_day: null,
      session_time: null,
      strava_club_id: null,
      timezone: 'Asia/Singapore',
      updated_at: null,
      slug: 'sosg',
      tagline: null,
      strava_hashtag_prefix: null,
      locale: 'en-SG',
      recurring_session_day: null,
      recurring_session_time: null,
      recurring_session_end: null,
      recurring_session_location: null,
      recurring_auto_draft: false,
      max_athletes_per_coach: 3,
    }

    // ClubSettings should be the same type as Club
    const settings: ClubSettings = club
    const backToClub: Club = settings

    expect(settings).toBe(club)
    expect(backToClub).toBe(club)
  })

  // 4. slug has correct default — optional on Insert
  it('slug is optional on Insert (has DB default)', () => {
    // This should compile without providing slug
    const insert: ClubInsert = {
      name: 'New Club',
    }

    expect(insert.slug).toBeUndefined()
  })

  // 5. locale has correct default — optional on Insert
  it('locale is optional on Insert (has DB default)', () => {
    // This should compile without providing locale
    const insert: ClubInsert = {
      name: 'New Club',
    }

    expect(insert.locale).toBeUndefined()

    // Also verify both are optional on Update
    const update: ClubUpdate = {
      name: 'Updated Club',
    }

    expect(update.slug).toBeUndefined()
    expect(update.locale).toBeUndefined()
  })
})
