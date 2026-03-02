-- Feature A: Public Sharing — privacy controls for milestone/story pages
-- Coaches can enable sharing; caregivers can disable (with override).

ALTER TABLE athletes ADD COLUMN allow_public_sharing BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE athletes ADD COLUMN sharing_disabled_by_caregiver BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN athletes.allow_public_sharing IS 'Whether milestone/story pages are publicly visible for this athlete.';
COMMENT ON COLUMN athletes.sharing_disabled_by_caregiver IS 'When true, coaches cannot re-enable sharing — caregiver has final say.';
