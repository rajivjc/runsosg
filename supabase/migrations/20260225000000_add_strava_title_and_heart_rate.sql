-- Add Strava activity title and heart rate data to sessions
ALTER TABLE sessions
  ADD COLUMN strava_title TEXT,
  ADD COLUMN avg_heart_rate SMALLINT,
  ADD COLUMN max_heart_rate SMALLINT;

-- Index for quick lookups on heart rate (e.g. filtering sessions with HR data)
COMMENT ON COLUMN sessions.strava_title IS 'Activity title from Strava (e.g. race name)';
COMMENT ON COLUMN sessions.avg_heart_rate IS 'Average heart rate in bpm from Strava';
COMMENT ON COLUMN sessions.max_heart_rate IS 'Max heart rate in bpm from Strava';
