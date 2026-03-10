-- ============================================================
-- SOSG Running Club Hub — Demo Seed Data
-- ============================================================
-- Copy-paste into Supabase SQL Editor and run.
-- Safe to run repeatedly: cleans everything except the admin
-- user (rajivjacob@gmail.com), then re-seeds fresh data.
-- ============================================================

-- ── PART 1: CLEANUP ────────────────────────────────────────

-- Leaf tables first (no other tables reference these)
DELETE FROM public.kudos;
DELETE FROM public.cheers;
DELETE FROM public.coach_badges;
DELETE FROM public.session_rsvp;
DELETE FROM public.notifications;
DELETE FROM public.media;
DELETE FROM public.strava_sync_log;
DELETE FROM public.strava_unmatched;

-- Tables with inbound FKs (children deleted above)
DELETE FROM public.milestones;
DELETE FROM public.coach_notes;
DELETE FROM public.cues;
DELETE FROM public.sessions;
DELETE FROM public.invitations;
DELETE FROM public.strava_connections;
DELETE FROM public.athletes;

-- Remove all users except admin from public + auth
DELETE FROM public.users WHERE email != 'rajivjacob@gmail.com';
DELETE FROM auth.users  WHERE email != 'rajivjacob@gmail.com';

-- Ensure milestone definitions exist (skip if already present)
INSERT INTO public.milestone_definitions (label, type, condition, icon, display_order)
SELECT * FROM (VALUES
  ('First Session',  'automatic', '{"metric":"session_count","threshold":1}'::jsonb,  '🏃', 1),
  ('5 Sessions',     'automatic', '{"metric":"session_count","threshold":5}'::jsonb,  '⭐', 2),
  ('10 Sessions',    'automatic', '{"metric":"session_count","threshold":10}'::jsonb, '🔥', 3),
  ('25 Sessions',    'automatic', '{"metric":"session_count","threshold":25}'::jsonb, '💪', 4),
  ('50 Sessions',    'automatic', '{"metric":"session_count","threshold":50}'::jsonb, '🏅', 5),
  ('First 3K',       'automatic', '{"metric":"distance_km","threshold":3}'::jsonb,    '📍', 6),
  ('First 5K',       'automatic', '{"metric":"distance_km","threshold":5}'::jsonb,    '🎯', 7),
  ('First 10K',      'automatic', '{"metric":"distance_km","threshold":10}'::jsonb,   '🏆', 8),
  ('Personal Best',  'automatic', '{"metric":"longest_run"}'::jsonb,                    '⚡', 9),
  ('Great Attitude', 'manual',    null,                                                '❤️', 10)
) AS v(label, type, condition, icon, display_order)
WHERE NOT EXISTS (SELECT 1 FROM public.milestone_definitions);

-- Ensure club_settings row exists
INSERT INTO public.club_settings DEFAULT VALUES
ON CONFLICT DO NOTHING;


-- ── PART 2: SEED DATA ─────────────────────────────────────

DO $$
DECLARE
  v_admin  uuid;
  v_wj     uuid;  -- Wei Jie Tan
  v_sc     uuid;  -- Sarah Chen
  v_ak     uuid;  -- Arun Kumar
  v_ml     uuid;  -- Mei Lin Ong
  v_dr     uuid;  -- Danish Rizal
  v_rl     uuid;  -- Rachel Lim
BEGIN

  -- ── Look up admin ──────────────────────────────────────
  SELECT id INTO v_admin
    FROM public.users
   WHERE email = 'rajivjacob@gmail.com';

  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin user rajivjacob@gmail.com not found in public.users';
  END IF;

  -- ── Athletes ───────────────────────────────────────────

  INSERT INTO public.athletes
    (name, date_of_birth, joined_at, running_goal, goal_type, goal_target,
     communication_notes, medical_notes, emergency_contact, active)
  VALUES
    ('Wei Jie Tan', '2005-08-12', '2025-09-01',
     'Run 50 km by end of 2026', 'distance_total', 50,
     'Responds well to visual cues and countdown timers. Prefers calm, clear instructions.',
     'Autism spectrum. Uses noise-cancelling earbuds. No medication on session days.',
     'Tan Ah Kow (father) — 9123 4567', true)
  RETURNING id INTO v_wj;

  INSERT INTO public.athletes
    (name, date_of_birth, joined_at, running_goal, goal_type, goal_target,
     communication_notes, medical_notes, emergency_contact, active)
  VALUES
    ('Sarah Chen', '2007-03-22', '2025-10-01',
     'Complete a 5K run', 'distance_single', 5,
     'Very social — loves chatting with coaches. Uses simple sentences. Thumbs up/down for quick checks.',
     'Down syndrome. Flat feet — wears orthotics. Carry water at all times.',
     'Linda Chen (mother) — 8234 5678', true)
  RETURNING id INTO v_sc;

  INSERT INTO public.athletes
    (name, date_of_birth, joined_at, running_goal, goal_type, goal_target,
     communication_notes, medical_notes, emergency_contact, active)
  VALUES
    ('Arun Kumar', '2008-11-05', '2025-12-01',
     'Build up to running 10 sessions', 'session_count', 10,
     'Non-verbal. Uses picture cards and gestures. Watch for hand-flapping when excited or overwhelmed.',
     'Autism spectrum (non-verbal). Sensory sensitivities — avoid tags on clothing. EpiPen in bag (bee sting allergy).',
     'Priya Kumar (mother) — 9876 5432', true)
  RETURNING id INTO v_ak;

  INSERT INTO public.athletes
    (name, date_of_birth, joined_at, running_goal, goal_type, goal_target,
     communication_notes, medical_notes, emergency_contact, active)
  VALUES
    ('Mei Lin Ong', '2006-06-18', '2025-10-15',
     'Run 30 sessions total', 'session_count', 30,
     'Speaks clearly but needs extra processing time. Wait 5 seconds before repeating. Loves praise.',
     'Intellectual disability. Takes medication at 7am — confirm with mum before early sessions.',
     'Ong Mei Hua (mother) — 8765 4321', true)
  RETURNING id INTO v_ml;

  INSERT INTO public.athletes
    (name, date_of_birth, joined_at, running_goal, goal_type, goal_target,
     communication_notes, medical_notes, emergency_contact, active)
  VALUES
    ('Danish Rizal', '2009-01-30', '2026-02-01',
     'Complete first 3K', 'distance_single', 3,
     'Shy at first but opens up quickly. Loves dinosaurs — use as conversation starter. Speaks Malay and English.',
     'ADHD. Takes Ritalin (morning dose). May be restless during warm-up — redirect with movement.',
     'Rizal bin Ahmad (father) — 9234 8765', true)
  RETURNING id INTO v_dr;

  INSERT INTO public.athletes
    (name, date_of_birth, joined_at, running_goal, goal_type, goal_target,
     communication_notes, medical_notes, emergency_contact, active)
  VALUES
    ('Rachel Lim', '2006-09-07', '2025-11-01',
     'Run 40 km total', 'distance_total', 40,
     'Good verbal skills. Tends to get anxious before sessions — reassurance helps. Has a comfort routine (stretching her fingers).',
     'Cerebral palsy (mild, right side). Uses ankle brace. Fatigue sets in after ~20 min — watch for limping.',
     'Jennifer Lim (mother) — 9345 6789', true)
  RETURNING id INTO v_rl;


  -- ── Sessions ───────────────────────────────────────────
  -- All sessions are Sunday mornings at Bishan Park (7:30 AM SGT)
  -- Dates: Oct 2025 → Mar 8 2026

  -- Wei Jie Tan — 18 sessions (experienced, steady improvement)
  INSERT INTO public.sessions
    (athlete_id, coach_user_id, status, date, distance_km, duration_seconds, feel, note, sync_source)
  VALUES
    (v_wj, v_admin, 'completed', '2025-10-05T07:30:00+08:00', 2.500, 1320, 3, NULL, 'manual'),
    (v_wj, v_admin, 'completed', '2025-10-12T07:30:00+08:00', 2.800, 1440, 3, NULL, 'manual'),
    (v_wj, v_admin, 'completed', '2025-10-19T07:30:00+08:00', 2.600, 1380, 3, 'First session with visual timer — worked really well', 'manual'),
    (v_wj, v_admin, 'completed', '2025-10-26T07:30:00+08:00', 3.000, 1500, 4, NULL, 'manual'),
    (v_wj, v_admin, 'completed', '2025-11-09T07:30:00+08:00', 3.200, 1560, 4, NULL, 'manual'),
    (v_wj, v_admin, 'completed', '2025-11-16T07:30:00+08:00', 3.100, 1500, 3, NULL, 'manual'),
    (v_wj, v_admin, 'completed', '2025-11-30T07:30:00+08:00', 3.500, 1680, 4, 'Great pacing today, kept a steady rhythm for the full distance', 'manual'),
    (v_wj, v_admin, 'completed', '2025-12-07T07:30:00+08:00', 3.400, 1620, 4, NULL, 'manual'),
    (v_wj, v_admin, 'completed', '2025-12-14T07:30:00+08:00', 3.800, 1800, 4, NULL, 'manual'),
    (v_wj, v_admin, 'completed', '2025-12-28T07:30:00+08:00', 3.600, 1740, 5, 'Used the 4-count breathing technique, helped settle nerves at the start', 'manual'),
    (v_wj, v_admin, 'completed', '2026-01-04T07:30:00+08:00', 4.000, 1860, 4, NULL, 'manual'),
    (v_wj, v_admin, 'completed', '2026-01-18T07:30:00+08:00', 4.200, 1980, 5, NULL, 'manual'),
    (v_wj, v_admin, 'completed', '2026-01-25T07:30:00+08:00', 3.900, 1860, 4, NULL, 'manual'),
    (v_wj, v_admin, 'completed', '2026-02-01T07:30:00+08:00', 4.500, 2100, 5, 'Tried the new route past the pond, he really enjoyed the scenery', 'manual'),
    (v_wj, v_admin, 'completed', '2026-02-15T07:30:00+08:00', 4.800, 2220, 5, NULL, 'manual'),
    (v_wj, v_admin, 'completed', '2026-02-22T07:30:00+08:00', 5.100, 2340, 5, 'First ever 5K! Wei Jie asked to keep going — amazing motivation!', 'manual'),
    (v_wj, v_admin, 'completed', '2026-03-01T07:30:00+08:00', 4.600, 2160, 4, NULL, 'manual'),
    (v_wj, v_admin, 'completed', '2026-03-08T07:30:00+08:00', 5.200, 2400, 5, 'Personal best distance today! Incredible run', 'manual');

  -- Sarah Chen — 10 sessions (social, steady progress)
  INSERT INTO public.sessions
    (athlete_id, coach_user_id, status, date, distance_km, duration_seconds, feel, note, sync_source)
  VALUES
    (v_sc, v_admin, 'completed', '2025-10-12T07:30:00+08:00', 1.800, 1080, 3, NULL, 'manual'),
    (v_sc, v_admin, 'completed', '2025-10-26T07:30:00+08:00', 2.000, 1200, 3, NULL, 'manual'),
    (v_sc, v_admin, 'completed', '2025-11-09T07:30:00+08:00', 2.200, 1260, 4, 'Sarah was so happy today — high-fived everyone at the finish', 'manual'),
    (v_sc, v_admin, 'completed', '2025-11-16T07:30:00+08:00', 2.100, 1200, 3, NULL, 'manual'),
    (v_sc, v_admin, 'completed', '2025-11-30T07:30:00+08:00', 2.500, 1380, 4, NULL, 'manual'),
    (v_sc, v_admin, 'completed', '2025-12-14T07:30:00+08:00', 2.800, 1560, 4, 'Walked the last 500m but didn''t want to stop. Progress!', 'manual'),
    (v_sc, v_admin, 'completed', '2026-01-04T07:30:00+08:00', 2.700, 1500, 4, NULL, 'manual'),
    (v_sc, v_admin, 'completed', '2026-01-25T07:30:00+08:00', 3.000, 1620, 5, 'Sarah brought her own water bottle today — very independent!', 'manual'),
    (v_sc, v_admin, 'completed', '2026-02-08T07:30:00+08:00', 3.100, 1680, 4, NULL, 'manual'),
    (v_sc, v_admin, 'completed', '2026-03-01T07:30:00+08:00', 3.200, 1740, 5, 'Tried intervals: 2 min run, 1 min walk — she loved the structure', 'manual');

  -- Arun Kumar — 5 sessions (newer, cautious but growing)
  INSERT INTO public.sessions
    (athlete_id, coach_user_id, status, date, distance_km, duration_seconds, feel, note, sync_source)
  VALUES
    (v_ak, v_admin, 'completed', '2025-12-07T07:30:00+08:00', 1.200,  840, 2, 'First session! Cautious at first but warmed up after the warm-up jog', 'manual'),
    (v_ak, v_admin, 'completed', '2025-12-21T07:30:00+08:00', 1.500,  960, 3, 'Used picture cards to choose between two routes — picked the park trail', 'manual'),
    (v_ak, v_admin, 'completed', '2026-01-11T07:30:00+08:00', 1.600, 1020, 3, NULL, 'manual'),
    (v_ak, v_admin, 'completed', '2026-02-01T07:30:00+08:00', 1.800, 1080, 4, NULL, 'manual'),
    (v_ak, v_admin, 'completed', '2026-03-08T07:30:00+08:00', 2.000, 1140, 4, 'Arun smiled at the 1K mark today — first time showing enjoyment during a run', 'manual');

  -- Mei Lin Ong — 12 sessions (enthusiastic, natural leader)
  INSERT INTO public.sessions
    (athlete_id, coach_user_id, status, date, distance_km, duration_seconds, feel, note, sync_source)
  VALUES
    (v_ml, v_admin, 'completed', '2025-10-19T07:30:00+08:00', 2.200, 1200, 4, NULL, 'manual'),
    (v_ml, v_admin, 'completed', '2025-10-26T07:30:00+08:00', 2.400, 1320, 4, NULL, 'manual'),
    (v_ml, v_admin, 'completed', '2025-11-09T07:30:00+08:00', 2.500, 1380, 4, NULL, 'manual'),
    (v_ml, v_admin, 'completed', '2025-11-16T07:30:00+08:00', 2.300, 1260, 3, NULL, 'manual'),
    (v_ml, v_admin, 'completed', '2025-11-30T07:30:00+08:00', 2.800, 1500, 5, 'Mei Lin had the biggest smile at the finish line today', 'manual'),
    (v_ml, v_admin, 'completed', '2025-12-14T07:30:00+08:00', 2.900, 1560, 4, NULL, 'manual'),
    (v_ml, v_admin, 'completed', '2025-12-28T07:30:00+08:00', 3.000, 1620, 5, NULL, 'manual'),
    (v_ml, v_admin, 'completed', '2026-01-18T07:30:00+08:00', 3.100, 1680, 5, NULL, 'manual'),
    (v_ml, v_admin, 'completed', '2026-02-01T07:30:00+08:00', 3.200, 1740, 4, NULL, 'manual'),
    (v_ml, v_admin, 'completed', '2026-02-15T07:30:00+08:00', 3.300, 1800, 5, 'Pacing was much more consistent this week compared to last month', 'manual'),
    (v_ml, v_admin, 'completed', '2026-03-01T07:30:00+08:00', 3.000, 1620, 5, 'Rain session today but she didn''t mind at all — "I love rain running!" she said', 'manual'),
    (v_ml, v_admin, 'completed', '2026-03-08T07:30:00+08:00', 3.500, 1860, 5, 'Volunteered to help warm up the newer athletes — beautiful leadership moment', 'manual');

  -- Danish Rizal — 3 sessions (brand new, dinosaur-loving)
  INSERT INTO public.sessions
    (athlete_id, coach_user_id, status, date, distance_km, duration_seconds, feel, note, sync_source)
  VALUES
    (v_dr, v_admin, 'completed', '2026-02-08T07:30:00+08:00', 1.500, 960, 3, 'First session! Nervous but completed a full 1.5K — dad stayed nearby', 'manual'),
    (v_dr, v_admin, 'completed', '2026-02-22T07:30:00+08:00', 1.600, 1020, 4, NULL, 'manual'),
    (v_dr, v_admin, 'completed', '2026-03-08T07:30:00+08:00', 1.800, 1080, 4, 'Ran with Sarah and they chatted the whole way', 'manual');

  -- Rachel Lim — 10 sessions (overcoming anxiety, brave)
  INSERT INTO public.sessions
    (athlete_id, coach_user_id, status, date, distance_km, duration_seconds, feel, note, sync_source)
  VALUES
    (v_rl, v_admin, 'completed', '2025-11-02T07:30:00+08:00', 1.800, 1140, 3, NULL, 'manual'),
    (v_rl, v_admin, 'completed', '2025-11-16T07:30:00+08:00', 2.000, 1260, 3, NULL, 'manual'),
    (v_rl, v_admin, 'completed', '2025-11-30T07:30:00+08:00', 2.200, 1380, 4, NULL, 'manual'),
    (v_rl, v_admin, 'completed', '2025-12-07T07:30:00+08:00', 2.000, 1260, 3, 'Her ankle brace was rubbing — adjusted with tape and she finished strong', 'manual'),
    (v_rl, v_admin, 'completed', '2025-12-21T07:30:00+08:00', 2.400, 1440, 4, NULL, 'manual'),
    (v_rl, v_admin, 'completed', '2026-01-04T07:30:00+08:00', 2.600, 1500, 4, NULL, 'manual'),
    (v_rl, v_admin, 'completed', '2026-01-25T07:30:00+08:00', 2.800, 1620, 4, 'Rachel was worried about the rain but ended up loving it — breakthrough session', 'manual'),
    (v_rl, v_admin, 'completed', '2026-02-08T07:30:00+08:00', 3.000, 1740, 5, 'Rachel ran her longest distance ever today! She couldn''t stop smiling', 'manual'),
    (v_rl, v_admin, 'completed', '2026-02-22T07:30:00+08:00', 2.500, 1500, 4, 'Shorter run today — listened to her body. Great self-awareness', 'manual'),
    (v_rl, v_admin, 'completed', '2026-03-08T07:30:00+08:00', 3.100, 1800, 5, 'Ran without the comfort stretch before starting — big step! She said she felt "brave"', 'manual');


  -- ── Coaching Cues ──────────────────────────────────────

  INSERT INTO public.cues (athlete_id, helps, avoid, best_cues, kit, version, updated_by) VALUES
    (v_wj,
     ARRAY['Music during warm-up', 'Visual countdown timer', 'Same route each week', 'Quiet warm-up area'],
     ARRAY['Sudden loud noises', 'Crowded start lines', 'Changes to routine without warning'],
     ARRAY['Look ahead, not down', 'Arms like a train', 'Breathe in 2, out 2'],
     ARRAY['Noise-cancelling earbuds', 'Blue compression shirt', 'Cushioned Asics'],
     1, v_admin),
    (v_sc,
     ARRAY['Buddy system with another athlete', 'Verbal encouragement every 500m', 'Stickers as rewards'],
     ARRAY['Running alone', 'Skipping warm-up stretches'],
     ARRAY['Big steps, strong legs!', 'You''re a superstar!', 'Swing those arms'],
     ARRAY['Custom orthotics', 'Pink headband', 'Water bottle holster'],
     1, v_admin),
    (v_ak,
     ARRAY['Picture cards for route choices', 'Consistent coach pairing', 'Quiet start area away from crowd'],
     ARRAY['Clothing tags', 'Strong perfumes nearby', 'Sudden transitions'],
     ARRAY['Show "go" card then start', 'Gentle tap on shoulder for pace', 'Thumbs up at each marker'],
     ARRAY['Tag-free shirt', 'EpiPen in waist bag', 'Soft-sole Brooks'],
     1, v_admin),
    (v_ml,
     ARRAY['Verbal praise after each segment', '5-second processing pause', 'Running with a buddy'],
     ARRAY['Rushing instructions', 'Comparing to other athletes'],
     ARRAY['Steady and strong!', 'One more lap, you''ve got this', 'Chest up, eyes forward'],
     ARRAY['Yellow running cap', 'Garmin watch (distance display)', 'Light Nikes'],
     1, v_admin),
    (v_dr,
     ARRAY['Movement-based warm-up (no standing still)', 'Dinosaur stickers as markers', 'Short clear instructions'],
     ARRAY['Long waiting periods', 'Standing in line'],
     ARRAY['Run like a T-Rex!', 'Fast feet, strong legs', 'Almost at the dinosaur marker!'],
     ARRAY['Dinosaur water bottle', 'Light trainers', 'Cap for sun'],
     1, v_admin),
    (v_rl,
     ARRAY['Pre-run reassurance routine', 'Warm-up stretches (especially right calf)', 'Familiar coaches'],
     ARRAY['Uneven terrain', 'Running more than 25 min without break', 'Pressure to match others'' pace'],
     ARRAY['Relax your shoulders', 'Short steps on this bit', 'You''re doing amazing, Rach'],
     ARRAY['Right ankle brace', 'Medical tape (backup)', 'Cushioned New Balance'],
     1, v_admin);


  -- ── Milestones ─────────────────────────────────────────

  -- Wei Jie: First Session, 5 Sessions, 10 Sessions, First 3K, First 5K, Great Attitude
  INSERT INTO public.milestones (athlete_id, milestone_definition_id, label, achieved_at, awarded_by, session_id) VALUES
    (v_wj, (SELECT id FROM public.milestone_definitions WHERE label = 'First Session'),
     'First Session', '2025-10-05T07:30:00+08:00', v_admin,
     (SELECT id FROM public.sessions WHERE athlete_id = v_wj AND date = '2025-10-05T07:30:00+08:00' LIMIT 1)),
    (v_wj, (SELECT id FROM public.milestone_definitions WHERE label = '5 Sessions'),
     '5 Sessions', '2025-11-09T07:30:00+08:00', v_admin,
     (SELECT id FROM public.sessions WHERE athlete_id = v_wj AND date = '2025-11-09T07:30:00+08:00' LIMIT 1)),
    (v_wj, (SELECT id FROM public.milestone_definitions WHERE label = '10 Sessions'),
     '10 Sessions', '2025-12-28T07:30:00+08:00', v_admin,
     (SELECT id FROM public.sessions WHERE athlete_id = v_wj AND date = '2025-12-28T07:30:00+08:00' LIMIT 1)),
    (v_wj, (SELECT id FROM public.milestone_definitions WHERE label = 'First 3K'),
     'First 3K', '2025-10-26T07:30:00+08:00', v_admin,
     (SELECT id FROM public.sessions WHERE athlete_id = v_wj AND date = '2025-10-26T07:30:00+08:00' LIMIT 1)),
    (v_wj, (SELECT id FROM public.milestone_definitions WHERE label = 'First 5K'),
     'First 5K', '2026-02-22T07:30:00+08:00', v_admin,
     (SELECT id FROM public.sessions WHERE athlete_id = v_wj AND date = '2026-02-22T07:30:00+08:00' LIMIT 1)),
    (v_wj, (SELECT id FROM public.milestone_definitions WHERE label = 'Great Attitude'),
     'Great Attitude', '2026-02-15T07:30:00+08:00', v_admin,
     (SELECT id FROM public.sessions WHERE athlete_id = v_wj AND date = '2026-02-15T07:30:00+08:00' LIMIT 1));

  -- Sarah: First Session, 5 Sessions, First 3K
  INSERT INTO public.milestones (athlete_id, milestone_definition_id, label, achieved_at, awarded_by, session_id) VALUES
    (v_sc, (SELECT id FROM public.milestone_definitions WHERE label = 'First Session'),
     'First Session', '2025-10-12T07:30:00+08:00', v_admin,
     (SELECT id FROM public.sessions WHERE athlete_id = v_sc AND date = '2025-10-12T07:30:00+08:00' LIMIT 1)),
    (v_sc, (SELECT id FROM public.milestone_definitions WHERE label = '5 Sessions'),
     '5 Sessions', '2025-11-30T07:30:00+08:00', v_admin,
     (SELECT id FROM public.sessions WHERE athlete_id = v_sc AND date = '2025-11-30T07:30:00+08:00' LIMIT 1)),
    (v_sc, (SELECT id FROM public.milestone_definitions WHERE label = 'First 3K'),
     'First 3K', '2026-01-25T07:30:00+08:00', v_admin,
     (SELECT id FROM public.sessions WHERE athlete_id = v_sc AND date = '2026-01-25T07:30:00+08:00' LIMIT 1));

  -- Arun: First Session
  INSERT INTO public.milestones (athlete_id, milestone_definition_id, label, achieved_at, awarded_by, session_id) VALUES
    (v_ak, (SELECT id FROM public.milestone_definitions WHERE label = 'First Session'),
     'First Session', '2025-12-07T07:30:00+08:00', v_admin,
     (SELECT id FROM public.sessions WHERE athlete_id = v_ak AND date = '2025-12-07T07:30:00+08:00' LIMIT 1));

  -- Mei Lin: First Session, 5 Sessions, First 3K
  INSERT INTO public.milestones (athlete_id, milestone_definition_id, label, achieved_at, awarded_by, session_id) VALUES
    (v_ml, (SELECT id FROM public.milestone_definitions WHERE label = 'First Session'),
     'First Session', '2025-10-19T07:30:00+08:00', v_admin,
     (SELECT id FROM public.sessions WHERE athlete_id = v_ml AND date = '2025-10-19T07:30:00+08:00' LIMIT 1)),
    (v_ml, (SELECT id FROM public.milestone_definitions WHERE label = '5 Sessions'),
     '5 Sessions', '2025-11-30T07:30:00+08:00', v_admin,
     (SELECT id FROM public.sessions WHERE athlete_id = v_ml AND date = '2025-11-30T07:30:00+08:00' LIMIT 1)),
    (v_ml, (SELECT id FROM public.milestone_definitions WHERE label = 'First 3K'),
     'First 3K', '2025-12-28T07:30:00+08:00', v_admin,
     (SELECT id FROM public.sessions WHERE athlete_id = v_ml AND date = '2025-12-28T07:30:00+08:00' LIMIT 1));

  -- Danish: First Session
  INSERT INTO public.milestones (athlete_id, milestone_definition_id, label, achieved_at, awarded_by, session_id) VALUES
    (v_dr, (SELECT id FROM public.milestone_definitions WHERE label = 'First Session'),
     'First Session', '2026-02-08T07:30:00+08:00', v_admin,
     (SELECT id FROM public.sessions WHERE athlete_id = v_dr AND date = '2026-02-08T07:30:00+08:00' LIMIT 1));

  -- Rachel: First Session, 5 Sessions, First 3K, Personal Best
  INSERT INTO public.milestones (athlete_id, milestone_definition_id, label, achieved_at, awarded_by, session_id) VALUES
    (v_rl, (SELECT id FROM public.milestone_definitions WHERE label = 'First Session'),
     'First Session', '2025-11-02T07:30:00+08:00', v_admin,
     (SELECT id FROM public.sessions WHERE athlete_id = v_rl AND date = '2025-11-02T07:30:00+08:00' LIMIT 1)),
    (v_rl, (SELECT id FROM public.milestone_definitions WHERE label = '5 Sessions'),
     '5 Sessions', '2025-12-21T07:30:00+08:00', v_admin,
     (SELECT id FROM public.sessions WHERE athlete_id = v_rl AND date = '2025-12-21T07:30:00+08:00' LIMIT 1)),
    (v_rl, (SELECT id FROM public.milestone_definitions WHERE label = 'First 3K'),
     'First 3K', '2026-02-08T07:30:00+08:00', v_admin,
     (SELECT id FROM public.sessions WHERE athlete_id = v_rl AND date = '2026-02-08T07:30:00+08:00' LIMIT 1)),
    (v_rl, (SELECT id FROM public.milestone_definitions WHERE label = 'Personal Best'),
     'Personal Best', '2026-02-08T07:30:00+08:00', v_admin,
     (SELECT id FROM public.sessions WHERE athlete_id = v_rl AND date = '2026-02-08T07:30:00+08:00' LIMIT 1));


  -- ── Coach Notes ────────────────────────────────────────

  INSERT INTO public.coach_notes (athlete_id, coach_user_id, content, note_type, visibility, created_at) VALUES
    (v_wj, v_admin,
     'Wei Jie has made incredible progress since October. His pacing has become much more consistent and he''s starting to self-regulate when to walk and when to run. The visual timer has been a game changer.',
     'observation', 'all', '2026-01-20T09:00:00+08:00'),
    (v_wj, v_admin,
     'Noticed he gets anxious when there are more than 10 people at the start. Let''s try warming up at the quieter end of the park next week.',
     'observation', 'coaches_only', '2026-02-10T09:00:00+08:00'),
    (v_sc, v_admin,
     'Sarah is our social butterfly. She motivates everyone around her. Today she cheered for Arun at the finish line — what a team player.',
     'general', 'all', '2026-01-15T09:00:00+08:00'),
    (v_sc, v_admin,
     'Orthotics seem to be wearing down. Flagged to mum — she''ll get new ones fitted next week.',
     'observation', 'coaches_only', '2026-02-20T09:00:00+08:00'),
    (v_ak, v_admin,
     'Arun is still warming up to the group but his comfort level is increasing each week. The picture cards are working well for giving him autonomy in route choices.',
     'observation', 'all', '2026-01-25T09:00:00+08:00'),
    (v_ml, v_admin,
     'Mei Lin volunteered to help warm up the newer athletes today. She''s becoming a natural leader. So proud of her growth both as a runner and as a person.',
     'general', 'all', '2026-03-01T09:00:00+08:00'),
    (v_ml, v_admin,
     'Her mum confirmed medication timing is consistent. No concerns for early sessions.',
     'observation', 'coaches_only', '2026-02-05T09:00:00+08:00'),
    (v_dr, v_admin,
     'Just three sessions in but Danish is already more confident. The dinosaur markers along the route keep him engaged and give him something to run toward.',
     'general', 'all', '2026-03-05T09:00:00+08:00'),
    (v_rl, v_admin,
     'Rachel overcame her pre-run anxiety today without needing the full comfort routine. Major breakthrough! She said she felt "brave".',
     'observation', 'all', '2026-03-08T09:00:00+08:00'),
    (v_rl, v_admin,
     'Watch her right ankle closely — she mentioned mild discomfort in the last 500m. The tape adjustment helped but we should keep monitoring.',
     'observation', 'coaches_only', '2026-02-15T09:00:00+08:00'),
    (v_rl, v_admin,
     'Jennifer (mum) sent a lovely message saying Rachel talks about running club all week. This programme is making a real difference for the whole family.',
     'general', 'all', '2026-02-25T09:00:00+08:00');


  -- ── Coach Badges (for admin) ───────────────────────────

  INSERT INTO public.coach_badges (user_id, badge_key, earned_at) VALUES
    (v_admin, 'first_steps',    '2025-10-05T08:30:00+08:00'),
    (v_admin, 'high_five',      '2025-11-09T08:30:00+08:00'),
    (v_admin, 'double_digits',  '2025-12-07T08:30:00+08:00'),
    (v_admin, 'team_player',    '2025-11-02T08:30:00+08:00'),
    (v_admin, 'all_star_coach', '2025-12-07T08:30:00+08:00'),
    (v_admin, 'storyteller',    '2026-01-25T08:30:00+08:00'),
    (v_admin, 'heart_reader',   '2025-12-14T08:30:00+08:00');


  -- ── Kudos on recent sessions ───────────────────────────
  -- Admin gives kudos to recent sessions from each athlete

  INSERT INTO public.kudos (session_id, user_id)
  SELECT s.id, v_admin
    FROM public.sessions s
   WHERE s.date >= '2026-02-22T00:00:00+08:00'
     AND s.coach_user_id = v_admin
   ORDER BY s.date DESC;


  -- ── Notifications ──────────────────────────────────────

  INSERT INTO public.notifications (user_id, type, payload, read, channel, created_at) VALUES
    (v_admin, 'milestone',
     '{"athlete_name": "Danish Rizal", "milestone": "First Session", "icon": "🏃"}'::jsonb,
     false, 'in_app', '2026-02-08T08:00:00+08:00'),
    (v_admin, 'milestone',
     '{"athlete_name": "Wei Jie Tan", "milestone": "First 5K", "icon": "🎯"}'::jsonb,
     false, 'in_app', '2026-02-22T08:00:00+08:00'),
    (v_admin, 'milestone',
     '{"athlete_name": "Rachel Lim", "milestone": "First 3K", "icon": "📍"}'::jsonb,
     true, 'in_app', '2026-02-08T08:00:00+08:00');

  RAISE NOTICE '✅ Demo seed complete! 6 athletes, 58 sessions, 17 milestones, 11 notes, 7 badges';

END $$;
