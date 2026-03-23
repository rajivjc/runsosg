-- Rename club_settings → clubs and add new columns for multi-club support

-- 1. Rename the table
ALTER TABLE club_settings RENAME TO clubs;

-- 2. Add new columns (slug added without UNIQUE to allow backfill first)
ALTER TABLE clubs ADD COLUMN slug TEXT DEFAULT 'default';
ALTER TABLE clubs ADD COLUMN tagline TEXT DEFAULT 'Growing Together';
ALTER TABLE clubs ADD COLUMN strava_hashtag_prefix TEXT DEFAULT '#SOSG';
ALTER TABLE clubs ADD COLUMN locale TEXT NOT NULL DEFAULT 'en-SG';

-- 3. Backfill the existing row(s)
UPDATE clubs SET slug = 'sosg' WHERE slug = 'default';

-- 4. Add NOT NULL and UNIQUE constraints after backfill
ALTER TABLE clubs ALTER COLUMN slug SET NOT NULL;
ALTER TABLE clubs ADD CONSTRAINT clubs_slug_key UNIQUE (slug);

-- 5. Create a backward-compatible view
CREATE VIEW club_settings AS SELECT * FROM clubs;

-- 6. Add an index on slug
CREATE INDEX idx_clubs_slug ON clubs (slug);
