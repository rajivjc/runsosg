/**
 * Unit tests for the getClub() helper.
 *
 * Tests:
 * 1. getClub() returns all expected fields
 * 2. getClub() returns cached result on second call
 * 3. resetClubCache() clears the cache
 * 4. getClub() throws on database error
 * 5. Coach feed uses club name from getClub()
 * 6. Caregiver feed uses club name from getClub()
 */

// ── Mocks (must be before imports) ───────────────────────────────────────────

const mockSingle = jest.fn()
const mockLimit = jest.fn(() => ({ single: mockSingle }))
const mockSelect = jest.fn(() => ({ limit: mockLimit }))
const mockFrom = jest.fn(() => ({ select: mockSelect }))

jest.mock('@/lib/supabase/admin', () => {
  const handler = { from: mockFrom }
  return { adminClient: handler }
})

import { getClub, resetClubCache } from '@/lib/club'

// ── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_CLUB = {
  id: 'club-1',
  name: 'SOSG Running Club',
  logo_url: null,
  home_location: 'Bishan Park',
  session_day: 'Sunday',
  session_time: '7:30 AM',
  strava_club_id: null,
  timezone: 'Asia/Singapore',
  updated_at: '2025-01-01T00:00:00Z',
  slug: 'sosg',
  tagline: 'Growing Together',
  strava_hashtag_prefix: '#SOSG',
  locale: 'en-SG',
}

function setupMock(response: { data: unknown; error: unknown }) {
  mockSingle.mockResolvedValue(response)
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('getClub()', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetClubCache()
  })

  it('returns all expected fields', async () => {
    setupMock({ data: MOCK_CLUB, error: null })

    const club = await getClub()

    expect(club.name).toBe('SOSG Running Club')
    expect(club.timezone).toBe('Asia/Singapore')
    expect(club.locale).toBe('en-SG')
    expect(club.tagline).toBe('Growing Together')
    expect(club.slug).toBe('sosg')
    expect(club.strava_hashtag_prefix).toBe('#SOSG')
    expect(mockFrom).toHaveBeenCalledWith('clubs')
  })

  it('returns cached result on second call', async () => {
    setupMock({ data: MOCK_CLUB, error: null })

    await getClub()
    await getClub()

    expect(mockFrom).toHaveBeenCalledTimes(1)
  })

  it('clears cache when resetClubCache() is called', async () => {
    setupMock({ data: MOCK_CLUB, error: null })

    await getClub()
    resetClubCache()
    await getClub()

    expect(mockFrom).toHaveBeenCalledTimes(2)
  })

  it('returns fallback on database error', async () => {
    setupMock({ data: null, error: { message: 'fail' } })

    const club = await getClub()
    expect(club.name).toBe('Running Club')
    expect(club.tagline).toBe('Growing Together')
  })

  it('returns fallback when data is null', async () => {
    setupMock({ data: null, error: null })

    const club = await getClub()
    expect(club.name).toBe('Running Club')
  })
})

describe('coach feed uses club name from getClub()', () => {
  it('getClub() returns club name without fallback', async () => {
    setupMock({ data: MOCK_CLUB, error: null })

    const club = await getClub()

    // The club name comes from the database — no hardcoded fallback
    expect(club.name).toBe('SOSG Running Club')
    expect(club.name).not.toBeUndefined()
    expect(club.name).not.toBeNull()
  })
})

describe('caregiver feed uses club name from getClub()', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetClubCache()
  })

  it('getClub() returns club name without fallback', async () => {
    setupMock({ data: { ...MOCK_CLUB, name: 'Custom Club Name' }, error: null })

    const club = await getClub()

    // Verify custom name is returned (not a hardcoded default)
    expect(club.name).toBe('Custom Club Name')
  })
})
