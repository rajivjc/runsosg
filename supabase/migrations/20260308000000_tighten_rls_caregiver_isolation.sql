-- Tighten RLS SELECT policies so caregivers can only see data
-- for their linked athlete. Coaches and admins retain full access.
--
-- Tables affected: sessions, cues, media, milestones
-- Tables kept as USING(true): users, club_settings, milestone_definitions,
--   kudos, strava_sync_log, strava_unmatched, session_rsvp
--   (these are non-sensitive or needed for shared features)

-- ── sessions: coaches/admins see all; caregivers see their athlete only ──
DROP POLICY IF EXISTS "sessions_select" ON sessions;
CREATE POLICY "sessions_select"
  ON sessions FOR SELECT
  TO authenticated
  USING (
    get_my_role() IN ('admin', 'coach')
    OR EXISTS (
      SELECT 1 FROM athletes
      WHERE athletes.id = sessions.athlete_id
        AND athletes.caregiver_user_id = auth.uid()
    )
  );

-- ── cues: coaches/admins see all; caregivers see their athlete only ──
DROP POLICY IF EXISTS "cues_select" ON cues;
CREATE POLICY "cues_select"
  ON cues FOR SELECT
  TO authenticated
  USING (
    get_my_role() IN ('admin', 'coach')
    OR EXISTS (
      SELECT 1 FROM athletes
      WHERE athletes.id = cues.athlete_id
        AND athletes.caregiver_user_id = auth.uid()
    )
  );

-- ── media: coaches/admins see all; caregivers see their athlete only ──
DROP POLICY IF EXISTS "media_select" ON media;
CREATE POLICY "media_select"
  ON media FOR SELECT
  TO authenticated
  USING (
    get_my_role() IN ('admin', 'coach')
    OR EXISTS (
      SELECT 1 FROM athletes
      WHERE athletes.id = media.athlete_id
        AND athletes.caregiver_user_id = auth.uid()
    )
  );

-- ── milestones: coaches/admins see all; caregivers see their athlete only ──
DROP POLICY IF EXISTS "milestones_select" ON milestones;
CREATE POLICY "milestones_select"
  ON milestones FOR SELECT
  TO authenticated
  USING (
    get_my_role() IN ('admin', 'coach')
    OR EXISTS (
      SELECT 1 FROM athletes
      WHERE athletes.id = milestones.athlete_id
        AND athletes.caregiver_user_id = auth.uid()
    )
  );

-- ── strava_sync_log: restrict to coaches/admins (caregivers don't need this) ──
DROP POLICY IF EXISTS "strava_sync_log_select" ON strava_sync_log;
CREATE POLICY "strava_sync_log_select"
  ON strava_sync_log FOR SELECT
  TO authenticated
  USING (get_my_role() IN ('admin', 'coach'));

-- ── strava_unmatched: restrict to coaches/admins ──
DROP POLICY IF EXISTS "strava_unmatched_select" ON strava_unmatched;
CREATE POLICY "strava_unmatched_select"
  ON strava_unmatched FOR SELECT
  TO authenticated
  USING (get_my_role() IN ('admin', 'coach'));
