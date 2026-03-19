-- Add avatar column for athlete-chosen emoji avatar
ALTER TABLE athletes ADD COLUMN avatar TEXT DEFAULT NULL;
