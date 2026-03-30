'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import type { OnboardingStep } from '@/lib/onboarding'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type OnboardingCardProps = {
  firstName: string
  steps: OnboardingStep[]
  completedCount: number
  totalCount: number
}

const STORAGE_KEY = 'kita_onboarding_collapsed'
const OLD_STORAGE_KEY = 'kita_onboarding_dismissed'

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator &&
      (window.navigator as unknown as { standalone: boolean }).standalone === true)
  )
}

/**
 * Welcome checklist card for new coaches.
 * Shown instead of the greeting card when the coach hasn't completed all steps.
 * Can be collapsed — stored in sessionStorage (resets each browser session).
 */
export default function OnboardingCard({
  firstName,
  steps: serverSteps,
  completedCount: serverCompletedCount,
  totalCount,
}: OnboardingCardProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  // Check sessionStorage on mount + clean up old localStorage key + detect standalone
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Clean up old permanent dismiss key so existing coaches see the card again
      localStorage.removeItem(OLD_STORAGE_KEY)

      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored === 'true') setCollapsed(true)

      // Detect if app is already installed as PWA
      setIsInstalled(isStandalone())
    }
  }, [])

  // Capture beforeinstallprompt for native install
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Override install_app step completion client-side
  const steps = useMemo(() =>
    serverSteps.map(step =>
      step.key === 'install_app' && isInstalled
        ? { ...step, completed: true }
        : step
    ), [serverSteps, isInstalled])

  const completedCount = isInstalled
    ? serverCompletedCount + 1
    : serverCompletedCount

  const handleInstallClick = useCallback(async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setIsInstalled(true)
    setInstallPrompt(null)
  }, [installPrompt])

  function handleToggle() {
    const next = !collapsed
    setCollapsed(next)
    if (typeof window !== 'undefined') {
      if (next) {
        sessionStorage.setItem(STORAGE_KEY, 'true')
      } else {
        sessionStorage.removeItem(STORAGE_KEY)
      }
    }
  }

  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Collapsed state: compact bar with progress summary
  if (collapsed) {
    return (
      <button
        onClick={handleToggle}
        className="w-full bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/20 dark:to-emerald-950/20 border border-teal-200 dark:border-teal-400/30 rounded-2xl px-5 py-3.5 mb-5 shadow-sm flex items-center justify-between text-left"
        aria-label="Expand setup guide"
      >
        <span className="text-sm font-medium text-teal-700 dark:text-teal-300">
          Setup guide: {completedCount} of {totalCount} complete
        </span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-teal-400 flex-shrink-0">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    )
  }

  return (
    <div className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/20 dark:to-emerald-950/20 border border-teal-200 dark:border-teal-400/30 rounded-2xl px-5 py-5 mb-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-lg font-bold text-text-primary">
            Welcome, {firstName}!
          </p>
          <p className="text-sm text-teal-700 dark:text-teal-300 mt-0.5">
            Let&apos;s get you set up for coaching
          </p>
        </div>
        <button
          onClick={handleToggle}
          className="text-teal-400 hover:text-teal-600 dark:hover:text-teal-300 p-1 transition-colors"
          aria-label="Collapse setup guide"
          title="Collapse"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 10l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-teal-600 dark:text-teal-300 font-medium">
            {completedCount} of {totalCount} complete
          </span>
          <span className="text-[10px] text-teal-500">{progressPct}%</span>
        </div>
        <div className="w-full bg-teal-100 rounded-full h-1.5">
          <div
            className="bg-teal-500 h-1.5 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {steps.map((step) => {
          const inner = (
            <div className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
              step.completed
                ? 'bg-white/40'
                : 'bg-white/70 hover:bg-white'
            }`}>
              <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                step.completed
                  ? 'bg-teal-500 text-white'
                  : 'border-2 border-teal-300'
              }`}>
                {step.completed && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className={`text-sm font-medium ${
                step.completed ? 'text-teal-600 dark:text-teal-300 line-through' : 'text-text-primary'
              }`}>
                {step.label}
              </span>
            </div>
          )

          // Use native install prompt if available for the install step
          if (step.key === 'install_app' && installPrompt && !step.completed) {
            return (
              <button key={step.key} onClick={handleInstallClick} className="w-full text-left">
                {inner}
              </button>
            )
          }

          return (
            <Link key={step.key} href={step.href}>
              {inner}
            </Link>
          )
        })}
      </div>

    </div>
  )
}
