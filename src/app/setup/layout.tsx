import type { Metadata } from 'next'
import { getClub } from '@/lib/club'

export async function generateMetadata(): Promise<Metadata> {
  const club = await getClub()
  return { title: `Set Up — ${club.name}` }
}

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return children
}
