-- ============================================================
-- Add UNIQUE constraint on strava_connections.strava_athlete_id
-- Migration: 20260227000000_unique_strava_athlete_id.sql
--
-- Prevents the same Strava account from being connected to
-- multiple coach users, which would cause duplicate webhooks
-- and ambiguous activity ownership.
-- ============================================================

CREATE UNIQUE INDEX strava_connections_strava_athlete_id_unique
  ON strava_connections (strava_athlete_id);
