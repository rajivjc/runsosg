-- Add 'low_feel_alert' to the allowed notification types
-- The CHECK constraint on notifications.type was missing this value,
-- causing low-feel notifications to silently fail on insert.
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'milestone',
    'feel_prompt',
    'unmatched_run',
    'strava_disconnected',
    'general',
    'low_feel_alert'
  ));
