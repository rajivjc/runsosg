'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function ScrollRestorer() {
  const pathname = usePathname()

  // Scroll to top and flush compositor on every route change
  useEffect(() => {
    window.scrollTo(0, 0)

    // Force iOS WebKit to tear down stale compositing layers from the
    // previous page's <main>. Toggling a transform on <body> forces a
    // compositor re-evaluation, clearing any orphaned GPU textures.
    document.body.style.transform = 'translateZ(0)'
    requestAnimationFrame(() => {
      document.body.style.transform = ''
    })
  }, [pathname])

  // Proactive DOM cleanup: watch for orphaned <main> elements from iOS
  // WKWebView process restoration / DOM corruption. A MutationObserver
  // fires synchronously on DOM changes — no timing race like useEffect.
  useEffect(() => {
    const removeStaleMains = () => {
      const mains = document.querySelectorAll('main')
      if (mains.length > 1) {
        // Keep the last <main> (the current page), remove older orphans
        Array.from(mains).slice(0, -1).forEach((el) => el.remove())
      }
    }

    const observer = new MutationObserver(removeStaleMains)
    observer.observe(document.body, { childList: true, subtree: true })
    removeStaleMains() // initial check on mount

    return () => observer.disconnect()
  }, [])

  return null
}
