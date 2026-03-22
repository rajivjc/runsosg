'use client'

import { useState, useCallback, useEffect } from 'react'
import { QrCode, X, Copy, Check } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

interface Props {
  athleteId: string
  athleteName: string
}

export default function AthleteQrCode({ athleteId, athleteName }: Props) {
  const [open, setOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/my/${athleteId}`
    : `/my/${athleteId}`

  useEffect(() => {
    const key = `qr_hint_seen_${athleteId}`
    if (typeof window !== 'undefined' && !localStorage.getItem(key)) {
      setShowHint(true)
    }
  }, [athleteId])

  const dismissHint = useCallback(() => {
    const key = `qr_hint_seen_${athleteId}`
    localStorage.setItem(key, '1')
    setShowHint(false)
  }, [athleteId])

  const handleOpen = useCallback(() => {
    if (showHint) dismissHint()
    setOpen(true)
  }, [showHint, dismissHint])

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }, [url])

  return (
    <>
      <div className="relative flex flex-col items-center">
        <button
          onClick={handleOpen}
          className="p-2 text-text-hint hover:text-teal-600 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/15 rounded-lg transition-all"
          aria-label="Print QR code for athlete's personal page"
          title="Print QR code for athlete's personal page"
        >
          <QrCode size={18} />
        </button>
        <span className="text-[9px] text-text-hint font-medium leading-none mt-0.5">QR</span>

        {showHint && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-10 w-56">
            <div className="bg-teal-700 text-white dark:bg-teal-400 dark:text-gray-950 text-[11px] rounded-lg px-3 py-2 shadow-lg relative">
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-teal-700 rotate-45 rounded-sm" />
              <p className="relative">New: Print a QR code for this athlete&apos;s personal page</p>
              <button
                onClick={(e) => { e.stopPropagation(); dismissHint() }}
                className="absolute top-1 right-1 p-0.5 text-teal-200 hover:text-white"
                aria-label="Dismiss hint"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-surface rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6 text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-text-primary">
                {athleteName}&apos;s page
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-text-hint hover:text-text-secondary rounded-lg transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex justify-center mb-4">
              <div className="bg-white p-3 rounded-xl border border-border-subtle">
                <QRCodeSVG
                  value={url}
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>

            <p className="text-sm text-text-secondary mb-4 text-left">
              Print this QR code and stick it somewhere easy to find — like a fridge, a bedroom wall, or inside a notebook.
              {' '}{athleteName} (or their caregiver) can scan it with any phone camera to open their personal running page.
              {' '}They&apos;ll need their PIN to sign in.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => window.print()}
                className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white dark:bg-teal-400 dark:text-gray-950 text-sm font-semibold rounded-xl transition-colors"
              >
                Print QR code
              </button>

              <button
                onClick={handleCopyLink}
                className="w-full h-12 flex items-center justify-center gap-2 bg-surface border border-border hover:border-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/15 text-text-secondary text-sm font-medium rounded-xl transition-colors"
              >
                {linkCopied ? (
                  <>
                    <Check size={16} className="text-emerald-600" />
                    <span className="text-emerald-600">Link copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>Copy link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
