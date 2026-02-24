'use client'

import { useEffect, useState, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'sosg-install-dismissed'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

type Platform =
  | 'ios-safari'
  | 'ios-other'       // Chrome/Firefox/Edge on iOS — cannot install PWA
  | 'android-native'  // Chrome/Edge/Samsung Internet — fires beforeinstallprompt
  | 'android-firefox'
  | 'desktop-native'  // Chrome/Edge — fires beforeinstallprompt
  | 'desktop-other'   // Firefox/Safari desktop — no PWA install
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

  // iOS detection (all browsers on iOS use WebKit)
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)
  if (isIOS) {
    // Safari check: Safari UA has "Safari" but NOT "CriOS" (Chrome), "FxiOS" (Firefox), "EdgiOS" (Edge)
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
    return isSafari ? 'ios-safari' : 'ios-other'
  }

  // Android detection
  const isAndroid = /Android/.test(ua)
  if (isAndroid) {
    // Firefox on Android doesn't fire beforeinstallprompt
    if (/Firefox/.test(ua)) return 'android-firefox'
    return 'android-native' // Chrome, Edge, Samsung Internet
  }

  // Desktop
  // Chrome or Edge (Chromium-based) support PWA install
  const isChromiumDesktop = /Chrome/.test(ua) && !/Edg/.test(ua)
  const isEdgeDesktop = /Edg/.test(ua)
  if (isChromiumDesktop || isEdgeDesktop) return 'desktop-native'

  return 'desktop-other'
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
  const [platform, setPlatform] = useState<Platform>('unknown')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return

    const detected = detectPlatform()
    setPlatform(detected)

    // For platforms that fire beforeinstallprompt, listen for it
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // For platforms without native prompt, show manual instructions
    if (
      detected === 'ios-safari' ||
      detected === 'ios-other' ||
      detected === 'android-firefox'
    ) {
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
        {platform === 'ios-safari' && (
          <>
            <p style={{ margin: 0, fontSize: 'var(--type-body-size)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Add to Home Screen
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 'var(--type-body-sm-size)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Tap the{' '}
              <span aria-label="share" style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22, background: '#007AFF', borderRadius: 5,
                verticalAlign: 'middle', marginInline: 2,
              }}>
                <span style={{ color: '#fff', fontSize: 13, lineHeight: 1 }}>&#x2B06;&#xFE0F;</span>
              </span>{' '}
              share button below, then <strong>&quot;Add to Home Screen&quot;</strong>
            </p>
          </>
        )}

        {platform === 'ios-other' && (
          <>
            <p style={{ margin: 0, fontSize: 'var(--type-body-size)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Open in Safari to install
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 'var(--type-body-sm-size)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              To add this app to your home screen, open this page in <strong>Safari</strong>. Then tap Share &#x2192; <strong>&quot;Add to Home Screen&quot;</strong>.
            </p>
          </>
        )}

        {platform === 'android-firefox' && (
          <>
            <p style={{ margin: 0, fontSize: 'var(--type-body-size)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Install SOSG Run
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 'var(--type-body-sm-size)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Tap the <strong>&#x22EE; menu</strong> (top right), then <strong>&quot;Install&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.
            </p>
          </>
        )}

        {(platform === 'android-native' || platform === 'desktop-native' || platform === 'unknown') && deferredPrompt && (
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

      {!deferredPrompt && (platform === 'ios-safari' || platform === 'ios-other' || platform === 'android-firefox') && (
        <button
          onClick={dismiss}
          className="btn-primary"
          style={{
            width: 'auto',
            padding: '8px 16px',
            fontSize: 'var(--type-body-sm-size)',
            minHeight: 36,
            flexShrink: 0,
          }}
        >
          Got it
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
