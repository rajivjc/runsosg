-- Prevent duplicate kudos (race condition in toggleKudos check-then-act)
-- First, remove any existing duplicates (keep the earliest)
DELETE FROM kudos
WHERE id NOT IN (
  SELECT DISTINCT ON (session_id, user_id) id
  FROM kudos
  ORDER BY session_id, user_id, created_at ASC
);

ALTER TABLE kudos
  ADD CONSTRAINT kudos_session_user_unique UNIQUE (session_id, user_id);
