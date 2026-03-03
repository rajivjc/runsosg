'use client'

import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

export default function CloseButton() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.back()}
      aria-label="Close"
      className="absolute top-4 left-4 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
    >
      <X size={20} />
    </button>
  )
}
