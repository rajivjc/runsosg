'use client'

import { useState, useRef, useEffect, useCallback, useTransition } from 'react'
import { Download, CheckCircle, X, Share2 } from 'lucide-react'
import { formatDate } from '@/lib/utils/dates'
import { useClubConfig } from '@/components/providers/ClubConfigProvider'
import { savePhoto, downloadZipViaForm } from '@/lib/utils/download'
import PhotoLightbox from './PhotoLightbox'

export type PhotoData = {
  id: string
  session_id: string | null
  signed_url: string
  caption: string | null
  created_at: string
}

type PhotosTabProps = {
  photos: PhotoData[]
  athleteName: string
  athleteId: string
  initialCursor: string | null
  totalCount: number
  loadMore: (athleteId: string, cursor: string) => Promise<{
    photos: PhotoData[]
    nextCursor: string | null
  }>
  onDeletePhoto?: (photoId: string) => Promise<void>
}

/** Group photos by month (e.g. "March 2026") */
function groupByMonth(photos: PhotoData[], timezone = 'Asia/Singapore'): { month: string; photos: PhotoData[] }[] {
  const groups: Map<string, PhotoData[]> = new Map()
  for (const photo of photos) {
    const d = new Date(photo.created_at)
    if (isNaN(d.getTime())) continue
    const key = new Intl.DateTimeFormat('en-GB', {
      month: 'long',
      year: 'numeric',
      timeZone: timezone,
    }).format(d)
    const existing = groups.get(key)
    if (existing) existing.push(photo)
    else groups.set(key, [photo])
  }
  return Array.from(groups.entries()).map(([month, photos]) => ({ month, photos }))
}

export default function PhotosTab({
  photos: initialPhotos,
  athleteName,
  athleteId,
  initialCursor,
  totalCount,
  loadMore,
  onDeletePhoto,
}: PhotosTabProps) {
  const { timezone } = useClubConfig()
  const [photos, setPhotos] = useState<PhotoData[]>(initialPhotos)
  const [cursor, setCursor] = useState<string | null>(initialCursor)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [loadingMore, startLoadMore] = useTransition()
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Show toast with auto-dismiss
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }, [])

  // Infinite scroll: observe sentinel div
  useEffect(() => {
    if (!cursor) return
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && cursor && !loadingMore) {
          startLoadMore(async () => {
            const result = await loadMore(athleteId, cursor)
            setPhotos(prev => [...prev, ...result.photos])
            setCursor(result.nextCursor)
          })
        }
      },
      { rootMargin: '300px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [cursor, loadingMore, loadMore, athleteId, startLoadMore])

  // Selection helpers
  function toggleSelection(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(photos.map(p => p.id)))
  }

  function clearSelection() {
    setSelectedIds(new Set())
    setSelectionMode(false)
  }

  // Smart download: 1-3 photos direct via server endpoint, 4+ via ZIP form submission
  async function handleDownload(ids: string[]) {
    if (ids.length === 0) return
    setDownloading(true)

    try {
      if (ids.length <= 3) {
        // Direct download — server endpoint sets Content-Disposition: attachment.
        // savePhoto() also handles iOS PWA (uses Web Share API to stay in-app).
        for (const id of ids) {
          const photo = photos.find(p => p.id === id)
          if (!photo) continue
          const filename = `${athleteName.replace(/\s+/g, '_')}_${formatDate(photo.created_at).replace(/\s+/g, '_')}_${photo.id.slice(0, 8)}.jpg`
          await savePhoto(photo.id, photo.signed_url, filename, {
            title: `${athleteName} — Run photo`,
          })
        }
        showToast(`${ids.length} photo${ids.length > 1 ? 's' : ''} saved`)
      } else {
        // ZIP download via native form submission — browser handles the
        // Content-Disposition: attachment response natively, no blob URLs needed.
        setDownloadProgress(`Preparing ${ids.length} photos...`)
        downloadZipViaForm(ids, athleteName)
        showToast(`${ids.length} photos saved as ZIP. Open the file to access them.`)
      }
    } catch {
      showToast('Download failed. Please try again.')
    }

    setDownloading(false)
    setDownloadProgress(null)
  }

  // Share via Web Share API (mobile-friendly)
  const canShare = typeof navigator !== 'undefined' && !!navigator.share

  async function handleShare(ids: string[]) {
    if (ids.length === 0 || !canShare) return
    setDownloading(true)
    try {
      const files: File[] = []
      for (const id of ids.slice(0, 10)) { // limit share to 10 files
        const photo = photos.find(p => p.id === id)
        if (!photo) continue
        const res = await fetch(photo.signed_url)
        const blob = await res.blob()
        files.push(new File([blob], `${athleteName.replace(/\s+/g, '_')}_${id.slice(0, 8)}.jpg`, {
          type: blob.type || 'image/jpeg',
        }))
      }
      await navigator.share({ files })
    } catch {
      // User cancelled — no-op
    }
    setDownloading(false)
  }

  if (photos.length === 0 && totalCount === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">📷</p>
        <p className="text-base font-semibold text-text-primary mb-1">No photos yet</p>
        <p className="text-sm text-text-muted">Photos added during session logging will appear here.</p>
      </div>
    )
  }

  const groups = groupByMonth(photos, timezone)
  const selectedCount = selectedIds.size

  return (
    <div>
      {/* Toolbar — selection mode actions */}
      {selectionMode ? (
        <div className="sticky top-0 z-10 bg-surface border-b border-border -mx-4 px-4 py-3 mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={clearSelection}
              className="p-2 -m-2 text-text-muted hover:text-text-secondary"
              aria-label="Exit selection"
            >
              <X size={20} />
            </button>
            <span className="text-sm font-medium text-text-secondary">
              {selectedCount} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="text-xs font-medium text-teal-600 dark:text-teal-300 hover:text-teal-700 dark:hover:text-teal-300 px-2 py-1"
            >
              Select all
            </button>
            {canShare && selectedCount > 0 && (
              <button
                onClick={() => handleShare(Array.from(selectedIds))}
                disabled={downloading}
                className="flex items-center gap-1.5 bg-surface-alt hover:bg-surface-alt active:scale-[0.97] text-text-secondary text-xs font-medium rounded-lg px-3 py-2 transition-all duration-150 disabled:opacity-50"
              >
                <Share2 size={14} />
                Share
              </button>
            )}
            {selectedCount > 0 && (
              <button
                onClick={() => handleDownload(Array.from(selectedIds))}
                disabled={downloading}
                className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 active:scale-[0.97] text-white text-xs font-medium rounded-lg px-3 py-2 transition-all duration-150 disabled:opacity-50"
              >
                <Download size={14} />
                {downloading ? downloadProgress || 'Downloading...' : `Download (${selectedCount})`}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-text-hint font-medium">{totalCount} photo{totalCount !== 1 ? 's' : ''}</p>
          <div className="flex items-center gap-2">
            {photos.length > 1 && (
              <button
                onClick={() => setSelectionMode(true)}
                className="text-xs font-medium text-teal-600 dark:text-teal-300 hover:text-teal-700 dark:hover:text-teal-300 px-2 py-1 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/12 transition-colors"
              >
                Select
              </button>
            )}
            {photos.length > 0 && (
              <button
                onClick={() => handleDownload(photos.map(p => p.id))}
                disabled={downloading}
                className="flex items-center gap-1.5 bg-surface-raised hover:bg-surface-alt active:scale-[0.97] border border-border text-text-secondary text-xs font-medium rounded-lg px-3 py-2 transition-all duration-150 disabled:opacity-50"
              >
                <Download size={14} />
                {downloading ? downloadProgress || 'Downloading...' : photos.length === 1 ? 'Download' : 'Download all'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Photo grid grouped by month */}
      {groups.map((group) => (
        <div key={group.month} className="mb-5">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
            {group.month}
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {group.photos.map((photo) => {
              const isSelected = selectedIds.has(photo.id)
              const globalIndex = photos.indexOf(photo)

              return (
                <button
                  key={photo.id}
                  onClick={() => {
                    if (selectionMode) {
                      toggleSelection(photo.id)
                    } else {
                      setLightboxIndex(globalIndex)
                    }
                  }}
                  onContextMenu={(e) => {
                    // Long-press on mobile triggers selection mode
                    if (!selectionMode) {
                      e.preventDefault()
                      setSelectionMode(true)
                      setSelectedIds(new Set([photo.id]))
                    }
                  }}
                  className={`relative aspect-square rounded-lg overflow-hidden bg-surface-alt focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all ${
                    selectionMode
                      ? isSelected
                        ? 'ring-2 ring-teal-500 ring-offset-1'
                        : 'opacity-60'
                      : 'hover:opacity-90'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.signed_url}
                    alt={photo.caption ?? 'Session photo'}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />

                  {/* Selection indicator */}
                  {selectionMode && (
                    <div className="absolute top-1.5 right-1.5">
                      <CheckCircle
                        size={22}
                        className={isSelected ? 'text-teal-500 fill-teal-500' : 'text-white/70'}
                        strokeWidth={isSelected ? 2.5 : 2}
                      />
                    </div>
                  )}

                  {/* Date overlay — only show in non-selection mode */}
                  {!selectionMode && (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent px-1.5 py-1">
                      <p className="text-[10px] text-white/90 font-medium">{formatDate(photo.created_at)}</p>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Infinite scroll sentinel */}
      {cursor && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {loadingMore ? (
            <div className="flex items-center gap-2 text-xs text-text-hint">
              <div className="w-4 h-4 border-2 border-border-strong border-t-teal-500 dark:border-t-teal-400 rounded-full animate-spin" />
              Loading more photos...
            </div>
          ) : (
            <div className="h-4" /> // invisible trigger area
          )}
        </div>
      )}

      {/* "End of photos" indicator */}
      {!cursor && photos.length > 0 && photos.length >= 24 && (
        <p className="text-center text-xs text-text-hint py-4">All photos loaded</p>
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg max-w-[90vw] text-center animate-[fadeIn_0.2s_ease-out]">
          {toast}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          initialIndex={lightboxIndex}
          athleteName={athleteName}
          onClose={() => setLightboxIndex(null)}
          onDelete={onDeletePhoto ? async (photoId) => {
            await onDeletePhoto(photoId)
            setPhotos(prev => prev.filter(p => p.id !== photoId))
          } : undefined}
        />
      )}
    </div>
  )
}
