import type { Metadata } from 'next'
import { getClub } from '@/lib/club'

export async function generateMetadata(): Promise<Metadata> {
  const club = await getClub()
  return { title: `Sign In — ${club.name}` }
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
