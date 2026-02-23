-- ============================================================
-- Allow multiple sessions per Strava activity (multi-athlete matching)
-- Migration: 20260226000000_allow_multi_athlete_strava_sessions.sql
--
-- The previous UNIQUE constraint on sessions.strava_activity_id
-- prevented the same Strava activity from being linked to multiple
-- athletes (e.g. a single run tagged #ali #priya). This migration
-- replaces it with a composite unique on (strava_activity_id, athlete_id).
-- ============================================================

-- Drop the existing single-column unique constraint
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_strava_activity_id_key;

-- Add composite unique: one session per athlete per Strava activity
CREATE UNIQUE INDEX sessions_strava_activity_athlete_unique
  ON sessions (strava_activity_id, athlete_id)
  WHERE strava_activity_id IS NOT NULL;
