/**
 * Shared query helpers used by both coach and caregiver feed loaders.
 *
 * Centralises club-stats queries and milestone-definition caching so
 * changes propagate to both roles automatically.
 */

import { adminClient } from '@/lib/supabase/admin'
import { unstable_cache } from 'next/cache'
import { findClubBestWeek, type ClubBestWeek } from '@/lib/analytics/club-records'

// ─── Club stats (shared between coach & caregiver feeds) ────────

export interface ClubStats {
  sessions: number
  km: number
  athletes: number
  milestones: number
  coaches: number
  caregivers: number
  thisMonthSessions: number
  thisMonthKm: number
  lastMonthSessions: number
  lastMonthKm: number
  bestWeek: ClubBestWeek | null
}

// Cached best-week computation (changes infrequently)
const getCachedBestWeek = unstable_cache(
  async (): Promise<ClubBestWeek | null> => {
    const { data } = await adminClient
      .from('sessions')
      .select('date, distance_km')
      .eq('status', 'completed')
    return findClubBestWeek((data ?? []) as { date: string; distance_km: number | null }[])
  },
  ['club-best-week'],
  { revalidate: 300, tags: ['club-best-week'] }
)

export async function loadClubStats(): Promise<ClubStats> {
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]

  const [
    { count: totalSessionCount },
    { count: totalAthleteCount },
    { count: totalMilestoneCount },
    { count: coachCount },
    { count: caregiverCount },
    { data: totalKmResult },
    { data: thisMonthData },
    { data: lastMonthData },
    bestWeek,
  ] = await Promise.all([
    adminClient.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    adminClient.from('athletes').select('*', { count: 'exact', head: true }).eq('active', true),
    adminClient.from('milestones').select('*', { count: 'exact', head: true }),
    adminClient.from('users').select('*', { count: 'exact', head: true }).in('role', ['coach', 'admin']).eq('active', true),
    adminClient.from('users').select('*', { count: 'exact', head: true }).eq('role', 'caregiver').eq('active', true),
    adminClient.rpc('get_total_km'),
    adminClient.from('sessions').select('distance_km').eq('status', 'completed').gte('date', thisMonthStart),
    adminClient.from('sessions').select('distance_km').eq('status', 'completed').gte('date', lastMonthStart).lt('date', thisMonthStart),
    getCachedBestWeek(),
  ])

  const thisMonthSessions = (thisMonthData ?? []).length
  const thisMonthKm = (thisMonthData ?? []).reduce((sum: number, s: any) => sum + (s.distance_km ?? 0), 0)
  const lastMonthSessions = (lastMonthData ?? []).length
  const lastMonthKm = (lastMonthData ?? []).reduce((sum: number, s: any) => sum + (s.distance_km ?? 0), 0)

  return {
    sessions: totalSessionCount ?? 0,
    km: (totalKmResult as unknown as number) ?? 0,
    athletes: totalAthleteCount ?? 0,
    milestones: totalMilestoneCount ?? 0,
    coaches: coachCount ?? 0,
    caregivers: caregiverCount ?? 0,
    thisMonthSessions,
    thisMonthKm: Math.round(thisMonthKm * 10) / 10,
    lastMonthSessions,
    lastMonthKm: Math.round(lastMonthKm * 10) / 10,
    bestWeek,
  }
}

// ─── Cached milestone definitions ───────────────────────────────

export interface MilestoneDefinition {
  id: string
  label: string
  icon: string
  condition: { metric?: string; threshold?: number } | null
}

export const getMilestoneDefinitions = unstable_cache(
  async (): Promise<MilestoneDefinition[]> => {
    const { data } = await adminClient
      .from('milestone_definitions')
      .select('id, label, icon, condition')
      .eq('active', true)
      .eq('type', 'automatic')
    return (data ?? []) as MilestoneDefinition[]
  },
  ['milestone-definitions'],
  { revalidate: 120, tags: ['milestone-definitions'] }
)
