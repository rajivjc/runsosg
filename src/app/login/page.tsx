import { getClub } from '@/lib/club'
import LoginForm from './LoginForm'

export default async function LoginPage() {
  const club = await getClub()
  return (
    <LoginForm
      clubName={club.name}
      tagline={(club.tagline ?? 'Growing together').toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase())}
    />
  )
}
