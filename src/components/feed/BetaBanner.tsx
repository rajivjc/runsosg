'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const STORAGE_KEY = 'kita-beta-banner-dismissed'

export default function BetaBanner({ clubName }: { clubName?: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-200 dark:border-teal-400/20 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
      <p className="text-sm text-teal-800 dark:text-teal-300 flex-1">
        <span className="font-semibold">Welcome to the {clubName ?? 'Running Club'} beta!</span>{' '}
        We&apos;d love your feedback — let a coach or admin know what you think.
      </p>
      <button
        onClick={dismiss}
        className="flex-shrink-0 p-1 text-teal-500 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
        aria-label="Dismiss banner"
      >
        <X size={16} />
      </button>
    </div>
  )
}
