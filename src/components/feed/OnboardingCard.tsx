'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { OnboardingStep } from '@/lib/onboarding'

type OnboardingCardProps = {
  firstName: string
  steps: OnboardingStep[]
  completedCount: number
  totalCount: number
}

const STORAGE_KEY = 'sosg_onboarding_dismissed'

/**
 * Welcome checklist card for new coaches.
 * Shown instead of the greeting card when the coach hasn't completed all steps.
 * Can be dismissed — stored in localStorage.
 */
export default function OnboardingCard({
  firstName,
  steps,
  completedCount,
  totalCount,
}: OnboardingCardProps) {
  const [dismissed, setDismissed] = useState(false)

  // Check localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'true') setDismissed(true)
    }
  }, [])

  if (dismissed) return null

  function handleDismiss() {
    setDismissed(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true')
    }
  }

  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200/60 rounded-2xl px-5 py-5 mb-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-lg font-bold text-gray-900">
            Welcome, {firstName}!
          </p>
          <p className="text-sm text-teal-700 mt-0.5">
            Let&apos;s get you set up for coaching
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-teal-400 hover:text-teal-600 p-1 transition-colors"
          aria-label="Dismiss onboarding"
          title="Dismiss"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-teal-600 font-medium">
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
        {steps.map((step) => (
          <Link key={step.key} href={step.href}>
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
                step.completed ? 'text-teal-600 line-through' : 'text-gray-900'
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
