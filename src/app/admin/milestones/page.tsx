import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import MilestoneDefinitionRow from '@/components/admin/MilestoneDefinitionRow'
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
        className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 transition-colors"
      >
        <ChevronLeft size={16} />
        Admin
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">Milestone Definitions</h1>

      {/* Create new */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Add a milestone</h2>
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-4">
          <MilestoneDefinitionForm />
        </div>
      </section>

      {/* Existing definitions */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          All milestones
          <span className="text-sm font-normal text-gray-400 ml-2">
            {(definitions ?? []).length} defined
          </span>
        </h2>
        {(definitions ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">No milestone definitions yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
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
