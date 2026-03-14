/**
 * Story page data fetcher.
 *
 * Server-only module using adminClient. Fetches all data needed
 * for the enhanced story page: athlete, sessions, milestones,
 * hero photo, coach reflections, story updates, and monthly photos.
 */

import { cache } from 'react'
import { adminClient } from '@/lib/supabase/admin'
import { getHeroPhoto, getSignedUrl, getSignedUrls } from '@/lib/media'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StorySession {
  id: string
  date: string
  distance_km: number | null
  feel: number | null
}

export interface StoryMilestone {
  id: string
  label: string
  achieved_at: string
  icon: string | null
}

export interface StoryCoachReflection {
  id: string
  content: string
  created_at: string
  coach_name: string | null
}

export interface StoryUpdateItem {
  id: string
  content: string
  created_at: string
  coach_name: string | null
}

export interface MonthlyPhoto {
  url: string
  month: string
  year: number
}

export interface StoryPageData {
  athlete: {
    id: string
    name: string
    joined_at: string | null
    running_goal: string | null
    created_at: string | null
    allow_public_sharing: boolean
  }
  sessions: StorySession[]
  milestones: StoryMilestone[]
  heroPhotoUrl: string | null
  coachReflections: StoryCoachReflection[]
  storyUpdates: StoryUpdateItem[]
  monthlyPhotos: MonthlyPhoto[]
}

// ─── Data fetcher ─────────────────────────────────────────────────────────────

export const getStoryData = cache(async (athleteId: string): Promise<StoryPageData | null> => {
  const [
    { data: athlete },
    { data: sessions },
    { data: milestones },
    { data: coachReflections },
    { data: storyUpdates },
  ] = await Promise.all([
    adminClient
      .from('athletes')
      .select('id, name, joined_at, running_goal, created_at, allow_public_sharing')
      .eq('id', athleteId)
      .single(),
    adminClient
      .from('sessions')
      .select('id, date, distance_km, feel')
      .eq('athlete_id', athleteId)
      .eq('status', 'completed')
      .is('strava_deleted_at', null)
      .order('date', { ascending: true }),
    adminClient
      .from('milestones')
      .select('id, label, achieved_at, milestone_definitions(icon)')
      .eq('athlete_id', athleteId)
      .order('achieved_at', { ascending: true }),
    adminClient
      .from('coach_notes')
      .select('id, content, created_at, coach_user_id, users(name)')
      .eq('athlete_id', athleteId)
      .eq('include_in_story', true)
      .eq('visibility', 'all')
      .order('created_at', { ascending: false })
      .limit(5),
    adminClient
      .from('story_updates')
      .select('id, content, created_at, coach_user_id, users(name)')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (!athlete) return null

  // Fetch hero photo
  const heroPhoto = await getHeroPhoto(athleteId)
  let heroPhotoUrl: string | null = null
  if (heroPhoto) {
    heroPhotoUrl = await getSignedUrl(heroPhoto.storage_path, heroPhoto.url)
  }

  // Fetch monthly photos (one per calendar month)
  const monthlyPhotos = await getMonthlyPhotos(athleteId)

  // Flatten milestones
  const flatMilestones: StoryMilestone[] = (milestones ?? []).map((m: any) => ({
    id: m.id,
    label: m.label,
    achieved_at: m.achieved_at,
    icon: m.milestone_definitions?.icon ?? null,
  }))

  // Flatten coach reflections
  const flatReflections: StoryCoachReflection[] = (coachReflections ?? []).map((r: any) => ({
    id: r.id,
    content: r.content,
    created_at: r.created_at,
    coach_name: r.users?.name ?? null,
  }))

  // Flatten story updates
  const flatUpdates: StoryUpdateItem[] = (storyUpdates ?? []).map((u: any) => ({
    id: u.id,
    content: u.content,
    created_at: u.created_at,
    coach_name: u.users?.name ?? null,
  }))

  return {
    athlete,
    sessions: (sessions ?? []) as StorySession[],
    milestones: flatMilestones,
    heroPhotoUrl,
    coachReflections: flatReflections,
    storyUpdates: flatUpdates,
    monthlyPhotos,
  }
})

// ─── Monthly photos helper ────────────────────────────────────────────────────

async function getMonthlyPhotos(athleteId: string): Promise<MonthlyPhoto[]> {
  // Get photos joined with sessions, ordered by date
  const { data: photos } = await adminClient
    .from('media')
    .select('id, url, storage_path, created_at, session_id, sessions(date, feel)')
    .eq('athlete_id', athleteId)
    .not('session_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (!photos || photos.length === 0) return []

  // Pick one photo per calendar month (prefer highest feel)
  const byMonth = new Map<string, { url: string; storage_path: string | null; feel: number; date: string }>()

  for (const p of photos as any[]) {
    const sessionDate = p.sessions?.date
    if (!sessionDate) continue

    const d = new Date(sessionDate)
    const sgDate = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Singapore' }))
    const key = `${sgDate.getFullYear()}-${String(sgDate.getMonth() + 1).padStart(2, '0')}`
    const feel = p.sessions?.feel ?? 0

    const existing = byMonth.get(key)
    if (!existing || feel > existing.feel) {
      byMonth.set(key, {
        url: p.url,
        storage_path: p.storage_path,
        feel,
        date: sessionDate,
      })
    }
  }

  // Limit to 12 months and generate signed URLs
  const entries = Array.from(byMonth.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)

  if (entries.length === 0) return []

  const signedUrls = await getSignedUrls(
    entries.map(([, v]) => ({ storagePath: v.storage_path, fallbackUrl: v.url }))
  )

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]

  return entries.map(([key], i) => {
    const [yearStr, monthStr] = key.split('-')
    return {
      url: signedUrls[i],
      month: monthNames[parseInt(monthStr, 10) - 1],
      year: parseInt(yearStr, 10),
    }
  })
}
