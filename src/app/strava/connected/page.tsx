import { getClub } from '@/lib/club'
import StravaConnectedContent from './StravaConnectedContent'

export default async function StravaConnectedPage() {
  const club = await getClub()
  return <StravaConnectedContent clubName={club.name} />
}
