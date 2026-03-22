'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

type HintCardProps = {
  storageKey: string
  title: string
  description: string
  variant?: 'teal' | 'amber'
}

const VARIANTS = {
  teal: {
    container: 'bg-teal-50/60 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-400/20',
    title: 'text-teal-800 dark:text-teal-300',
    description: 'text-teal-700 dark:text-teal-300',
    dismiss: 'text-teal-400 hover:text-teal-600 dark:hover:text-teal-300',
  },
  amber: {
    container: 'bg-amber-50/60 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-400/20',
    title: 'text-amber-800 dark:text-amber-300',
    description: 'text-amber-700 dark:text-amber-300',
    dismiss: 'text-amber-400 hover:text-amber-600 dark:hover:text-amber-300',
  },
}

export default function HintCard({ storageKey, title, description, variant = 'teal' }: HintCardProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) {
      setVisible(true)
    }
  }, [storageKey])

  function dismiss() {
    localStorage.setItem(storageKey, '1')
    setVisible(false)
  }

  if (!visible) return null

  const styles = VARIANTS[variant]

  return (
    <div className={`relative rounded-xl px-4 py-3 mb-4 ${styles.container}`}>
      <button
        onClick={dismiss}
        className={`absolute top-2.5 right-2.5 p-1 transition-colors ${styles.dismiss}`}
        aria-label="Dismiss hint"
      >
        <X size={14} />
      </button>

      <p className={`text-sm font-semibold ${styles.title} pr-6`}>{title}</p>
      <p className={`text-xs ${styles.description} mt-0.5 leading-relaxed`}>{description}</p>
    </div>
  )
}
