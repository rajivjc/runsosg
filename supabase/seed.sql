-- ============================================================
-- SOSG Running Club Hub — Seed Data
-- ============================================================

-- ── club_settings ────────────────────────────────────────────
INSERT INTO public.club_settings DEFAULT VALUES;

-- ── milestone_definitions ────────────────────────────────────
INSERT INTO public.milestone_definitions
  (label, type, condition, icon, display_order)
VALUES
  ('First Session',  'automatic', '{"metric":"session_count","threshold":1}',  '🏃', 1),
  ('5 Sessions',     'automatic', '{"metric":"session_count","threshold":5}',  '⭐', 2),
  ('10 Sessions',    'automatic', '{"metric":"session_count","threshold":10}', '🔥', 3),
  ('25 Sessions',    'automatic', '{"metric":"session_count","threshold":25}', '💪', 4),
  ('50 Sessions',    'automatic', '{"metric":"session_count","threshold":50}', '🏅', 5),
  ('First 3K',       'automatic', '{"metric":"distance_km","threshold":3}',    '📍', 6),
  ('First 5K',       'automatic', '{"metric":"distance_km","threshold":5}',    '🎯', 7),
  ('First 10K',      'automatic', '{"metric":"distance_km","threshold":10}',   '🏆', 8),
  ('Personal Best',  'manual',    null,                                         '⚡', 9),
  ('Great Attitude', 'manual',    null,                                         '❤️', 10);
