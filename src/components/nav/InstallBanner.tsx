'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'sosg-install-banner-dismissed'
const OLD_DISMISS_KEY = 'sosg-install-dismissed'
const PWA_INSTALLED_KEY = 'sosg-pwa-was-installed'
const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

type Platform =
  | 'ios-safari'
  | 'ios-other'
  | 'android-native'
  | 'android-firefox'
  | 'desktop-native'
  | 'desktop-other'
  | 'unknown'

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator &&
      (window.navigator as unknown as { standalone: boolean }).standalone === true)
  )
}

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'unknown'
  const ua = navigator.userAgent

  const isIOS = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)
  if (isIOS) {
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
    return isSafari ? 'ios-safari' : 'ios-other'
  }

  const isAndroid = /Android/.test(ua)
  if (isAndroid) {
    if (/Firefox/.test(ua)) return 'android-firefox'
    return 'android-native'
  }

  const isChromiumDesktop = /Chrome/.test(ua) && !/Edg/.test(ua)
  const isEdgeDesktop = /Edg/.test(ua)
  if (isChromiumDesktop || isEdgeDesktop) return 'desktop-native'

  return 'desktop-other'
}

function migrateOldDismissKey(): void {
  const old = localStorage.getItem(OLD_DISMISS_KEY)
  if (old) {
    localStorage.setItem(DISMISS_KEY, old)
    localStorage.removeItem(OLD_DISMISS_KEY)
  }
}

/**
 * If the app was previously installed as a PWA but is no longer running
 * in standalone mode, the user must have uninstalled it. Clear the
 * dismiss key so the install banner shows again.
 */
function clearDismissIfUninstalled(): void {
  if (typeof window === 'undefined') return

  const wasInstalled = localStorage.getItem(PWA_INSTALLED_KEY)
  if (wasInstalled && !isStandalone()) {
    // User had the PWA but uninstalled it — re-show the banner
    localStorage.removeItem(DISMISS_KEY)
    localStorage.removeItem(PWA_INSTALLED_KEY)
  }
}

function wasDismissedRecently(): boolean {
  if (typeof window === 'undefined') return false
  const raw = localStorage.getItem(DISMISS_KEY)
  if (!raw) return false
  const ts = parseInt(raw, 10)
  return Date.now() - ts < DISMISS_DURATION_MS
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Mark that PWA is installed (for uninstall detection later)
    if (isStandalone()) {
      localStorage.setItem(PWA_INSTALLED_KEY, '1')
      return
    }

    // If user previously had PWA but uninstalled, clear the dismiss timer
    clearDismissIfUninstalled()

    migrateOldDismissKey()
    if (wasDismissedRecently()) return

    const detected = detectPlatform()

    // No actionable install path for these platforms
    if (detected === 'desktop-other' || detected === 'ios-other') return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // For platforms without native prompt, show immediately
    if (detected === 'ios-safari' || detected === 'android-firefox') {
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
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    }
    setDeferredPrompt(null)
  }, [deferredPrompt])

  if (!visible) return null

  return (
    <div
      role="banner"
      aria-label="Install app"
      style={{
        background: 'var(--color-accent-lighter)',
        borderBottom: '1px solid var(--color-border)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 'var(--type-body-sm-size)',
        color: 'var(--color-text-secondary)',
        lineHeight: 1.4,
      }}
    >
      <p style={{ margin: 0, flex: 1 }}>
        For the best experience, install SOSG Run on your device.{' '}
        {!deferredPrompt && (
          <Link
            href="/setup"
            style={{
              color: 'var(--color-accent)',
              fontWeight: 600,
              textDecoration: 'underline',
              textUnderlineOffset: 2,
            }}
          >
            Learn how
          </Link>
        )}
      </p>

      {deferredPrompt && (
        <button
          onClick={handleInstall}
          className="btn-primary"
          style={{
            width: 'auto',
            padding: '6px 14px',
            fontSize: 'var(--type-body-sm-size)',
            minHeight: 32,
            flexShrink: 0,
          }}
        >
          Install
        </button>
      )}

      <button
        onClick={dismiss}
        aria-label="Dismiss install banner"
        style={{
          flexShrink: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 16,
          color: 'var(--color-text-secondary)',
          padding: 0,
          minWidth: 44,
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        &#x2715;
      </button>
    </div>
  )
}
