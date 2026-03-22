/**
 * On iOS PWA, blob downloads via a.click() corrupt the page layout.
 * This module provides share-based alternatives that use the native
 * iOS share sheet, avoiding the WKWebView document preview entirely.
 */

function isIOSPWA(): boolean {
  if (typeof window === 'undefined') return false
  return (
    (window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator &&
        (navigator as unknown as { standalone: boolean }).standalone === true)) &&
    /iPhone|iPad|iPod/.test(navigator.userAgent)
  )
}

function canShareFiles(): boolean {
  if (typeof navigator === 'undefined') return false
  if (!navigator.share || !navigator.canShare) return false
  // Test with a dummy file to check file sharing support
  try {
    const testFile = new File([''], 'test.pdf', { type: 'application/pdf' })
    return navigator.canShare({ files: [testFile] })
  } catch {
    return false
  }
}

/**
 * Share or download a PDF blob. On iOS PWA, uses the native share sheet.
 * On desktop/other platforms, triggers a normal download.
 */
export async function sharePdf(blob: Blob, filename: string): Promise<void> {
  if (isIOSPWA() && canShareFiles()) {
    const file = new File([blob], filename, { type: 'application/pdf' })
    await navigator.share({ files: [file] })
    return
  }
  // Desktop fallback: normal download
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Share or download a CSV string. On iOS PWA, uses the native share sheet.
 * On desktop/other platforms, triggers a normal download.
 */
export async function shareCsv(content: string, filename: string): Promise<void> {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  if (isIOSPWA() && canShareFiles()) {
    const file = new File([blob], filename, { type: 'text/csv' })
    await navigator.share({ files: [file] })
    return
  }
  // Desktop fallback: normal download
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
