'use client'

import { useEffect, useState, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'sosg-install-dismissed'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone === true)
  )
}

function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
}

function wasDismissedRecently(): boolean {
  if (typeof window === 'undefined') return false
  const raw = localStorage.getItem(DISMISS_KEY)
  if (!raw) return false
  const ts = parseInt(raw, 10)
  return Date.now() - ts < DISMISS_DURATION_MS
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSPrompt, setShowIOSPrompt] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return

    // Android / Chrome: capture the native install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS Safari: show manual instructions
    if (isIOS()) {
      setShowIOSPrompt(true)
      setVisible(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = useCallback(() => {
    setVisible(false)
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setVisible(false)
    }
    setDeferredPrompt(null)
  }, [deferredPrompt])

  if (!visible) return null

  return (
    <div
      role="banner"
      aria-label="Install app"
      style={{
        position: 'fixed',
        bottom: 68,
        left: 8,
        right: 8,
        zIndex: 900,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {showIOSPrompt ? (
          <>
            <p style={{ margin: 0, fontSize: 'var(--type-body-size)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Add to Home Screen
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 'var(--type-body-sm-size)', color: 'var(--color-text-secondary)' }}>
              Tap the share button <span aria-hidden="true" style={{ fontSize: 16, verticalAlign: 'middle' }}>&#x2B06;&#xFE0F;</span> then &quot;Add to Home Screen&quot; for the best experience.
            </p>
          </>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 'var(--type-body-size)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Install SOSG Run
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 'var(--type-body-sm-size)', color: 'var(--color-text-secondary)' }}>
              Add to your home screen for quick access and fewer logins.
            </p>
          </>
        )}
      </div>

      {deferredPrompt && (
        <button
          onClick={handleInstall}
          className="btn-primary"
          style={{
            width: 'auto',
            padding: '8px 16px',
            fontSize: 'var(--type-body-sm-size)',
            minHeight: 36,
            flexShrink: 0,
          }}
        >
          Install
        </button>
      )}

      <button
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="btn-icon"
        style={{ flexShrink: 0, fontSize: 18, padding: 4, minWidth: 'auto', minHeight: 'auto' }}
      >
        &#x2715;
      </button>
    </div>
  )
}
