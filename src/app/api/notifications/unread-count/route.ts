import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ count: 0 }, { status: 401 })
  }

  const { data } = await adminClient
    .from('notifications')
    .select('id')
    .eq('user_id', user.id)
    .eq('read', false)
    .limit(10)

  return NextResponse.json({ count: (data ?? []).length })
}
