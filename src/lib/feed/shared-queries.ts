/**
 * Shared query helpers used by both coach and caregiver feed loaders.
 *
 * Centralises club-stats queries and milestone-definition caching so
 * changes propagate to both roles automatically.
 */

import { adminClient } from '@/lib/supabase/admin'
import { unstable_cache } from 'next/cache'

// ─── Club stats (shared between coach & caregiver feeds) ────────

export interface ClubStats {
  sessions: number
  km: number
  athletes: number
  milestones: number
  coaches: number
  caregivers: number
}

export async function loadClubStats(): Promise<ClubStats> {
  const [
    { count: totalSessionCount },
    { count: totalAthleteCount },
    { count: totalMilestoneCount },
    { count: coachCount },
    { count: caregiverCount },
    { data: totalKmResult },
  ] = await Promise.all([
    adminClient.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    adminClient.from('athletes').select('*', { count: 'exact', head: true }).eq('active', true),
    adminClient.from('milestones').select('*', { count: 'exact', head: true }),
    adminClient.from('users').select('*', { count: 'exact', head: true }).in('role', ['coach', 'admin']).eq('active', true),
    adminClient.from('users').select('*', { count: 'exact', head: true }).eq('role', 'caregiver').eq('active', true),
    adminClient.rpc('get_total_km'),
  ])

  return {
    sessions: totalSessionCount ?? 0,
    km: (totalKmResult as unknown as number) ?? 0,
    athletes: totalAthleteCount ?? 0,
    milestones: totalMilestoneCount ?? 0,
    coaches: coachCount ?? 0,
    caregivers: caregiverCount ?? 0,
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
