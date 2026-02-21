'use client'

import { cancelInvitation } from '@/app/admin/actions'
import { useRouter } from 'next/navigation'

export default function CancelInviteButton({
  invitationId,
  email,
}: {
  invitationId: string
  email: string
}) {
  const router = useRouter()

  async function handleClick() {
    if (!window.confirm(`Cancel invitation for ${email}?`)) return
    await cancelInvitation(invitationId)
    router.refresh()
  }

  return (
    <button
      onClick={handleClick}
      className="text-xs font-medium text-red-500 hover:text-red-700 border border-red-100 rounded-lg px-2.5 py-1 transition-colors"
    >
      Cancel
    </button>
  )
}
