'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, Download, Share2 } from 'lucide-react'
import { formatDate } from '@/lib/utils/dates'
import { savePhoto, shareViaWebShare } from '@/lib/utils/download'
import type { PhotoData } from './AthleteTabs'

type PhotoLightboxProps = {
  photos: PhotoData[]
  initialIndex: number
  athleteName: string
  onClose: () => void
}

function buildFilename(photo: PhotoData, athleteName: string): string {
  return `${athleteName.replace(/\s+/g, '_')}_${formatDate(photo.created_at).replace(/\s+/g, '_')}_${photo.id.slice(0, 8)}.jpg`
}

export default function PhotoLightbox({ photos, initialIndex, athleteName, onClose }: PhotoLightboxProps) {
  const [index, setIndex] = useState(initialIndex)
  const [downloading, setDownloading] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const photo = photos[index]
  const hasPrev = index > 0
  const hasNext = index < photos.length - 1
  const canShare = typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare

  const goPrev = useCallback(() => {
    if (index > 0) setIndex(i => i - 1)
  }, [index])

  const goNext = useCallback(() => {
    if (index < photos.length - 1) setIndex(i => i + 1)
  }, [index, photos.length])

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, goPrev, goNext])

  // Lock body scroll when lightbox is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Touch/swipe handling
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    touchStartX.current = null
    touchStartY.current = null

    // Only trigger swipe if horizontal movement is dominant
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx > 0) goPrev()
      else goNext()
    }
  }

  async function handleDownload() {
    setDownloading(true)
    const filename = buildFilename(photo, athleteName)
    await savePhoto(photo.id, photo.signed_url, filename, {
      title: `${athleteName} — Run photo`,
      text: photo.caption || undefined,
    })
    setDownloading(false)
  }

  async function handleShare() {
    setDownloading(true)
    const filename = buildFilename(photo, athleteName)
    const shared = await shareViaWebShare(photo.signed_url, filename, {
      title: `${athleteName} — Run photo`,
      text: photo.caption || undefined,
    })
    if (!shared) {
      // Share not supported or cancelled — use savePhoto which is
      // platform-aware (won't break out of iOS PWA standalone mode)
      await savePhoto(photo.id, photo.signed_url, filename, {
        title: `${athleteName} — Run photo`,
        text: photo.caption || undefined,
      })
    }
    setDownloading(false)
  }

  if (!photo) return null

  return (
    <div
      className="fixed inset-0 bg-black/95 z-50 flex flex-col"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <span className="text-sm text-white/60 font-medium">
          {index + 1} / {photos.length}
        </span>
        <div className="flex items-center gap-1">
          {canShare && (
            <button
              onClick={handleShare}
              disabled={downloading}
              className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
              aria-label="Share photo"
            >
              <Share2 size={20} />
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
            aria-label="Download photo"
          >
            <Download size={20} />
          </button>
          <button
            onClick={onClose}
            className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Image area */}
      <div
        className="flex-1 flex items-center justify-center relative min-h-0 px-4"
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Prev button — desktop */}
        {hasPrev && (
          <button
            onClick={goPrev}
            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
            aria-label="Previous photo"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.id}
          src={photo.signed_url}
          alt={photo.caption ?? 'Session photo'}
          className="max-w-full max-h-full rounded-lg object-contain select-none"
          draggable={false}
        />

        {/* Next button — desktop */}
        {hasNext && (
          <button
            onClick={goNext}
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
            aria-label="Next photo"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </div>

      {/* Caption / date footer */}
      <div className="px-4 py-3 text-center flex-shrink-0" onClick={e => e.stopPropagation()}>
        {photo.caption && (
          <p className="text-sm text-white/90 mb-1">{photo.caption}</p>
        )}
        <p className="text-xs text-white/40">{formatDate(photo.created_at)}</p>
      </div>
    </div>
  )
}
