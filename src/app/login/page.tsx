'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { sendMagicLink, verifyOtpCode } from './actions'
import { getRedirectPath } from './get-redirect-path'

type PageState = 'idle' | 'loading' | 'success' | 'error'
type OtpState = 'idle' | 'verifying' | 'error'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [pageState, setPageState] = useState<PageState>('idle')
  const [sentEmail, setSentEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpState, setOtpState] = useState<OtpState>('idle')
  const inputRef = useRef<HTMLInputElement>(null)
  const otpRef = useRef<HTMLInputElement>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const isRevoked = searchParams.get('error') === 'revoked'

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (pageState === 'success') {
      otpRef.current?.focus()
    }
  }, [pageState])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPageState('loading')
    const { error } = await sendMagicLink(email)
    if (error) {
      setPageState('error')
    } else {
      setSentEmail(email)
      setPageState('success')
    }
  }

  async function handleVerifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!otpCode.trim()) return
    setOtpState('verifying')
    const { error } = await verifyOtpCode(sentEmail, otpCode.trim())
    if (error) {
      setOtpState('error')
    } else {
      const path = await getRedirectPath()
      router.push(path)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8">
        {isRevoked && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-center">
            Your access has been revoked. Please contact your administrator.
          </div>
        )}
        <div className="text-4xl text-center mb-2">🏃</div>
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">
          SOSG Running Club
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">Sign in to continue</p>

        {pageState === 'success' ? (
          <div className="flex flex-col items-center text-center mt-8 space-y-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900">Check your email</h2>
            <p className="text-gray-600 text-sm">
              We sent a code to <span className="font-medium">{sentEmail}</span>.
            </p>

            {/* OTP code input */}
            <form onSubmit={handleVerifyOtp} className="w-full space-y-3 pt-2">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                  Enter the 6-digit code
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

            <p className="text-xs text-gray-400 pt-1">
              Or tap the link in your email to sign in via browser.
            </p>
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
            </div>

            <button
              type="submit"
              disabled={pageState === 'loading'}
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
                'Send magic link'
              )}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
