import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Admin client with service role key.
 * NEVER import this in browser/client components.
 * Only use in server-side code (Server Actions, API routes, scripts).
 */
export const adminClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
