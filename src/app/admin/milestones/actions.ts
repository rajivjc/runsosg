'use server'

import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { revalidateTag } from 'next/cache'
import { logAudit } from '@/lib/audit'

async function verifyAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session has expired. Please sign in again.' }

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role !== 'admin') return { error: 'Only admins can perform this action.' }

  return { userId: user.id }
}

export async function createMilestoneDefinition(
  _prev: { error?: string; success?: string },
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const label = (formData.get('label') as string ?? '').trim()
  const icon = (formData.get('icon') as string ?? '').trim() || null
  const type = formData.get('type') as 'automatic' | 'manual'
  const metric = formData.get('metric') as string | null
  const thresholdStr = formData.get('threshold') as string | null

  if (!label) return { error: 'Label is required.' }
  if (!['automatic', 'manual'].includes(type)) return { error: 'Invalid type.' }

  let condition = null
  if (type === 'automatic') {
    if (!metric || !thresholdStr) return { error: 'Automatic milestones require a metric and threshold.' }
    const threshold = parseFloat(thresholdStr)
    if (isNaN(threshold) || threshold <= 0) return { error: 'Threshold must be a positive number.' }
    if (!['session_count', 'distance_km', 'longest_run'].includes(metric)) return { error: 'Invalid metric.' }
    condition = { metric, threshold: Math.round(threshold * 100) / 100 }
  }

  // Get next display_order
  const { data: maxOrder } = await adminClient
    .from('milestone_definitions')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)
  const nextOrder = ((maxOrder ?? [])[0]?.display_order ?? 0) + 1

  const { error } = await adminClient
    .from('milestone_definitions')
    .insert({
      label,
      icon,
      type,
      condition,
      active: true,
      display_order: nextOrder,
      created_by: auth.userId,
    })

  if (error) return { error: 'Could not create milestone definition. Please try again.' }

  logAudit({
    actorId: auth.userId,
    actorRole: 'admin',
    action: 'milestone_def.create',
    targetType: 'milestone_definition',
    metadata: { label, type },
  })

  revalidatePath('/admin/milestones')
  revalidateTag('milestone-definitions')
  return { success: `Milestone "${label}" created.` }
}

export async function toggleMilestoneDefinitionActive(
  definitionId: string,
  active: boolean
): Promise<{ error?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  const { error } = await adminClient
    .from('milestone_definitions')
    .update({ active })
    .eq('id', definitionId)

  if (error) return { error: 'Could not update milestone. Please try again.' }

  logAudit({
    actorId: auth.userId,
    actorRole: 'admin',
    action: 'milestone_def.toggle',
    targetType: 'milestone_definition',
    targetId: definitionId,
    metadata: { active },
  })

  revalidatePath('/admin/milestones')
  revalidateTag('milestone-definitions')
  return {}
}

export async function updateMilestoneDefinition(
  definitionId: string,
  data: { label?: string; icon?: string; display_order?: number; condition?: { metric: string; threshold: number } }
): Promise<{ error?: string }> {
  const auth = await verifyAdmin()
  if ('error' in auth) return { error: auth.error }

  if (data.condition) {
    const { metric, threshold } = data.condition
    if (!['session_count', 'distance_km', 'longest_run'].includes(metric)) return { error: 'Invalid metric.' }
    if (isNaN(threshold) || threshold <= 0) return { error: 'Threshold must be a positive number.' }
    data.condition = { metric, threshold: Math.round(threshold * 100) / 100 }
  }

  const { error } = await adminClient
    .from('milestone_definitions')
    .update(data)
    .eq('id', definitionId)

  if (error) return { error: 'Could not update milestone. Please try again.' }

  logAudit({
    actorId: auth.userId,
    actorRole: 'admin',
    action: 'milestone_def.update',
    targetType: 'milestone_definition',
    targetId: definitionId,
    metadata: data,
  })

  revalidatePath('/admin/milestones')
  revalidateTag('milestone-definitions')
  return {}
}
