/**
 * Cross-browser download utilities with platform-aware strategies.
 *
 * Handles differences between:
 * - Desktop browsers (Chrome, Firefox, Safari)
 * - Mobile browsers (iOS Safari, Android Chrome)
 * - PWA standalone mode (iOS, Android)
 */

export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPad with iPadOS 13+ reports as Mac
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export function isPWAStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari-specific standalone flag
    (window.navigator as unknown as Record<string, unknown>).standalone === true
  )
}

export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined') return false
  if (!navigator.share || !navigator.canShare) return false
  try {
    return navigator.canShare({
      files: [new File([''], 'test.jpg', { type: 'image/jpeg' })],
    })
  } catch {
    return false
  }
}

/**
 * Download a single photo via the server endpoint.
 * Server sets Content-Disposition: attachment so the browser downloads natively.
 * Works on: Desktop (all), Android (browser + PWA), iOS Safari (browser).
 */
export function downloadViaServer(photoId: string, filename: string): void {
  const a = document.createElement('a')
  a.href = `/api/photos/download/${photoId}?name=${encodeURIComponent(filename)}`
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/**
 * Download a ZIP of multiple photos via native form submission.
 * The browser sends a POST and handles the Content-Disposition: attachment response
 * natively — no blob URLs needed, so this works on iOS Safari.
 */
export function downloadZipViaForm(photoIds: string[], athleteName: string): void {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = '/api/photos/download'
  form.style.display = 'none'

  const input = document.createElement('input')
  input.type = 'hidden'
  input.name = 'payload'
  input.value = JSON.stringify({ photoIds, athleteName })
  form.appendChild(input)

  document.body.appendChild(form)
  form.submit()
  document.body.removeChild(form)
}

/**
 * Share files using the Web Share API.
 * On iOS this gives "Save Image" which saves directly to Camera Roll —
 * the most natural save experience for iOS users.
 * Returns true if sharing completed, false if cancelled/failed.
 */
export async function shareViaWebShare(
  signedUrl: string,
  filename: string,
  options?: { title?: string; text?: string }
): Promise<boolean> {
  if (!canShareFiles()) return false
  try {
    const res = await fetch(signedUrl)
    const blob = await res.blob()
    const file = new File([blob], filename, {
      type: blob.type || 'image/jpeg',
    })
    await navigator.share({
      files: [file],
      title: options?.title,
      text: options?.text,
    })
    return true
  } catch {
    return false
  }
}

/**
 * Save a single photo — picks the best strategy per platform.
 *
 * iOS PWA: Web Share API (downloads can break out of standalone shell)
 * iOS Safari: Server endpoint (Content-Disposition: attachment works)
 * Desktop / Android: Server endpoint
 */
export async function savePhoto(
  photoId: string,
  signedUrl: string,
  filename: string,
  options?: { title?: string; text?: string }
): Promise<void> {
  // In iOS PWA standalone mode, <a download> breaks out to Safari.
  // Use Web Share API which keeps the user inside the PWA.
  // If user cancels the share sheet, we return without fallback —
  // falling through to downloadViaServer would eject them from the PWA.
  if (isIOSDevice() && isPWAStandalone() && canShareFiles()) {
    await shareViaWebShare(signedUrl, filename, options)
    return
  }

  downloadViaServer(photoId, filename)
}
