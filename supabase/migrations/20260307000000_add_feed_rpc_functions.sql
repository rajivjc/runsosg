-- RPC functions for feed performance optimisation.
-- These move aggregation from the application layer into the database.

-- Total distance (km) across all completed sessions.
CREATE OR REPLACE FUNCTION get_total_km()
RETURNS numeric AS $$
  SELECT COALESCE(SUM(distance_km), 0)
  FROM sessions
  WHERE status = 'completed';
$$ LANGUAGE sql STABLE;

-- Weekly stats: session count, total km, distinct athlete count since a given date.
CREATE OR REPLACE FUNCTION get_weekly_stats(since date)
RETURNS TABLE(session_count bigint, total_km numeric, athlete_count bigint) AS $$
  SELECT
    COUNT(*)::bigint,
    COALESCE(SUM(distance_km), 0),
    COUNT(DISTINCT athlete_id)::bigint
  FROM sessions
  WHERE status = 'completed'
    AND date >= since;
$$ LANGUAGE sql STABLE;
