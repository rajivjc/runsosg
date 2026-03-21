-- Audit log for admin and sensitive coach actions.
-- Entries are fire-and-forget — logging failures must never block operations.

CREATE TABLE audit_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  actor_role  text,
  action      text        NOT NULL,
  target_type text,
  target_id   text,
  metadata    jsonb       DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS — only admins can read the audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
  ON audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- No insert policy for authenticated users — inserts go through adminClient (service role)
-- This prevents non-admin users from writing fake audit entries

-- Index for browsing by time (admin panel default sort)
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- Index for filtering by action type
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- Index for filtering by target (e.g. "show me all changes to athlete X")
CREATE INDEX idx_audit_log_target ON audit_log(target_type, target_id);
