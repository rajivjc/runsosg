import type { Metadata } from 'next'
import { getClub } from '@/lib/club'

export async function generateMetadata(): Promise<Metadata> {
  const club = await getClub()
  return { title: `Strava Connected — ${club.name}` }
}

export default function StravaConnectedLayout({ children }: { children: React.ReactNode }) {
  return children
}
