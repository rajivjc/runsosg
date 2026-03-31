'use client'

import { useState, type ReactNode } from 'react'
import styles from '@/app/landing.module.css'

export default function StoryToggle({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <div
        className={`${styles.storyToggleContent} ${expanded ? styles.storyToggleExpanded : ''}`}
      >
        {children}
      </div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={styles.storyToggleButton}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse the story' : 'Read the full story about why Kita was built'}
      >
        {expanded ? 'Read less' : 'Read the full story'}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className={`${styles.storyToggleChevron} ${expanded ? styles.storyToggleChevronUp : ''}`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </>
  )
}
