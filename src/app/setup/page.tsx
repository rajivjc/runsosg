import { getClub } from '@/lib/club'
import SetupContent from './SetupContent'

export default async function SetupPage() {
  const club = await getClub()
  return <SetupContent clubName={club.name} />
}
