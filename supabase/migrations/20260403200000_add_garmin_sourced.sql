-- Add garmin_sourced boolean to sessions table
-- true  = Strava activity recorded on a Garmin device
-- false = Strava activity recorded on a non-Garmin device
-- null  = not a Strava-sourced session, or historical session with unknown device
ALTER TABLE sessions ADD COLUMN garmin_sourced boolean DEFAULT NULL;

COMMENT ON COLUMN sessions.garmin_sourced IS
  'Whether the Strava activity was recorded on a Garmin device. NULL for non-Strava sessions or unknown.';
