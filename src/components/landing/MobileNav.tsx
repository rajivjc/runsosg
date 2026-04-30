'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import styles from '@/app/landing.module.css'

export default function MobileNav() {
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  return (
    <>
      <button
        className={styles.hamburger}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Close menu' : 'Open menu'}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? (
            <>
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </>
          ) : (
            <>
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </>
          )}
        </svg>
      </button>

      {/* Overlay to close on tap outside */}
      <div
        className={open ? styles.mobileMenuOverlayOpen : styles.mobileMenuOverlay}
        onClick={close}
        aria-hidden="true"
      />

      <div className={open ? styles.mobileMenuOpen : styles.mobileMenu} role="menu">
        <Link href="/demo" className={styles.mobileMenuItem} onClick={close} role="menuitem">
          See the app
        </Link>
        <a
          href="https://github.com/rajivjc/kita"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.mobileMenuItem}
          onClick={close}
          role="menuitem"
        >
          GitHub
        </a>
        <Link href="/login" className={styles.mobileMenuItem} onClick={close} role="menuitem">
          Sign in
        </Link>
      </div>
    </>
  )
}
