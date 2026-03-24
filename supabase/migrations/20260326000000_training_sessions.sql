-- Phase 1: Training Sessions & Coach RSVP — Database Foundation
--
-- Creates: training_sessions, session_coach_rsvps, session_athlete_rsvps, session_assignments
-- Alters:  users (can_manage_sessions, session_notifications)
--          sessions (training_session_id)
--          clubs (recurring session template fields)
-- Seeds:   recurring template from legacy session_day/session_time/home_location

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. NEW TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Core training session record
CREATE TABLE IF NOT EXISTS training_sessions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id                UUID NOT NULL REFERENCES clubs(id),
  title                  TEXT,
  session_start          TIMESTAMPTZ NOT NULL,
  session_end            TIMESTAMPTZ,
  location               TEXT NOT NULL,
  notes                  TEXT,
  status                 TEXT NOT NULL DEFAULT 'draft',
  coach_rsvp_deadline    TIMESTAMPTZ,
  athlete_rsvp_deadline  TIMESTAMPTZ,
  pairings_published_at  TIMESTAMPTZ,
  pairings_stale         BOOLEAN NOT NULL DEFAULT false,
  completed_at           TIMESTAMPTZ,
  created_by             UUID NOT NULL REFERENCES users(id),
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);

-- Coach RSVP
CREATE TABLE IF NOT EXISTS session_coach_rsvps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  coach_id        UUID NOT NULL REFERENCES users(id),
  status          TEXT NOT NULL DEFAULT 'pending',
  responded_at    TIMESTAMPTZ,
  responded_by    UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, coach_id)
);

-- Athlete RSVP (submitted by caregiver, coach, or admin)
CREATE TABLE IF NOT EXISTS session_athlete_rsvps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  athlete_id      UUID NOT NULL REFERENCES athletes(id),
  status          TEXT NOT NULL DEFAULT 'pending',
  responded_by    UUID REFERENCES users(id),
  responded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, athlete_id)
);

-- Coach-athlete pairings
CREATE TABLE IF NOT EXISTS session_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  coach_id        UUID NOT NULL REFERENCES users(id),
  athlete_id      UUID NOT NULL REFERENCES athletes(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, athlete_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. UPDATED_AT TRIGGER
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_training_sessions_updated_at
  BEFORE UPDATE ON training_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. COLUMN ADDITIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_manage_sessions BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_notifications BOOLEAN NOT NULL DEFAULT true;

-- Link existing run-log sessions to training sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS training_session_id UUID REFERENCES training_sessions(id);

-- Clubs table — recurring session template
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS recurring_session_day      SMALLINT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS recurring_session_time     TIME;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS recurring_session_end      TIME;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS recurring_session_location TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS recurring_auto_draft       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS max_athletes_per_coach     SMALLINT NOT NULL DEFAULT 3;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. SEED RECURRING TEMPLATE FROM LEGACY FIELDS
-- ═══════════════════════════════════════════════════════════════════════════════

-- session_day is text like 'Sunday', convert to SMALLINT (0=Sun, 6=Sat)
-- session_time is text like '7:30 AM', convert to TIME
UPDATE clubs SET
  recurring_session_day = CASE lower(session_day)
    WHEN 'sunday'    THEN 0
    WHEN 'monday'    THEN 1
    WHEN 'tuesday'   THEN 2
    WHEN 'wednesday' THEN 3
    WHEN 'thursday'  THEN 4
    WHEN 'friday'    THEN 5
    WHEN 'saturday'  THEN 6
  END,
  recurring_session_time = (
    CASE
      WHEN session_time ~ '^\d{1,2}:\d{2}\s*(AM|PM|am|pm)$' THEN
        to_timestamp(session_time, 'HH:MI AM')::TIME
      ELSE NULL
    END
  ),
  recurring_session_location = home_location
WHERE session_day IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_training_sessions_club_date ON training_sessions(club_id, session_start);
CREATE INDEX IF NOT EXISTS idx_training_sessions_status ON training_sessions(status);
CREATE INDEX IF NOT EXISTS idx_coach_rsvps_session ON session_coach_rsvps(session_id);
CREATE INDEX IF NOT EXISTS idx_coach_rsvps_coach ON session_coach_rsvps(coach_id);
CREATE INDEX IF NOT EXISTS idx_athlete_rsvps_session ON session_athlete_rsvps(session_id);
CREATE INDEX IF NOT EXISTS idx_assignments_session ON session_assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_assignments_coach ON session_assignments(coach_id);
CREATE INDEX IF NOT EXISTS idx_sessions_training_session ON sessions(training_session_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE training_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_coach_rsvps    ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_athlete_rsvps  ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_assignments    ENABLE ROW LEVEL SECURITY;

-- ── training_sessions ──────────────────────────────────────────────────────────

-- SELECT: all authenticated users can see published/completed/cancelled sessions;
--         draft sessions only visible to admin or users with can_manage_sessions
CREATE POLICY "training_sessions_select"
  ON training_sessions FOR SELECT
  TO authenticated
  USING (
    status != 'draft'
    OR get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.can_manage_sessions = true
    )
  );

-- INSERT: admin or users with can_manage_sessions
CREATE POLICY "training_sessions_insert"
  ON training_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.can_manage_sessions = true
    )
  );

-- UPDATE: admin or session creator
CREATE POLICY "training_sessions_update"
  ON training_sessions FOR UPDATE
  TO authenticated
  USING (
    get_my_role() = 'admin'
    OR created_by = auth.uid()
  )
  WITH CHECK (
    get_my_role() = 'admin'
    OR created_by = auth.uid()
  );

-- DELETE: admin only
CREATE POLICY "training_sessions_delete"
  ON training_sessions FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- ── session_coach_rsvps ────────────────────────────────────────────────────────

-- SELECT: all authenticated users in same club (via training_sessions join)
CREATE POLICY "session_coach_rsvps_select"
  ON session_coach_rsvps FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: service role only (auto-created on publish) — no authenticated policy
-- (adminClient bypasses RLS)

-- UPDATE: the coach themselves or admin
CREATE POLICY "session_coach_rsvps_update"
  ON session_coach_rsvps FOR UPDATE
  TO authenticated
  USING (
    coach_id = auth.uid()
    OR get_my_role() = 'admin'
  )
  WITH CHECK (
    coach_id = auth.uid()
    OR get_my_role() = 'admin'
  );

-- ── session_athlete_rsvps ──────────────────────────────────────────────────────

-- SELECT: all authenticated users
CREATE POLICY "session_athlete_rsvps_select"
  ON session_athlete_rsvps FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: service role only — no authenticated policy

-- UPDATE: linked caregiver, admin, or coaches
CREATE POLICY "session_athlete_rsvps_update"
  ON session_athlete_rsvps FOR UPDATE
  TO authenticated
  USING (
    get_my_role() IN ('admin', 'coach')
    OR EXISTS (
      SELECT 1 FROM athletes
      WHERE athletes.id = session_athlete_rsvps.athlete_id
        AND athletes.caregiver_user_id = auth.uid()
    )
  )
  WITH CHECK (
    get_my_role() IN ('admin', 'coach')
    OR EXISTS (
      SELECT 1 FROM athletes
      WHERE athletes.id = session_athlete_rsvps.athlete_id
        AND athletes.caregiver_user_id = auth.uid()
    )
  );

-- ── session_assignments ────────────────────────────────────────────────────────

-- SELECT: all authenticated users
CREATE POLICY "session_assignments_select"
  ON session_assignments FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: admin or can_manage_sessions users
CREATE POLICY "session_assignments_insert"
  ON session_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.can_manage_sessions = true
    )
  );

-- UPDATE: admin or can_manage_sessions users
CREATE POLICY "session_assignments_update"
  ON session_assignments FOR UPDATE
  TO authenticated
  USING (
    get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.can_manage_sessions = true
    )
  )
  WITH CHECK (
    get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.can_manage_sessions = true
    )
  );

-- DELETE: admin or can_manage_sessions users
CREATE POLICY "session_assignments_delete"
  ON session_assignments FOR DELETE
  TO authenticated
  USING (
    get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.can_manage_sessions = true
    )
  );
