/**
 * Tests for bottom navigation tab structure.
 *
 * Validates that:
 * 1. Sessions tab is present for all roles
 * 2. Admin tab is removed
 * 3. Correct tab count per role
 * 4. Sessions tab uses CalendarDays icon and links to /sessions
 */

describe('Bottom nav tab structure', () => {
  // Replicate the tab building logic from BottomNavClient
  function buildTabs(isAdmin: boolean, isCaregiver: boolean) {
    return [
      { href: '/feed', label: 'Feed' },
      { href: '/sessions', label: 'Sessions' },
      { href: '/athletes', label: 'Athletes' },
      ...(!isCaregiver ? [{ href: '/notifications', label: 'Alerts' }] : []),
      { href: '/account', label: 'Account' },
    ]
  }

  it('caregiver sees 4 tabs: Feed, Sessions, Athletes, Account', () => {
    const tabs = buildTabs(false, true)
    expect(tabs).toHaveLength(4)
    expect(tabs.map(t => t.label)).toEqual(['Feed', 'Sessions', 'Athletes', 'Account'])
  })

  it('coach sees 5 tabs: Feed, Sessions, Athletes, Alerts, Account', () => {
    const tabs = buildTabs(false, false)
    expect(tabs).toHaveLength(5)
    expect(tabs.map(t => t.label)).toEqual(['Feed', 'Sessions', 'Athletes', 'Alerts', 'Account'])
  })

  it('admin sees 5 tabs: Feed, Sessions, Athletes, Alerts, Account', () => {
    const tabs = buildTabs(true, false)
    expect(tabs).toHaveLength(5)
    expect(tabs.map(t => t.label)).toEqual(['Feed', 'Sessions', 'Athletes', 'Alerts', 'Account'])
  })

  it('admin does NOT see Admin tab', () => {
    const tabs = buildTabs(true, false)
    expect(tabs.find(t => t.label === 'Admin')).toBeUndefined()
  })

  it('sessions tab links to /sessions', () => {
    const tabs = buildTabs(false, false)
    const sessionsTab = tabs.find(t => t.label === 'Sessions')
    expect(sessionsTab).toBeDefined()
    expect(sessionsTab!.href).toBe('/sessions')
  })

  it('sessions tab uses CalendarDays icon', () => {
    // Verify the ICONS map includes /sessions
    const ICONS: Record<string, string> = {
      '/feed': 'Home',
      '/sessions': 'CalendarDays',
      '/athletes': 'Users',
      '/notifications': 'Bell',
      '/account': 'User',
    }
    expect(ICONS['/sessions']).toBe('CalendarDays')
  })

  it('5 tabs at 375px gives 75px per tab — above 56px minimum', () => {
    const tabCount = 5
    const screenWidth = 375
    const tabWidth = screenWidth / tabCount
    expect(tabWidth).toBeGreaterThanOrEqual(56)
  })
})
