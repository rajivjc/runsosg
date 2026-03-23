/**
 * Static analysis tests for login page redesign.
 *
 * Verifies:
 * 1. Teal gradient background (brand consistency)
 * 2. SVG running icon replaces emoji
 * 3. Updated tagline
 * 4. Footer links (Our story, Privacy, Terms)
 * 5. Invite-only messaging
 * 6. All existing login functionality preserved
 * 7. Accessibility: aria-hidden on decorative SVG, role="alert" on errors
 */

import * as fs from 'fs'
import * as path from 'path'

describe('login page redesign', () => {
  const filePath = path.join(
    __dirname,
    '../../src/app/login/LoginForm.tsx'
  )
  let content: string

  beforeAll(() => {
    content = fs.readFileSync(filePath, 'utf-8')
  })

  describe('visual branding', () => {
    it('uses teal-to-emerald gradient background', () => {
      expect(content).toContain('from-teal-500')
      expect(content).toContain('to-emerald-600')
    })

    it('uses rounded-3xl shadow-2xl card styling', () => {
      expect(content).toContain('rounded-3xl')
      expect(content).toContain('shadow-2xl')
    })

    it('does not use the old emoji icon', () => {
      // The old 🏃 emoji in a text-4xl div should be gone
      expect(content).not.toContain('text-4xl text-center mb-2')
    })

    it('has SVG running icon with teal fill', () => {
      expect(content).toContain('viewBox="0 0 512 512"')
      expect(content).toContain('#0D9488')
    })

    it('has branded tagline', () => {
      expect(content).toContain('one run at a time')
    })

    it('does not use old gray subtitle', () => {
      expect(content).not.toContain('Sign in to continue')
    })
  })

  describe('footer links', () => {
    it('links to Our Story page', () => {
      expect(content).toContain('href="/about"')
      expect(content).toContain('Our story')
    })

    it('links to Privacy page', () => {
      expect(content).toContain('href="/privacy"')
    })

    it('links to Terms page', () => {
      expect(content).toContain('href="/terms"')
    })

    it('shows invite-only messaging', () => {
      expect(content).toContain('Invite only')
      expect(content).toContain('contact your administrator to join')
    })

    it('uses white text on teal background for footer links', () => {
      expect(content).toContain('text-white/80')
      expect(content).toContain('hover:text-white')
    })
  })

  describe('accessibility', () => {
    it('has aria-hidden on decorative SVG icon', () => {
      expect(content).toContain('aria-hidden="true"')
    })

    it('has role="alert" on error messages', () => {
      const alertCount = (content.match(/role="alert"/g) || []).length
      // Should have alerts for: OTP error, general error, not found, rate limited
      expect(alertCount).toBeGreaterThanOrEqual(4)
    })

    it('has labels on form inputs', () => {
      expect(content).toContain('htmlFor="email"')
      expect(content).toContain('htmlFor="otp"')
    })
  })

  describe('preserved functionality', () => {
    it('still imports sendMagicLink action', () => {
      expect(content).toContain("import { sendMagicLink } from './actions'")
    })

    it('still imports verifyOtpAndRedirect', () => {
      expect(content).toContain("import { verifyOtpAndRedirect } from './get-redirect-path'")
    })

    it('preserves OTP form elements', () => {
      expect(content).toContain('handleVerifyOtp')
      expect(content).toContain('one-time-code')
      expect(content).toContain('maxLength={6}')
    })

    it('preserves email form elements', () => {
      expect(content).toContain('handleSubmit')
      expect(content).toContain('type="email"')
      expect(content).toContain('autoComplete="email"')
    })

    it('preserves resend cooldown logic', () => {
      expect(content).toContain('handleResend')
      expect(content).toContain('resendCooldown')
      expect(content).toContain('INITIAL_COOLDOWN_SECONDS')
    })

    it('preserves PWA auto-auth logic', () => {
      expect(content).toContain('pwaAuthAttempted')
      expect(content).toContain('sosg-pwa-token')
      expect(content).toContain('pwa-launch')
    })

    it('preserves change email functionality', () => {
      expect(content).toContain('handleChangeEmail')
      expect(content).toContain('Use a different email')
    })

    it('preserves error states', () => {
      expect(content).toContain('isRevoked')
      expect(content).toContain('isExpired')
      expect(content).toContain('isInvalidInvite')
      expect(content).toContain('rate_limited')
      expect(content).toContain('not_found')
    })
  })
})
