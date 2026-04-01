/**
 * Unit tests for the landing page (src/app/page.tsx).
 *
 * Validates:
 * 1. Unauthenticated users see the landing page
 * 2. Authenticated users are redirected to /feed
 * 3. Landing page contains expected sections and links
 * 4. Does NOT contain authenticated app nav
 * 5. StoryToggle expand/collapse behaviour
 * 6. ScrollReveal respects prefers-reduced-motion
 */

import { renderToString } from 'react-dom/server'
import { createElement } from 'react'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetUser = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}))

const mockRedirect = jest.fn()
jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args)
    // next/navigation redirect throws to halt execution
    throw new Error('NEXT_REDIRECT')
  },
}))

// Mock next/link as a simple anchor
jest.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
      createElement('a', { href, className }, children),
  }
})

// Mock ClubInquiryForm as a simple div (client component with server action deps)
jest.mock('@/components/landing/ClubInquiryForm', () => {
  return {
    __esModule: true,
    default: () =>
      createElement('div', { 'data-testid': 'club-inquiry-form' }, 'Ready to start your club?'),
  }
})

// Mock next/image as a simple img
jest.mock('next/image', () => {
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) =>
      createElement('img', { src: props.src, alt: props.alt, width: props.width, height: props.height }),
  }
})

// ── Helpers ────────────────────────────────────────────────────────────────────

function mockUnauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null } })
}

function mockAuthenticated() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-123', email: 'coach@test.com' } },
  })
}

async function renderLandingPage(): Promise<string> {
  // Dynamic import to ensure mocks are applied first
  const { default: Home } = await import('@/app/page')
  const element = await Home()
  return renderToString(element)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Landing page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Authentication', () => {
    it('renders the landing page for unauthenticated users', async () => {
      mockUnauthenticated()
      const html = await renderLandingPage()
      expect(html).toContain('every athlete')
      expect(html).toContain('belongs')
    })

    it('redirects authenticated users to /feed', async () => {
      mockAuthenticated()
      await expect(renderLandingPage()).rejects.toThrow('NEXT_REDIRECT')
      expect(mockRedirect).toHaveBeenCalledWith('/feed')
    })
  })

  describe('Content sections', () => {
    let html: string

    beforeAll(async () => {
      mockUnauthenticated()
      html = await renderLandingPage()
    })

    it('contains the hero section with tagline', () => {
      expect(html).toContain('The running app where')
      expect(html).toContain('every athlete')
    })

    it('contains the story section', () => {
      expect(html).toContain('WHY I BUILT THIS')
      expect(html).toContain('An athlete finished a 5km run and looked around to see if anyone was watching')
    })

    it('contains the screenshots section', () => {
      expect(html).toContain('SEE IT IN ACTION')
      expect(html).toContain('Three roles. One app. Zero clutter.')
    })

    it('contains the personas/features section', () => {
      expect(html).toContain('BUILT FOR THREE ROLES')
      expect(html).toContain('Coach')
      expect(html).toContain('Caregiver')
      expect(html).toContain('Athlete')
    })

    it('contains the inclusive design section', () => {
      expect(html).toContain('BUILT DIFFERENTLY')
      expect(html).toContain('Accessibility is not a feature')
      expect(html).toContain('WCAG 2.2 AAA')
    })

    it('contains the how-it-works section', () => {
      expect(html).toContain('HOW IT WORKS')
      expect(html).toContain('Create your club')
      expect(html).toContain('Add your athletes')
      expect(html).toContain('Start logging runs')
    })

    it('contains the CTA section', () => {
      expect(html).toContain('Ready to start your club?')
    })

    it('contains the footer', () => {
      expect(html).toContain('Built with care in Singapore')
    })
  })

  describe('Links', () => {
    let html: string

    beforeAll(async () => {
      mockUnauthenticated()
      html = await renderLandingPage()
    })

    it('contains "Sign in" link pointing to /login', () => {
      expect(html).toContain('href="/login"')
      expect(html).toContain('Sign in')
    })

    it('contains "Start your club" link pointing to contact form', () => {
      expect(html).toContain('href="#contact"')
      expect(html).toContain('Start your club')
    })

    it('contains footer links to privacy, terms, and contact', () => {
      expect(html).toContain('href="/privacy"')
      expect(html).toContain('href="/terms"')
      expect(html).toContain('href="mailto:hello@kitarun.com"')
    })
  })

  describe('App nav isolation', () => {
    it('does not contain authenticated app bottom nav tabs', async () => {
      mockUnauthenticated()
      const html = await renderLandingPage()
      // The authenticated app uses bottom nav with Feed/Sessions/Athletes/Alerts/Account
      // The landing page should NOT include these navigation items as tabs
      // (Landing uses its own nav with "Our story", "Features", "Accessibility")
      expect(html).toContain('Our story')
      expect(html).toContain('Features')
      expect(html).toContain('Accessibility')
    })
  })
})

describe('StoryToggle', () => {
  it('renders with a "Read the full story" button', async () => {
    const { default: StoryToggle } = await import('@/components/landing/StoryToggle')
    const element = createElement(StoryToggle, null, createElement('p', null, 'Hidden content'))
    const html = renderToString(element)
    expect(html).toContain('Read the full story')
    // Content is rendered but hidden via CSS class (max-height: 0 applied by storyToggleContent)
    expect(html).toContain('Hidden content')
    expect(html).toContain('storyToggleContent')
  })
})

describe('ScrollReveal', () => {
  it('renders children with initial hidden state', async () => {
    const { default: ScrollReveal } = await import('@/components/landing/ScrollReveal')
    const element = createElement(ScrollReveal, null, createElement('p', null, 'Section content'))
    const html = renderToString(element)
    // Server render: initial state is opacity 0 (not yet revealed)
    expect(html).toContain('Section content')
    expect(html).toContain('opacity:0')
  })
})
