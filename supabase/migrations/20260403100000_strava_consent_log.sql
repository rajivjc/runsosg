-- Strava API Agreement §2.18: Log prior express consent before OAuth
CREATE TABLE strava_consent_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consented_at    timestamptz NOT NULL DEFAULT now(),
  consent_version text        NOT NULL DEFAULT '2025-10-09'
);

ALTER TABLE strava_consent_log ENABLE ROW LEVEL SECURITY;

-- Coaches can insert their own consent records
CREATE POLICY "strava_consent_log_insert_own"
  ON strava_consent_log FOR INSERT
  TO authenticated
  WITH CHECK (coach_id = auth.uid());

-- Coaches can view their own consent history
CREATE POLICY "strava_consent_log_select_own"
  ON strava_consent_log FOR SELECT
  TO authenticated
  USING (coach_id = auth.uid());
