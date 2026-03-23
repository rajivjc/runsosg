'use client'

import { createContext, useContext } from 'react'

interface ClubConfig {
  timezone: string
  locale: string
}

const ClubConfigContext = createContext<ClubConfig>({
  timezone: 'Asia/Singapore',
  locale: 'en-SG',
})

/**
 * Hook to access club timezone and locale from any client component.
 * Must be used inside <ClubConfigProvider>.
 */
export function useClubConfig(): ClubConfig {
  return useContext(ClubConfigContext)
}

/**
 * Provider for club-level configuration (timezone, locale).
 * Placed in the root layout, populated from getClub().
 */
export default function ClubConfigProvider({
  timezone,
  locale,
  children,
}: ClubConfig & { children: React.ReactNode }) {
  return (
    <ClubConfigContext.Provider value={{ timezone, locale }}>
      {children}
    </ClubConfigContext.Provider>
  )
}
