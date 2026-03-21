'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { sendMagicLink } from './actions'
import { verifyOtpAndRedirect } from './get-redirect-path'

type PageState = 'idle' | 'loading' | 'success' | 'error' | 'rate_limited' | 'not_found'
type OtpState = 'idle' | 'verifying' | 'error'

const INITIAL_COOLDOWN_SECONDS = 60
const RATE_LIMITED_COOLDOWN_SECONDS = 120

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [pageState, setPageState] = useState<PageState>('idle')
  const [sentEmail, setSentEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpState, setOtpState] = useState<OtpState>('idle')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendCount, setResendCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const otpRef = useRef<HTMLInputElement>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const isRevoked = searchParams.get('error') === 'revoked'
  const isExpired = searchParams.get('expired') === 'true'
  const prefillEmail = searchParams.get('email') ?? ''
  const isInvalidInvite = searchParams.get('error') === 'invalid-invite'

  // In standalone PWA mode, try to auto-authenticate using the cached PWA token
  // instead of showing the login form. This handles the case where iOS opens a
  // new PWA instance (e.g. from a notification) without session cookies.
  const [pwaAuthAttempted, setPwaAuthAttempted] = useState(false)
  useEffect(() => {
    if (pwaAuthAttempted || isRevoked) return
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    if (!isStandalone) return
    setPwaAuthAttempted(true)
    ;(async () => {
      try {
        const tokenCache = await caches.open('sosg-pwa-token')
        const tokenResp = await tokenCache.match('/_token')
        if (tokenResp) {
          const token = await tokenResp.text()
          if (token) {
            window.location.href = `/auth/pwa-launch?token=${encodeURIComponent(token)}`
            return
          }
        }
      } catch {
        // Cache API unavailable — fall through to normal login
      }
    })()
  }, [pwaAuthAttempted, isRevoked])

  // Auto-fill email from URL params (e.g. expired invitation link)
  useEffect(() => {
    if (prefillEmail && !email) {
      setEmail(prefillEmail)
    }
  }, [prefillEmail]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-send OTP when arriving from an expired invitation link
  const autoSentRef = useRef(false)
  useEffect(() => {
    if (isExpired && prefillEmail && !autoSentRef.current) {
      autoSentRef.current = true
      ;(async () => {
        setPageState('loading')
        const { error, rateLimited, notFound } = await sendMagicLink(prefillEmail, window.location.origin)
        if (error) {
          if (notFound) setPageState('not_found')
          else if (rateLimited) setPageState('rate_limited')
          else setPageState('error')
        } else {
          setSentEmail(prefillEmail)
          setPageState('success')
          setResendCooldown(INITIAL_COOLDOWN_SECONDS)
        }
      })()
    }
  }, [isExpired, prefillEmail])

  useEffect(() => {
    if (!isExpired) inputRef.current?.focus()
  }, [isExpired])

  useEffect(() => {
    if (pageState === 'success') {
      otpRef.current?.focus()
    }
  }, [pageState])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const id = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [resendCooldown])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPageState('loading')
    const { error, rateLimited, notFound } = await sendMagicLink(email, window.location.origin)
    if (error) {
      if (notFound) {
        setPageState('not_found')
      } else if (rateLimited) {
        setPageState('rate_limited')
      } else {
        setPageState('error')
      }
    } else {
      setSentEmail(email)
      setPageState('success')
      setResendCooldown(INITIAL_COOLDOWN_SECONDS)
    }
  }

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || !sentEmail) return
    const nextCount = resendCount + 1
    setResendCount(nextCount)
    // Exponential backoff: 60s, 120s, 240s, capped at 300s
    const cooldown = Math.min(INITIAL_COOLDOWN_SECONDS * Math.pow(2, nextCount - 1), 300)
    setResendCooldown(cooldown)
    setOtpCode('')
    setOtpState('idle')
    const { rateLimited } = await sendMagicLink(sentEmail, window.location.origin)
    if (rateLimited) {
      setResendCooldown(RATE_LIMITED_COOLDOWN_SECONDS)
    }
  }, [resendCooldown, sentEmail, resendCount])

  async function handleVerifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!otpCode.trim()) return
    setOtpState('verifying')
    const { error, redirectPath } = await verifyOtpAndRedirect(sentEmail, otpCode.trim())
    if (error) {
      setOtpState('error')
    } else {
      router.push(redirectPath)
    }
  }

  function handleChangeEmail() {
    setPageState('idle')
    setSentEmail('')
    setOtpCode('')
    setOtpState('idle')
    setResendCooldown(0)
    setResendCount(0)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-teal-500 to-emerald-600 px-4 py-8">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8">
        {isRevoked && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-center">
            Your access has been revoked. Please contact your administrator.
          </div>
        )}
        {isExpired && pageState !== 'success' && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 text-center">
            Your invitation link has expired. We&apos;re sending a new sign-in code to your email.
          </div>
        )}
        {isInvalidInvite && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-center">
            This invitation link is invalid. Please contact your administrator.
          </div>
        )}
        {/* Running icon — matches PWA splash screen */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 512 512"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <g fill="#0D9488" stroke="#0D9488" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="312" cy="135" r="32" stroke="none" />
                <line x1="298" y1="167" x2="252" y2="280" strokeWidth="42" />
                <circle cx="290" cy="193" r="16" stroke="none" />
                <circle cx="255" cy="276" r="15" stroke="none" />
                <line x1="290" y1="193" x2="342" y2="208" strokeWidth="22" />
                <circle cx="342" cy="208" r="9" stroke="none" />
                <line x1="342" y1="208" x2="354" y2="178" strokeWidth="18" />
                <line x1="290" y1="193" x2="243" y2="174" strokeWidth="22" />
                <circle cx="243" cy="174" r="9" stroke="none" />
                <line x1="243" y1="174" x2="218" y2="190" strokeWidth="18" />
                <line x1="255" y1="276" x2="318" y2="338" strokeWidth="28" />
                <circle cx="318" cy="338" r="11" stroke="none" />
                <line x1="318" y1="338" x2="354" y2="320" strokeWidth="23" />
                <line x1="255" y1="276" x2="198" y2="342" strokeWidth="28" />
                <circle cx="198" cy="342" r="11" stroke="none" />
                <line x1="198" y1="342" x2="166" y2="365" strokeWidth="23" />
              </g>
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">
          SOSG Running Club
        </h1>
        <p className="text-sm text-teal-600 text-center font-medium mb-6">
          Growing together, one run at a time
        </p>

        {pageState === 'success' ? (
          <div className="flex flex-col items-center text-center mt-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7 text-teal-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Check your email</h2>
            <p className="text-gray-600 text-sm">
              We sent a 6-digit code to<br />
              <span className="font-medium">{sentEmail}</span>
            </p>

            {/* OTP code input */}
            <form onSubmit={handleVerifyOtp} className="w-full space-y-3 pt-2">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                  Enter the code from your email
                </label>
                <input
                  ref={otpRef}
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => {
                    setOtpCode(e.target.value.replace(/\D/g, ''))
                    if (otpState === 'error') setOtpState('idle')
                  }}
                  placeholder="000000"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-center text-lg font-mono tracking-[0.3em] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
                {otpState === 'error' && (
                  <p className="mt-1 text-sm text-red-600" role="alert">
                    Invalid or expired code. Please try again.
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={otpState === 'verifying' || otpCode.length < 6}
                className="flex w-full items-center justify-center rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {otpState === 'verifying' ? (
                  <>
                    <svg
                      className="mr-2 h-4 w-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Verifying…
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            {/* Resend & help */}
            <div className="pt-1 space-y-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="text-sm text-teal-600 hover:text-teal-700 font-medium disabled:text-gray-400 disabled:cursor-default bg-transparent border-none p-0 min-w-0 min-h-0 w-auto"
              >
                {resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : 'Resend code'}
              </button>
              <p className="text-xs text-gray-400">
                Don&apos;t see it? Check your spam or promotions folder.
              </p>
              <button
                type="button"
                onClick={handleChangeEmail}
                className="text-xs text-gray-400 hover:text-gray-600 bg-transparent border-none p-0 min-w-0 min-h-0 w-auto"
              >
                Use a different email
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                ref={inputRef}
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
              {pageState === 'error' && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  Something went wrong. Please try again.
                </p>
              )}
              {pageState === 'not_found' && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  No account found for this email. Please contact your administrator to get an invitation.
                </p>
              )}
              {pageState === 'rate_limited' && (
                <p className="mt-1 text-sm text-amber-600" role="alert">
                  Too many sign-in attempts. Please wait a few minutes before trying again.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={pageState === 'loading' || pageState === 'rate_limited'}
              className="flex w-full items-center justify-center rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pageState === 'loading' ? (
                <>
                  <svg
                    className="mr-2 h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Sending…
                </>
              ) : (
                'Send login code'
              )}
            </button>

            <p className="text-xs text-gray-400 text-center">
              We&apos;ll email you a 6-digit code to sign in. No password needed.
            </p>
          </form>
        )}
      </div>

      {/* Footer links */}
      <div className="mt-6 flex flex-col items-center gap-2">
        <div className="flex items-center gap-3 text-sm">
          <a href="/about" className="text-white/80 hover:text-white transition-colors">
            Our story
          </a>
          <span className="text-white/40">&middot;</span>
          <a href="/privacy" className="text-white/80 hover:text-white transition-colors">
            Privacy
          </a>
          <span className="text-white/40">&middot;</span>
          <a href="/terms" className="text-white/80 hover:text-white transition-colors">
            Terms
          </a>
        </div>
        <p className="text-xs text-white/50">
          Invite only — contact your administrator to join
        </p>
      </div>
    </main>
  )
}
