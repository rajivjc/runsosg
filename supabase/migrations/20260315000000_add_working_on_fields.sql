-- Add "working on" and "recent progress" fields to athletes table
-- These are coach-written, caregiver-visible status fields
ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS working_on text,
  ADD COLUMN IF NOT EXISTS recent_progress text,
  ADD COLUMN IF NOT EXISTS working_on_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS working_on_updated_by uuid REFERENCES auth.users(id);
