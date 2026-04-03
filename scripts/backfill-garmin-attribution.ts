/**
 * One-off backfill script: Set garmin_sourced to NULL for existing Strava-sourced
 * sessions where the device origin is unknown.
 *
 * Why: The garmin_sourced field was added after Strava sync was already live.
 * Existing sessions created via Strava did not capture device_name, so we cannot
 * determine whether they originated from a Garmin device. This script marks them
 * as NULL (unknown) rather than false, so the UI correctly omits Garmin attribution
 * for historical sessions rather than incorrectly asserting non-Garmin origin.
 *
 * Sessions without a strava_activity_id are not Strava-sourced — garmin_sourced
 * is already NULL by default and does not need updating.
 *
 * Usage:
 *   npx tsx scripts/backfill-garmin-attribution.ts
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Idempotent — safe to run multiple times. Sessions already set to NULL are
 * unaffected by the update.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const adminClient = createClient(supabaseUrl, serviceRoleKey)

async function main() {
  console.log('Backfilling garmin_sourced for existing sessions...\n')

  // Count total sessions
  const { count: totalCount, error: countError } = await adminClient
    .from('sessions')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error('Failed to count sessions:', countError.message)
    process.exit(1)
  }

  console.log(`Total sessions: ${totalCount}`)

  // Count Strava-sourced sessions
  const { count: stravaCount, error: stravaCountError } = await adminClient
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .not('strava_activity_id', 'is', null)

  if (stravaCountError) {
    console.error('Failed to count Strava sessions:', stravaCountError.message)
    process.exit(1)
  }

  console.log(`Strava-sourced sessions: ${stravaCount}`)
  console.log(`Non-Strava sessions (skipped): ${(totalCount ?? 0) - (stravaCount ?? 0)}`)

  if (!stravaCount || stravaCount === 0) {
    console.log('\nNo Strava-sourced sessions found. Nothing to update.')
    return
  }

  // Set garmin_sourced = NULL for all Strava-sourced sessions
  // This is idempotent: NULL → NULL is a no-op in practice
  const { error: updateError, data: updatedRows } = await adminClient
    .from('sessions')
    .update({ garmin_sourced: null })
    .not('strava_activity_id', 'is', null)
    .select('id')

  if (updateError) {
    console.error('Failed to update sessions:', updateError.message)
    process.exit(1)
  }

  console.log(`\nSessions updated (garmin_sourced → NULL): ${updatedRows?.length ?? 0}`)
  console.log('Done.')
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
