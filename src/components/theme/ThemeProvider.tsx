'use client'

import { useEffect, useState, createContext, useContext, useCallback } from 'react'

type Theme = 'system' | 'light' | 'dark'

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
  resolved: 'light' | 'dark'
}>({ theme: 'system', setTheme: () => {}, resolved: 'light' })

export function useTheme() {
  return useContext(ThemeContext)
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved: 'light' | 'dark') {
  const root = document.documentElement
  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  // Update meta theme-color for PWA status bar
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', resolved === 'dark' ? '#141424' : '#0D9488')
  }
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolved, setResolved] = useState<'light' | 'dark'>('light')

  const resolve = useCallback((t: Theme) => {
    return t === 'system' ? getSystemTheme() : t
  }, [])

  // Load saved preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null
    const t = saved ?? 'system'
    setThemeState(t)
    const r = resolve(t)
    setResolved(r)
    applyTheme(r)
  }, [resolve])

  // Listen for system theme changes when in "system" mode
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const r = getSystemTheme()
      setResolved(r)
      applyTheme(r)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    localStorage.setItem('theme', t)
    const r = resolve(t)
    setResolved(r)
    applyTheme(r)
  }, [resolve])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  )
}
