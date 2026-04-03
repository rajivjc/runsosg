-- Strava deletion audit log for §5.4 compliance
-- Tracks personal data deletion when a coach's Strava authorization is revoked

CREATE TABLE strava_deletion_audit (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at      timestamptz NOT NULL DEFAULT now(),
  sessions_affected integer   NOT NULL DEFAULT 0,
  photos_deleted  integer     NOT NULL DEFAULT 0,
  photos_failed   integer     NOT NULL DEFAULT 0,
  triggered_by    text        NOT NULL
);

ALTER TABLE strava_deletion_audit ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (webhook handler uses adminClient)
-- Only admins can read audit entries
CREATE POLICY "Admins can read strava deletion audit"
  ON strava_deletion_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE INDEX idx_strava_deletion_audit_coach_id ON strava_deletion_audit(coach_id);
CREATE INDEX idx_strava_deletion_audit_deleted_at ON strava_deletion_audit(deleted_at);
