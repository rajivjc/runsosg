-- Rename club_settings → clubs and add new columns for multi-club support

-- 1. Rename the table
ALTER TABLE club_settings RENAME TO clubs;

-- 2. Add new columns
ALTER TABLE clubs ADD COLUMN slug TEXT UNIQUE NOT NULL DEFAULT 'default';
ALTER TABLE clubs ADD COLUMN tagline TEXT DEFAULT 'Growing Together';
ALTER TABLE clubs ADD COLUMN strava_hashtag_prefix TEXT DEFAULT '#SOSG';
ALTER TABLE clubs ADD COLUMN locale TEXT NOT NULL DEFAULT 'en-SG';

-- 3. Backfill the existing row
UPDATE clubs SET slug = 'sosg' WHERE slug = 'default';

-- 4. Create a backward-compatible view
CREATE VIEW club_settings AS SELECT * FROM clubs;

-- 5. Add an index on slug
CREATE INDEX idx_clubs_slug ON clubs (slug);
