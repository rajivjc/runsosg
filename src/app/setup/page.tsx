import { getClub } from '@/lib/club'
import SetupContent from './SetupContent'

export default async function SetupPage() {
  const club = await getClub()
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const appDomain = rawUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '') || 'the app'
  return <SetupContent clubName={club.name} appDomain={appDomain} />
}
