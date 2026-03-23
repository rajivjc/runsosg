import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import MilestoneDefinitionRow from '@/components/admin/MilestoneDefinitionRow'
import { getClub } from '@/lib/club'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const club = await getClub()
  return { title: `Milestone Definitions — ${club.name}` }
}
import MilestoneDefinitionForm from '@/components/admin/MilestoneDefinitionForm'

export default async function AdminMilestonesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: callerUser } = await adminClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerUser?.role !== 'admin') redirect('/athletes')

  const { data: definitions } = await adminClient
    .from('milestone_definitions')
    .select('id, label, type, condition, icon, display_order, active, created_at')
    .order('display_order', { ascending: true })

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 pb-28 space-y-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-teal-600 dark:text-teal-300 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
      >
        <ChevronLeft size={16} />
        Admin
      </Link>

      <h1 className="text-2xl font-bold text-text-primary">Milestone Definitions</h1>

      {/* Create new */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Add a milestone</h2>
        <div className="bg-surface border border-border rounded-xl px-4 py-4">
          <MilestoneDefinitionForm />
        </div>
      </section>

      {/* Existing definitions */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          All milestones
          <span className="text-sm font-normal text-text-hint ml-2">
            {(definitions ?? []).length} defined
          </span>
        </h2>
        {(definitions ?? []).length === 0 ? (
          <p className="text-sm text-text-muted">No milestone definitions yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 border border-border rounded-xl overflow-hidden">
            {(definitions ?? []).map((def) => (
              <MilestoneDefinitionRow
                key={def.id}
                id={def.id}
                label={def.label}
                icon={def.icon}
                type={def.type as 'automatic' | 'manual'}
                condition={def.condition as { metric?: string; threshold?: number } | null}
                active={def.active}
                displayOrder={def.display_order}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
