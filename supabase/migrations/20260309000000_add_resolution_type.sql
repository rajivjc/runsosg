-- Add resolution_type to strava_unmatched to distinguish between
-- runs linked to an athlete vs dismissed as personal (non-coaching) runs.
ALTER TABLE strava_unmatched
  ADD COLUMN IF NOT EXISTS resolution_type text
  CHECK (resolution_type IN ('linked', 'dismissed'));

-- Backfill: any already-resolved rows were linked
UPDATE strava_unmatched
  SET resolution_type = 'linked'
  WHERE resolved_at IS NOT NULL AND resolution_type IS NULL;
