/**
 * iOS PWA (WKWebView) corrupts page layout after dismissing a document
 * preview sheet (PDF/CSV viewer). This utility forces a layout
 * recalculation when the page becomes visible again after a download.
 */

function isIOSStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    (window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator &&
        (navigator as unknown as { standalone: boolean }).standalone === true)) &&
    /iPhone|iPad|iPod/.test(navigator.userAgent)
  )
}

/**
 * Call this BEFORE triggering a download in iOS PWA.
 * It sets up a one-time visibilitychange listener that forces
 * a layout recalculation when the user returns from the preview.
 */
export function guardIOSDownload(): void {
  if (!isIOSStandalone()) return

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      document.removeEventListener('visibilitychange', handleVisibilityChange)

      // Force layout recalculation by briefly toggling overflow
      const scrollY = window.scrollY
      document.documentElement.style.overflow = 'hidden'
      setTimeout(() => {
        document.documentElement.style.overflow = ''
        window.scrollTo(0, scrollY)
      }, 50)
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
}
