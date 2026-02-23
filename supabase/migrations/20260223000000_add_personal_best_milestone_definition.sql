-- Add Personal Best milestone definition
-- This row was inserted manually in Supabase console on 2026-02-23
-- during Engineer 4 / Phase 6 (notifications) work.
-- Detected by checkAndAwardMilestones() when current session distance
-- exceeds all previous sessions for the same athlete.
INSERT INTO milestone_definitions (label, type, condition, icon, active)
VALUES (
  'Personal Best',
  'automatic',
  '{"metric": "longest_run"}',
  '🏅',
  true
)
ON CONFLICT DO NOTHING;
