'use client'

import { useEffect } from 'react'

export default function SplashHider() {
  useEffect(() => {
    const splash = document.getElementById('pwa-splash')
    if (splash) {
      splash.style.transition = 'opacity 0.4s ease'
      splash.style.opacity = '0'
      setTimeout(() => splash.remove(), 400)
    }
  }, [])
  return null
}
