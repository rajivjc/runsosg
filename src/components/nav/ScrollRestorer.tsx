'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function ScrollRestorer() {
  const pathname = usePathname()

  useEffect(() => {
    window.scrollTo(0, 0)

    // Force iOS WebKit to tear down stale compositing layers from the
    // previous page's <main>. Toggling a transform on <body> forces a
    // compositor re-evaluation, clearing any orphaned GPU textures.
    document.body.style.transform = 'translateZ(0)'
    requestAnimationFrame(() => {
      document.body.style.transform = ''
    })

    // Detect DOM corruption from iOS WKWebView process restoration.
    // If orphaned <main> elements exist from a previous page, force a
    // full reload so React can rebuild the DOM from scratch.
    const mainElements = document.querySelectorAll('main')
    if (mainElements.length > 1) {
      window.location.reload()
      return
    }
  }, [pathname])

  return null
}
