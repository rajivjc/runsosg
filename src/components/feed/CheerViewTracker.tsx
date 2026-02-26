'use client'

import { useEffect, useRef } from 'react'
import { markCheersViewed } from '@/app/feed/cheer-actions'

type Props = {
  unviewedCheerIds: string[]
}

export default function CheerViewTracker({ unviewedCheerIds }: Props) {
  const calledRef = useRef(false)

  useEffect(() => {
    if (calledRef.current || unviewedCheerIds.length === 0) return
    calledRef.current = true
    markCheersViewed(unviewedCheerIds)
  }, [unviewedCheerIds])

  return null
}
