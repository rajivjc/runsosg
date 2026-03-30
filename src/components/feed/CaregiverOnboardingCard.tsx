'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { OnboardingStep } from '@/lib/onboarding'

type CaregiverOnboardingCardProps = {
  firstName: string
  steps: OnboardingStep[]
  completedCount: number
  totalCount: number
}

const STORAGE_KEY = 'kita_caregiver_onboarding_collapsed'

/**
 * Welcome checklist card for new caregivers.
 * Amber-themed to match caregiver UI.
 * Can be collapsed — stored in sessionStorage (resets each browser session).
 */
export default function CaregiverOnboardingCard({
  firstName,
  steps,
  completedCount,
  totalCount,
}: CaregiverOnboardingCardProps) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored === 'true') setCollapsed(true)
    }
  }, [])

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

  if (collapsed) {
    return (
      <button
        onClick={handleToggle}
        className="w-full bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/15 border border-amber-200 dark:border-amber-400/30 rounded-2xl px-5 py-3.5 mb-5 shadow-sm flex items-center justify-between text-left"
        aria-label="Expand setup guide"
      >
        <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
          Getting started: {completedCount} of {totalCount} complete
        </span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-amber-400 flex-shrink-0">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    )
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/15 border border-amber-200 dark:border-amber-400/30 rounded-2xl px-5 py-5 mb-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-lg font-bold text-text-primary">
            Welcome, {firstName}!
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
            Here&apos;s how to get started
          </p>
        </div>
        <button
          onClick={handleToggle}
          className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 p-1 transition-colors"
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
          <span className="text-[10px] text-amber-600 dark:text-amber-300 font-medium">
            {completedCount} of {totalCount} complete
          </span>
          <span className="text-[10px] text-amber-500">{progressPct}%</span>
        </div>
        <div className="w-full bg-amber-100 dark:bg-amber-900/10 rounded-full h-1.5">
          <div
            className="bg-amber-500 h-1.5 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {steps.map((step) => (
          <Link key={step.key} href={step.href}>
            <div className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
              step.completed
                ? 'bg-white/40'
                : 'bg-white/70 hover:bg-white'
            }`}>
              <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                step.completed
                  ? 'bg-amber-500 text-white'
                  : 'border-2 border-amber-300'
              }`}>
                {step.completed && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className={`text-sm font-medium ${
                step.completed ? 'text-amber-600 dark:text-amber-300 line-through' : 'text-text-primary'
              }`}>
                {step.label}
              </span>
            </div>
          </Link>
        ))}
      </div>

    </div>
  )
}
