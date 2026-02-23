-- Add kudos table for social engagement on sessions
CREATE TABLE IF NOT EXISTS kudos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE kudos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all kudos" ON kudos
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert kudos" ON kudos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own kudos" ON kudos
  FOR DELETE USING (auth.uid() = user_id);

-- Add low_feel_alert to notifications type check if it exists as a constraint
-- (The app now uses 'low_feel_alert' as a notification type)
DO $$
BEGIN
  -- Try to drop the existing check constraint and recreate with new type
  ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('milestone', 'feel_prompt', 'low_feel_alert', 'unmatched_run', 'strava_disconnected', 'general'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
