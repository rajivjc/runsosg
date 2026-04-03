/**
 * One-off cleanup script: Remove Strava-sourced photos from Supabase Storage
 * and null out their references in the media table.
 *
 * Why: Strava API Agreement §7.1 prohibits storing Strava Data beyond 7 days.
 * The ingest pipeline previously downloaded and stored Strava photos. This script
 * cleans up any remaining records.
 *
 * Usage:
 *   npx tsx scripts/cleanup-strava-photos.ts
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Idempotent — safe to run multiple times. Records already cleaned by the deauth
 * handler or a previous run of this script will be skipped.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log('Querying media records with source = strava or strava_archived...\n')

  const { data: records, error } = await adminClient
    .from('media')
    .select('id, storage_path, source')
    .in('source', ['strava', 'strava_archived'])

  if (error) {
    console.error('Failed to query media table:', error.message)
    process.exit(1)
  }

  if (!records || records.length === 0) {
    console.log('No Strava-sourced photo records found. Nothing to clean up.')
    return
  }

  console.log(`Found ${records.length} Strava-sourced photo record(s).\n`)

  let storageDeleted = 0
  let storageSkipped = 0
  let dbCleaned = 0

  for (const record of records) {
    const { id, storage_path } = record

    // Delete from Supabase Storage if a path exists
    if (storage_path) {
      const { error: removeError } = await adminClient.storage
        .from('athlete-media')
        .remove([storage_path])

      if (removeError) {
        // File already gone (deleted by deauth handler or previous run) — skip
        console.warn(`  WARN: Storage delete skipped for ${storage_path}: ${removeError.message}`)
        storageSkipped++
      } else {
        console.log(`  Deleted from Storage: ${storage_path}`)
        storageDeleted++
      }
    } else {
      // No storage path — record may only have a CDN URL reference
      storageSkipped++
    }

    // Null out the Strava-specific fields on the media record
    const { error: updateError } = await adminClient
      .from('media')
      .delete()
      .eq('id', id)

    if (updateError) {
      console.error(`  ERROR: Failed to delete media record ${id}: ${updateError.message}`)
    } else {
      console.log(`  Deleted media record: ${id}`)
      dbCleaned++
    }
  }

  console.log('\n── Summary ──')
  console.log(`Total records found:             ${records.length}`)
  console.log(`Storage deletions succeeded:     ${storageDeleted}`)
  console.log(`Storage deletions skipped:       ${storageSkipped}`)
  console.log(`Database records cleaned:        ${dbCleaned}`)
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
