-- Add session_id to milestones so badges can be attached to the triggering session
ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES sessions(id) ON DELETE SET NULL;
