'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type DeviceType = 'iphone' | 'android' | 'desktop'

function detectDevice(): DeviceType {
  if (typeof window === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'iphone'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator &&
      (window.navigator as unknown as { standalone: boolean }).standalone === true)
  )
}

export default function SetupContent({ clubName }: { clubName: string }) {
  const [activeTab, setActiveTab] = useState<DeviceType>('iphone')
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    setActiveTab(detectDevice())
    setInstalled(isStandalone())
  }, [])

  const tabs: { id: DeviceType; label: string }[] = [
    { id: 'iphone', label: 'iPhone / iPad' },
    { id: 'android', label: 'Android' },
    { id: 'desktop', label: 'Computer' },
  ]

  return (
    <main className="min-h-screen bg-surface-raised px-4 py-8 pb-28">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏃</div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Set Up {clubName}
          </h1>
          <p className="text-sm text-text-muted">
            Follow these steps to add the app to your device for the best experience.
          </p>
        </div>

        {installed && (
          <div className="mb-6 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-400/20 px-4 py-3 text-sm text-green-800 dark:text-green-300 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>The app is already installed on this device!</span>
          </div>
        )}

        {/* Step 1 — Login */}
        <section className="bg-surface rounded-xl border border-border shadow-sm mb-4 overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-600 text-white dark:bg-teal-400 dark:text-gray-950 text-sm font-bold flex items-center justify-center">1</span>
            <h2 className="text-base font-semibold text-text-primary">Sign in</h2>
          </div>
          <div className="px-5 py-4 text-sm text-text-secondary space-y-2">
            <p>Your admin will send you an invite email. After that:</p>
            <ol className="space-y-1.5 pl-4">
              <li>Open the app link in your browser</li>
              <li>Enter your email address</li>
              <li>Check your email for a <strong>6-digit code</strong></li>
              <li>Type the code into the app and tap <strong>Sign in</strong></li>
            </ol>
            <p className="text-xs text-text-hint mt-2">
              No password needed! You&apos;ll get a fresh code each time you sign in.
            </p>
          </div>
        </section>

        {/* Step 2 — Install as app */}
        <section className="bg-surface rounded-xl border border-border shadow-sm mb-4 overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-600 text-white dark:bg-teal-400 dark:text-gray-950 text-sm font-bold flex items-center justify-center">2</span>
            <h2 className="text-base font-semibold text-text-primary">Add to Home Screen</h2>
          </div>

          {/* Device tabs */}
          <div className="flex border-b border-border-subtle">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 text-xs font-medium text-center transition-colors border-b-2 bg-transparent ${
                  activeTab === tab.id
                    ? 'text-teal-600 dark:text-teal-300 border-teal-600'
                    : 'text-text-hint border-transparent hover:text-text-secondary'
                }`}
                style={{ minWidth: 'auto', minHeight: 'auto', width: 'auto' }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="px-5 py-4 text-sm text-text-secondary">
            {activeTab === 'iphone' && <IOSInstructions clubName={clubName} />}
            {activeTab === 'android' && <AndroidInstructions clubName={clubName} />}
            {activeTab === 'desktop' && <DesktopInstructions />}
          </div>
        </section>

        {/* Step 3 — All set */}
        <section className="bg-surface rounded-xl border border-border shadow-sm mb-6 overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-600 text-white dark:bg-teal-400 dark:text-gray-950 text-sm font-bold flex items-center justify-center">3</span>
            <h2 className="text-base font-semibold text-text-primary">You&apos;re all set!</h2>
          </div>
          <div className="px-5 py-4 text-sm text-text-secondary space-y-2">
            <p>Open the <strong>{clubName}</strong> app from your home screen. It works like a regular app — no app store needed.</p>
            <p className="text-xs text-text-hint">You may need to sign in again the first time you open it.</p>
          </div>
        </section>

        {/* Help section */}
        <div className="text-center text-sm text-text-hint space-y-2">
          <p>Having trouble? Ask your coach or admin for help.</p>
          <Link href="/login" className="text-teal-600 dark:text-teal-300 hover:text-teal-700 dark:hover:text-teal-300 font-medium">
            Go to Sign in
          </Link>
        </div>
      </div>
    </main>
  )
}

function IOSInstructions({ clubName }: { clubName: string }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-400/20 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300">
        <strong>Important:</strong> You must use <strong>Safari</strong> for this step (the blue compass icon on your home screen). If you&apos;re using Chrome or another browser, open <strong>Safari</strong>, go to <strong>sosg.run</strong>, and sign in there first.
      </div>
      <ol className="space-y-3 pl-0" style={{ listStyle: 'none', paddingLeft: 0 }}>
        <li className="flex gap-3 items-start">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-surface-alt text-text-secondary text-xs font-bold flex items-center justify-center mt-0.5">1</span>
          <span>
            Tap the <strong>Share</strong> button &mdash; the square with an upward arrow{' '}
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 22, height: 22, background: '#007AFF', borderRadius: 5,
              verticalAlign: 'middle', marginInline: 2,
            }}>
              <span style={{ color: '#fff', fontSize: 12, lineHeight: 1 }}>&#x2B06;&#xFE0F;</span>
            </span>{' '}
            at the <strong>bottom centre</strong> of your screen
          </span>
        </li>
        <li className="flex gap-3 items-start">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-surface-alt text-text-secondary text-xs font-bold flex items-center justify-center mt-0.5">2</span>
          <span>A menu will slide up from the bottom. Scroll down in this menu and look for <strong>&quot;Add to Home Screen&quot;</strong> (it has a <strong>+</strong> icon next to it)</span>
        </li>
        <li className="flex gap-3 items-start">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-surface-alt text-text-secondary text-xs font-bold flex items-center justify-center mt-0.5">3</span>
          <span>You&apos;ll see a preview with the app name and icon. Tap <strong>&quot;Add&quot;</strong> in the top right corner to confirm</span>
        </li>
      </ol>
      <p className="text-xs text-text-hint">
        The {clubName} icon will appear on your home screen just like a regular app.
      </p>
    </div>
  )
}

function AndroidInstructions({ clubName }: { clubName: string }) {
  return (
    <div className="space-y-4">
      <p className="text-text-muted text-xs">
        Works with Chrome, Edge, Samsung Internet, and Firefox.
      </p>
      <div>
        <p className="font-medium text-text-secondary text-xs mb-2">Chrome / Edge / Samsung Internet:</p>
        <ol className="space-y-3 pl-0" style={{ listStyle: 'none', paddingLeft: 0 }}>
          <li className="flex gap-3 items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-surface-alt text-text-secondary text-xs font-bold flex items-center justify-center mt-0.5">1</span>
            <span>You should see an <strong>&quot;Install {clubName}&quot;</strong> banner at the bottom of your screen when you first visit. Tap <strong>Install</strong>.</span>
          </li>
          <li className="flex gap-3 items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-surface-alt text-text-secondary text-xs font-bold flex items-center justify-center mt-0.5">2</span>
            <span>If you don&apos;t see the banner, tap the <strong>&#x22EE;</strong> icon (three vertical dots in the top right corner of your screen) and then tap <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.</span>
          </li>
        </ol>
      </div>
      <div>
        <p className="font-medium text-text-secondary text-xs mb-2">Firefox:</p>
        <ol className="space-y-3 pl-0" style={{ listStyle: 'none', paddingLeft: 0 }}>
          <li className="flex gap-3 items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-surface-alt text-text-secondary text-xs font-bold flex items-center justify-center mt-0.5">1</span>
            <span>Tap the <strong>&#x22EE;</strong> icon (three vertical dots in the top right corner of your screen)</span>
          </li>
          <li className="flex gap-3 items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-surface-alt text-text-secondary text-xs font-bold flex items-center justify-center mt-0.5">2</span>
            <span>Tap <strong>&quot;Install&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong></span>
          </li>
        </ol>
      </div>
    </div>
  )
}

function DesktopInstructions() {
  return (
    <div className="space-y-4">
      <div>
        <p className="font-medium text-text-secondary text-xs mb-2">Chrome or Edge (recommended):</p>
        <ol className="space-y-3 pl-0" style={{ listStyle: 'none', paddingLeft: 0 }}>
          <li className="flex gap-3 items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-surface-alt text-text-secondary text-xs font-bold flex items-center justify-center mt-0.5">1</span>
            <span>Look for the <strong>install icon</strong> in the address bar (right side)</span>
          </li>
          <li className="flex gap-3 items-start">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-surface-alt text-text-secondary text-xs font-bold flex items-center justify-center mt-0.5">2</span>
            <span>Click it and confirm <strong>&quot;Install&quot;</strong></span>
          </li>
        </ol>
      </div>
      <div className="rounded-lg bg-surface-raised border border-border px-3 py-2.5 text-xs text-text-muted">
        <strong>Firefox or Safari?</strong> These browsers don&apos;t support app installation. You can still use the full app in your browser — just bookmark the page for easy access.
      </div>
    </div>
  )
}
