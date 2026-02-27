'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const CelebrationOverlay = dynamic(() => import('./CelebrationOverlay'), {
  ssr: false,
})

type MilestoneForDetection = {
  id: string
  label: string
  icon: string
  athleteName: string
  achievedAt: string
}

type MilestoneDetectorProps = {
  recentMilestones: MilestoneForDetection[]
}

const STORAGE_KEY = 'sosg_seen_milestones'

function getSeenMilestones(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return new Set()
    return new Set(JSON.parse(stored))
  } catch {
    return new Set()
  }
}

function markMilestoneSeen(id: string) {
  if (typeof window === 'undefined') return
  try {
    const seen = getSeenMilestones()
    seen.add(id)
    // Keep only last 100 to avoid unbounded growth
    const arr = Array.from(seen).slice(-100)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
  } catch {
    // localStorage might be full or disabled
  }
}

/**
 * Detects unseen milestones achieved in the last 24 hours
 * and shows a celebration overlay for the first one found.
 */
export default function MilestoneDetector({ recentMilestones }: MilestoneDetectorProps) {
  const [celebrateMilestone, setCelebrateMilestone] = useState<MilestoneForDetection | null>(null)

  useEffect(() => {
    if (recentMilestones.length === 0) return

    const seen = getSeenMilestones()
    const unseen = recentMilestones.find(m => !seen.has(m.id))

    if (unseen) {
      setCelebrateMilestone(unseen)
      markMilestoneSeen(unseen.id)
    }
  }, [recentMilestones])

  if (!celebrateMilestone) return null

  return (
    <CelebrationOverlay
      milestoneId={celebrateMilestone.id}
      athleteName={celebrateMilestone.athleteName}
      milestoneLabel={celebrateMilestone.label}
      milestoneIcon={celebrateMilestone.icon}
      onDismiss={() => setCelebrateMilestone(null)}
    />
  )
}
