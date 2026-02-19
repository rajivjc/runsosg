-- ============================================================
-- SOSG Running Club Hub — Initial Schema
-- Migration: 20250001000000_initial_schema.sql
-- ============================================================

-- ─── TABLES ──────────────────────────────────────────────────

CREATE TABLE club_settings (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text        NOT NULL DEFAULT 'SOSG Running Club',
  logo_url         text,
  home_location    text        DEFAULT 'Bishan Park',
  session_day      text        DEFAULT 'Sunday',
  session_time     text        DEFAULT '7:30 AM',
  strava_club_id   bigint,
  timezone         text        NOT NULL DEFAULT 'Asia/Singapore',
  updated_at       timestamptz DEFAULT now()
);

CREATE TABLE users (
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text        NOT NULL UNIQUE,
  name       text,
  role       text        NOT NULL DEFAULT 'coach'
                         CHECK (role IN ('admin','coach','caregiver')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE athletes (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text        NOT NULL,
  caregiver_user_id   uuid        REFERENCES users(id) ON DELETE SET NULL,
  photo_url           text,
  active              boolean     NOT NULL DEFAULT true,
  date_of_birth       date,
  joined_at           date,
  running_goal        text,
  communication_notes text,
  medical_notes       text,
  emergency_contact   text,
  updated_by          uuid        REFERENCES users(id) ON DELETE SET NULL,
  updated_at          timestamptz,
  created_at          timestamptz DEFAULT now()
);

CREATE TABLE sessions (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id            uuid        NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  coach_user_id         uuid        REFERENCES users(id) ON DELETE SET NULL,
  planned_coach_user_id uuid        REFERENCES users(id) ON DELETE SET NULL,
  strava_activity_id    bigint      UNIQUE,
  status                text        NOT NULL DEFAULT 'completed'
                                    CHECK (status IN ('planned','completed','cancelled')),
  date                  timestamptz NOT NULL,
  distance_km           numeric(6,3),
  duration_seconds      integer,
  feel                  smallint    CHECK (feel BETWEEN 1 AND 5),
  note                  text,
  route_name            text,
  map_polyline          text,
  weather               text,
  sync_source           text        CHECK (sync_source IN
                                    ('strava_webhook','manual','backfill')),
  match_method          text        CHECK (match_method IN
                                    ('hashtag','schedule','manual_review')),
  match_confidence      text        CHECK (match_confidence IN
                                    ('high','medium','manual')),
  strava_deleted_at     timestamptz,
  created_at            timestamptz DEFAULT now()
);

CREATE TABLE cues (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id    uuid        NOT NULL UNIQUE REFERENCES athletes(id) ON DELETE CASCADE,
  helps         text[]      NOT NULL DEFAULT '{}',
  avoid         text[]      NOT NULL DEFAULT '{}',
  best_cues     text[]      NOT NULL DEFAULT '{}',
  kit           text[]      NOT NULL DEFAULT '{}',
  version       integer     NOT NULL DEFAULT 1,
  previous_cues jsonb,
  updated_by    uuid        REFERENCES users(id) ON DELETE SET NULL,
  updated_at    timestamptz DEFAULT now()
);

CREATE TABLE coach_notes (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id    uuid        NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  coach_user_id uuid        REFERENCES users(id) ON DELETE SET NULL,
  content       text        NOT NULL,
  note_type     text        NOT NULL DEFAULT 'general'
                            CHECK (note_type IN ('general','milestone','observation')),
  visibility    text        NOT NULL DEFAULT 'all'
                            CHECK (visibility IN ('all','coaches_only')),
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE milestone_definitions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  label         text        NOT NULL,
  type          text        NOT NULL CHECK (type IN ('automatic','manual')),
  condition     jsonb,
  icon          text,
  display_order integer     NOT NULL DEFAULT 0,
  active        boolean     NOT NULL DEFAULT true,
  created_by    uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE milestones (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id              uuid        NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  milestone_definition_id uuid        REFERENCES milestone_definitions(id) ON DELETE SET NULL,
  label                   text        NOT NULL,
  achieved_at             timestamptz NOT NULL DEFAULT now(),
  awarded_by              uuid        REFERENCES users(id) ON DELETE SET NULL,
  share_image_url         text,
  created_at              timestamptz DEFAULT now()
);

CREATE TABLE media (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id   uuid        NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  session_id   uuid        REFERENCES sessions(id) ON DELETE SET NULL,
  milestone_id uuid        REFERENCES milestones(id) ON DELETE SET NULL,
  url          text        NOT NULL,
  caption      text,
  uploaded_by  uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE strava_connections (
  user_id           uuid        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  strava_athlete_id bigint      NOT NULL,
  access_token      text        NOT NULL,
  refresh_token     text        NOT NULL,
  token_expires_at  timestamptz NOT NULL,
  last_sync_at      timestamptz,
  last_sync_status  text        CHECK (last_sync_status IN
                                ('ok','token_expired','error')),
  last_error        text,
  created_at        timestamptz DEFAULT now()
);

CREATE TABLE strava_sync_log (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  strava_activity_id bigint      NOT NULL,
  coach_user_id      uuid        REFERENCES users(id) ON DELETE SET NULL,
  event_type         text        NOT NULL CHECK (event_type IN ('create','update','delete')),
  event_time         timestamptz,
  received_at        timestamptz NOT NULL DEFAULT now(),
  processed_at       timestamptz,
  status             text        NOT NULL DEFAULT 'pending'
                                 CHECK (status IN
                                 ('pending','matched','unmatched','skipped','error')),
  result_session_id  uuid        REFERENCES sessions(id) ON DELETE SET NULL,
  error_message      text,
  raw_payload        jsonb       NOT NULL
);

CREATE TABLE strava_unmatched (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id      uuid        REFERENCES users(id) ON DELETE SET NULL,
  strava_activity_id bigint      NOT NULL,
  activity_data      jsonb       NOT NULL,
  created_at         timestamptz DEFAULT now(),
  resolved_at        timestamptz,
  resolved_by        uuid        REFERENCES users(id) ON DELETE SET NULL,
  resolved_session_id uuid       REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE TABLE session_rsvp (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status     text        NOT NULL CHECK (status IN ('confirmed','absent')),
  note       text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (session_id, user_id)
);

CREATE TABLE notifications (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         text        NOT NULL CHECK (type IN
               ('milestone','feel_prompt','unmatched_run',
                'strava_disconnected','general')),
  payload      jsonb       NOT NULL DEFAULT '{}',
  read         boolean     NOT NULL DEFAULT false,
  channel      text        NOT NULL DEFAULT 'in_app'
                           CHECK (channel IN ('in_app','email','push')),
  delivered_at timestamptz,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE invitations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        NOT NULL,
  role        text        NOT NULL CHECK (role IN ('admin','coach','caregiver')),
  athlete_id  uuid        REFERENCES athletes(id) ON DELETE SET NULL,
  invited_by  uuid        REFERENCES users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_at  timestamptz DEFAULT now()
);

-- ─── FUNCTIONS & TRIGGERS ────────────────────────────────────

-- Auto-create public.users row when a new auth user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_row invitations%ROWTYPE;
BEGIN
  -- Look for a pending invitation for this email
  SELECT * INTO invitation_row
  FROM public.invitations
  WHERE email = NEW.email
    AND accepted_at IS NULL
  LIMIT 1;

  -- Insert into public.users
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    COALESCE(invitation_row.role, 'coach')
  );

  -- Mark invitation as accepted if one was found
  IF invitation_row.id IS NOT NULL THEN
    UPDATE public.invitations
    SET accepted_at = now()
    WHERE email = NEW.email
      AND accepted_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Version-bump cues when updated
CREATE OR REPLACE FUNCTION update_cues_version()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.previous_cues := to_jsonb(OLD);
  NEW.version       := OLD.version + 1;
  NEW.updated_at    := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_cues_updated
  BEFORE UPDATE ON cues
  FOR EACH ROW EXECUTE FUNCTION update_cues_version();

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────

ALTER TABLE club_settings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE cues                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_notes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_definitions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones             ENABLE ROW LEVEL SECURITY;
ALTER TABLE media                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE strava_connections     ENABLE ROW LEVEL SECURITY;
ALTER TABLE strava_sync_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE strava_unmatched       ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_rsvp           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations            ENABLE ROW LEVEL SECURITY;

-- Helper function to avoid repeating the subquery in every policy
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- ── club_settings: all authenticated users can read ──────────
CREATE POLICY "club_settings_select"
  ON club_settings FOR SELECT
  TO authenticated
  USING (true);

-- ── users: all authenticated users can read ──────────────────
CREATE POLICY "users_select"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- ── athletes: coaches/admins see all; caregivers see own ─────
CREATE POLICY "athletes_select"
  ON athletes FOR SELECT
  TO authenticated
  USING (
    get_my_role() IN ('admin','coach')
    OR caregiver_user_id = auth.uid()
  );

CREATE POLICY "athletes_all_admin"
  ON athletes FOR ALL
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- ── sessions ─────────────────────────────────────────────────
CREATE POLICY "sessions_select"
  ON sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "sessions_insert"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() IN ('admin','coach'));

CREATE POLICY "sessions_update"
  ON sessions FOR UPDATE
  TO authenticated
  USING (get_my_role() IN ('admin','coach'))
  WITH CHECK (get_my_role() IN ('admin','coach'));

-- ── cues ─────────────────────────────────────────────────────
CREATE POLICY "cues_select"
  ON cues FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "cues_insert"
  ON cues FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() IN ('admin','coach'));

CREATE POLICY "cues_update"
  ON cues FOR UPDATE
  TO authenticated
  USING (get_my_role() IN ('admin','coach'))
  WITH CHECK (get_my_role() IN ('admin','coach'));

-- ── coach_notes ───────────────────────────────────────────────
CREATE POLICY "coach_notes_select"
  ON coach_notes FOR SELECT
  TO authenticated
  USING (
    get_my_role() IN ('admin','coach')
    OR visibility = 'all'
  );

CREATE POLICY "coach_notes_insert"
  ON coach_notes FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() IN ('admin','coach'));

-- ── milestone_definitions ────────────────────────────────────
CREATE POLICY "milestone_definitions_select"
  ON milestone_definitions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "milestone_definitions_all_admin"
  ON milestone_definitions FOR ALL
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- ── milestones ────────────────────────────────────────────────
CREATE POLICY "milestones_select"
  ON milestones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "milestones_insert"
  ON milestones FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() IN ('admin','coach'));

-- ── media ────────────────────────────────────────────────────
CREATE POLICY "media_select"
  ON media FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "media_insert"
  ON media FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() IN ('admin','coach'));

-- ── strava_connections ────────────────────────────────────────
CREATE POLICY "strava_connections_all_own"
  ON strava_connections FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── strava_sync_log ───────────────────────────────────────────
CREATE POLICY "strava_sync_log_select"
  ON strava_sync_log FOR SELECT
  TO authenticated
  USING (true);

-- ── strava_unmatched ──────────────────────────────────────────
CREATE POLICY "strava_unmatched_select"
  ON strava_unmatched FOR SELECT
  TO authenticated
  USING (true);

-- ── session_rsvp ─────────────────────────────────────────────
CREATE POLICY "session_rsvp_select"
  ON session_rsvp FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "session_rsvp_insert"
  ON session_rsvp FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "session_rsvp_update"
  ON session_rsvp FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── notifications ─────────────────────────────────────────────
CREATE POLICY "notifications_select"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── invitations ───────────────────────────────────────────────
CREATE POLICY "invitations_all_admin"
  ON invitations FOR ALL
  TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');
