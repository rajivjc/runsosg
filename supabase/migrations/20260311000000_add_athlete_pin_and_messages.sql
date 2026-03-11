-- Add athlete PIN authentication for "My Journey" page
ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS athlete_pin text,
  ADD COLUMN IF NOT EXISTS pin_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked_until timestamptz;

-- Athlete messages to coaches (preset one-tap messages)
CREATE TABLE IF NOT EXISTS athlete_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  viewed_by_coach_at timestamptz
);

-- Enable RLS
ALTER TABLE athlete_messages ENABLE ROW LEVEL SECURITY;

-- RLS: coaches and admins can read athlete messages
CREATE POLICY "Coaches and admins can read athlete messages"
  ON athlete_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'coach') AND active = true
    )
  );

-- Index for efficient feed queries
CREATE INDEX IF NOT EXISTS idx_athlete_messages_unviewed
  ON athlete_messages (created_at DESC)
  WHERE viewed_by_coach_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_athlete_messages_athlete
  ON athlete_messages (athlete_id, created_at DESC);
