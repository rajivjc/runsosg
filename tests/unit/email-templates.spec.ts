import { milestoneEmail, weeklyDigestEmail, invitationEmail } from '@/lib/email/templates'

describe('Email templates', () => {
  describe('milestoneEmail', () => {
    it('renders athlete name and milestone label', () => {
      const html = milestoneEmail({
        athleteName: 'Marcus',
        milestoneLabel: '10th Run',
        milestoneIcon: '🏆',
        coachName: 'Sarah',
        date: '15 February 2026',
        milestoneUrl: 'https://app.test/milestone/123',
      })

      expect(html).toContain('Marcus')
      expect(html).toContain('10th Run')
      expect(html).toContain('🏆')
      expect(html).toContain('Sarah')
      expect(html).toContain('15 February 2026')
      expect(html).toContain('https://app.test/milestone/123')
      expect(html).toContain('Running Club')
      expect(html).toContain('Milestone Achieved')
    })

    it('handles null coach name', () => {
      const html = milestoneEmail({
        athleteName: 'James',
        milestoneLabel: 'First Run',
        milestoneIcon: '👟',
        coachName: null,
        date: '1 January 2026',
        milestoneUrl: 'https://app.test/milestone/456',
      })

      expect(html).toContain('James')
      expect(html).not.toContain('Coached by')
    })
  })

  describe('weeklyDigestEmail', () => {
    it('renders coach name and session count', () => {
      const html = weeklyDigestEmail({
        coachName: 'Sarah',
        totalSessions: 5,
        athleteNames: ['Marcus', 'James'],
        weekDateRange: '10-16 Feb 2026',
        feedUrl: 'https://app.test/feed',
      })

      expect(html).toContain('Sarah')
      expect(html).toContain('5')
      expect(html).toContain('sessions logged')
      expect(html).toContain('Marcus')
      expect(html).toContain('James')
      expect(html).toContain('10-16 Feb 2026')
    })

    it('uses singular for 1 session', () => {
      const html = weeklyDigestEmail({
        coachName: 'Bob',
        totalSessions: 1,
        athleteNames: [],
        weekDateRange: '10-16 Feb 2026',
        feedUrl: 'https://app.test/feed',
      })

      expect(html).toContain('session logged')
      expect(html).not.toContain('sessions logged')
    })
  })

  describe('invitationEmail', () => {
    it('renders coach role description with accept URL', () => {
      const html = invitationEmail({
        role: 'coach',
        inviterName: 'Admin Jane',
        acceptUrl: 'https://app.test/auth/accept-invite?token=abc123',
      })

      expect(html).toContain('Admin Jane')
      expect(html).toContain('coach')
      expect(html).toContain('log runs')
      expect(html).toContain('Accept Invitation')
      expect(html).toContain('accept-invite?token=abc123')
    })

    it('renders caregiver role description', () => {
      const html = invitationEmail({
        role: 'caregiver',
        inviterName: null,
        acceptUrl: 'https://app.test/auth/accept-invite?token=xyz',
      })

      expect(html).toContain('caregiver')
      expect(html).toContain('read-only access')
      expect(html).not.toContain('null')
    })

    it('includes getting started steps for coaches without display name step', () => {
      const html = invitationEmail({
        role: 'coach',
        inviterName: 'Admin',
        acceptUrl: 'https://app.test/auth/accept-invite?token=abc',
      })

      expect(html).toContain('Connect Strava')
      expect(html).toContain('Log your first run')
      // Display name step is no longer in the email (handled by /welcome page)
      expect(html).not.toContain('Set your display name')
      // PWA install tip is no longer in the email
      expect(html).not.toContain('install the app')
    })

    it('includes getting started steps for caregivers without display name step', () => {
      const html = invitationEmail({
        role: 'caregiver',
        inviterName: null,
        acceptUrl: 'https://app.test/auth/accept-invite?token=xyz',
      })

      expect(html).toContain('View your athlete')
      expect(html).toContain('Send your first cheer')
      // Display name step is no longer in the email
      expect(html).not.toContain('Set your display name')
      expect(html).not.toContain('install the app')
    })

    it('does not include getting started for admin role', () => {
      const html = invitationEmail({
        role: 'admin',
        inviterName: 'Admin',
        acceptUrl: 'https://app.test/auth/accept-invite?token=abc',
      })

      expect(html).not.toContain('Connect Strava')
      expect(html).not.toContain('Send your first cheer')
    })

    it('includes expiry notice', () => {
      const html = invitationEmail({
        role: 'coach',
        inviterName: 'Admin',
        acceptUrl: 'https://app.test/auth/accept-invite?token=abc',
      })

      expect(html).toContain('expires in 7 days')
    })
  })
})
