'use client'

import { useState, type ReactNode } from 'react'

export default function StoryToggle({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <div
        style={{
          maxHeight: expanded ? '4000px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.5s ease-in-out',
        }}
      >
        {children}
      </div>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          marginTop: '16px',
          padding: '8px 0',
          color: '#0F766E',
          fontWeight: 600,
          fontSize: '15px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
        aria-expanded={expanded}
      >
        {expanded ? 'Read less' : 'Read the full story'}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.3s ease',
          }}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </>
  )
}
